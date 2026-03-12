import { appendFile, readFile, writeFile } from "fs/promises";
import * as vscode from "vscode";

export interface MarkerRange {
    start: number;
    end: number;
}

export interface MarkerAnnotation {
    id: string;
    range: MarkerRange;
    path: string;
    color: string;
    content: string;
    alt: string;
    gui: {
        description: string;
        relation: {
            a: string;
            b: string;
            comment: string;
        }[]
    };
}

export class Executor {

    private toMarker: string = '';

    private static mdChangeLs = new Map<string, string>();

    /**
     * Returns a workspace-relative path (e.g. "src/extension.ts").
     * Bypasses all URI encoding, drive letter, and virtual FS issues.
     */
    public static normalizePath(rawPath: string): string {
        try {
            const vscode = require('vscode');
            const uri = rawPath.startsWith('file://') ? vscode.Uri.parse(rawPath) : vscode.Uri.file(rawPath);

            // Get relative path and normalize slashes
            let i = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');

            const cleaned = i.replace(/^(\.\/|\/)+/, '');

            return './' + cleaned;
        } catch {
            return './' + rawPath.replace(/\\/g, '/').replace(/^[\.\/]+/, '');
        }
    }

    public static formatEnchance = (content: string) => {
        let result = content;
        Executor.mdChangeLs.forEach((value, key) => {
            // Using a simple split/join for better performance on large strings
            result = result.split(key).join(value);
        });
        return result;
    };

    constructor(path: string) {
        this.toMarker = path;

        Executor.mdChangeLs.set('\\n', '\n\n');    // User input \n becomes Markdown newline
        Executor.mdChangeLs.set('\\t', '    ');   // Tabs to 4 spaces
        Executor.mdChangeLs.set('---', '  \n\n---\n\n'); // Horizontal rule

    }

    public async writeIntoMarker(path: string, ctt: MarkerAnnotation) {

        // Path is already a properly encoded file:// URI provided by VS Code
        const normalizedPath = ctt.path;

        const record = {
            id: ctt.id,
            range: { start: ctt.range.start, end: ctt.range.end },
            path: normalizedPath,
            color: ctt.color,
            content: ctt.content,
            alt: ctt.alt,
            gui: ctt.gui
        };

        // NDJSON: one JSON object per line, appended directly
        // JSON.stringify auto-escapes any \n inside content strings - safe for markdown
        await appendFile(this.toMarker, JSON.stringify(record) + '\n');
    }

    public async refresh(list: any) {

        // refresh marker file
        if (!list) { return; }

        console.log('we are in refresh');

        const lines: string[] = [];
        const seen = new Set<string>();

        // Traverse the nested dict: list[path][line] = MarkerData[]
        for (const [filePath, markersAtLines] of Object.entries(list)) {
            for (const [lineStr, slot] of Object.entries(markersAtLines as any)) {
                const slotArr = Array.isArray(slot) ? slot : [slot];
                for (const d of slotArr) {
                    // Deduplicate by id (since 1 MarkerData maps to N lines)
                    if (!seen.has(d.id)) {
                        seen.add(d.id);

                        const record = {
                            id: d.id,
                            range: { start: d.range.start, end: d.range.end },
                            path: filePath,
                            color: d.color,
                            content: d.content,
                            alt: d.alt ? d.alt : '',
                            gui: d.gui
                        };
                        lines.push(JSON.stringify(record));
                    }
                }
            }
        }
        // Overwrite the entire file with the latest in-memory state
        await writeFile(this.toMarker, lines.join('\n') + (lines.length > 0 ? '\n' : ''));
        return;
    }

    public async recover(cmd: string = 'n', path?: string, ctt?: MarkerAnnotation) {

        if (!path || !ctt) { return; };

        // 1. Read every line in the NDJSON file
        const raw = await readFile(this.toMarker, 'utf-8');

        // 2. Keep only lines that do NOT match the same path+range start (drop the old entry)
        const filtered = raw
            .split('\n')
            .filter(line => {
                if (!line.trim()) { return false; } // drop empty lines
                try {
                    const obj = JSON.parse(line);
                    const rStart = obj.range ? obj.range.start : obj.line;
                    return !(obj.path === ctt.path && rStart === ctt.range.start);
                } catch {
                    return false; // drop corrupted lines
                }
            })
            .join('\n');

        if (cmd === 'd') {
            await writeFile(this.toMarker, filtered + (filtered.length > 0 ? '\n' : ''));
            return;
        }

        // 3. Build the updated record
        const newRecord = {
            id: ctt.id,
            range: { start: ctt.range.start, end: ctt.range.end },
            path: ctt.path,
            color: ctt.color,
            content: ctt.content,
            alt: ctt.alt,
            gui: ctt.gui
        };

        // 4. Write filtered content + new record back as one atomic write
        await writeFile(this.toMarker, filtered + '\n' + JSON.stringify(newRecord) + '\n');
    }

    public async replaceColor(list: any, colorMap: Map<string, string>) {
        console.log('we are in replaceColor');
        if (!list || colorMap.size === 0) {
            return;
        }
        let updated = false;

        for (const [filePath, markersAtLines] of Object.entries(list)) {
            for (const [lineStr, slot] of Object.entries(markersAtLines as any)) {
                const slotArr = Array.isArray(slot) ? slot : [slot];
                for (const d of slotArr) {
                    if (colorMap.has(d.color)) {
                        d.color = colorMap.get(d.color);
                        updated = true;
                    }
                }
            }
        }

        if (updated) {
            await this.refresh(list);
        }
    }

    public async jumpToLine(filePath: string, range: { start: number, end: number }) {

        const uri = vscode.Uri.file(filePath);

        const doc = await vscode.workspace.openTextDocument(uri);

        // change linecount to index
        const posStart = new vscode.Position(range.start - 1, 0);
        const posEnd = new vscode.Position(range.end - 1, 0);

        await vscode.window.showTextDocument(doc, {
            selection: new vscode.Range(posStart, posEnd),
            preview: false,
            viewColumn: vscode.ViewColumn.One
        });
    }

}

/**
 * Tracks line shifts caused by user edits and updates marker positions in memory.
 * Usage: instantiate once in activate(), pass configLoader.list reference.
 */
export class lineTracker {

    /**
     * Call this from onDidChangeTextDocument.
     * It shifts all marker line numbers for the affected file.
     */
    public static shift(
        list: { [filepath: string]: { [line: number]: any } },
        filePath: string,
        changes: readonly { range: { start: { line: number; character: number }; end: { line: number } }; text: string }[],
        document: vscode.TextDocument
    ) {
        // Initialize with the current state of the file's markers
        let currentMarkers = list[filePath];

        if (!currentMarkers) { return; }

        for (const change of changes) {
            const startLine = change.range.start.line + 1; // 1-based VS Code line
            const char = change.range.start.character;

            const oldLineCount = change.range.end.line - change.range.start.line;
            const newLineCount = change.text.split('\n').length - 1;
            const delta = newLineCount - oldLineCount;

            if (delta === 0) { continue; }

            // 1. Extract unique markers from array slots (prevents reference/fusion bugs)
            const seenIds = new Set<string>();
            const uniqueMarkers: any[] = [];
            for (const lineStr in currentMarkers) {
                const slot = currentMarkers[lineStr];
                const slotArr = Array.isArray(slot) ? slot : [slot];
                for (const m of slotArr) {
                    if (!seenIds.has(m.id)) {
                        seenIds.add(m.id);
                        uniqueMarkers.push(m);
                    }
                }
            }

            const updated: any = {};

            // 2. Process each marker independently
            for (const oldMarker of uniqueMarkers) {
                // Immutable Clone
                const marker = { ...oldMarker, range: { ...oldMarker.range } };

                // 3. Ultra-simple Border Logic
                const currentLineText = document.lineAt(change.range.start.line).text;
                const lines = change.text.split('\n');

                // If it's a simple text change (no newlines)
                if (lines.length <= 1) {
                    if (startLine < marker.range.start || (startLine === marker.range.start && char === 0)) {
                        marker.range.start += delta;
                    }
                    if (startLine < marker.range.end) {
                        marker.range.end += delta;
                    }
                } else {
                    // Newline inserted (Split or Escape)
                    const nextLineText = document.lineAt(change.range.start.line + 1).text;
                    const indentation = lines[lines.length - 1]; // Likely auto-indentation

                    // Virtual Original Length = Left + Right (minus new indentation)
                    const virtualOriginalLength = currentLineText.length + (nextLineText.length - indentation.length);

                    // Drift: If change is ABOVE or exactly at start-col-0
                    if (startLine < marker.range.start || (startLine === marker.range.start && char === 0)) {
                        marker.range.start += delta;
                    }

                    const isInside = startLine < marker.range.end;
                    const isSplit = startLine === marker.range.end && char < virtualOriginalLength;

                    if (isInside || isSplit) {
                        marker.range.end += delta;
                    }
                }

                // 4. Safe Bounds Check
                if (marker.range.start < 1) {
                    marker.range.start = 1;
                }

                // 5. Build the new map with array slots
                if (marker.range.end >= marker.range.start) {
                    for (let l = marker.range.start; l <= marker.range.end; l++) {
                        if (!updated[l]) { updated[l] = []; }
                        updated[l].push(marker);
                    }
                }
            }

            // Assign back the newly built snapshot to currentMarkers
            currentMarkers = updated;
            list[filePath] = updated;
        }
    }
}

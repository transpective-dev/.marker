import { appendFile, readFile, writeFile } from "fs/promises";

interface ctt {
    line: number,
    path: string,
    color: string,
    content: string,
}

export class executor {

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

            const cleaned = i.replace(/^[\.\/]+/, '');

            return './' + cleaned;
        } catch {
            return './' + rawPath.replace(/\\/g, '/').replace(/^[\.\/]+/, '');
        }
    }

    public static formatEnchance = (content: string) => {
        let result = content;
        executor.mdChangeLs.forEach((value, key) => {
            // Using a simple split/join for better performance on large strings
            result = result.split(key).join(value);
        });
        return result;
    }

    constructor(path: string) {
        this.toMarker = path;

        executor.mdChangeLs.set('\\n', '\n\n');    // User input \n becomes Markdown newline
        executor.mdChangeLs.set('\\t', '    ');   // Tabs to 4 spaces
        executor.mdChangeLs.set('---', '  \n\n---\n\n'); // Horizontal rule

    }

    public async writeIntoMarker(path: string, ctt: ctt) {

        // Path is already a properly encoded file:// URI provided by VS Code
        const normalizedPath = ctt.path;

        const record = {
            line: ctt.line,
            path: normalizedPath,
            color: ctt.color,
            content: ctt.content
        };

        // NDJSON: one JSON object per line, appended directly
        // JSON.stringify auto-escapes any \n inside content strings - safe for markdown
        await appendFile(this.toMarker, JSON.stringify(record) + '\n');
    }

    public async refresh(list: any) {

        // refresh marker file
        if (!list) { return; }
    
        const lines: string[] = [];
        // Traverse the nested dict: list[path][line] = {content, color}
        for (const [filePath, markersAtLines] of Object.entries(list)) {
            for (const [lineStr, data] of Object.entries(markersAtLines as any)) {
                const record = {
                    line: parseInt(lineStr),
                    path: filePath,
                    color: (data as any).color,
                    content: (data as any).content
                };
                lines.push(JSON.stringify(record));
            }
        }
        // Overwrite the entire file with the latest in-memory state
        await writeFile(this.toMarker, lines.join('\n') + (lines.length > 0 ? '\n' : ''));
        return;
    }

    public async recover(cmd: string = 'n', path?: string, ctt?: ctt) {

        if (!path || !ctt) { return; };

        // 1. Read every line in the NDJSON file
        const raw = await readFile(this.toMarker, 'utf-8');

        // 2. Keep only lines that do NOT match the same path+line (drop the old entry)
        const filtered = raw
            .split('\n')
            .filter(line => {
                if (!line.trim()) { return false; } // drop empty lines
                try {
                    const obj = JSON.parse(line);
                    return !(obj.path === ctt.path && obj.line === ctt.line);
                } catch {
                    return false; // drop corrupted lines
                }
            })
            .join('\n');

        // 3. Build the updated record
        const newRecord = {
            line: ctt.line,
            path: ctt.path,
            color: ctt.color,
            content: ctt.content
        };

        // 4. Write filtered content + new record back as one atomic write
        await writeFile(this.toMarker, filtered + '\n' + JSON.stringify(newRecord) + '\n');
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
        list: { [filepath: string]: { [line: number]: { content: string; color: string } } },
        filePath: string,
        changes: readonly { range: { start: { line: number }; end: { line: number } }; text: string }[]
    ) {
        const fileMarkers = list[filePath];
        if (!fileMarkers) { return; }

        for (const change of changes) {
            const startLine = change.range.start.line;
            const oldLineCount = change.range.end.line - change.range.start.line;
            const newLineCount = change.text.split('\n').length - 1;
            const delta = newLineCount - oldLineCount;

            if (delta === 0) { continue; }

            // Rebuild the object with shifted keys
            const updated: typeof fileMarkers = {};
            for (const lineStr in fileMarkers) {
                const line = parseInt(lineStr);
                if (line > startLine + 1) {
                    // This marker is below the edit → shift it
                    updated[line + delta] = fileMarkers[lineStr];
                } else {
                    // This marker is at or above the edit → keep it
                    updated[line] = fileMarkers[lineStr];
                }
            }
            list[filePath] = updated;
        }
    }
}

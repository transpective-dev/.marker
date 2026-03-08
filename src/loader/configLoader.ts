import { join } from 'path';
import { readdir, readFile } from 'fs/promises';

// Lookup is O(1) instead of O(n) array.find()
export interface MarkerRange {
    start: number;
    end: number;
}
export interface MarkerData {
    range: MarkerRange;
    content: string;
    color: string;
}

export type note_ls = {
    [filepath: string]: {
        [line: number]: MarkerData;
    };
}


import * as vscode from 'vscode';
import { executor } from '../executor';

export class configloader {


    private onUpdateCallback?: () => void;

    public setOnUpdate(cb: () => void) { this.onUpdateCallback = cb; }

    private path: string;

    public list: note_ls = {};

    // register file system watcher
    public watcher: vscode.FileSystemWatcher;

    // Plan D: debounce timer - only reload after 300ms of silence
    private debounceTimer: NodeJS.Timeout | null = null;

    constructor(path: string) {

        this.watcher = vscode.workspace.createFileSystemWatcher(

            // scope to .marker
            new vscode.RelativePattern(path, '**/*.jsonl')

        );

        this.path = path;
        // initialize
        this.loadConfig();
        console.log(this.path);

        // Add FileSystemWatcher for hot-reloading (with debounce)
        const reload = () => {
            if (this.debounceTimer) { clearTimeout(this.debounceTimer); }
            this.debounceTimer = setTimeout(() => this.loadConfig(), 300);
        };

        this.watcher.onDidChange(reload);
        this.watcher.onDidCreate(reload);
        this.watcher.onDidDelete(reload);
    }

    public async loadConfig() {

        try {
            console.log('reading files...');

            const ls: string[] = await readdir(this.path);

            const newPath = join(this.path, ls[0]);

            console.log(newPath);

            const raw = await readFile(newPath, 'utf-8');

            // NDJSON: split by line, skip empty lines, parse each line independently
            // Lines with bad JSON are silently dropped to avoid one bad entry corrupting everything
            const i = raw
                .split('\n')
                .filter(line => line.trim().length > 0)
                .flatMap(line => {
                    try { return [JSON.parse(line)]; }
                    catch { return []; }
                });

            // clear list before repopulating in case of reload
            for (let key in this.list) {
                delete this.list[key];
            }

            for (const item of i) {

                const refinePath = executor.normalizePath(item.path);

                // Plan B: store as nested key map instead of array
                if (!this.list[refinePath]) {
                    this.list[refinePath] = {};
                }

                // Hot migration from old "line" format to new "range" format
                const rStart = item.range !== undefined ? item.range.start : item.line;
                const rEnd = item.range !== undefined ? item.range.end : item.line;

                const markerData: MarkerData = {
                    range: { start: rStart, end: rEnd },
                    content: item.content,
                    color: item.color ? item.color : '#ffffff90'
                };

                // Map ALL lines within the range to point to the exact same memory object
                // Preserves O(1) lookup speeds for ANY line overlapping the range
                for (let l = rStart; l <= rEnd; l++) {
                    this.list[refinePath][l] = markerData;
                }
            }

            console.dir(this.list, { depth: null, colors: true });

            // updateDecos
            this.onUpdateCallback?.();

        } catch (error) {
            console.error('Marker MVP try-catch caught an error during loadConfig:', error);
        }

    }

    // get content from jsonl
    public get(path: string, line: number) {

        path = executor.normalizePath(path);

        // Find if line exists in the file's marker list
        if (!this.list[path]) {
            console.log('no  path found');
            return undefined;
        }

        // Plan B: O(1) direct key lookup - no array.find() needed
        const entry = this.list[path]?.[line];
        console.log(entry);
        return entry ? entry : undefined;
    }

    public getTotalCount(): number {
        let count = 0;
        for (const path in this.list) {
            count += Object.keys(this.list[path]).length;
        }
        return count;
    }

}

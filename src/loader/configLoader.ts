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
    alt: string;
    id: string;
    gui: {
        description: string;
        relation: {
            a: string;
            b: string;
            comment: string;
        }[]
    };
}

export type note_ls = {
    [filepath: string]: {
        [line: number]: MarkerData;
    };
}


import * as vscode from 'vscode';
import { Executor } from '../executor';

export class configloader {


    private onUpdateCallback?: () => void;

    public setOnUpdate(cb: () => void) { this.onUpdateCallback = cb; }

    private path: string;

    public list: note_ls = {};

    // register file system watcher
    public watcher: vscode.FileSystemWatcher;

    // Plan D: debounce timer - only reload after 300ms of silence
    private debounceTimer: NodeJS.Timeout | null = null;

    public reload = () => {
        if (this.debounceTimer) { clearTimeout(this.debounceTimer); }
        this.debounceTimer = setTimeout(() => {
            this.loadData();
        }, 300);
    };

    constructor(path: string) {

        this.watcher = vscode.workspace.createFileSystemWatcher(

            // scope to .marker
            new vscode.RelativePattern(path, '**/*.jsonl')

        );

        this.path = path;
        // initialize
        this.loadData();
        console.log(this.path);

        this.watcher.onDidChange(this.reload);
        this.watcher.onDidCreate(this.reload);
        this.watcher.onDidDelete(this.reload);
    }

    public async loadData() {

        try {
            console.log('reading files...');

            const newPath = join(this.path, '.marker.jsonl');

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

            const generateId = () => {
                const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                let result = '';
                for (let i = 0; i < 6; i++) {
                    result += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return result;
            };

            for (const item of i) {

                const refinePath = Executor.normalizePath(item.path);

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
                    color: item.color ? item.color : '#00000000',
                    alt: item.alt ? item.alt : '',
                    id: item.id ? item.id : generateId(),
                    gui: item.gui ? item.gui : {
                        description: '',
                        relation: []
                    }
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
            console.error('Marker MVP try-catch caught an error during loadData:', error);
        }

    }

    // get content from jsonl
    public get(path: string, line: { start: number, end?: number }) {

        path = Executor.normalizePath(path);

        // Find if line exists in the file's marker list
        if (!this.list[path]) {
            console.log('no  path found');
            return undefined;
        }

        // Check if any line in the range has an existing marker
        const endLine = line.end ?? line.start;
        for (let l = line.start; l <= endLine; l++) {
            const entry = this.list[path][l];
            if (entry) {
                console.log('Found overlapping entry at line', l, ':', entry);
                return entry;
            }
        }

        console.log('no entry found in range');
        return undefined;
    }

    public getTotalCount(): number {
        let count = 0;
        for (const path in this.list) {
            count += Object.keys(this.list[path]).length;
        }
        return count;
    }

}

import { join } from 'path';
import { workspacePath } from '../extension';
import { readdir, readFile } from 'fs/promises';
import { pathToFileURL } from 'url';

// Plan B: two-level nested map - { filepath: { line: { content, color } } }
// Lookup is O(1) instead of O(n) array.find()
interface note_ls {
    [filepath: string]: {
        [line: number]: {
            content: string;
            color: string;
        };
    };
}


import * as vscode from 'vscode';

export class configloader {

    
    private onUpdateCallback?: () => void;
    public setOnUpdate(cb: () => void) { this.onUpdateCallback = cb; }
    
    private path = workspacePath;
    
    public list: note_ls = {};

    // register file system watcher
    public watcher = vscode.workspace.createFileSystemWatcher(

        // scope to .marker
        new vscode.RelativePattern(this.path, '**/*.jsonl')
    );
    // Plan D: debounce timer - only reload after 300ms of silence
    private debounceTimer: NodeJS.Timeout | null = null;

    constructor() {
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

                const refinePath = item.path;

                // Plan B: store as nested key map instead of array
                if (!this.list[refinePath]) {
                    this.list[refinePath] = {};
                }

                this.list[refinePath][item.line] = {
                    content: item.content,
                    color: item.color ? item.color : '#ffffff90'
                };
            }

            console.dir(this.list, { depth: null, colors: true });
            this.onUpdateCallback?.();
        } catch (error) {
            console.error('Marker MVP try-catch caught an error during loadConfig:', error);
        }

    }

    private urlMap = new Map<string, string>();

    // get content from jsonl
    public get(path: string, line: number) {

        if (this.urlMap.has(path)) {
            path = this.urlMap.get(path)!;
        } else {
            this.urlMap.set(path, pathToFileURL(path).href);
            path = this.urlMap.get(path)!;
        }

        console.log(path);

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
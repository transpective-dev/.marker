import { join } from 'path';
import { workspacePath } from '../extension'
import { readdir, readFile } from 'fs/promises';
import { pathToFileURL } from 'url';

interface note_ls {
    [key: string]: [
        {
            line: number;
            content: string;
        }
    ]
}

const list: note_ls = {};

import * as vscode from 'vscode';

export class configloader {

    private path = workspacePath;

    // register file system watcher
    public watcher = vscode.workspace.createFileSystemWatcher(

        // scope to .marker
        new vscode.RelativePattern(this.path, '**/*.json')
    );
    constructor() {
        // initialize
        this.loadConfig();
        console.log(this.path);

        // Add FileSystemWatcher for hot-reloading

        this.watcher.onDidChange(() => this.loadConfig());
        this.watcher.onDidCreate(() => this.loadConfig());
        this.watcher.onDidDelete(() => this.loadConfig());
    }

    public async loadConfig() {

        try {
            console.log('reading files...');

            const ls: string[] = await readdir(this.path);

            const newPath = join(this.path, ls[0]);

            console.log(newPath);

            const i = await readFile(newPath).then((i) => {
                return JSON.parse(i.toString('utf-8'));
            });

            // clear list before repopulating in case of reload
            for (let key in list) {
                delete list[key];
            }

            for (const Object of i) {

                const refinePath = pathToFileURL(Object.path).href;

                // handle error if list[Object.path] is undefined
                list[refinePath] = (list[refinePath] || []);

                list[refinePath].push({
                    line: Object.line,
                    content: Object.content
                });
            }

            console.dir(list, { depth: null, colors: true });
        } catch (error) {
            console.error('Marker MVP try-catch caught an error during loadConfig:', error);
        }

    }

    public get(path: string, line: number) {

        const refinePath = pathToFileURL(path).href;
        console.log(path, line);
        console.log(refinePath);

        // Find if line exists in the file's marker list
        if (!list[refinePath]) {
            console.log('no  path found');
            return undefined;
        }

        const marker = list[refinePath].find(m => m.line === line);
        return marker ? marker.content : undefined;
    }

}
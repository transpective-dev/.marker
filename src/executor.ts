import { appendFile, readFile, writeFile } from "fs/promises";
import { pathToFileURL } from "url";

interface ctt {
    line: number,
    path: string,
    color: string,
    content: string,
}

export class executor {

    private toMarker: string = '';

    constructor(path: string) {
        this.toMarker = path;
    }

    public async writeIntoMarker(path: string, ctt: ctt) {

        const record = {
            line: ctt.line,
            path: pathToFileURL(ctt.path).href,
            color: ctt.color,
            content: ctt.content
        };

        // NDJSON: one JSON object per line, appended directly
        // JSON.stringify auto-escapes any \n inside content strings - safe for markdown
        await appendFile(this.toMarker, JSON.stringify(record) + '\n');
    }

    public async recover(path: string, ctt: ctt) {

        // 1. Read every line in the NDJSON file
        const raw = await readFile(this.toMarker, 'utf-8');

        // 2. Keep only lines that do NOT match the same path+line (drop the old entry)
        const filtered = raw
            .split('\n')
            .filter(line => {
                if (!line.trim()) { return false; } // drop empty lines
                try {
                    const obj = JSON.parse(line);
                    return !(obj.path === pathToFileURL(ctt.path).href && obj.line === ctt.line);
                } catch {
                    return false; // drop corrupted lines
                }
            })
            .join('\n');

        // 3. Build the updated record
        const newRecord = {
            line: ctt.line,
            path: pathToFileURL(ctt.path).href,
            color: ctt.color,
            content: ctt.content
        };

        // 4. Write filtered content + new record back as one atomic write
        await writeFile(this.toMarker, filtered + '\n' + JSON.stringify(newRecord) + '\n');
    }

}

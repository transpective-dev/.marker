import * as vscode from 'vscode';
import { Executor } from '../executor';
import type { configloader } from '../loader/configLoader';

export class MarkerHoverProvider implements vscode.HoverProvider {

    constructor(private config: configloader) { }

    provideHover(

        // tell you where file you at
        document: vscode.TextDocument,

        // tell you where line you at
        position: vscode.Position,

        // token
        token: vscode.CancellationToken

    ): vscode.ProviderResult<vscode.Hover> {

        const markerText = this.config.get(Executor.normalizePath(document.uri.fsPath), { start: position.line + 1 });

        console.log(markerText);

        if (markerText) {

            const md = new vscode.MarkdownString();
            // Important: set baseUri so relative paths (./img.png) work inside Hover
            md.baseUri = document.uri;
            md.isTrusted = true;
            md.supportHtml = true; // Enable HTML tags like <b>, <i>, <br>, etc.
            md.appendMarkdown(`${Executor.formatEnchance(markerText.content)}`);

            return new vscode.Hover(md);

        }

        return undefined;
    }
}

import * as vscode from 'vscode';

export function findEnclosingBlock(doc: vscode.TextDocument, cursorLine: number): { start: number, end: number } | null {

    // 1. Find the start of the block upwards
    let startLine = cursorLine;
    let openChar = '';
    let closeChar = '';

    const pairs: Record<string, string> = {
        '{': '}',
        '[': ']',
        '(': ')'
    };

    while (startLine >= 0) {
        const text = doc.lineAt(startLine).text;

        // Scan from the end of the line to the beginning to find the innermost opening bracket
        for (let j = text.length - 1; j >= 0; j--) {
            const char = text[j];
            if (char === '{' || char === '[' || char === '(') {
                openChar = char;
                closeChar = pairs[char];
                break;
            }
        }

        if (openChar) {
            break;
        }
        startLine--;
    }

    if (startLine < 0 || !openChar) {
        return null;
    }

    // 2. Find the corresponding endpoint downwards
    let endLine = startLine;
    let stack = 0;
    let foundEnd = false;

    for (let i = startLine; i < doc.lineCount; i++) {
        const text = doc.lineAt(i).text;

        // Count the specified brackets in this line (ignore other characters)
        for (const char of text) {
            if (char === openChar) { stack++; }
            if (char === closeChar) { stack--; }
        }

        // If stack hits zero (and we actually entered a block), we found the closure point
        if (stack === 0) {
            endLine = i;
            foundEnd = true;
            break;
        }
    }

    if (!foundEnd) {
        return null;
    }

    // Return 1-based line numbers for VS Code compatibility
    return { start: startLine + 1, end: endLine + 1 };
}

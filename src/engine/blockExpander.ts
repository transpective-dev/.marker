import * as vscode from 'vscode';

export function findEnclosingBlock(doc: vscode.TextDocument, cursorLine: number): { start: number, end: number } | null {

    // 1. 向上寻找 Block 的起点
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

        // 从行尾向行首扫描，找到最贴近内部的开口括号
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

    // 2. 向下寻找对应的终点
    let endLine = startLine;
    let stack = 0;
    let foundEnd = false;

    for (let i = startLine; i < doc.lineCount; i++) {
        const text = doc.lineAt(i).text;

        // 统计这一行有多少个指定的左右括号 (无视其他符号)
        for (const char of text) {
            if (char === openChar) { stack++; }
            if (char === closeChar) { stack--; }
        }

        // 如果栈归零（且真正进入过栈计算），说明找到了闭合点
        if (stack === 0) {
            endLine = i;
            foundEnd = true;
            break;
        }
    }

    if (!foundEnd) {
        return null;
    }

    // 返回 VS Code 可读的 1-based 行号
    return { start: startLine + 1, end: endLine + 1 };
}

import * as vscode from 'vscode';
import { Executor } from '../executor';
import type { configloader } from '../loader/configLoader';
import type { color } from '../toolbox/config';

let isHighlightEnabled = false;

export const toggleHighlight = () => {
    isHighlightEnabled = !isHighlightEnabled;
};

export const getIsHighlightEnabled = () => isHighlightEnabled;

// Generates a 16x16 solid color SVG block from a hex string.
// '#' must be URI-encoded as '%23' or it breaks the data URI.
export const toSvgIcon = (hex: string): vscode.Uri => {
    const encoded = hex.replace('#', '%23');
    const svg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="${encoded}" rx="1.5"/></svg>`;
    return vscode.Uri.parse(svg);
};

// Map the palette into the shape QuickPick expects - done once, not inside the command.
export const colorPalette = (palette: color[]) => {
    if (!palette) { return; };
    return palette.map(item => ({
        label: item.desc,
        description: item.hex,
        iconPath: toSvgIcon(item.hex),
    }));
};

// key is hex, value is decoration type
const decorationTypes = new Map<string, vscode.TextEditorDecorationType>();

// Initialize decoration types
export const decoration = (palette: color[]) => {
    if (!palette) { return; };

    decorationTypes.forEach((value) => value.dispose());
    decorationTypes.clear();

    for (const item of palette) {
        const hex = item.hex;
        decorationTypes.set(hex, vscode.window.createTextEditorDecorationType({
            isWholeLine: true,
            backgroundColor: hex + '15',
            borderStyle: 'solid',
            borderWidth: '0 0 0 3px',
            borderColor: hex,
            before: {
                contentText: ' ', // add placeholder
                margin: '0 0 0 12px' // push text 8px away
            }
        }));
    }
};

export function updateDecos(payload: { configLoader: configloader }) {

    console.log('highlight: ', isHighlightEnabled);

    const currentEditor = vscode.window.activeTextEditor;

    if (!currentEditor) { return; } // no editor open, nothing to do

    if (!isHighlightEnabled) {
        decorationTypes.forEach((value) => {
            currentEditor!.setDecorations(value, []);
        });
        console.log('highlighting disabled');
        return;
    }

    // Ensure absolute path stability exactly like configLoader
    const currentPath = Executor.normalizePath(currentEditor.document.uri.toString());

    console.log(currentPath);

    const getList = payload.configLoader.list[currentPath];

    if (!getList) return;

    const colorGroups = new Map<string, vscode.Range[]>();
    const seenIds = new Set<string>();

    for (const lineStr in getList) {
        const slot = getList[lineStr];
        const slotArr = Array.isArray(slot) ? slot : [slot];

        // render ALL markers in the slot (each with their own color)
        for (const marker of slotArr) {
            // Deduplicate by id to avoid double-painting same marker across multiple line keys
            if (seenIds.has(marker.id)) { continue; }
            seenIds.add(marker.id);

            const color = marker.color;

            if (!colorGroups.has(color)) {
                colorGroups.set(color, []);
            }

            // VS Code Range is 0-indexed.
            colorGroups.get(color)!.push(new vscode.Range(
                marker.range.start - 1, 0,
                marker.range.end - 1, 0
            ));
        }
    }

    // map order: [value, key, map]
    // style: the form that we defined.
    // color: the hex.
    decorationTypes.forEach((style, color) => {
        const ranges = colorGroups.get(color) || [];
        currentEditor!.setDecorations(style, ranges);
    });

}

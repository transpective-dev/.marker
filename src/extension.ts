import * as vscode from 'vscode';


class MarkerHoverProvider implements vscode.HoverProvider {

	constructor(private config: configloader) { }

	provideHover(

		// tell you where file you at
		document: vscode.TextDocument,

		// tell you where line you at
		position: vscode.Position,

		// token
		token: vscode.CancellationToken

	): vscode.ProviderResult<vscode.Hover> {

		const markerText = this.config.get(document.uri.fsPath, position.line + 1);
		console.log(markerText);

		if (markerText) {

			const md = new vscode.MarkdownString();
			md.isTrusted = true;

			// we have to encode to url because command:marker.editComment?${stage} only accept url
			const stage = encodeURIComponent(JSON.stringify(markerText));

			md.appendMarkdown(`${markerText.content}\n\n`);
			md.appendMarkdown(`--- \n\n`);
			md.appendMarkdown(`[✏️ 编辑](command:marker.editComment?${stage})`);

			return new vscode.Hover(md);

		}

		return undefined;
	}
}

import path, { join } from 'path';
import { mkdir, writeFile, readdir } from 'fs/promises';
import { configloader } from './loader/configLoader';
import { executor } from './executor';

const initializeFile = async () => {

	const content = {
		path: toMarkerPath,
		line: 1,
		content: 'welcome to .marker!'
	};

	const ls = await readdir(workspacePath);

	if (ls) {
		return;
	};

	mkdir(workspacePath, { recursive: true });
	writeFile(toMarkerPath, JSON.stringify(content, null, 2));

};

// point to the root of the workspace
export const workspacePath = join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath!, '.marker-storage');
export const toMarkerPath = join(workspacePath, '.marker.jsonl');

const exct = new executor(toMarkerPath);

// --- Color Palette ---

// Register your colors here. Only touch this array to add/remove colors.
const palette: string[] = [
	'#f53c42',
	'#ff950a',
	'#EDA536',
	'#A6A43B',
	'#88AA66',
	'#88ABAD',
	'#4CB3D2',
	'#69C6FF',
];

// Generates a 16x16 solid color SVG block from a hex string.
// '#' must be URI-encoded as '%23' or it breaks the data URI.
const toSvgIcon = (hex: string): vscode.Uri => {
	const encoded = hex.replace('#', '%23');
	const svg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="${encoded}" rx="1.5"/></svg>`;
	return vscode.Uri.parse(svg);
};

// Map the palette into the shape QuickPick expects - done once, not inside the command.
const colorPalette = palette.map(hex => ({
	label: hex,
	description: '',
	iconPath: toSvgIcon(hex),
}));

export function activate(context: vscode.ExtensionContext) {

	initializeFile();

	console.log('Marker Loaded!');

	const configLoader = new configloader();

	const provider = new MarkerHoverProvider(configLoader);
	const hoverRegistration = vscode.languages.registerHoverProvider({ pattern: '**' }, provider);

	const addComment = vscode.commands.registerCommand('marker.addComment', async () => {
		const input = await vscode.window.showInputBox({
			prompt: 'Add Comment\t',
		});

		if (!input) { return; } // 如果取消了输入内容，就退出

		const editor = vscode.window.activeTextEditor;
		if (!editor) { return; }

		const currentPath = editor.document.uri.fsPath; // get path
		const currentLine = editor.selection.active.line; // get index

		// color selector - uses the pre-built palette above
		const colorOption = await vscode.window.showQuickPick(colorPalette, { placeHolder: 'Select Color' });

		if (!colorOption) { return; }

		exct.writeIntoMarker(toMarkerPath, {
			line: currentLine + 1,
			path: currentPath,
			color: colorOption.label!,
			content: input
		});
	});

	const editComment = vscode.commands.registerCommand('marker.editComment', async (args: any) => {

		const input = await vscode.window.showInputBox({
			value: args.content,
			prompt: '修改您的注释'
		});
		if (input === undefined) {return;}; 

		await exct.recover(toMarkerPath, {
			line: args.line,
			path: args.path, 
			color: args.color,
			content: input
		});
	});

	forDebug(context, configLoader, 'marker.debug');

	const register = [
		hoverRegistration,
		configLoader.watcher,
		addComment,
		editComment
	];

	context.subscriptions.push(...register);

}

export function deactivate() {
}

const forDebug = (ctx: any, cl: any, cmd: string) => {

	const debug = vscode.commands.registerCommand('marker.debug', () => {
		cl.loadConfig();
	});

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);

	statusBarItem.text = '.Marker Debug';
	statusBarItem.command = 'marker.debug';
	statusBarItem.show();

	ctx.subscriptions.push(debug, statusBarItem);

}


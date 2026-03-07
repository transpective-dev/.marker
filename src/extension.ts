import * as vscode from 'vscode';

let configLoader: configloader;

let currentEditor: typeof vscode.window.activeTextEditor | null = null;

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

		const markerText = this.config.get(executor.normalizePath(document.uri.fsPath), position.line + 1);

		console.log(markerText);

		if (markerText) {

			const md = new vscode.MarkdownString();

			md.isTrusted = true;

			md.appendMarkdown(`${executor.formatEnchance(markerText.content)}`);

			return new vscode.Hover(md);

		}

		return undefined;
	}
}

import { join } from 'path';
import { mkdir, writeFile, readdir } from 'fs/promises';
import { configloader } from './loader/configLoader';
import { executor, lineTracker } from './executor';

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
const workspacePath = join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath!, '.marker-storage');
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

// key is hex, value is decoration type
const decorationTypes = new Map<string, vscode.TextEditorDecorationType>();

// Initialize decoration types
const decoration = () => {
	for (const hex of palette) {
		decorationTypes.set(hex, vscode.window.createTextEditorDecorationType({
			isWholeLine: true,
			backgroundColor: hex + '35',
			borderStyle: 'solid',
			borderWidth: '0 0 0 3px',
			borderColor: hex,
			before: {
				contentText: ' ', // add placeholder
				margin: '0 0 0 12px' // push text 8px away
			}
		}));
	}
}

function updateDecos() {

	console.log('highlight: ', isHighlightEnabled);

	currentEditor = vscode.window.activeTextEditor;

	if (!currentEditor) { return; } // no editor open, nothing to do

	if (!isHighlightEnabled) {
		decorationTypes.forEach((value) => {
			currentEditor!.setDecorations(value, []);
		});
		console.log('highlighting disabled');
		return;
	}

	// Ensure absolute path stability exactly like configLoader
	const currentPath = executor.normalizePath(currentEditor!.document.uri.toString());

	console.log(currentPath);

	const getList = configLoader.list[currentPath];

	const colorGroups = new Map<string, vscode.Range[]>();

	for (const lineStr in getList) {
		const line = parseInt(lineStr) - 1; // index - 1
		const color = getList[lineStr].color;
		if (!colorGroups.has(color)) {
			colorGroups.set(color, []);
		};

		// create a range object, representing the visual range
		// range(begin, end)
		colorGroups.get(color)!.push(new vscode.Range(line, 0, line, 0));
	}
	decorationTypes.forEach((style, color) => {
		const ranges = colorGroups.get(color) || [];
		currentEditor!.setDecorations(style, ranges);
	});

}

export let isHighlightEnabled = false;

// lens emitter
const lensEmitter = new vscode.EventEmitter<void>();

const lenses: vscode.CodeLensProvider = {

	// turn on lens when received emit
	onDidChangeCodeLenses: lensEmitter.event,

	provideCodeLenses(doc) {

		// lens list
		const lenses: vscode.CodeLens[] = [];

		// gate: only show lenses when highlight is enabled
		if (!isHighlightEnabled) { return []; }

		// get content from loader
		const fileMarkers = configLoader.list[executor.normalizePath(doc.uri.fsPath)];

		// register lenses
		for (const lineStr in fileMarkers) {
			const line = parseInt(lineStr) - 1;
			const range = new vscode.Range(line, 0, line, 0);
			const lens = new vscode.CodeLens(range);

			lens.command = {
				title: `[ .Marker ]: ${fileMarkers[lineStr].content}`,
				command: "marker.addComment", // let the user click to edit
				arguments: []
			};
			lenses.push(lens);
		}

		return lenses;
	}
};

export function activate(context: vscode.ExtensionContext) {

	configLoader = new configloader(workspacePath);

	// Sync: when marker data changes, re-draw highlights
	configLoader.setOnUpdate(() => { updateDecos(); });

	// Sync: when user switches file tab, re-draw for new file
	vscode.window.onDidChangeActiveTextEditor(() => { updateDecos(); }, null, context.subscriptions);

	// Sync: when user edits code, shift marker line numbers to follow
	vscode.workspace.onDidChangeTextDocument((event) => {
		const filePath = executor.normalizePath(event.document.uri.fsPath);
		lineTracker.shift(configLoader.list, filePath, event.contentChanges);
		updateDecos();
		lensEmitter.fire();
	}, null, context.subscriptions);

	decoration();

	initializeFile();

	console.log('Marker Loaded!');

	const provider = new MarkerHoverProvider(configLoader);

	const hoverRegistration = vscode.languages.registerHoverProvider({ pattern: '**' }, provider);
	const lensRegistration = vscode.languages.registerCodeLensProvider({ pattern: '**' }, lenses);

	const addComment = vscode.commands.registerCommand('marker.addComment', async () => {

		const editor = vscode.window.activeTextEditor;

		if (!editor) { return; }

		// Ensure absolute path stability exactly like configLoader
		const currentPath = executor.normalizePath(editor.document.uri.toString());
		const currentLine = editor.selection.active.line + 1;

		// Check if there is already a comment on the current line (for 'Edit' option)
		const existing = configLoader.get(currentPath, currentLine);

		const qp = vscode.window.createQuickPick();

		qp.placeholder = 'Select Option';

		// Build the static option list
		const items = [existing ? {
			label: 'Edit Comment',
			description: 'edit',
		} : {
			label: 'Add Comment',
			description: 'add',
		}];

		qp.items = items;

		qp.onDidAccept(async () => {
			const selected = qp.selectedItems[0];
			qp.hide();

			if (!selected) { return; }

			if (selected.description === 'edit' && existing) {
				// --- EDIT MODE: prefill and call recover ---
				const updated = await vscode.window.showInputBox({
					value: existing.content,
					prompt: 'Edit comment'
				});
				if (updated === undefined) { return; }
				await exct.recover(toMarkerPath, {
					line: currentLine,
					path: currentPath,
					color: existing.color,
					content: updated
				});

			} else if (selected.description === 'add' && !existing) {
				// --- NEW COMMENT MODE ---
				const content = await vscode.window.showInputBox({
					prompt: 'Add comment'
				});

				const colorOption = await vscode.window.showQuickPick(colorPalette, { placeHolder: 'Select Color' });
				if (!colorOption) { return; }
				if (content === undefined) { return; }
				await exct.writeIntoMarker(toMarkerPath, {
					line: currentLine,
					path: currentPath,
					color: colorOption.label!,
					content: content
				});
			}
		});

		qp.show();
		lensEmitter.fire();
	});


	const highLight = vscode.commands.registerCommand('marker.highLight', () => {
		isHighlightEnabled = !isHighlightEnabled;
		updateDecos();
		lensEmitter.fire();
	});

	forDebug(context, configLoader, 'marker.debug');

	const register = [
		hoverRegistration,
		lensRegistration,
		configLoader.watcher,
		addComment,
		highLight
	];

	context.subscriptions.push(...register);

	// Initial render after everything is set up
	updateDecos();

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

};


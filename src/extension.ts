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

		const markerText = this.config.get(executor.normalizePath(document.uri.fsPath), { start: position.line + 1 });

		console.log(markerText);

		if (markerText) {

			const md = new vscode.MarkdownString();
			// Important: set baseUri so relative paths (./img.png) work inside Hover
			md.baseUri = document.uri;
			md.isTrusted = true;
			md.supportHtml = true; // Enable HTML tags like <b>, <i>, <br>, etc.
			md.appendMarkdown(`${executor.formatEnchance(markerText.content)}`);

			return new vscode.Hover(md);

		}

		return undefined;
	}
}

import { join } from 'path';
import { mkdir, writeFile, readdir, readFile } from 'fs/promises';
import { configloader } from './loader/configLoader';
import { executor, lineTracker } from './executor';
import { findEnclosingBlock } from './engine/blockExpander';

let workspacePath: string;
export let toMarkerPath: string;
export let exct: executor;

const initializeFile = async (storagePath: string, jsonlPath: string) => {
	try {
		// Check if storage directory exists
		try {
			await readdir(storagePath);
			// If it exists, check if the file exists
			try {
				await readFile(jsonlPath);
				return; // File exists, we are good
			} catch {
				// File doesn't exist, create it below
			}
		} catch {
			// Directory doesn't exist, create it
			await mkdir(storagePath, { recursive: true });
		}

		const content = {
			line: 1,
			path: executor.normalizePath(jsonlPath),
			color: 'green',
			content: 'welcome to .marker!'
		};

		await writeFile(jsonlPath, JSON.stringify(content) + '\n');
	} catch (e) {
		console.error('Failed to initialize .marker storage:', e);
	}
};

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
};

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
	const seenRanges = new Set<string>();

	for (const lineStr in getList) {
		const marker = getList[lineStr];
		const color = marker.color;

		// Deduplicate: each unique multi-line block should only be pushed ONCE
		// Otherwise, VS Code will layer them, making the background look too thick.
		const uniqueKey = `${marker.range.start}-${marker.range.end}-${color}-${marker.content}`;
		if (seenRanges.has(uniqueKey)) { continue; }
		seenRanges.add(uniqueKey);

		if (!colorGroups.has(color)) {
			colorGroups.set(color, []);
		};

		// VS Code Range is 0-indexed.
		// Since isWholeLine: true is set in the decoration type, 
		// any character index (0 to 0) will cover the entire line.
		colorGroups.get(color)!.push(new vscode.Range(
			marker.range.start - 1, 0,
			marker.range.end - 1, 0
		));
	}

	// map order: [value, key, map]
	// style: the form that we defined.
	// color: the hex.
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
		const seen = new Set<string>();
		for (const lineStr in fileMarkers) {

			// get data from filemarker
			const markerInfo = fileMarkers[lineStr];

			// get place for comment by reducing one from start
			const startLine = markerInfo.range.start - 1;

			// If we've already rendered a lens for this marker, skip
			// to avoid show comment on every line in range.
			// conbine each line in range to one .
			const uniqueKey = `${startLine}-${markerInfo.range.end}-${markerInfo.content}`;

			// if already shown comment, then skip.
			if (seen.has(uniqueKey)) { continue; }

			// initialize uniqueId
			seen.add(uniqueKey);

			// where to show comment
			const range = new vscode.Range(startLine, 0, startLine, 0);

			// set position for lens
			const lens = new vscode.CodeLens(range);

			lens.command = {
				title: `[ .Marker ]: ${markerInfo.content}`,
				command: "marker.addComment", // let the user click to edit
				arguments: [],
				tooltip: executor.formatEnchance(markerInfo.content)
			};
			lenses.push(lens);
		}

		return lenses;
	}
};

export function activate(context: vscode.ExtensionContext) {

	// 1. Safe Initialization of Workspace Paths
	const folders = vscode.workspace.workspaceFolders;
	if (!folders || folders.length === 0) {
		console.log('.Marker: No workspace folders found. Extension will stay dormant.');
		return;
	}

	const rootPath = folders[0].uri.fsPath;
	workspacePath = join(rootPath, '.marker-storage');
	toMarkerPath = join(workspacePath, '.marker.jsonl');

	// 2. Initialize Core Logic
	configLoader = new configloader(workspacePath);
	exct = new executor(toMarkerPath);

	// Sync: when marker data changes, re-draw highlights
	configLoader.setOnUpdate(() => { updateDecos(); });

	// Sync: when user switches file tab, re-draw for new file
	vscode.window.onDidChangeActiveTextEditor(() => { updateDecos(); }, null, context.subscriptions);

	vscode.workspace.onDidCloseTextDocument(() => { exct.refresh(configLoader.list); }, null, context.subscriptions);

	// Sync: when user edits code, shift marker line numbers to follow
	vscode.workspace.onDidChangeTextDocument((event) => {
		const filePath = executor.normalizePath(event.document.uri.fsPath);
		console.log('onDidChangeTextDocument: ', filePath);
		lineTracker.shift(configLoader.list, filePath, event.contentChanges, event.document);
		updateDecos();
		lensEmitter.fire();
	}, null, context.subscriptions);

	decoration();

	initializeFile(workspacePath, toMarkerPath);

	console.log('Marker Loaded!');

	vscode.window.showInformationMessage('welcome to .marker!');

	const provider = new MarkerHoverProvider(configLoader);

	const hoverRegistration = vscode.languages.registerHoverProvider({ pattern: '**' }, provider);
	const lensRegistration = vscode.languages.registerCodeLensProvider({ pattern: '**' }, lenses);

	const addComment = vscode.commands.registerCommand('marker.addComment', async () => {

		const editor = vscode.window.activeTextEditor;

		if (!editor) { return; }

		// Ensure absolute path stability exactly like configLoader
		const currentPath = executor.normalizePath(editor.document.uri.toString());

		const currentLine = {
			start: editor.selection.start.line + 1,
			end: editor.selection.end.line + 1
		};

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

		// push recover

		const lsItems = [
			{
				label: 'Refresh Comment Change',
				description: 'recover',
			},
			{
				label: 'Delete Comment',
				description: 'delete',
			}
		];

		items.push(...lsItems);

		qp.items = items;


		qp.onDidAccept(async () => {
			const selected = qp.selectedItems[0];
			qp.hide();

			if (!selected) { return; }

			if (selected.description === 'edit' && existing) {
				// --- EDIT MODE: prefill and call recover ---

				const options = await vscode.window.showQuickPick([
					{
						label: 'Edit Content',
						description: 'e-ctt',
					},
					{
						label: 'Edit Color',
						description: 'e-color',
					}
				], { placeHolder: 'Choose what to edit' });

				if (!options) { return; }

				if (options.description === 'e-ctt') {

					const updated = await vscode.window.showInputBox({
						value: existing.content,
						prompt: 'Edit comment'
					});

					if (updated === undefined) { return; }

					await exct.recover('n', toMarkerPath, {
						range: existing.range,
						path: currentPath,
						color: existing.color,
						content: updated
					});

				}

				if (options.description === 'e-color') {

					const updated = await vscode.window.showQuickPick(colorPalette, { placeHolder: 'Select Color' });

					if (!updated) { return; }

					await exct.recover('n', toMarkerPath, {
						range: existing.range,
						path: currentPath,
						color: updated.label!,
						content: existing.content
					});

				}


			} else if (selected.description === 'add' && !existing) {
				// --- NEW COMMENT MODE ---
				const content = await vscode.window.showInputBox({
					prompt: 'Add comment'
				});

				const colorOption = await vscode.window.showQuickPick(colorPalette, { placeHolder: 'Select Color' });
				if (!colorOption) { return; }
				if (content === undefined) { return; }
				await exct.writeIntoMarker(toMarkerPath, {
					range: { start: currentLine.start, end: currentLine.end },
					path: currentPath,
					color: colorOption.label!,
					content: content
				});
			} else if (selected.description === 'recover') {
				await exct.refresh(configLoader.list);
				vscode.window.showInformationMessage('Refreshed');
			} else if (selected.description === 'delete') {
				const markerToDelete = configLoader.list[currentPath][currentLine.start];

				// use for to delete multi-line highlight
				if (markerToDelete) {
					for (let l = markerToDelete.range.start; l <= markerToDelete.range.end; l++) {
						delete configLoader.list[currentPath][l];
					}
					await exct.refresh(configLoader.list);
				}
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

	// --- marker.expandRange ---
	// External engine for {} [] (): Finds the nearest open bracket upward and uses a stack to find the matching close bracket downward.
	const expandRange = vscode.commands.registerCommand('marker.expandRange', async () => {

		const editor = vscode.window.activeTextEditor;
		if (!editor) { return; }

		const doc = editor.document;
		const currentPath = executor.normalizePath(doc.uri.toString());
		const cursorLine = editor.selection.active.line; // 0-based

		// 1. Check if the current line has a Marker
		const existing = configLoader.list[currentPath]?.[cursorLine + 1];
		if (!existing) {
			vscode.window.showWarningMessage('.Marker: No marker found at cursor line to expand.');
			return;
		}

		// 2. Delegate calculation logic to the minimalist engine
		const block = findEnclosingBlock(doc, cursorLine);

		if (!block) {
			vscode.window.showWarningMessage('.Marker: Could not find enclosing {}, [], or () block.');
			return;
		}

		const newStart = block.start;
		const newEnd = block.end;

		// 3. Check if the range has actually expanded
		if (existing.range.start === newStart && existing.range.end === newEnd) {
			return; // Already expanded to limit, no redraw needed
		}

		// 4. Clean up old highlight memory
		for (let l = existing.range.start; l <= existing.range.end; l++) {
			delete configLoader.list[currentPath][l];
		}

		// 5. Write the new expanded range
		await exct.recover('n', toMarkerPath, {
			range: { start: newStart, end: newEnd },
			path: currentPath,
			color: existing.color,
			content: existing.content
		});

		vscode.window.showInformationMessage(`.Marker: Expanded to lines ${newStart} - ${newEnd}`);
	});


	forDebug(context, configLoader, 'marker.debug');

	const register = [
		hoverRegistration,
		lensRegistration,
		configLoader.watcher,
		addComment,
		highLight,
		expandRange
	];

	context.subscriptions.push(...register);

	// Initial render after everything is set up
	updateDecos();

}

export function deactivate() {
	return exct.refresh(configLoader.list);
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


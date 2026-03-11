import * as vscode from 'vscode';

import { MarkerHoverProvider } from './modules/hover';
import { initializeFile } from './modules/init';
import { toSvgIcon, colorPalette, decoration, updateDecos, toggleHighlight, getIsHighlightEnabled } from './modules/highlight';
import { getLensesProvider } from './modules/lens';

import { join } from 'path';
import { configloader } from './loader/configLoader';
import { Executor, lineTracker } from './executor';
import { findEnclosingBlock } from './engine/blockExpander';
import { Config } from './toolbox/config';

let configLoader: configloader;

let workspacePath: string;
export let toMarkerPath: string;
export let toUserConfig: string;
export let exct: Executor;

const updateHL = (i: string) => {
	switch (i) {
		case 'text':
			lensEmitter.fire();
			break;
		case 'HL':
			updateDecos({ configLoader });
			break;
		case 'text/HL':
			updateDecos({ configLoader });
			lensEmitter.fire();
			break;
	}
}

// lens emitter
export const lensEmitter = new vscode.EventEmitter<void>();

import { QuickPick } from './qp';

const quick_p = new QuickPick();

export async function activate(context: vscode.ExtensionContext) {

	// 1. Safe Initialization of Workspace Paths
	const folders = vscode.workspace.workspaceFolders;
	if (!folders || folders.length === 0) {
		console.log('.Marker: No workspace folders found. Extension will stay dormant.');
		return;
	}

	const rootPath = folders[0].uri.fsPath;
	workspacePath = join(rootPath, '.marker-storage');
	toMarkerPath = join(workspacePath, '.marker.jsonl');
	toUserConfig = join(workspacePath, 'config.json');

	// 2. Initialize Core Logic
	configLoader = new configloader(workspacePath);
	exct = new Executor(toMarkerPath);
	const userConfig = new Config(toUserConfig);

	// Sync: when marker data changes, re-draw highlights
	configLoader.setOnUpdate(() => { updateHL(userConfig.high_light_status); });

	// Sync: when user switches file tab, re-draw for new file
	vscode.window.onDidChangeActiveTextEditor(() => { updateHL(userConfig.high_light_status); }, null, context.subscriptions);

	vscode.workspace.onDidCloseTextDocument(() => { exct.refresh(configLoader.list); }, null, context.subscriptions);

	// Sync: when user edits code, shift marker line numbers to follow
	vscode.workspace.onDidChangeTextDocument((event) => {
		const filePath = Executor.normalizePath(event.document.uri.fsPath);
		console.log('onDidChangeTextDocument: ', filePath);
		lineTracker.shift(configLoader.list, filePath, event.contentChanges, event.document);

		updateHL(userConfig.high_light_status);

	}, null, context.subscriptions);

	await initializeFile(workspacePath);

	decoration(userConfig.color()!);

	const color_p = () => colorPalette(userConfig.color()!);

	console.log('Marker Loaded!');

	vscode.window.showInformationMessage('welcome to .marker!');

	const provider = new MarkerHoverProvider(configLoader);

	const hoverRegistration = vscode.languages.registerHoverProvider({ pattern: '**' }, provider);

	const lenses = getLensesProvider({
		isHighlightEnabled: getIsHighlightEnabled,
		configLoader,
		lensEmitter,
		getShowStatus: () => userConfig.high_light_status
	});

	const lensRegistration = vscode.languages.registerCodeLensProvider({ pattern: '**' }, lenses);

	const options = vscode.commands.registerCommand('marker.options', async () => {

		const editor = vscode.window.activeTextEditor;

		if (!editor) { return; }

		// Ensure absolute path stability exactly like configLoader
		const currentPath = Executor.normalizePath(editor.document.uri.toString());

		const currentLine = {
			start: editor.selection.start.line + 1,
			end: editor.selection.end.line + 1
		};

		// Check if there is already a comment on the current line (for 'Edit' option)
		const existing = configLoader.get(currentPath, currentLine);

		const qp = vscode.window.createQuickPick();

		qp.placeholder = 'Select Option';

		// Build the static option list
		const items = [existing ? quick_p.items.edit : quick_p.items.add];

		const lsItems = [
			quick_p.items.refresh,
			quick_p.items.delete,
			quick_p.items.config,
			quick_p.items.color
		];

		items.push(...lsItems);

		qp.items = items;

		qp.onDidAccept(async () => {

			const selected = qp.selectedItems[0];

			qp.hide();

			if (!selected) { return; }

			if (selected.label === 'Edit' && existing) {
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
						content: updated,
						alt: existing.alt
					});

				}

				if (options.description === 'e-color') {

					const updated = await vscode.window.showQuickPick(color_p()!, { placeHolder: 'Select Color' });

					if (!updated) { return; }

					await exct.recover('n', toMarkerPath, {
						range: existing.range,
						path: currentPath,
						color: updated.description,
						content: existing.content,
						alt: existing.alt
					});

				}


			} else if (selected.label === 'Add' && !existing) {
				// --- NEW COMMENT MODE ---
				const content = await vscode.window.showInputBox({
					prompt: 'Add comment'
				});

				const colorOption = await vscode.window.showQuickPick(color_p()!, { placeHolder: 'Select Color' });

				if (!colorOption) { return; }

				if (content === undefined) { return; }

				const alt = await vscode.window.showInputBox({
					prompt: 'Add alt text for highlight'
				});

				await exct.writeIntoMarker(toMarkerPath, {
					range: { start: currentLine.start, end: currentLine.end },
					path: currentPath,
					color: colorOption.description!,
					content: content,
					alt: alt ?? ''
				});
			} else if (selected.label === 'Refresh') {

				await exct.refresh(configLoader.list);
				vscode.window.showInformationMessage('Refreshed');

			} else if (selected.label === 'Delete') {
				const markerToDelete = configLoader.list[currentPath][currentLine.start];

				// use for to delete multi-line highlight
				if (markerToDelete) {
					for (let l = markerToDelete.range.start; l <= markerToDelete.range.end; l++) {
						delete configLoader.list[currentPath][l];
					}
					await exct.refresh(configLoader.list);
				}
			} else if (selected.label === 'Config') {

				// open config file
				await vscode.window.showTextDocument(vscode.Uri.file(toUserConfig));

			} else if (selected.label === 'Color') {

				const todo = await vscode.window.showQuickPick([
					{
						label: 'Add Custom Color',
						description: 'acc'
					},
					{
						label: 'Edit Color Details',
						description: 'ecd'
					},
					{
						label: 'Remove Color',
						description: 'rc'
					}
				], { placeHolder: 'Select Color Action' });

				if (!todo) { return; }

				const colors = structuredClone(Config.colorLs);

				if (todo.description === 'acc') {
					const color = await vscode.window.showInputBox({
						prompt: 'Add Hex Code'
					});

					if (!color) { return; }
					if (!color.startsWith('#') && ![3, 6, 8].includes(color.length)) { vscode.window.showErrorMessage('Invalid color'); return; };

					const label = await vscode.window.showInputBox({
						prompt: 'Add label'
					});

					const desc = await vscode.window.showInputBox({
						prompt: 'Add description'
					});

					colors.push({ hex: color, label: label ? label : 'No label', desc: desc ? desc : 'No description' });
				}

				if (todo.description === 'ecd') {
					// Map colors to QuickPick items keeping original reference
					const mapped = colors.map(c => ({ label: c.label, description: c.hex, iconPath: toSvgIcon(c.hex), ref: c }));
					const colorItem = await vscode.window.showQuickPick(mapped, { placeHolder: 'Select Color' });

					if (!colorItem) { return; }

					const index = colors.indexOf(colorItem.ref);

					// Fix: Use property names explicitly rather than Object.keys(array)
					const target = await vscode.window.showQuickPick(['label', 'desc', 'hex'], { placeHolder: 'Select Target field' });

					if (!target) { return; }

					if (target === 'label') {
						const label = await vscode.window.showInputBox({
							prompt: 'Modify label',
							value: colorItem.ref.label
						});
						if (!label) { return; }
						colors[index].label = label;
					}

					if (target === 'desc') {
						const desc = await vscode.window.showInputBox({
							prompt: 'Modify description',
							value: colorItem.ref.desc
						});
						if (!desc) { return; }
						colors[index].desc = desc;
					}

					if (target === 'hex') {
						const hex = await vscode.window.showInputBox({
							prompt: 'Modify hex color',
							value: colorItem.ref.hex
						});
						if (!hex) { return; }
						if (!hex.startsWith('#') && ![3, 6, 8].includes(hex.length)) { vscode.window.showErrorMessage('Invalid color'); return; };
						colors[index].hex = hex;
					}
				}

				if (todo.description === 'rc') {
					const mapped = colors.map(c => ({ label: c.label, description: c.hex, detail: c.desc, ref: c }));
					const colorItem = await vscode.window.showQuickPick(mapped, { placeHolder: 'Select Color to Remove' });
					if (!colorItem) { return; }
					colors.splice(colors.indexOf(colorItem.ref), 1);
				}

				// Fix: change ctt to color so it matches config.ts update signature 'payloads.color'
				await userConfig.update('color', todo.description, { path: toUserConfig, color: colors, list: configLoader.list, exct: exct });

				decoration(colors);
				updateDecos({ configLoader });
			}
		});

		qp.show();
		lensEmitter.fire();
	});


	const highLight = vscode.commands.registerCommand('marker.highLight', () => {

		toggleHighlight();

		updateHL(userConfig.high_light_status);

	});

	// --- marker.expandRange ---
	// External engine for {} [] (): Finds the nearest open bracket upward and uses a stack to find the matching close bracket downward.
	const expandRange = vscode.commands.registerCommand('marker.expandRange', async () => {

		const editor = vscode.window.activeTextEditor;
		if (!editor) { return; }

		const doc = editor.document;
		const currentPath = Executor.normalizePath(doc.uri.toString());
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
			content: existing.content,
			alt: existing.alt
		});

		vscode.window.showInformationMessage(`.Marker: Expanded to lines ${newStart} - ${newEnd}`);
	});


	forDebug(context, configLoader, 'marker.debug');

	const register = [
		hoverRegistration,
		lensRegistration,
		configLoader.watcher,
		options,
		highLight,
		expandRange
	];

	context.subscriptions.push(...register);

	// Initial render after everything is set up
	updateDecos({ configLoader });

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

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
			return new vscode.Hover(markerText);
		}

		return undefined;
	}
}

import path, { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { configloader } from './loader/configLoader';
import { register } from 'module';

const initializeFile = () => {

	const content= [{
		path: join(workspacePath, '.marker.json'),
		line: 1,
		content: 'welcome to .marker!'
	}];

	mkdir(workspacePath, { recursive: true });
	writeFile(join(workspacePath, '.marker.json'), JSON.stringify(content, null, 2));

};

// point to the root of the workspace
export const workspacePath = join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath!, '.marker-storage');

export function activate(context: vscode.ExtensionContext) {

	initializeFile();

	console.log('Marker Loaded!');

	const configLoader = new configloader();

	const provider = new MarkerHoverProvider(configLoader);
	const hoverRegistration = vscode.languages.registerHoverProvider({ pattern: '**' }, provider);

	forDebug(context, configLoader, 'marker.debug');

	const register = [
		hoverRegistration,
		configLoader.watcher
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


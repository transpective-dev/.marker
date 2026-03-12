import * as vscode from 'vscode';
import { Executor } from '../executor';
import type { configloader } from '../loader/configLoader';

export const getLensesProvider = (payload: {
    isHighlightEnabled: () => boolean,
    configLoader: configloader,
    lensEmitter: vscode.EventEmitter<void>,
    getShowStatus: () => 'text' | 'HL' | 'text/HL'
}): vscode.CodeLensProvider => {

    const lensesProvider: vscode.CodeLensProvider = {

        // turn on lens when received emit
        onDidChangeCodeLenses: payload.lensEmitter.event,

        provideCodeLenses(doc) {

            // lens list
            const lenses: vscode.CodeLens[] = [];

            // gate: only show lenses when highlight is enabled
            if (!payload.isHighlightEnabled()) { return []; }

            // gate: do NOT show lenses if the configuration is strictly "Highlight Only"
            if (payload.getShowStatus() === 'HL') { return []; }

            // get content from loader
            const fileMarkers = payload.configLoader.list[Executor.normalizePath(doc.uri.fsPath)];

            if (!fileMarkers) { return []; }

            // register lenses
            const seen = new Set<string>();
            for (const lineStr in fileMarkers) {

                // get data from filemarker — take the top-priority marker (index 0, narrowest range)
                const slot = fileMarkers[lineStr];
                const slotArr = Array.isArray(slot) ? slot : [slot];
                if (slotArr.length === 0) { continue; }
                const markerInfo = slotArr[0];

                // get place for comment by reducing one from start
                const startLine = markerInfo.range.start - 1;

                // If we've already rendered a lens for this marker, skip
                // to avoid show comment on every line in range.
                // combine each line in range to one.
                const uniqueKey = `${startLine}-${markerInfo.range.end}-${markerInfo.content}`;

                // if already shown comment, then skip.
                if (seen.has(uniqueKey)) { continue; }

                // initialize uniqueId
                seen.add(uniqueKey);

                // where to show comment
                const range = new vscode.Range(startLine, 0, startLine, 0);

                // set position for lens
                const lens = new vscode.CodeLens(range);

                // Show hierarchy indicator when multiple markers share this line
                const hierarchyTag = slotArr.length > 1 ? ` [+${slotArr.length - 1}]` : '';

                lens.command = {
                    title: `(.Marker)[ R${markerInfo.range.start}:${markerInfo.range.end}${hierarchyTag} ]: ${markerInfo.alt ? markerInfo.alt : markerInfo.content}`,
                    command: "marker.options", // let the user click to edit
                    arguments: [],
                };
                lenses.push(lens);
            }

            return lenses;
        }
    };

    return lensesProvider;
};

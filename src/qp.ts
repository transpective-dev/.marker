interface lsitem {
    label: string;
    description: string;
}

import * as vscode from 'vscode';

export class QuickPick {

    public items: { [key: string]: lsitem } = {
        edit: {
            label: 'Edit',
            description: 'Edit Comment'
        },
        delete: {
            label: 'Delete',
            description: 'Delete Comment'
        },
        refresh: {
            label: 'Refresh',
            description: 'Refresh Comment Changes'
        },
        color: {
            label: 'Color',
            description: 'Change Comment Color'
        },
        add: {
            label: 'Add',
            description: 'Add Comment'
        },
        config: {
            label: 'Config',
            description: 'Edit config'
        },
    };
    
    public takeAction (action: string, target1?: string, target2?: string) {
        switch (action) {
            case 'edit':
                break;
            default:
                break;
        }
    }
}
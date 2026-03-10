interface lsitem {
    label: string;
    description: string;
}

import * as vscode from 'vscode';

export class QuickPick {

    public items: { [key: string]: lsitem } = {
        edit: {
            label: 'Edit Comment',
            description: 'edit'
        },
        delete: {
            label: 'Delete Comment',
            description: 'delete'
        },
        refresh: {
            label: 'Refresh Comment Changes',
            description: 'refresh'
        },
        color: {
            label: 'Change Comment Color',
            description: 'color'
        },
        add: {
            label: 'Add Comment',
            description: 'add'
        },
        config: {
            label: 'Edit Config',
            description: 'config'
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
import { readFileSync, existsSync } from 'fs';
import { writeFile } from 'fs/promises';

interface configs {
    settings: {
        high_light_status: string;
    };
    color: color[]
}

export interface color {
    hex: string;
    label: string;
    desc: string;
}

const DEFAULT_COLORS: color[] = [
    { label: 'Red', hex: '#FF5F56', desc: 'Critical/Bug' },
    { label: 'Yellow', hex: '#FFBD2E', desc: 'Warning/Todo' },
    { label: 'Green', hex: '#27C93F', desc: 'Good/Complete' },
    { label: 'Blue', hex: '#007ACC', desc: 'Info/Note' }
];

export class Config {

    private configs: configs | null = null;

    constructor(path: string) {
        this.initialize(path);
    }

    public static colorLs: color[] = [];

    private initialize(path: string) {
        try {
            if (existsSync(path)) {
                const raw = readFileSync(path, 'utf-8');
                this.configs = JSON.parse(raw);
            }
        } catch (e) {
            console.error('.Marker: Failed to read config', e);
        }
    }

    public color(): color[] {
        // Fallback to default colors if empty or undefined
        if (!this.configs || !this.configs.color || this.configs.color.length === 0) {
            return DEFAULT_COLORS;
        }

        Config.colorLs = this.configs.color ? this.configs.color : DEFAULT_COLORS;

        return this.configs.color;
    }

    public async update(type: string, payloads: any) {

        switch(type){
            case 'color': 
            const beforeChange = structuredClone(this.configs?.color);
                Config.colorLs = payloads.color;
                const full = {
                    settings: this.configs?.settings,
                    color: Config.colorLs
                };
                await writeFile(payloads.path, JSON.stringify(full, null, 2));
                break;
            default:
                break;
        }

    }

    private async updateSettings(payload: any) {

    }
}
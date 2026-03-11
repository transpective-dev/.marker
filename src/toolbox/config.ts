import { readFileSync, existsSync } from 'fs';
import { writeFile } from 'fs/promises';

interface configs {
    settings: {
        high_light_status: 'text' | 'HL' | 'text/HL';
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

    public static configs: configs | null = null;

    constructor(path: string) {
        this.initialize(path);
    }

    public static colorLs: color[] = [];

    private initialize(path: string) {
        try {
            if (existsSync(path)) {
                const raw = readFileSync(path, 'utf-8');
                Config.configs = JSON.parse(raw);
            }
        } catch (e) {
            console.error('.Marker: Failed to read config', e);
        }
    }

    public color(): color[] {
        // Fallback to default colors if empty or undefined
        if (!Config.configs || !Config.configs.color || Config.configs.color.length === 0) {
            return DEFAULT_COLORS;
        }

        Config.colorLs = Config.configs.color ? Config.configs.color : DEFAULT_COLORS;

        return Config.configs.color;
    }

    public async update(type: string, action: string, payloads: any) {

        switch (type) {
            case 'color':
                const beforeChange = structuredClone(Config.configs?.color);

                Config.colorLs = payloads.color;

                if (Config.configs) {
                    Config.configs.color = payloads.color;
                }

                const full = {
                    settings: Config.configs?.settings,
                    color: Config.colorLs
                };

                await writeFile(payloads.path, JSON.stringify(full, null, 2));

                if (beforeChange && payloads.list && payloads.exct) {
                    const colorMap = new Map<string, string>();

                    switch (action) {
                        case 'acc':
                            if (beforeChange.length < payloads.color.length) {

                            }
                            break;
                        case 'rc':
                            if (beforeChange.length > payloads.color.length) {

                            }
                            break;
                        case 'ecd':
                            for (let i = 0; i < beforeChange.length; i++) {
                                if (beforeChange.length === payloads.color.length) {
                                    if (beforeChange[i].hex !== payloads.color[i].hex) {
                                        colorMap.set(beforeChange[i].hex, payloads.color[i].hex);
                                    }

                                }
                            }
                            break;
                    }

                    if (colorMap.size > 0) {
                        await payloads.exct.replaceColor(payloads.list, colorMap);
                    }
                }

                break;
            default:
                break;
        }

    }

    public get high_light_status(): 'text' | 'HL' | 'text/HL' {
        return Config.configs?.settings.high_light_status || 'text/HL';
    }
    
}
import { join } from 'path';
import { writeFile, readdir } from 'fs/promises';
import { Executor } from '../executor';

export const initializeFile = async (storagePath: string) => {
    try {

        const fileLs = await readdir(storagePath);

        if (!fileLs.includes('.marker.jsonl')) {
            const content = {
                line: 1,
                path: Executor.normalizePath(join(storagePath, '.marker.jsonl')),
                color: 'green',
                content: 'welcome to .marker!',
                alt: ''
            };

            await writeFile(join(storagePath, '.marker.jsonl'), JSON.stringify(content) + '\n');
        }

        if (!fileLs.includes('config.json')) {
            const config = {
                settings: {
                    high_light_status: 'text/HL'
                },
                color: [
                    { label: 'Red', hex: '#FF5F56', desc: 'Critical/Bug' },
                    { label: 'Yellow', hex: '#FFBD2E', desc: 'Warning/Todo' },
                    { label: 'Green', hex: '#27C93F', desc: 'Good/Complete' },
                    { label: 'Blue', hex: '#007ACC', desc: 'Info/Note' },
                    { label: 'Transparent', hex: '#00000000', desc: 'Keep Background Clear' }
                ]
            };
            await writeFile(join(storagePath, 'config.json'), JSON.stringify(config, null, 2));
        }


    } catch (e) {
        console.error('Failed to initialize .marker storage:', e);
    }
};

import fs from 'node:fs/promises';
import task from 'tasuku';
import {askForConfigOption} from './common.js';

export async function addEditorConfig(): Promise<void> {
	const {configFilePath, configFileName} =
		await askForConfigOption('editorconfig');

	// If the user renames or deletes a config, it will return early
	if (!configFilePath || !configFileName) return;

	await task('Adding EditorConfig', async ({setTitle, setOutput}) => {
		// Read config
		const editorConfigFile = await fs.readFile(configFilePath, 'utf8');

		// Create new EditorConfig file
		await fs.writeFile('.editorconfig', editorConfigFile);

		setTitle('Added EditorConfig');
		setOutput(configFileName);
	});
}

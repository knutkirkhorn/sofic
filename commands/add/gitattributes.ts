import fs from 'node:fs/promises';
import task from 'tasuku';
import {askForConfigOption} from './common.js';

export async function addGitattributes(): Promise<void> {
	const {configFilePath, configFileName} =
		await askForConfigOption('gitattributes');

	// If the user renames or deletes a config, it will return early
	if (!configFilePath || !configFileName) return;

	await task('Adding .gitattributes', async ({setTitle, setOutput}) => {
		// Read config
		const gitattributesFile = await fs.readFile(configFilePath, 'utf8');

		// Create new .gitattributes file
		await fs.writeFile('.gitattributes', gitattributesFile);

		setTitle('Added .gitattributes');
		setOutput(configFileName);
	});
}

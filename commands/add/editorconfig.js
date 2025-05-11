import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import task from 'tasuku';

export async function addEditorConfig() {
	await task('Adding EditorConfig', async ({setTitle, setOutput}) => {
		// Read config snippet
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);
		const snippetsDirectory = path.join(__dirname, 'snippets');
		const editorConfigSnippet = await fs.readFile(
			path.join(snippetsDirectory, '.editorconfig'),
			'utf8',
		);

		// Create new EditorConfig file
		await fs.writeFile('.editorconfig2', editorConfigSnippet);

		setTitle('Added EditorConfig');
		setOutput('.editorconfig');
	});
}

import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export async function addEditorConfig() {
	console.log('Adding EditorConfig...');

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

	console.log('Added EditorConfig (`.editorconfig`)');
	console.log('Finished adding EditorConfig');
}

import {execa} from 'execa';
import logSymbols from 'log-symbols';
import task from 'tasuku';
import {addEditorConfig} from '../add/editorconfig.js';
import {addEslint} from '../add/eslint.js';
import {addGitattributes} from '../add/gitattributes.js';
import {addPrettier} from '../add/prettier.js';
import {
	ensureUserConfigDirectoriesExists,
	ensureUserConfigFileExists,
} from '../index.js';

export async function initBunProject() {
	// Run bun init (bun init -y)
	await execa('bun', ['init', '-y']);

	// Ensure the user config directories and file exist
	await ensureUserConfigDirectoriesExists();
	await ensureUserConfigFileExists();

	await task('Initializing bun project', async ({setTitle}) => {
		// Install ESLint
		await addEslint();

		// Install Prettier
		await addPrettier();

		// Install EditorConfig
		await addEditorConfig();

		// Add gitattributes
		await addGitattributes();

		setTitle(
			`Bun project initialized successfully with ESLint, Prettier and EditorConfig`,
		);
	});
}

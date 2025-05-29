import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fileExists} from '../util.js';
import {addEditorConfig} from './add/editorconfig.js';
import {addEslint} from './add/eslint.js';
import {addPrettier} from './add/prettier.js';

async function ensureUserConfigDirectoriesExists() {
	const homeDirectory = os.homedir();
	const configDirectories = ['eslint', 'prettier', 'editorconfig'];

	for (const directory of configDirectories) {
		const configDirectoryPath = path.join(
			homeDirectory,
			'.sofic',
			'configs',
			directory,
		);
		await fs.mkdir(configDirectoryPath, {recursive: true});
	}
}

async function ensureUserConfigFileExists() {
	const homeDirectory = os.homedir();
	const configFile = path.join(
		homeDirectory,
		'.sofic',
		'configs',
		'configs.json',
	);

	if (await fileExists(configFile)) {
		return;
	}

	// Use version from the current package.json
	// The version will be for future potential breaking changes
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const soficPackageJson = JSON.parse(
		await fs.readFile(path.join(__dirname, '../package.json'), 'utf8'),
	);

	const config = {
		version: soficPackageJson.version,
		configs: {
			editorconfig: {},
			eslint: {},
			prettier: {},
		},
	};
	// Save the config
	await fs.writeFile(configFile, JSON.stringify(config, undefined, 2));
}

export async function add(tool, flags) {
	if (flags.list || !tool) {
		console.log('Available tools:');
		console.log('  - eslint');
		console.log('  - prettier');
		console.log('  - editorconfig');
		return;
	}

	// Ensure the user config are setup
	await ensureUserConfigDirectoriesExists();
	await ensureUserConfigFileExists();

	// Run the add command for the tool
	switch (tool) {
		case 'eslint': {
			await addEslint();
			break;
		}
		case 'prettier': {
			await addPrettier();
			break;
		}
		case 'editorconfig': {
			await addEditorConfig();
			break;
		}
		default: {
			throw new Error(`Tool ${tool} is not supported`);
		}
	}
}

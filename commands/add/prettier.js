import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execa} from 'execa';
import {detect, resolveCommand} from 'package-manager-detector';

async function installPrettierPackages() {
	console.log('Installing Prettier packages...');

	// Get what package manager is used for given project
	const packageManager = await detect({
		cwd: process.cwd(),
	});

	// Get the command to install packages
	const {command, args} = resolveCommand(
		// Use 'npm' as default package manager if no package manager is detected
		packageManager?.agent || 'npm',
		'add',
		// Use `-D` to add packages as dev dependencies
		['-D', 'prettier', '@ianvs/prettier-plugin-sort-imports'],
	);

	// Run the install packages command
	await execa(command, args);

	console.log('Installed Prettier packages');
}

async function addPrettierConfig() {
	console.log('Adding Prettier config...');

	// Read config snippet
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const snippetsDirectory = path.join(__dirname, 'snippets');
	const prettierConfigSnippet = await fs.readFile(
		path.join(snippetsDirectory, 'prettier.config.mjs'),
		'utf8',
	);

	// Create new Prettier config file
	await fs.writeFile('prettier.config.mjs', prettierConfigSnippet);

	console.log('Added Prettier config (`prettier.config.mjs`)');
}

export async function addPrettier() {
	console.log('Adding Prettier...');

	// Install packages
	await installPrettierPackages();

	// Add config
	await addPrettierConfig();

	console.log('Finished adding Prettier');
}

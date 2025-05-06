import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execa} from 'execa';
import {detect, resolveCommand} from 'package-manager-detector';

async function installEslintPackages() {
	console.log('Installing ESLint packages...');

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
		[
			'-D',
			'@eslint/js',
			'eslint',
			'eslint-plugin-unicorn',
			'eslint-config-prettier',
			'globals',
		],
	);

	// Run the install packages command
	await execa(command, args);

	console.log('Installed ESLint packages');
}

async function addEslintConfig() {
	console.log('Adding ESLint config...');

	// Read config snippet
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const snippetsDirectory = path.join(__dirname, 'snippets');
	const eslintConfigSnippet = await fs.readFile(
		path.join(snippetsDirectory, 'eslint.config.mjs'),
		'utf8',
	);

	// Create new ESLint config file
	await fs.writeFile('eslint.config.mjs', eslintConfigSnippet);

	console.log('Added ESLint config (`eslint.config.mjs`)');
}

export async function addEslint() {
	console.log('Adding eslint...');

	// Install packages
	await installEslintPackages();

	// Add config
	await addEslintConfig();

	console.log('Finished adding eslint');
}

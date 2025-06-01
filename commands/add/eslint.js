import fs from 'node:fs/promises';
import {execa} from 'execa';
import {detect, resolveCommand} from 'package-manager-detector';
import {parseImports} from 'parse-imports';
import task from 'tasuku';
import {askForConfigOption} from './common.js';

async function installEslintPackages(packages) {
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
		['-D', ...packages],
	);

	// Run the install packages command
	await execa(command, args);
}

async function readImportsFromConfig(configFile) {
	// TODO: needs test for this, test with the default configs
	// TODO: do this for the prettier configs also

	const imports = [...(await parseImports(configFile))];
	const packageImports = imports
		.filter(
			import_ =>
				import_.moduleSpecifier.type === 'package' &&
				!import_.moduleSpecifier.value.startsWith('node:'),
		)
		.map(import_ => {
			// eslint/config -> eslint
			// @eslint/js -> @eslint/js
			if (
				!import_.moduleSpecifier.value.startsWith('@') &&
				import_.moduleSpecifier.value.includes('/')
			) {
				return import_.moduleSpecifier.value.split('/')[0];
			}

			return import_.moduleSpecifier.value;
		});
	return packageImports;
}

export async function addEslint() {
	const configFilePath = await askForConfigOption(
		'eslint',
		'eslint.config.mjs',
	);

	if (!configFilePath) return;

	// Read config
	const eslintConfigFile = await fs.readFile(configFilePath, 'utf8');

	await Promise.all([
		task('Installing ESLint packages', async ({setTitle}) => {
			const packagesToInstall = await readImportsFromConfig(eslintConfigFile);
			await installEslintPackages(packagesToInstall);
			setTitle('Installed ESLint packages');
		}),
		task('Adding ESLint config', async ({setTitle, setOutput}) => {
			// Create new ESLint config file
			await fs.writeFile('eslint.config.mjs', eslintConfigFile);
			setTitle('Added ESLint config');
			setOutput('eslint.config.mjs');
		}),
	]);
}

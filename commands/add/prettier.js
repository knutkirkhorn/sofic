import fs from 'node:fs/promises';
import {execa} from 'execa';
import {detect, resolveCommand} from 'package-manager-detector';
import task from 'tasuku';
import {askForConfigOption} from './common.js';

async function installPrettierPackages(packages) {
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

export async function readImportsFromConfig(configFilePath) {
	// TODO: needs test for this, test with the default configs
	// TODO: do this for the prettier configs also

	const parsedPrettierConfig = await import(`file://${configFilePath}`);
	const packageImports = parsedPrettierConfig.default.plugins.map(plugin => {
		// some/thing -> some
		// @ianvs/prettier-plugin-sort-imports -> @ianvs/prettier-plugin-sort-imports
		if (!plugin.startsWith('@') && plugin.includes('/')) {
			return plugin.split('/')[0];
		}

		return plugin;
	});

	return packageImports;
}

export async function addPrettier() {
	const {configFilePath, configFileName} = await askForConfigOption('prettier');

	if (!configFilePath) return;

	await Promise.all([
		task('Installing Prettier packages', async ({setTitle}) => {
			const packagesToInstall = await readImportsFromConfig(configFilePath);
			await installPrettierPackages(packagesToInstall);
			setTitle('Installed Prettier packages');
		}),
		task('Adding Prettier config', async ({setTitle, setOutput}) => {
			// Read config
			const prettierConfigFile = await fs.readFile(configFilePath, 'utf8');
			// Create new Prettier config file
			await fs.writeFile(configFileName, prettierConfigFile);
			setTitle('Added Prettier config');
			setOutput(configFileName);
		}),
	]);
}

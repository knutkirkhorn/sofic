import fs from 'node:fs/promises';
import {execa} from 'execa';
import {detect, resolveCommand} from 'package-manager-detector';
import task from 'tasuku';
import {askForConfigOption} from './common.js';

async function installPrettierPackages(packages: string[]): Promise<void> {
	// Get what package manager is used for given project
	const packageManager = await detect({
		cwd: process.cwd(),
	});

	// Get the command to install packages
	const resolvedCommand = resolveCommand(
		// Use 'npm' as default package manager if no package manager is detected
		packageManager?.agent || 'npm',
		'add',
		// Use `-D` to add packages as dev dependencies
		['-D', ...packages],
	);

	if (!resolvedCommand) {
		throw new Error('Failed to resolve command to install Prettier packages');
	}

	const {command, args} = resolvedCommand;

	// Run the install packages command
	await execa(command, args);
}

interface PrettierConfig {
	default: {
		plugins: string[];
	};
}

export async function readImportsFromConfig(
	configFilePath: string,
): Promise<string[]> {
	const parsedPrettierConfig = (await import(
		`file://${configFilePath}`
	)) as PrettierConfig;
	const packageImports = parsedPrettierConfig.default.plugins
		.map(plugin => {
			// some/thing -> some
			// @ianvs/prettier-plugin-sort-imports -> @ianvs/prettier-plugin-sort-imports
			if (!plugin.startsWith('@') && plugin.includes('/')) {
				return plugin.split('/')[0];
			}

			return plugin;
		})
		// Filter out any undefined values that may exist
		.filter(
			(packageImport): packageImport is string =>
				typeof packageImport === 'string',
		);

	// Convert to Set and back to array to remove duplicates
	return [...new Set(packageImports)];
}

export async function addFormatCheckScript(): Promise<boolean> {
	const packageJsonPath = 'package.json';

	let packageJson: {scripts?: Record<string, string>; [key: string]: unknown};
	try {
		const content = await fs.readFile(packageJsonPath, 'utf8');
		packageJson = JSON.parse(content) as typeof packageJson;
	} catch {
		// No package.json found, skip adding format:check script
		return false;
	}

	// Check if a format:check script already exists
	if (packageJson.scripts?.['format:check']) {
		return false;
	}

	// Add the format:check script
	packageJson.scripts = {
		...packageJson.scripts,
		'format:check': 'prettier . --check',
	};

	await fs.writeFile(
		packageJsonPath,
		JSON.stringify(packageJson, undefined, '\t') + '\n',
	);
	return true;
}

export async function addPrettier(): Promise<void> {
	const {configFilePath, configFileName} = await askForConfigOption('prettier');

	if (!configFilePath || !configFileName) return;

	await Promise.all([
		task('Installing Prettier packages', async ({setTitle}) => {
			const packagesToInstall = await readImportsFromConfig(configFilePath);
			await installPrettierPackages(['prettier', ...packagesToInstall]);
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
		task('Adding format:check to scripts', async ({setTitle}) => {
			const added = await addFormatCheckScript();
			if (added) {
				setTitle('Added format:check to scripts');
			} else {
				setTitle(
					'`format:check` already exists in `scripts` or no package.json was found',
				);
			}
		}),
	]);
}

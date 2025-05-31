import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {input, select, Separator} from '@inquirer/prompts';
import {execa} from 'execa';
import logSymbols from 'log-symbols';
import {detect, resolveCommand} from 'package-manager-detector';
import task from 'tasuku';
import {z} from 'zod/v4';
import {fileExists} from '../../util.js';

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

const userConfigSchema = z.object({
	version: z.string(),
	configs: z.record(
		z.string(),
		z.record(
			z.string(),
			z.object({
				relative_path: z.string(),
			}),
		),
	),
});

async function getUserConfigs() {
	const homeDirectory = os.homedir();
	const configFile = path.join(
		homeDirectory,
		'.sofic',
		'configs',
		'configs.json',
	);
	const userConfigs = JSON.parse(await fs.readFile(configFile, 'utf8'));
	const parsedUserConfigs = userConfigSchema.parse(userConfigs);
	return parsedUserConfigs;
}

async function readImportsFromConfig(configFilePath) {
	console.log('configFilePath', configFilePath);
	// TODO: needs test for this, test with the default configs
	// TODO: do this for the prettier configs also

	const parsedPrettierConfig = await import(`file://${configFilePath}`);
	console.log('parsedPrettierConfig', parsedPrettierConfig);
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
	// Read the user configs
	const userConfigs = await getUserConfigs();

	// Prompt the user for which config to use
	const configAnswer = await select({
		message: 'Select a config',
		choices: [
			{
				name: 'Default',
				value: 'default',
				description: 'Use the default config',
			},
			// Append all user defined configs
			...Object.keys(userConfigs.configs.prettier).map(key => ({
				name: key,
				value: `user-${key}`,
				description: `Use the ${key} config`,
			})),
			new Separator(),
			{
				name: 'New config',
				value: 'new',
				description: 'Create a new config',
			},
		],
	});

	let configFilePath = '';

	if (configAnswer === 'new') {
		// Create new config
		const configName = await input({
			message: 'Config name',
			validate: value => {
				if (!value) return 'Config name is required';

				if (Object.keys(userConfigs.configs.prettier).includes(value)) {
					return 'Config with this name already exists';
				}

				return true;
			},
		});

		const configPath = await input({
			message: 'Config path',
			validate: value => {
				if (!value) return 'Config path is required';
				return true;
			},
		});

		// Check if the input path is a valid file
		const configFileExists = await fileExists(configPath);
		if (!configFileExists) {
			throw new Error('Config file does not exist');
		}

		// Copy it into the <home-directory>/.sofic/configs/prettier/<next-index>/prettier.config.mjs
		const homeDirectory = os.homedir();
		const nextIndex = Object.keys(userConfigs.configs.prettier).length + 1;
		const newConfigPath = path.join(
			homeDirectory,
			'.sofic',
			'configs',
			'prettier',
			`${nextIndex}`,
			'prettier.config.mjs',
		);
		// Create new config directory
		await fs.mkdir(
			path.join(homeDirectory, '.sofic', 'configs', 'prettier', `${nextIndex}`),
			{
				recursive: true,
			},
		);

		// Write new config file
		const userSelectedConfigFile = await fs.readFile(configPath, 'utf8');
		await fs.writeFile(newConfigPath, userSelectedConfigFile);

		// Update user configs
		userConfigs.configs.prettier[configName] = {
			relative_path: nextIndex.toString(),
		};

		// Save updated user configs
		const userConfigFilePath = path.join(
			homeDirectory,
			'.sofic',
			'configs',
			'configs.json',
		);
		await fs.writeFile(
			userConfigFilePath,
			JSON.stringify(userConfigs, undefined, 2),
		);
		console.log(`${logSymbols.success} Saved config file '${configName}'`);

		configFilePath = newConfigPath;
	} else if (configAnswer === 'default') {
		// Use default config
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);
		const snippetsDirectory = path.join(__dirname, 'snippets');
		configFilePath = path.join(snippetsDirectory, 'prettier.config.mjs');
	} else {
		// Use user config
		const homeDirectory = os.homedir();
		const configName = configAnswer.replace('user-', '');
		configFilePath = path.join(
			homeDirectory,
			'.sofic',
			'configs',
			'prettier',
			userConfigs.configs.prettier[configName].relative_path,
			'prettier.config.mjs',
		);
	}

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
			await fs.writeFile('prettier.config.mjs', prettierConfigFile);
			setTitle('Added Prettier config');
			setOutput('prettier.config.mjs');
		}),
	]);
}

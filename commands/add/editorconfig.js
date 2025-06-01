import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {input, select, Separator} from '@inquirer/prompts';
import logSymbols from 'log-symbols';
import task from 'tasuku';
import {fileExists} from '../../util.js';
import {
	askToDeleteConfig,
	askToRenameConfig,
	getUserConfigs,
} from './common.js';

export async function addEditorConfig() {
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
			...Object.keys(userConfigs.configs.editorconfig).map(key => ({
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
			{
				name: 'Rename config',
				value: 'rename',
				description: 'Rename a config',
				disabled: Object.keys(userConfigs.configs.editorconfig).length === 0,
			},
			{
				name: 'Delete config',
				value: 'delete',
				description: 'Delete a config',
				disabled: Object.keys(userConfigs.configs.editorconfig).length === 0,
			},
			new Separator(),
		],
	});

	let configFilePath = '';

	// TODO: fix this:
	// eslint-disable-next-line unicorn/prefer-switch
	if (configAnswer === 'new') {
		// Create new config
		const configName = await input({
			message: 'Config name',
			validate: value => {
				if (!value) return 'Config name is required';

				if (Object.keys(userConfigs.configs.editorconfig).includes(value)) {
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

		// Copy it into the <home-directory>/.sofic/configs/editorconfig/<next-index>/.editorconfig
		const homeDirectory = os.homedir();
		const nextIndex = Object.keys(userConfigs.configs.editorconfig).length + 1;
		const newConfigPath = path.join(
			homeDirectory,
			'.sofic',
			'configs',
			'editorconfig',
			`${nextIndex}`,
			'.editorconfig',
		);
		// Create new config directory
		await fs.mkdir(
			path.join(
				homeDirectory,
				'.sofic',
				'configs',
				'editorconfig',
				`${nextIndex}`,
			),
			{
				recursive: true,
			},
		);

		// Write new config file
		const userSelectedConfigFile = await fs.readFile(configPath, 'utf8');
		await fs.writeFile(newConfigPath, userSelectedConfigFile);

		// Update user configs
		userConfigs.configs.editorconfig[configName] = {
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
		configFilePath = path.join(snippetsDirectory, '.editorconfig');
	} else if (configAnswer === 'rename') {
		await askToRenameConfig(userConfigs, 'editorconfig');
		return;
	} else if (configAnswer === 'delete') {
		await askToDeleteConfig(userConfigs, 'editorconfig');
		return;
	} else {
		// Use user config
		const homeDirectory = os.homedir();
		const configName = configAnswer.replace('user-', '');
		configFilePath = path.join(
			homeDirectory,
			'.sofic',
			'configs',
			'editorconfig',
			userConfigs.configs.editorconfig[configName].relative_path,
			'.editorconfig',
		);
	}

	await task('Adding EditorConfig', async ({setTitle, setOutput}) => {
		// Read config
		const editorConfigFile = await fs.readFile(configFilePath, 'utf8');

		// Create new EditorConfig file
		await fs.writeFile('.editorconfig', editorConfigFile);

		setTitle('Added EditorConfig');
		setOutput('.editorconfig');
	});
}

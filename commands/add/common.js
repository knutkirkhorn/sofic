import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {input, select} from '@inquirer/prompts';
import logSymbols from 'log-symbols';

export async function askToRenameConfig(userConfigs, configType) {
	// Select which config to rename
	const configToRename = await select({
		message: 'Select a config to rename',
		choices: Object.keys(userConfigs.configs[configType]).map(key => ({
			name: key,
			value: key,
		})),
	});

	// Rename config
	const newConfigName = await input({
		message: 'New config name',
		validate: value => {
			if (!value) return 'Config name is required';
			if (Object.keys(userConfigs.configs[configType]).includes(value)) {
				return 'Config with this name already exists';
			}
			return true;
		},
	});

	// Update user configs
	userConfigs.configs[configType][newConfigName] =
		userConfigs.configs[configType][configToRename];
	delete userConfigs.configs[configType][configToRename];

	// Save updated user configs
	const homeDirectory = os.homedir();
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
	console.log(
		`${logSymbols.success} Renamed config '${configToRename}' to '${newConfigName}'`,
	);
}

export async function askToDeleteConfig(userConfigs, configType) {
	// Select which config to delete
	const configToDelete = await select({
		message: 'Select a config to delete',
		choices: Object.keys(userConfigs.configs[configType]).map(key => ({
			name: key,
			value: key,
		})),
	});

	// Delete config
	delete userConfigs.configs[configType][configToDelete];

	// Save updated user configs
	const homeDirectory = os.homedir();
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
	console.log(`${logSymbols.success} Deleted config '${configToDelete}'`);
}

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {input, select, Separator} from '@inquirer/prompts';
import logSymbols from 'log-symbols';
import {v4 as uuidv4} from 'uuid';
import {z} from 'zod/v4';
import {fileExists} from '../../util.js';

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

type UserConfigs = z.infer<typeof userConfigSchema>;

async function getUserConfigs(): Promise<UserConfigs> {
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

export async function askToRenameConfig(
	userConfigs: UserConfigs,
	configType: string,
): Promise<void> {
	// Select which config to rename
	const configToRename = await select({
		message: 'Select a config to rename',
		choices: Object.keys(userConfigs.configs[configType] ?? {}).map(key => ({
			name: key,
			value: key,
		})),
	});

	// Rename config
	const newConfigName = await input({
		message: 'New config name',
		validate: value => {
			if (!value) return 'Config name is required';
			if (Object.keys(userConfigs.configs[configType] ?? {}).includes(value)) {
				return 'Config with this name already exists';
			}
			return true;
		},
	});

	// Update user configs
	userConfigs.configs[configType]![newConfigName] =
		userConfigs.configs[configType]![configToRename]!;
	delete userConfigs.configs[configType]![configToRename];

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

export async function askToDeleteConfig(
	userConfigs: UserConfigs,
	configType: string,
): Promise<void> {
	// Select which config to delete
	const configToDelete = await select({
		message: 'Select a config to delete',
		choices: Object.keys(userConfigs.configs[configType] ?? {}).map(key => ({
			name: key,
			value: key,
		})),
	});

	// Delete config
	delete userConfigs.configs[configType]![configToDelete];

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

const defaultConfigFileNames: Record<string, string> = {
	eslint: 'eslint.config.mjs',
	prettier: 'prettier.config.mjs',
	editorconfig: '.editorconfig',
	gitattributes: '.gitattributes',
};

// TODO: better name?
export async function askForConfigOption(configType: string): Promise<{
	configFilePath: string | undefined;
	configFileName: string | undefined;
}> {
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
			...Object.keys(userConfigs.configs[configType] ?? {}).map(key => ({
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
				disabled:
					Object.keys(userConfigs.configs[configType] ?? {}).length === 0,
			},
			{
				name: 'Delete config',
				value: 'delete',
				description: 'Delete a config',
				disabled:
					Object.keys(userConfigs.configs[configType] ?? {}).length === 0,
			},
			new Separator(),
		],
	});

	let configFilePath = '';

	switch (configAnswer) {
		case 'new': {
			// Create new config
			const configName = await input({
				message: 'Config name',
				validate: value => {
					if (!value) return 'Config name is required';

					if (
						Object.keys(userConfigs.configs[configType] ?? {}).includes(value)
					) {
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

			// Copy it into the <home-directory>/.sofic/configs/<configType>/<next-index>/<config-file-name>
			const homeDirectory = os.homedir();
			const newDirectoryName = uuidv4();
			const newFileName = path.basename(configPath);
			const newConfigPath = path.join(
				homeDirectory,
				'.sofic',
				'configs',
				configType,
				newDirectoryName,
				newFileName,
			);
			// Create new config directory
			await fs.mkdir(
				path.join(
					homeDirectory,
					'.sofic',
					'configs',
					configType,
					newDirectoryName,
				),
				{
					recursive: true,
				},
			);

			// Write new config file
			const userSelectedConfigFile = await fs.readFile(configPath, 'utf8');
			await fs.writeFile(newConfigPath, userSelectedConfigFile);

			// Update user configs
			userConfigs.configs[configType]![configName] = {
				relative_path: `${newDirectoryName}/${newFileName}`,
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

			break;
		}
		case 'default': {
			// Use default config
			const __filename = fileURLToPath(import.meta.url);
			const __dirname = path.dirname(__filename);
			// When running from source, snippets are next to this file.
			// When running from dist/, snippets are at the package root under commands/add/snippets.
			const configFileName = defaultConfigFileNames[configType]!;
			const localPath = path.join(__dirname, 'snippets', configFileName);
			if (await fileExists(localPath)) {
				configFilePath = localPath;
			} else {
				const packageRoot = path.join(__dirname, '..', '..', '..');
				configFilePath = path.join(
					packageRoot,
					'commands',
					'add',
					'snippets',
					configFileName,
				);
			}

			break;
		}
		case 'rename': {
			await askToRenameConfig(userConfigs, configType);
			return {configFilePath: undefined, configFileName: undefined};
		}
		case 'delete': {
			await askToDeleteConfig(userConfigs, configType);
			return {configFilePath: undefined, configFileName: undefined};
		}
		default: {
			// Use user config
			const homeDirectory = os.homedir();
			const configName = configAnswer.replace('user-', '');
			configFilePath = path.join(
				homeDirectory,
				'.sofic',
				'configs',
				configType,
				userConfigs.configs[configType]![configName]!.relative_path,
			);

			break;
		}
	}

	const configFileName = path.basename(configFilePath);
	return {configFilePath, configFileName};
}

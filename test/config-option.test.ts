import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {afterEach, expect, spyOn, test} from 'bun:test';
import {askForConfigOption} from '../commands/add/common.js';

const temporaryHomes: string[] = [];
const homedirSpies: Array<ReturnType<typeof spyOn>> = [];

afterEach(async () => {
	for (const spy of homedirSpies.splice(0)) {
		spy.mockRestore();
	}

	for (const temporaryHome of temporaryHomes.splice(0)) {
		await fs.rm(temporaryHome, {recursive: true, force: true});
	}
});

async function mockHomeDirectory(): Promise<string> {
	const homeDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sofic-home-'));
	temporaryHomes.push(homeDirectory);
	homedirSpies.push(spyOn(os, 'homedir').mockReturnValue(homeDirectory));
	return homeDirectory;
}

test('askForConfigOption uses default when configName is default', async () => {
	const {configFilePath, configFileName} = await askForConfigOption(
		'editorconfig',
		{configName: 'default'},
	);

	expect(configFileName).toBe('.editorconfig');
	expect(configFilePath).toContain(path.join('snippets', '.editorconfig'));
});

test('askForConfigOption uses named user config', async () => {
	const homeDirectory = await mockHomeDirectory();
	const configDirectory = path.join(
		homeDirectory,
		'.sofic',
		'configs',
		'editorconfig',
		'abc',
	);
	await fs.mkdir(configDirectory, {recursive: true});
	await fs.writeFile(
		path.join(configDirectory, '.editorconfig'),
		'root = true\n',
	);
	await fs.mkdir(path.join(homeDirectory, '.sofic', 'configs'), {
		recursive: true,
	});
	await fs.writeFile(
		path.join(homeDirectory, '.sofic', 'configs', 'configs.json'),
		JSON.stringify({
			version: '4.2.1',
			configs: {
				editorconfig: {
					next: {relative_path: 'abc/.editorconfig'},
				},
				eslint: {},
				gitattributes: {},
				prettier: {},
			},
		}),
	);

	const {configFilePath, configFileName} = await askForConfigOption(
		'editorconfig',
		{configName: 'next'},
	);

	expect(configFileName).toBe('.editorconfig');
	expect(await fs.readFile(configFilePath!, 'utf8')).toBe('root = true\n');
});

test('askForConfigOption throws when named config is missing', async () => {
	const homeDirectory = await mockHomeDirectory();
	await fs.mkdir(path.join(homeDirectory, '.sofic', 'configs'), {
		recursive: true,
	});
	await fs.writeFile(
		path.join(homeDirectory, '.sofic', 'configs', 'configs.json'),
		JSON.stringify({
			version: '4.2.1',
			configs: {
				editorconfig: {},
				eslint: {},
				gitattributes: {},
				prettier: {},
			},
		}),
	);

	await expect(
		askForConfigOption('eslint', {configName: 'next'}),
	).rejects.toThrow("Config 'next' not found for eslint");
});

test('askForConfigOption throws when both --default and config name are set', async () => {
	await expect(
		askForConfigOption('eslint', {useDefault: true, configName: 'next'}),
	).rejects.toThrow('Cannot use both --default and a config name');
});

#!/usr/bin/env node
import chalk from 'chalk';
import meow from 'meow';
import {add, init} from './commands/index.js';
import {checkRepoFiles} from './index.js';

const cli = meow(
	String.raw`
	Usage
	  $ sofic
	  $ sofic add <tool>
	  $ sofic check <path>
	  $ sofic init <tool>

	Options
	  --default, -d  Use the default config instead of prompting (add/init/check --fix)
	  --fix          Add missing configs found by check

	Examples
	  $ sofic
	  $ sofic add eslint
	  $ sofic add eslint --default
	  $ sofic add --list
	  $ sofic init bun
	  $ sofic init bun --default
	  $ sofic check C:\Users\knut\dev\sofic
	  $ sofic check C:\Users\knut\dev
	  $ sofic check --fix
	  $ sofic check C:\Users\knut\dev --fix --default
`,
	{
		importMeta: import.meta,
		flags: {
			list: {
				type: 'boolean',
			},
			default: {
				type: 'boolean',
				shortFlag: 'd',
			},
			fix: {
				type: 'boolean',
			},
		},
	},
);

const command = cli.input[0];
const checkOptions = {fix: cli.flags.fix, useDefault: cli.flags.default};

switch (command) {
	case 'check': {
		const directoryPath = cli.input[1];
		await checkRepoFiles(directoryPath, checkOptions);

		break;
	}
	case 'add': {
		const tool = cli.input[1];
		await add(tool, cli.flags);

		break;
	}
	case 'init': {
		const tool = cli.input[1];
		await init(tool, cli.flags);

		break;
	}
	default: {
		if (command) {
			// If the command is set, but not one of the supported commands, print an error
			console.error(
				chalk.red(
					`Unknown command \`${command}\`. See \`sofic --help\` for available commands.`,
				),
			);
		} else {
			await checkRepoFiles(undefined, checkOptions);
		}
	}
}

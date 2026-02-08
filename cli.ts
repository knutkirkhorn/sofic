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

	Examples
	  $ sofic
	  $ sofic add eslint
	  $ sofic add --list
	  $ sofic init bun
	  $ sofic check C:\Users\knut\dev\sofic
	  $ sofic check C:\Users\knut\dev
`,
	{
		importMeta: import.meta,
		flags: {
			list: {
				type: 'boolean',
			},
		},
	},
);

const command = cli.input[0];

switch (command) {
	case 'check': {
		const directoryPath = cli.input[1];
		await checkRepoFiles(directoryPath);

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
			await checkRepoFiles();
		}
	}
}

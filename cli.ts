#!/usr/bin/env node
import chalk from 'chalk';
import meow from 'meow';
import {add} from './commands/index.js';
import {checkRepoFiles} from './index.js';

const cli = meow(
	String.raw`
	Usage
	  $ sofic
	  $ sofic add <tool>
	  $ sofic check <path>

	Examples
	  $ sofic
	  $ sofic add eslint
	  $ sofic add --list
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

if (command === 'check') {
	const directoryPath = cli.input[1];
	await checkRepoFiles(directoryPath);
} else if (command === 'add') {
	const tool = cli.input[1];
	await add(tool, cli.flags);
} else if (command) {
	// If the command is set, but not one of the supported commands, print an error
	console.error(
		chalk.red(
			`Unknown command \`${command}\`. See \`sofic --help\` for available commands.`,
		),
	);
} else {
	await checkRepoFiles();
}

#!/usr/bin/env node
import chalk from 'chalk';
import meow from 'meow';
import {checkRepoFiles} from './index.js';

const cli = meow(
	`
	Usage
	  $ sofic check <path>

	Examples
	  $ sofic check C:\\Users\\knut\\dev\\sofic
	  $ sofic check C:\\Users\\knut\\dev
`,
	{
		importMeta: import.meta,
	},
);

const command = cli.input[0];

if (command === 'check') {
	const directoryPath = cli.input[1];
	await checkRepoFiles(directoryPath);
} else {
	console.error(
		chalk.red(
			`Unknown command \`${command}\`. See \`sofic --help\` for available commands.`,
		),
	);
}

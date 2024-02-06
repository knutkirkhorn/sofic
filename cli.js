#!/usr/bin/env node
import meow from 'meow';
import {checkRepoFiles} from './index.js';

const cli = meow(
	`
	Usage
	  $ sofic <path>

	Examples
	  $ sofic C:\\Users\\knut\\dev\\sofic
	  $ sofic C:\\Users\\knut\\dev
`,
	{
		importMeta: import.meta,
	},
);

const directoryPath = cli.input[0];
await checkRepoFiles(directoryPath);

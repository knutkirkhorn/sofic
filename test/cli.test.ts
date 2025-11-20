import {expect, test} from 'bun:test';
import {execa} from 'execa';

test('cli can print out', async () => {
	const {stdout} = await execa('node', ['dist/cli.js', '--version']);
	expect(stdout.length).toBeGreaterThan(0);
});

// TODO: fix this error later
// eslint-disable-next-line unicorn/prevent-abbreviations
import fs from 'node:fs/promises';

export async function fileExists(filePath) {
	try {
		const stats = await fs.stat(filePath);
		return stats.isFile();
	} catch {
		return false;
	}
}

import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

export async function withMockedFilesystem<T>(
	files: Record<string, string>,
	callback: () => Promise<T>,
): Promise<T> {
	// Create a temporary directory
	const temporaryDirectory = await fs.mkdtemp(
		path.join(tmpdir(), 'sofic-test-'),
	);
	const originalCwd = process.cwd();

	try {
		// Write all files to the temporary directory
		for (const [filePath, content] of Object.entries(files)) {
			const fullPath = path.join(temporaryDirectory, filePath);
			const directory = path.dirname(fullPath);
			await fs.mkdir(directory, {recursive: true});
			await fs.writeFile(fullPath, content, 'utf8');
		}

		// Change to temporary directory so relative paths work
		process.chdir(temporaryDirectory);

		// Run the callback
		return await callback();
	} finally {
		// Restore original working directory
		process.chdir(originalCwd);

		// Clean up temporary directory
		await fs.rm(temporaryDirectory, {recursive: true, force: true});
	}
}

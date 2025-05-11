import {addEditorConfig} from './add/editorconfig.js';
import {addEslint} from './add/eslint.js';
import {addPrettier} from './add/prettier.js';

export async function add(tool, flags) {
	if (flags.list || !tool) {
		console.log('Available tools:');
		console.log('  - eslint');
		console.log('  - prettier');
		console.log('  - editorconfig');
		return;
	}

	// Run the add command for the tool
	switch (tool) {
		case 'eslint': {
			await addEslint();
			break;
		}
		case 'prettier': {
			await addPrettier();
			break;
		}
		case 'editorconfig': {
			await addEditorConfig();
			break;
		}
		default: {
			throw new Error(`Tool ${tool} is not supported`);
		}
	}
}

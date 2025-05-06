import {addEslint} from './add/eslint.js';

export async function add(tool) {
	// Run the add command for the tool
	switch (tool) {
		case 'eslint': {
			await addEslint();
			break;
		}
		default: {
			throw new Error(`Tool ${tool} is not supported`);
		}
	}
}

/** @type {import("prettier").Config} */
export default {
	arrowParens: 'avoid',
	bracketSpacing: false,
	semi: true,
	singleQuote: true,
	quoteProps: 'as-needed',
	trailingComma: 'all',
	printWidth: 80,
	useTabs: true,
	overrides: [
		{
			files: '*.yaml',
			options: {
				useTabs: false,
				tabWidth: 2,
			},
		},
	],
	plugins: ['@ianvs/prettier-plugin-sort-imports'],
};

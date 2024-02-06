import fs from 'node:fs/promises';
import path from 'node:path';
import stripJsonComments from 'strip-json-comments';
import {fileExists} from '../util.js';

export async function hasPackageJson(directoryPath) {
	return fileExists(path.join(directoryPath, 'package.json'));
}

// eslint-disable-next-line consistent-return
async function checkEslintPlugin(
	packageJson,
	hasDevelopmentDependencies,
	eslintConfigExists,
	eslintConfig,
	pluginName,
) {
	const hasInstalledEslintPlugin = hasDevelopmentDependencies
		? Object.keys(packageJson.devDependencies).includes(
				`eslint-plugin-${pluginName}`,
			)
		: false;
	const hasEnabledEslintPlugin = eslintConfigExists
		? eslintConfig.extends.includes(`plugin:${pluginName}/recommended`)
		: false;

	if (!hasInstalledEslintPlugin) {
		return `package.json: missing \`eslint-plugin-${pluginName}\` in \`devDependencies\``;
	}

	if (eslintConfigExists && !hasEnabledEslintPlugin) {
		return `.eslintrc.json: missing \`plugin:${pluginName}/recommended\` in \`extends\``;
	}
}

async function checkEslintConfig(directoryPath) {
	const packageJson = JSON.parse(
		await fs.readFile(path.join(directoryPath, 'package.json'), 'utf8'),
	);
	const eslintConfigPath = path.join(directoryPath, '.eslintrc.json');
	const eslintConfigExists = await fileExists(eslintConfigPath);
	const eslintConfig = eslintConfigExists
		? JSON.parse(stripJsonComments(await fs.readFile(eslintConfigPath, 'utf8')))
		: {};

	const eslintErrors = [];
	const hasDevelopmentDependencies = packageJson.devDependencies !== undefined;

	const isUsingEslint = hasDevelopmentDependencies
		? Object.keys(packageJson.devDependencies).includes('eslint')
		: false;

	if (!isUsingEslint) {
		return ['package.json: missing `eslint` in `devDependencies`'];
	}

	const isUsingAva = hasDevelopmentDependencies
		? Object.keys(packageJson.devDependencies).includes('ava')
		: false;

	if (isUsingAva) {
		const avaEslintError = await checkEslintPlugin(
			packageJson,
			hasDevelopmentDependencies,
			eslintConfigExists,
			eslintConfig,
			'ava',
		);
		if (avaEslintError) eslintErrors.push(avaEslintError);
	}

	const unicornEslintError = await checkEslintPlugin(
		packageJson,
		hasDevelopmentDependencies,
		eslintConfigExists,
		eslintConfig,
		'unicorn',
	);
	if (unicornEslintError) eslintErrors.push(unicornEslintError);

	return eslintErrors;
}

async function checkNpmPackage(directoryPath) {
	const packageJson = JSON.parse(
		await fs.readFile(path.join(directoryPath, 'package.json'), 'utf8'),
	);
	const isNotPrivate = packageJson.private !== true;

	if (!isNotPrivate) return [];

	const npmPackageErrors = [];

	const hasLockFile = await fileExists(
		path.join(directoryPath, 'package-lock.json'),
	);
	if (hasLockFile) {
		npmPackageErrors.push(
			'npm package: should not have a lockfile (`package-lock.json`)',
		);
	}

	const hasNpmrc = await fileExists(path.join(directoryPath, '.npmrc'));
	if (!hasNpmrc) {
		npmPackageErrors.push('npm package: should have a `.npmrc` file');
	}

	const isTypeScriptPackage =
		packageJson.devDependencies &&
		packageJson.devDependencies.typescript !== undefined;
	const hasIndexFile = await fileExists(path.join(directoryPath, 'index.js'));

	if (!isTypeScriptPackage && hasIndexFile) {
		const hasTypeDefinitions = await fileExists(
			path.join(directoryPath, 'index.d.ts'),
		);
		if (!hasTypeDefinitions) {
			npmPackageErrors.push(
				'npm package: should have type definitions (`index.d.ts`)',
			);
		}

		const hasTypeDefinitionTests = await fileExists(
			path.join(directoryPath, 'index.test-d.ts'),
		);
		if (!hasTypeDefinitionTests) {
			npmPackageErrors.push(
				'npm package: should have type definition tests (`index.test-d.ts`)',
			);
		}
	}

	return npmPackageErrors;
}

function checkDevelopmentDependencies(packageJson, dependencies) {
	if (packageJson.devDependencies === undefined) {
		return dependencies.map(
			dependency =>
				`package.json: missing \`${dependency}\` in \`devDependencies\``,
		);
	}

	const errors = [];

	for (const dependency of dependencies) {
		if (!Object.keys(packageJson.devDependencies).includes(dependency)) {
			errors.push(
				`package.json: missing \`${dependency}\` in \`devDependencies\``,
			);
		}
	}

	return errors;
}

export async function checkPrettierConfig(directoryPath) {
	const packageJson = JSON.parse(
		await fs.readFile(path.join(directoryPath, 'package.json'), 'utf8'),
	);

	const prettierErrors = [];
	const hasInstalledTailwind = Object.keys(
		packageJson.devDependencies,
	).includes('tailwindcss');
	const developmentDependenciesToCheck = [
		'prettier',
		'eslint-config-prettier',
		'@ianvs/prettier-plugin-sort-imports',
	];
	if (hasInstalledTailwind) {
		developmentDependenciesToCheck.push('prettier-plugin-tailwindcss');
	}
	const developmentDependencyErrors = checkDevelopmentDependencies(
		packageJson,
		developmentDependenciesToCheck,
	);
	prettierErrors.push(...developmentDependencyErrors);

	return prettierErrors;
}

export async function checkJavascriptErrors(directoryPath) {
	const errors = [];

	const npmPackageErrors = await checkNpmPackage(directoryPath);
	errors.push(...npmPackageErrors);

	const eslintErrors = await checkEslintConfig(directoryPath);
	errors.push(...eslintErrors);

	const prettierErrors = await checkPrettierConfig(directoryPath);
	errors.push(...prettierErrors);

	return errors;
}

import {defineConfig} from "eslint/config";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default defineConfig([
	{
		ignores: [
			"main.js",
			"src/main.js",
			"esbuild.config.mjs",
			"version-bump.mjs",
			"jest.config.js",
			"temp-output-debug.ts",
			"dev-notes/"
		]
	},
	...obsidianmd.configs.recommended,
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {project: "./tsconfig.json"}
		},
		rules: {
			"@typescript-eslint/no-unused-vars": ["error", {args: "all", argsIgnorePattern: "_.*"}],
			"no-prototype-builtins": "off",
			"@typescript-eslint/no-empty-function": "off",
			"semi": ["warn", "always"]
		}
	},
	{
		files: ["test/**/*.ts"],
		languageOptions: {
			globals: {...globals.jest}
		}
	}
]);

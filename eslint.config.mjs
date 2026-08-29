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
			"semi": ["warn", "always"],
			// The settings tab embeds chord-notation and code examples (`[Verse 1]`,
			// `| C C/B | Am C/G |`, `autoscroll-speed`, `a-z`) inside <code> nodes and
			// setting descriptions, where forced lower-casing is wrong or meaningless.
			"obsidianmd/ui/sentence-case": "off"
		}
	},
	{
		files: ["test/**/*.ts"],
		languageOptions: {
			globals: {...globals.jest}
		},
		rules: {
			// Test fixtures lean on Jest matchers like `expect.any()` that are typed as `any`.
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-argument": "off"
		}
	}
]);

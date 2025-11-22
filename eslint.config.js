/*
ESLint Flat Config for "daily-notes-sorter"
Strict, typed linting for high-quality, maintainable Obsidian plugins.

RULE CATALOG (what and why) — with tiny examples

1) Obsidian plugin rules (obsidianmd/*)
  - obsidianmd/prefer-file-manager-trash-file: Prefer FileManager.trashFile() to respect user settings.
    Bad:  await app.vault.delete(file);
    Good: await app.fileManager.trashFile(file);

  - obsidianmd/commands/no-command-in-command-id: Forbid the word "command" in command IDs.
    Bad:  id: "my-plugin.command-run"
    Good: id: "my-plugin.run"

  - obsidianmd/commands/no-command-in-command-name: Forbid the word "command" in command names.
    Bad:  name: "Run Command"
    Good: name: "Run"

  - obsidianmd/commands/no-default-hotkeys: Discourage default hotkeys in commands.
    Bad:  hotkeys: [{ modifiers: ["Mod"], key: "L" }]
    Good: // leave hotkeys to user preferences

  - obsidianmd/commands/no-plugin-id-in-command-id: Don’t repeat plugin ID in command ID.
    Bad:  id: "daily-notes-sorter.daily-notes-sorter-run"
    Good: id: "run"

  - obsidianmd/commands/no-plugin-name-in-command-name: Don’t repeat plugin name in command name.
    Bad:  name: "Daily Notes Sorter: Run"
    Good: name: "Run"

  - obsidianmd/settings-tab/no-manual-html-headings: Don’t use <h1..h6> in settings tabs.
    Bad:  containerEl.createEl("h2", { text: "Settings" });
    Good: this.addHeading("Settings");

  - obsidianmd/settings-tab/no-problematic-settings-headings: Avoid anti-pattern headings in settings.
    Bad:  this.addHeading("Options", { level: 0 });
    Good: this.addHeading("Options");

  - obsidianmd/vault/iterate: Avoid iterating the whole vault to find a file by path.
    Bad:  app.vault.getFiles().find(f => f.path === target);
    Good: app.vault.getAbstractFileByPath(target);

  - obsidianmd/detach-leaves: Don’t call detachLeaves() in onunload.
    Bad:  app.workspace.detachLeavesOfType(VIEW_TYPE);
    Good: // let Obsidian handle leaves lifecycle

  - obsidianmd/hardcoded-config-path: Don’t hardcode data paths; use adapter APIs.
    Bad:  const p = app.vault.adapter.basePath + "/.obsidian/plugins/x/data.json";
    Good: await this.saveData(data);

  - obsidianmd/no-forbidden-elements: Don’t attach forbidden DOM elements.
    Bad:  document.body.appendChild(iframe);
    Good: use Obsidian UI APIs/components

  - obsidianmd/no-plugin-as-component: Don’t pass the plugin instance as a component to MarkdownRenderer.
    Bad:  MarkdownRenderer.render(app, md, el, path, this);
    Good: MarkdownRenderer.render(app, md, el, path, component);

  - obsidianmd/no-sample-code: Remove template/sample code from the repo.
    Bad:  import { SampleModal } from "…/sample";
    Good: remove sample references

  - obsidianmd/no-tfile-tfolder-cast: Don’t cast to TFile/TFolder; use instanceof.
    Bad:  const f = file as TFile;
    Good: if (file instanceof TFile) { … }

  - obsidianmd/no-view-references-in-plugin: Don’t store direct view refs on the plugin.
    Bad:  this.myView = …;
    Good: get active view via workspace APIs when needed

  - obsidianmd/no-static-styles-assignment: Don’t set inline styles directly; prefer CSS classes.
    Bad:  el.style.color = "red";
    Good: el.addClass("my-plugin-error");

  - obsidianmd/object-assign: Avoid ambiguous Object.assign with two args.
    Bad:  Object.assign(obj, other);
    Good: { …obj, …other }

  - obsidianmd/platform: Don’t use navigator for OS detection.
    Bad:  if (navigator.platform.includes("Mac")) …
    Good: use Obsidian platform APIs or feature checks

  - obsidianmd/regex-lookbehind: Avoid regex lookbehinds (unsupported on some iOS).
    Bad:  /(?<=#)\w+/
    Good: alternative regex or parse logic

  - obsidianmd/validate-manifest: Validate manifest.json structure.
    Bad:  missing "version"
    Good: valid manifest with required fields

  - obsidianmd/validate-license: Validate LICENSE structure / copyright notices.
    Bad:  malformed LICENSE
    Good: proper MIT (or other) license notice

  - obsidianmd/ui/sentence-case: Enforce sentence case for UI text.
    Bad:  "AutoReveal Pane"
    Good: "Auto reveal pane"

2) TypeScript strictness (typed)
  - @typescript-eslint/no-floating-promises: Forbid unhandled promises.
    Bad:  doAsync();
    Good: await doAsync(); // or void doAsync().catch(handle)

  - @typescript-eslint/no-misused-promises: Forbid promises where void is expected.
    Bad:  el.addEventListener("click", async () => { … });
    Good: el.addEventListener("click", () => { void asyncFn(); });

  - @typescript-eslint/promise-function-async: Async-returning functions must be async.
    Bad:  function f(): Promise<void> { return doAsync(); }
    Good: async function f(): Promise<void> { await doAsync(); }

  - @typescript-eslint/consistent-type-imports: Use `import type` for type-only imports.
    Bad:  import { TFile } from "obsidian";
    Good: import type { TFile } from "obsidian";

  - @typescript-eslint/explicit-function-return-type: Require explicit return types.
    Bad:  function f(x) { return x * 2; }
    Good: function f(x: number): number { return x * 2; }

  - @typescript-eslint/no-unsafe-* (assignment/member-access/call/return/argument): Block unsafe any flows.
    Bad:  const x: any = foo(); x.bar(); return x;
    Good: const x: Known; x.bar(); return x;

  - @typescript-eslint/restrict-template-expressions: Forbid non-primitive in templates.
    Bad:  `${obj}`
    Good: `${obj.id}`

3) General quality
  - eqeqeq ("smart"): Enforce ===/!=== except nullish checks.
    Bad:  if (x == 0) …
    Good: if (x === 0) …; if (x == null) … // allowed

  - curly ("all"): Always use braces.
    Bad:  if (x) doSomething();
    Good: if (x) { doSomething(); }

  - no-console: Forbid console except warn/error/debug.
    Bad:  console.log("dbg");
    Good: console.warn("…"); console.error("…"); console.debug("…");

4) Imports hygiene
  - import/order: Enforce grouped, alphabetized imports with blank lines between groups.
    Bad:
      import z from "z";
      import a from "a";
    Good:
      import a from "a";
      import z from "z";
      // blank line between builtin/external/internal, etc.
*/
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import obsidianmd from 'eslint-plugin-obsidianmd';
import importPlugin from 'eslint-plugin-import';
import unicorn from 'eslint-plugin-unicorn';
import eslintConfigPrettier from 'eslint-config-prettier';

// Scope type-checked rules to src/**/*.ts(x)
const tsTypeChecked = tseslint.configs.recommendedTypeChecked.map((cfg) => ({
  ...cfg,
  files: ['src/**/*.ts', 'src/**/*.tsx'],
}));
const tsStrictTypeChecked = tseslint.configs.strictTypeChecked.map((cfg) => ({
  ...cfg,
  files: ['src/**/*.ts', 'src/**/*.tsx'],
}));

export default [
  // Ignore build artifacts and non-source configs
  {
    ignores: [
      'node_modules/**',
      'build/**',
      'release/**',
      'main.js',
      'eslint.config.js',
      'scripts/**',
    ],
  },

  // Enable Node globals for JS config/build scripts
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
  },

  // Base JS rules
  js.configs.recommended,

  // Base TS rules (untyped) — syntax-level safety
  ...tseslint.configs.recommended,

  // Enable typed linting for src TS files (required by many rules below)
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: process.cwd(),
      },
    },
  },

  // TS recommendedTypeChecked scoped to src
  ...tsTypeChecked,
  // TS strictTypeChecked scoped to src
  ...tsStrictTypeChecked,

  // Obsidian rules for src TS
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    plugins: { obsidianmd, import: importPlugin },
    rules: {
      'obsidianmd/sample-names': 'off',
      'obsidianmd/prefer-file-manager-trash-file': 'error',
      'obsidianmd/commands/no-command-in-command-id': 'error',
      'obsidianmd/commands/no-command-in-command-name': 'error',
      'obsidianmd/commands/no-default-hotkeys': 'error',
      'obsidianmd/commands/no-plugin-id-in-command-id': 'error',
      'obsidianmd/commands/no-plugin-name-in-command-name': 'error',
      'obsidianmd/settings-tab/no-manual-html-headings': 'error',
      'obsidianmd/settings-tab/no-problematic-settings-headings': 'error',
      'obsidianmd/vault/iterate': 'error',
      'obsidianmd/detach-leaves': 'error',
      'obsidianmd/hardcoded-config-path': 'error',
      'obsidianmd/no-forbidden-elements': 'error',
      'obsidianmd/no-plugin-as-component': 'error',
      'obsidianmd/no-sample-code': 'error',
      'obsidianmd/no-tfile-tfolder-cast': 'error',
      'obsidianmd/no-view-references-in-plugin': 'error',
      'obsidianmd/no-static-styles-assignment': 'error',
      'obsidianmd/object-assign': 'error',
      'obsidianmd/platform': 'error',
      'obsidianmd/regex-lookbehind': 'error',
      'obsidianmd/validate-manifest': 'error',
      'obsidianmd/validate-license': 'error',
      'obsidianmd/ui/sentence-case': ['error', { enforceCamelCaseLower: true }],

      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: false, allowNullish: false },
      ],

      // Naming convention (popular TS setup)
      '@typescript-eslint/naming-convention': [
        'error',
        // Variables (includes imports): allow PascalCase for constructors/components, UPPER_CASE for consts
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
        // Parameters: allow leading underscore
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
        // Class members: default camelCase
        { selector: 'memberLike', format: ['camelCase'], leadingUnderscore: 'allow' },
        // Static readonly members (constants) can be UPPER_CASE
        {
          selector: 'memberLike',
          modifiers: ['static', 'readonly'],
          format: ['UPPER_CASE', 'camelCase'],
          leadingUnderscore: 'allow',
        },
        // Types, classes, interfaces, enums, type aliases: PascalCase
        { selector: 'typeLike', format: ['PascalCase'] },
        // Enum members: PascalCase (common TS convention)
        { selector: 'enumMember', format: ['PascalCase'] },
        // Type parameters: PascalCase with T-prefix
        { selector: 'typeParameter', format: ['PascalCase'], prefix: ['T'] },
        // Interfaces should not be prefixed with I
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: { regex: '^I[A-Z]', match: false },
        },
        // Quoted properties are ignored
        { selector: 'property', modifiers: ['requiresQuotes'], format: null },
      ],

      eqeqeq: ['error', 'smart'],
      curly: ['error', 'all'],
      'no-console': ['error', { allow: ['warn', 'error', 'debug'] }],

      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  // Relax unsafe-any style rules for Obsidian File Explorer integration points,
  // which rely on untyped/loosely-typed internal APIs across app versions.
  {
    files: ['src/file-explorer-utils.ts', 'src/ui/explorer-ui.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
    },
  },

  // Enforce file naming convention (kebab-case) for source files
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    plugins: { unicorn },
    rules: {
      'unicorn/filename-case': ['error', { cases: { kebabCase: true } }],
    },
  },

  // Disable stylistic rules that conflict with Prettier
  eslintConfigPrettier,
];

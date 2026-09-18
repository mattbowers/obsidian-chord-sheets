# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Obsidian plugin (fork of `olvidalo/obsidian-chord-sheets`) that renders chord-over-lyrics / inline-chord sheets from ` ```chords ` fenced code blocks: chord highlighting, chord diagrams (guitar/ukulele/mandolin), transposition, autoscroll, and image embeds. It ships as `main.js` + `manifest.json` + `styles.css` per Obsidian's plugin format.

## Commands

Node/npm are **not on PATH** on this machine — use the WebStorm-bundled runtime:

```sh
export PATH="/Users/matthew/Library/Application Support/JetBrains/WebStorm2024.3/node/versions/22.13.1/bin:$PATH"
```

With that set:

- `npm run dev` — esbuild in watch mode (entry `src/main.ts` → `main.js`, CJS, inline sourcemaps)
- `npm run build` — `tsc -noEmit` type-check, then production esbuild bundle (minified, no sourcemap)
- `npm test` — Jest (ts-jest) over `test/**/*.test.ts`
  - single file: `npm test -- test/chordProcessing.test.ts`
  - single test: `npm test -- -t "name substring"`
- `npm run lint` — ESLint (flat config, `eslint-plugin-obsidianmd` recommended rules)

There is no separate typecheck script; `tsc -noEmit` runs as part of `build`.

## Architecture

Chord sheets render through **two independent pipelines** that share the same tokenizer/domain logic but nothing else:

1. **Reading mode** — `main.ts` registers a `MarkdownPostProcessor` that finds `code[class*=language-chords]` blocks and mounts a `ChordBlockPostProcessorView` (`chordBlockPostProcessorView.ts`, a `MarkdownRenderChild`). It tokenizes the block's raw text line-by-line and re-renders each line as annotated HTML (chords, headers, directions, embeds, etc.).
2. **Edit / live preview mode** — a CodeMirror 6 extension (`editor-extension/chordSheetsEditorExtension.ts`) composed of a `StateField` (`chordBlocksStateField.ts`, the largest file — tracks chord-block ranges across the doc, incrementally re-tokenizes on edits, builds `Decoration`s) and a `ViewPlugin` (`chordSheetsViewPlugin.ts`, handles DOM events like clicks on transpose/instrument-change buttons and dispatches `CustomEvent`s back up to `main.ts`). This mode must track edits incrementally for performance, which is why it's structured very differently from the reading-mode post-processor.

Shared foundation, used by both pipelines:

- `sheet-parsing/tokenizeLine.ts` + `sheet-parsing/tokens.ts` — the line tokenizer. Classifies each line as chord/lyric/other and splits it into typed `Token`s (chord, word, header, marker, direction, quoted, embed, rhythm, break, inlineHeader...). `%c`/`%t` line markers and auto-detection both live here.
- `chordsUtils.ts` — the `SheetChord` domain type (tonic/type/bass, or a user-defined fret shape) and small token-array helpers.
- `chordProcessing.ts` — transpose and enharmonic-toggle logic, operating on `ChordSymbolRange[]` (positions + parsed chord) to produce CodeMirror `ChangeSpec[]`. Used by both editor commands and the live-preview toolbar buttons.
- `customChordTypes.ts` — registers extra chord types with `tonal` (e.g. non-standard extensions) at plugin load.
- `instruments/` — per-instrument fretboard data/rendering. `instruments.ts` is the registry (guitar/ukulele variants/mandolin) mapping to `FretDiagramRenderer` (`fretRenderer.ts`); fingerings come from `chords-db` (a fork, pinned via git dependency in `package.json`), with support for user-defined shapes (`Bbadd13[x13333]` syntax) layered on top.
- `chordDiagrams.ts` — builds the hover/overview chord diagram popups (via `tippy.js` + Vexchords-style rendering) shared by both pipelines.

Other standalone features, each with a corresponding editor command wired up in `main.ts`:

- `autoscrollControl.ts` — per-view autoscroll (`viewAutoscrollControlMap: WeakMap<View, AutoscrollControl>`), speed persisted to frontmatter (`autoscroll-speed` property) when enabled in settings or already present.
- `imageEmbeds.ts` / `imageResizeController.ts` — parses `![[img|300]]` / `![[img|50%]]` wikilink embeds inside chord blocks and adds drag-to-resize handles in reading mode, writing the new size back into the note as a percentage.
- `chordSheetsSettings.ts` / `chordSheetsSettingTab.ts` — plugin settings shape/defaults and the Obsidian settings UI. Changing settings calls `applyNewSettingsToEditors()` in `main.ts`, which rebuilds the CodeMirror extension array and re-renders reading-mode previews for open views.

`main.ts` is the plugin entry point (`ChordSheetsPlugin extends Plugin`): wires the post-processor, editor extension, DOM event listeners bridging CodeMirror↔Obsidian, editor commands, and frontmatter-derived song title/properties display (`title`/`key`/`tempo`/`patch` properties).

## Testing

Tests live in `test/` (ts-jest, Node environment) and cover the pure logic layer: tokenizer (`tokenize.test.ts`), chord processing/transposition (`chordProcessing.test.ts`), fret rendering (`fretRenderer.test.ts`), image embeds (`imageEmbeds.test.ts`). Test fixtures with full sample chord sheets are in `test/data/`. There is no test coverage of the CodeMirror `StateField`/`ViewPlugin` layer or the Obsidian post-processor — those require manual verification in a running vault (see below).

## Manual verification

This is an Obsidian plugin; UI-facing changes (rendering, live-preview decorations, diagrams, autoscroll, settings tab) need to be checked in an actual vault, not just `npm test`/`npm run build`. The plugin directory is symlinked into the user's Live vault (`~/Documents/Vaults/Live/.obsidian/plugins/chord-sheets-mb` → this repo), so `npm run build` (or a running `npm run dev`) makes the change live after an Obsidian plugin reload — no copy step. `install.sh` (copies `main.js`/`manifest.json`/`styles.css`) is still needed for the separate Stonetable vault, which isn't symlinked.

JetBrains run configs exist for launching/debugging Obsidian with remote debugging attached (see `.run/`, and "Development" in `README.md`).

## Repo conventions

- ESLint ignores `main.js` (the bundle) — only edit files under `src/`.
- `obsidianmd/ui/sentence-case` is disabled repo-wide in `chordSheetsSettingTab.ts` because settings descriptions embed chord notation/code examples where forced lowercasing would be wrong.
- `snippets/` holds the user's personal vault CSS snippets (per-device sizing, print styles) — version-controlled here and symlinked into the Live vault via the untracked local `link-snippets.sh`. Edit files in `snippets/`, never the vault symlinks.
- `data.json` (plugin settings for the Live vault, since the plugin dir is symlinked there) is gitignored despite being present in the repo root.

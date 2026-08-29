# Vault CSS snippets

Personal Obsidian CSS snippets that style this plugin's output. Version-controlled
here because they're tightly coupled to the plugin and worth a history; they are
consumed by symlinking them into a vault's `.obsidian/snippets/` folder.

| file | device | notes |
|---|---|---|
| `chord-sheets-laptop.css` | ASUS laptop | 16px, dense 2/4-column landscape layout, horizontal-overflow warning |
| `chord-sheets-tablet.css` | Samsung Galaxy Tab A9+ | 24px, single column, page-boundary stripes, vertical scroll-snap per block |
| `chord-sheets-pdf.css` | print / PDF export | `@media print` only, A4 sizing |

Each device's `appearance.json` enables the one snippet it needs.

## Setup on a machine

```sh
./link-snippets.sh                       # links into the Live vault
./link-snippets.sh /path/to/OtherVault   # or another vault
```

`link-snippets.sh` is a local, gitignored helper (like `install.sh` /
`install-live.sh`). It replaces the vault's snippet files with symlinks to the
copies in this folder. Then enable the ones you want in
Settings → Appearance → CSS snippets.

## Editing

- **Edit the files in this folder**, not the symlinks in the vault. (Editors with
  atomic "safe write" replace a symlink with a regular file on save; editing the
  real file here avoids that.)
- Obsidian does not always notice edits made through the symlink — toggle the
  snippet off/on in Settings → Appearance, or reload the vault, to apply.
- Edits show up as normal repo changes; commit them like any other file.

## Not covered

- The stale repo-root `chord-sheets.css` and the Stonetable vault's divergent
  `chord-sheets.css` are separate cleanups.
- If Obsidian Sync's "Sync CSS snippets" is ever turned on, disable it for these
  or it will fight the symlinks across devices.

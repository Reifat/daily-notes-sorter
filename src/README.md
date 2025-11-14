# Technical Documentation

This document contains technical documentation for developers of the Daily Notes Sorter plugin.

## Plugin Architecture

### Project Structure

```
src/
├── main.ts                    # Main plugin file, entry point
├── core/
│   └── sorter.ts             # File sorting logic by date
├── file-explorer-utils.ts    # Utilities for working with FileExplorer and patching
└── ui/
    ├── settings.ts            # Plugin settings interface
    ├── explorer-ui.ts        # UI for file explorer (sort button)
    └── autocomplete-input.ts  # Autocomplete component for path input
```

### Main Components

#### 1. `DailyNotesSorter` (main.ts)
Main plugin class that:
- Initializes all components on load
- Manages plugin settings (load/save)
- Coordinates work between components
- Integrates with Obsidian daily notes settings

**Key methods:**
- `onload()` — plugin initialization
- `loadSettings()` — load saved settings
- `saveSettings()` — save settings

#### 2. `Sorter` (core/sorter.ts)
Class responsible for sorting logic:
- Extracts date from file name according to specified format
- Sorts files by date (year → month → day)
- Handles files without dates
- Shows notifications about files that don't match the format

**Key methods:**
- `extractDate(fileName, dateFormat)` — extract date from file name
- `sortFolder(folder, fileItems, ascending, dateFormat)` — sort files in folder

**Supported formats:**
- Regular expressions for each date format
- Automatic conversion of two-digit year (YY) to four-digit
- Format validation before parsing

#### 3. `FileExplorerUtils` (file-explorer-utils.ts)
Utilities for working with file explorer:
- Patching FileExplorer sort methods via `monkey-around` library
- Support for different Obsidian API versions (before and after 1.6.0)
- Sort direction management
- Applying sorting to file explorer

**Key methods:**
- `patchFileExplorerFolder()` — apply patch for custom sorting
- `applySort()` — apply sorting to FileExplorer
- `setSortDirection()` — set sort direction
- `getFolderSettings()` — get settings for specific folder

**Patching features:**
- For Obsidian >= 1.6.0: patching `getSortedFolderItems()` method
- For Obsidian < 1.6.0: patching `sort()` method in Folder prototype
- Automatic API version detection

#### 4. `SorterSettings` (ui/settings.ts)
Plugin settings interface:
- Add/remove folders for sorting
- Select date format for each folder
- Path validation
- Path autocomplete on input

**Key features:**
- Folder list caching for performance
- Real-time validation
- Visual error indication (red border) and successful validation (green border)
- Automatic folder list update on vault changes

**UI elements:**
- Path input field with autocomplete
- Date format dropdown
- Delete item button
- Add new item button
- Apply settings button

#### 5. `ExplorerUI` (ui/explorer-ui.ts)
File explorer UI:
- Add sort button to FileExplorer header
- Toggle between ascending and descending sort
- Visual button styling

**Integration:**
- Uses `addSortButton()` method from FileExplorer API
- Saves sort state between sessions

#### 6. `AutocompleteInput` (ui/autocomplete-input.ts)
Autocomplete component:
- Filter folder list by entered text
- Display suggestions in dropdown
- Automatic list height adjustment to content
- Limit number of displayed suggestions (20 items)

**Features:**
- Adaptive list height considering available screen space
- Scrolling with many suggestions
- Focus and blur event handling
- Duplicate prevention in suggestion list

## Technical Details

### Dependencies

- **obsidian** — Obsidian API for plugin development
- **monkey-around** — library for method patching
- **moment** — date handling (used for getting daily notes settings)
- **typescript** — development language

### Compatibility

- **Minimum Obsidian version:** 0.15.0
- **API version support:** 
  - Obsidian < 1.6.0: patching via `createFolderDom()`
  - Obsidian >= 1.6.0: patching via `getSortedFolderItems()`

### Settings Data Structure

```typescript
interface DailyNotesSorterSettings {
    items: FolderItem[];           // List of folders for sorting
    sortAscending: boolean;        // Sort direction
}

interface FolderItem {
    path: string;                  // Folder path
    dateFormat: string;            // Date format (YYYY-MM-DD, DD.MM.YYYY, etc.)
}
```

### Sorting Algorithm

1. **Date extraction:** Plugin analyzes the beginning of file name and attempts to extract date according to specified format
2. **File separation:** Files are separated into two groups:
   - Files with date (will be sorted by date)
   - Files without date (will be sorted by name)
3. **Sorting:**
   - Files with date are sorted by year → month → day
   - Files without date are sorted by name (alphabetically)
4. **Combining:**
   - With ascending sort: files with date first, then without date
   - With descending sort: files without date first, then with date

### Error Handling

- Path validation before applying settings
- Check for folder existence in vault
- Error handling when loading/saving settings
- Notifications about files that don't match date format
- Error logging to console for debugging

## Development

### Requirements

- Node.js >= 16
- npm or yarn

### Installing Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

This command starts esbuild in watch mode and automatically rebuilds on source changes.

Local auto-install during development:
- Create `install-config.env` in the repository root with at least:
  ```bash
  DEST_DIR=/absolute/path/to/YourVault/.obsidian/plugins/daily-notes-sorter
  ```
  `RELEASE_TAG` is not required for dev installs.
- While `npm run dev` is running, on each successful rebuild the dev workflow:
  - Builds artifacts into `build/dev` via `scripts/build.js Dev`
  - Installs them into `DEST_DIR` via `scripts/install.js Dev` (delegates to `scripts/install/install.(sh|bat)`)

### Production Build

```bash
npm run build
```

This produces the compiled `main.js` in repo root. To create a distributable zip and stage release artifacts:

```bash
npm run release
```

What `release` does:
- format → lint → build
- runs `node scripts/build.js Release`:
  - copies `main.js`, `manifest.json`, `styles.css` into `build/release/`
  - creates `<plugin-id>-<version>.zip` inside `build/release/`

### NPM Scripts Reference

- `npm run dev`
  - Runs esbuild in watch mode and on each successful rebuild:
    - builds dev artifacts to `build/dev`
    - installs them to `DEST_DIR` via `scripts/install.js Dev`
- `npm run build`
  - Type-checks with `tsc` (no emit) and builds production bundle (`main.js`)
- `npm run release`
  - Runs: `format` → `lint` → `build` → `node scripts/build.js Release`
  - Produces `<plugin-id>-<version>.zip` in `build/release/`
- `npm run lint`
  - ESLint over the repo. Fails on warnings (`--max-warnings=0`)
- `npm run lint:fix`
  - ESLint with auto-fix (`--fix`)
- `npm run format`
  - Prettier write formatting (`prettier --write .`)
- `npm run format:check`
  - Prettier check mode (`prettier --check .`)
- `npm run install:release`
  - Installs plugin from local `build/release` artifacts into `DEST_DIR`
  - Requires `install-config.env` with `DEST_DIR`
  - Note: does not download from GitHub; for download-and-install use platform script without arguments:
    - macOS/Linux: `bash scripts/install/install.sh`
    - Windows: `scripts\install\install.bat`

### Build Structure

- `main.js` — compiled JavaScript plugin file
- `styles.css` — styles for UI components
- `manifest.json` — plugin manifest with metadata

### Install Scripts (manual/local)

Install scripts live in `scripts/install/`:
- `install.sh` (Unix/macOS)
- `install.bat` (Windows)
- `install.command` (macOS double-click wrapper)

Configuration:
- Create `install-config.env` in repository root:
  ```bash
  # Required for any install
  DEST_DIR=/absolute/path/to/YourVault/.obsidian/plugins/daily-notes-sorter
  # Required only for download-and-install mode
  RELEASE_TAG=1.0.0
  ```

Usage:
- Download-and-install from GitHub Releases (uses `RELEASE_TAG`):
  - macOS/Linux: `bash scripts/install/install.sh`
  - Windows: `scripts\install\install.bat`
- Install from local build output:
  - Release: `bash scripts/install/install.sh Release` or `scripts\install\install.bat Release`
  - Dev: `bash scripts/install/install.sh Dev` or `scripts\install\install.bat Dev`

Details:
- Downloaded archives are cached in `build/release/<RELEASE_TAG>/extracted`
- No marker files are required; install path is computed from `RELEASE_TAG`

## Implementation Details

### FileExplorer Patching

The plugin uses the `monkey-around` library to intercept FileExplorer sort methods. This allows:
- Not modifying Obsidian source code
- Working with different API versions
- Correctly handling patch removal when plugin is unloaded

### Caching

For performance improvement, caching is used:
- Folder list in vault is cached in settings
- Cache is automatically invalidated when vault structure changes
- Cache update on file/folder create/delete/rename

### Validation

Multi-level validation:
- Check folder existence when entering path
- Visual indication (input field border color)
- Check all items before applying settings
- Prevent adding empty items

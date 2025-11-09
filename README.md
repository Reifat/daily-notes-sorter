# Daily Notes Sorter

An Obsidian plugin that allows you to automatically sort daily notes by date in the file explorer.

## Description

**Daily Notes Sorter** is an Obsidian plugin that extends the file explorer functionality by adding the ability to automatically sort files by date in specified folders. The plugin analyzes file names, extracts dates according to the specified format, and sorts files in chronological order.

## Features

### 📁 Date Sorting
- Automatic sorting of files in specified folders by date
- Support for multiple date formats:
  - `YYYY-MM-DD` (ISO format, e.g.: 2024-01-15)
  - `DD.MM.YYYY` (European format, e.g.: 15.01.2024)
  - `DD.MM.YY` (European short format, e.g.: 15.01.24)
  - `MM/DD/YYYY` (US format, e.g.: 01/15/2024)

### 🔄 Sort Direction
- Ascending sort (from old to new)
- Descending sort (from new to old)
- Toggle sort direction via button in file explorer interface

### ⚙️ Flexible Configuration
- Configure individual folders with custom date formats
- Autocomplete folder paths when configuring
- Real-time path validation
- Settings persistence between sessions

### 🔔 Notifications
- Automatic notifications about files that don't match the specified date format
- Files without dates are placed at the beginning (descending) or end (ascending) of the list

## Usage

### Installation

#### Via Community Plugins (Recommended)

1. Open Obsidian Settings
2. Go to **Community plugins**
3. Make sure **Safe mode** is **off**
4. Click **Browse** and search for "Daily notes sorter"
5. Click **Install** and then **Enable**

#### Manual Installation

1. Download the latest release from the [GitHub repository](https://github.com/Reifat/daily-notes-sorter) (or clone the repository)
2. Copy the files `main.js`, `manifest.json`, and `styles.css` to `.obsidian/plugins/daily-notes-sorter/` folder in your vault
3. Reload Obsidian
4. Enable the plugin in Obsidian settings (Settings → Community plugins)

### Configuration

1. Open plugin settings (Settings → Daily notes sorter settings)
2. Click "Add item" to add a new folder
3. Enter folder path (you can use autocomplete)
4. Select date format from dropdown
5. Click "Apply settings" to apply changes

### Using in File Explorer

1. After configuring folders, sorting is applied automatically
2. A button for toggling sort direction will appear in the file explorer header
3. Click the button to toggle between ascending and descending sort

> **For developers:** Technical documentation, including plugin architecture, technical details, development instructions, and implementation details, can be found in [`src/README.md`](src/README.md).

## Known Limitations

1. **Date format at the beginning of file name:** The plugin only searches for dates at the beginning of file names. If the date is in the middle or end of the name, it will not be recognized.

2. **Files only:** The plugin sorts only files (TFile), folders remain in their places.

3. **FileExplorer dependency:** The plugin requires the built-in "Files" (FileExplorer) plugin to be enabled.

4. **One format per folder:** Each folder can have only one date format. If a folder contains files with different date formats, they may be sorted incorrectly.

## Future Improvements

- Support for additional date formats
- Search for date anywhere in file name
- Sort folders by date
- Group files by months/years
- Export/import settings

## License

MIT

## Author

Nick (GitHub: [@Reifat](https://github.com/Reifat))

## Support

If you found a bug or have a suggestion for improvement, please create an issue in the project repository.

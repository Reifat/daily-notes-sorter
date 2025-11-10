import { Plugin } from 'obsidian';

import { Sorter } from './core/sorter';
import { FileExplorerUtils } from './file-explorer-utils';
import { ExplorerUI } from './ui/explorer-ui';
import { SorterSettings } from './ui/settings';

const DEFAULT_DAILY_NOTE_FORMAT = 'YYYY-MM-DD';

export interface FolderItem {
  path: string;
  dateFormat: string;
}

interface DailyNotesSorterSettings {
  items: FolderItem[];
  sortAscending: boolean;
}

const DEFAULT_SETTINGS: DailyNotesSorterSettings = {
  items: [],
  sortAscending: true,
};

export default class DailyNotesSorter extends Plugin {
  settings!: DailyNotesSorterSettings;
  private sorter!: Sorter;
  private fileExplorerUtils!: FileExplorerUtils;
  private explorerUI!: ExplorerUI;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Initialize sorter with App for showing notifications
    this.sorter = new Sorter(this.app);

    // Initialize utilities for working with FileExplorer
    this.fileExplorerUtils = new FileExplorerUtils(
      this.app,
      this,
      this.sorter,
      this.settings,
      this,
    );

    // Initialize UI for FileExplorer
    this.explorerUI = new ExplorerUI(this.app, this.fileExplorerUtils);

    this.fileExplorerUtils
      .waitForFileExplorer((fileExplorer) => {
        this.fileExplorerUtils.patchFileExplorerFolder(fileExplorer);
        this.explorerUI.initialize(fileExplorer);

        // Apply sorting after plugin load
        // Use a small delay to ensure the patch is applied
        setTimeout(() => {
          this.fileExplorerUtils.applySort();
        }, 100);
      })
      .catch((err: unknown) => {
        console.error('[DailyNotesSorter] Error initializing FileExplorer:', err);
        // Note: We don't show a Notice here as the plugin might still work
        // if FileExplorer loads later
      });

    this.addSettingTab(new SorterSettings(this.app, this));
  }

  onunload(): void {
    // Cleanup is handled automatically by Obsidian:
    // - Patches registered via this.plugin.register() are automatically uninstalled
    // - Setting tabs are automatically removed
    // - Event listeners registered via this.registerEvent() are automatically removed

    // Cleanup UI components (e.g., remove sort button from FileExplorer)
    this.explorerUI.cleanup();
  }

  async loadSettings(): Promise<void> {
    try {
      const loadedData: unknown = await this.loadData();

      // Initialize settings with default values
      this.settings = Object.assign({}, DEFAULT_SETTINGS);

      // If there is loaded data, apply it
      if (loadedData && typeof loadedData === 'object') {
        const data = loadedData as {
          items?: Array<{ path?: string; dateFormat?: string }>;
          sortAscending?: boolean;
        };

        if (Array.isArray(data.items)) {
          this.settings.items = data.items.map((item) => ({
            path: item.path || '',
            dateFormat: item.dateFormat || DEFAULT_DAILY_NOTE_FORMAT,
          }));
        }
        // Load saved sort state
        if (typeof data.sortAscending === 'boolean') {
          this.settings.sortAscending = data.sortAscending;
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // In case of error, use default settings
      this.settings = Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  async saveSettings(): Promise<void> {
    try {
      // Ensure data structure is correct before saving
      // Validate and normalize data before saving
      this.settings.items = this.settings.items.map((item) => ({
        path: item.path || '',
        dateFormat: item.dateFormat || DEFAULT_DAILY_NOTE_FORMAT,
      }));

      // Save sort state from FileExplorerUtils
      this.settings.sortAscending = this.fileExplorerUtils.sortAscending;

      await this.saveData(this.settings);

      // Update settings in FileExplorerUtils after saving
      this.fileExplorerUtils.updateSettings(this.settings);
      // Apply sorting after updating settings
      this.fileExplorerUtils.applySort();
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }
}

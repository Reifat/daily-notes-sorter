import { around } from 'monkey-around';
import { requireApiVersion } from 'obsidian';

import type { Sorter } from './core/sorter';
import type { FolderItem } from './main';
import type { App, Plugin, FileExplorerView, TFolder } from 'obsidian';

// the monkey-around package doesn't export the below type
type MonkeyAroundUninstaller = () => void;

export class FileExplorerUtils {
  private app: App;
  private plugin: Plugin;
  private sorter: Sorter;
  private settings: { items: FolderItem[]; sortAscending?: boolean };
  private pluginInstance: { saveSettings: () => Promise<void> } | undefined; // Reference to plugin instance for saving settings
  public sortAscending: boolean = true; // Public for access from closure

  constructor(
    app: App,
    plugin: Plugin,
    sorter: Sorter,
    settings: { items: FolderItem[]; sortAscending?: boolean },
    pluginInstance?: { saveSettings: () => Promise<void> },
  ) {
    this.app = app;
    this.plugin = plugin;
    this.sorter = sorter;
    this.settings = settings;
    this.pluginInstance = pluginInstance;
    // Restore saved sort state
    if (settings.sortAscending !== undefined) {
      this.sortAscending = settings.sortAscending;
    }
  }

  /**
   * Updates settings (called when plugin settings change)
   */
  updateSettings(settings: { items: FolderItem[]; sortAscending?: boolean }): void {
    this.settings = settings;
    // Update sort state if it exists in settings
    if (settings.sortAscending !== undefined) {
      this.sortAscending = settings.sortAscending;
    }
  }

  /**
   * Checks if sorting is enabled for specified path
   * @param path - path to folder
   * @returns object with folder settings information or undefined
   */
  private getFolderSettings(path: string): FolderItem | undefined {
    return this.settings.items.find((item) => {
      // Compare paths, accounting for possible variants (with "/" and without)
      const normalizedItemPath = item.path.startsWith('/') ? item.path : `/${item.path}`;
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return item.path === path || normalizedItemPath === normalizedPath;
    });
  }

  /**
   * Sets sort direction and updates display
   * @param ascending - true for ascending, false for descending
   * @param saveSettings - whether to save settings (default true)
   */
  setSortDirection(ascending: boolean, saveSettings: boolean = true): void {
    this.sortAscending = ascending;

    // Update plugin settings
    this.settings.sortAscending = ascending;

    // Save settings if required
    if (saveSettings && this.pluginInstance) {
      this.pluginInstance.saveSettings().catch((err: unknown) => {
        console.error('[FileExplorerUtils] Error saving sort direction:', err);
      });
    }

    // Update sorting after changing direction
    this.applySort();
  }

  /**
   * Applies sorting to FileExplorer
   */
  applySort(): void {
    const fileExplorerView = this.getFileExplorer();
    if (fileExplorerView && typeof fileExplorerView.requestSort === 'function') {
      fileExplorerView.requestSort();
    }
  }

  /**
   * Gets current sort direction
   */
  getSortDirection(): boolean {
    return this.sortAscending;
  }

  /**
   * Gets FileExplorerView instance from workspace
   */
  getFileExplorer(): FileExplorerView | undefined {
    const fileExplorer: FileExplorerView | undefined = this.app.workspace
      .getLeavesOfType('file-explorer')
      .first()?.view as unknown as FileExplorerView;
    return fileExplorer;
  }

  /**
   * Waits for FileExplorer to load and executes callback
   * @param callback - function that will be called when FileExplorer loads
   * @param interval - check interval in milliseconds (default 100)
   * @param timeout - wait timeout in milliseconds (default 5000)
   */
  async waitForFileExplorer(
    callback: (fileExplorer: FileExplorerView) => void,
    interval: number = 100,
    timeout: number = 5000,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkFileExplorer = (): void => {
        const fileExplorer = this.getFileExplorer();
        if (fileExplorer) {
          clearInterval(timer);
          callback(fileExplorer);
          resolve();
        } else if (Date.now() - startTime > timeout) {
          clearInterval(timer);
          reject(new Error('[FileExplorerUtils] FileExplorer was not loaded, reason is time up!'));
        }
      };
      const timer = setInterval(checkFileExplorer, interval);
    });
  }

  /**
   * Checks availability and patchability of FileExplorer
   */
  checkFileExplorerIsAvailableAndPatchable(
    logWarning: boolean = true,
  ): FileExplorerView | undefined {
    const fileExplorerView: FileExplorerView | undefined = this.getFileExplorer();
    if (fileExplorerView && typeof fileExplorerView.requestSort === 'function') {
      // The plugin integration points changed with Obsidian 1.6.0 hence the patchability-check should also be Obsidian version aware
      if (requireApiVersion('1.6.0')) {
        if (typeof fileExplorerView.getSortedFolderItems === 'function') {
          return fileExplorerView;
        }
      } else {
        // Obsidian versions prior to 1.6.0
        if (typeof fileExplorerView.createFolderDom === 'function') {
          return fileExplorerView;
        }
      }
    }
    // Various scenarios when File Explorer was turned off (e.g. by some other plugin)
    if (logWarning) {
      const msg =
        `custom-sort v${this.plugin.manifest.version}: failed to locate File Explorer. The 'Files' core plugin can be disabled.\n` +
        `Some community plugins can also disable it.\n` +
        `See the example of MAKE.md plugin: https://github.com/Make-md/makemd/issues/25\n` +
        `You can find there instructions on how to re-enable the File Explorer in MAKE.md plugin`;
      console.warn(msg);
    }
    return undefined;
  }

  /**
   * Applies patch to FileExplorer for custom sorting
   */
  patchFileExplorerFolder(patchableFileExplorer?: FileExplorerView): boolean {
    // Capture methods and properties needed in closures
    const getFolderSettings = (path: string): FolderItem | undefined =>
      this.getFolderSettings(path);
    const getSortAscending = (): boolean => this.sortAscending;
    const sorter = this.sorter;
    const checkFileExplorerIsAvailableAndPatchable = (
      logWarning: boolean,
    ): FileExplorerView | undefined => this.checkFileExplorerIsAvailableAndPatchable(logWarning);

    const requestStandardObsidianSortAfter = (
      patchUninstaller: MonkeyAroundUninstaller | undefined,
    ): (() => void) => {
      return (): void => {
        if (patchUninstaller) {
          patchUninstaller();
        }

        const fileExplorerView: FileExplorerView | undefined =
          checkFileExplorerIsAvailableAndPatchable(false);
        if (fileExplorerView) {
          fileExplorerView.requestSort();
        }
      };
    };

    // patching file explorer might fail here because of various non-error reasons.
    // That's why not showing and not logging error message here
    patchableFileExplorer =
      patchableFileExplorer ?? this.checkFileExplorerIsAvailableAndPatchable(false);
    if (patchableFileExplorer) {
      if (requireApiVersion('1.6.0')) {
        // Starting from Obsidian 1.6.0 the sorting mechanics has been significantly refactored internally in Obsidian
        const uninstallerOfFolderSortFunctionWrapper: MonkeyAroundUninstaller = around(
          patchableFileExplorer.constructor.prototype,
          {
            getSortedFolderItems: (old: (folder: TFolder) => unknown[]) => {
              return function (this: FileExplorerView, folder: TFolder): unknown[] {
                const folderPath = folder.path;
                const folderSettings = getFolderSettings(folderPath);
                if (folderSettings) {
                  const ascending = getSortAscending();
                  const dateFormat = folderSettings.dateFormat;
                  return sorter.sortFolder(folder, this.fileItems, ascending, dateFormat);
                } else {
                  // default sort
                  return old.call(this, folder);
                }
              };
            },
          },
        );
        this.plugin.register(
          requestStandardObsidianSortAfter(uninstallerOfFolderSortFunctionWrapper),
        );
        return true;
      } else {
        // Up to Obsidian 1.6.0
        const tmpFolder = this.app.vault.getRoot();
        const Folder = patchableFileExplorer.createFolderDom(tmpFolder).constructor;
        const uninstallerOfFolderSortFunctionWrapper: MonkeyAroundUninstaller = around(
          Folder.prototype,
          {
            sort: (old: (folder: TFolder) => unknown[]) => {
              return function (
                this: { fileItems: Record<string, unknown> },
                folder: TFolder,
              ): unknown[] {
                const folderPath = folder.path;
                const folderSettings = getFolderSettings(folderPath);
                if (folderSettings) {
                  const ascending = getSortAscending();
                  const dateFormat = folderSettings.dateFormat;
                  return sorter.sortFolder(folder, this.fileItems, ascending, dateFormat);
                } else {
                  // default sort
                  return old.call(this, folder);
                }
              };
            },
          },
        );
        this.plugin.register(
          requestStandardObsidianSortAfter(uninstallerOfFolderSortFunctionWrapper),
        );
        return true;
      }
    } else {
      return false;
    }
  }
}

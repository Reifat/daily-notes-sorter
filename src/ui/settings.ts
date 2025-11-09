import { App, PluginSettingTab, Setting, TFolder, Notice } from 'obsidian';
import DailyNotesSorter from '../main';
import { AutocompleteInput } from './autocomplete-input';

enum SettingsLoadState {
    Unknown = "Unknown",
    Loading = "Loading",
    Loaded = "Loaded",
}

// Configuration constants
const INPUT_PLACEHOLDER = "Example: /folder/note";
const INPUT_DESCRIPTION = "Enter the path to the folder";
const SETTINGS_TITLE = "Daily notes sorter settings";
const ADD_BUTTON_TEXT = "Add item";
const APPLY_BUTTON_TEXT = "Apply settings";

// Date formats
const DATE_FORMATS = [
    { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO)" },
    { value: "DD.MM.YYYY", label: "DD.MM.YYYY (European)" },
    { value: "DD.MM.YY", label: "DD.MM.YY (European short)" },
    { value: "MM/DD/YYYY", label: "MM/DD/YYYY (US)" },
] as const;

const DEFAULT_DATE_FORMAT = "YYYY-MM-DD";

export class SorterSettings extends PluginSettingTab {
    plugin: DailyNotesSorter;
    private itemsContainer: HTMLElement | null = null;
    private cachedFolders: string[] | null = null;
    private activeAutocompleteInputs: Set<AutocompleteInput> = new Set();
    private inputElements: Map<number, HTMLInputElement> = new Map();
    private loadState: SettingsLoadState;

    constructor(app: App, plugin: DailyNotesSorter) {
        super(app, plugin);
        this.plugin = plugin;
        this.loadState = this.plugin.settings ? SettingsLoadState.Loaded : SettingsLoadState.Unknown;
        
        // Update cache and open lists when vault changes
        this.plugin.registerEvent(
            this.plugin.app.vault.on("create", () => {
                this.invalidateCache();
            })
        );
        
        this.plugin.registerEvent(
            this.plugin.app.vault.on("delete", () => {
                this.invalidateCache();
            })
        );
        
        this.plugin.registerEvent(
            this.plugin.app.vault.on("rename", () => {
                this.invalidateCache();
            })
        );
    }

    /**
     * Invalidates cache and updates all open suggestion lists
     */
    private invalidateCache(): void {
        this.cachedFolders = null;
        // Update all visible suggestion lists
        this.activeAutocompleteInputs.forEach((input) => {
            if (input.isVisible()) {
                input.refresh();
            }
        });
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Clear list of active components on redraw
        this.activeAutocompleteInputs.clear();
        this.inputElements.clear();
        
        // Reset cache when opening settings
        this.cachedFolders = null;

        // State-driven loading and rendering
        if (this.loadState !== SettingsLoadState.Loaded || !this.plugin.settings) {
            if (this.loadState === SettingsLoadState.Unknown) {
                this.loadState = SettingsLoadState.Loading;
                this.plugin.loadSettings()
                    .then(() => {
                        this.loadState = SettingsLoadState.Loaded;
                        this.display();
                    })
                    .catch((err: Error) => {
                        console.error("[SorterSettings] Error loading settings:", err);
                        // Allow retry on next display invocation
                        this.loadState = SettingsLoadState.Unknown;
                    });
            }
            // Do not render anything until settings are fully loaded
            return;
        }

        this.renderHeader(containerEl);
        this.itemsContainer = this.createItemsContainer(containerEl);
        this.renderItems();
        this.renderAddButton(containerEl);
        this.renderApplyButton(containerEl);
    }

    private renderHeader(container: HTMLElement): void {
        new Setting(container).setName(SETTINGS_TITLE).setHeading();
    }

    private createItemsContainer(container: HTMLElement): HTMLElement {
        return container.createDiv();
    }

    private renderItems(): void {
        if (!this.itemsContainer) return;

        this.itemsContainer.empty();

        if (this.plugin.settings.items.length === 0) {
            this.renderEmptyState();
            return;
        }

        this.plugin.settings.items.forEach((item, index: number) => {
            this.renderItem(item, index);
        });
    }

    private renderEmptyState(): void {
        if (!this.itemsContainer) return;

        this.itemsContainer.createDiv({
            cls: "setting-item-description",
            text: "No items. Click 'Add item' to create a new one.",
        });
    }

    private renderItem(item: { path: string; dateFormat?: string }, index: number): void {
        if (!this.itemsContainer) return;

        const itemDiv = this.itemsContainer.createDiv({
            cls: "setting-item-custom-plugin",
        });

        const inputSetting = this.createInputSetting(itemDiv, item.path || "", index);
        this.addDateFormatComboBox(inputSetting, item.dateFormat || DEFAULT_DATE_FORMAT, index);
        this.addDeleteButton(inputSetting, index);
    }

    /**
     * Gets list of all folders from vault
     * Uses caching to improve performance
     */
    private getFoldersFromVault(): string[] {
        // Return cached list if available
        if (this.cachedFolders !== null) {
            return this.cachedFolders;
        }

        try {
            const allFiles = this.plugin.app.vault.getAllLoadedFiles();
            const folders = allFiles
                .filter((file): file is TFolder => file instanceof TFolder)
                .map((folder) => folder.path)
                .sort(); // Sort for user convenience

            // Cache the result
            this.cachedFolders = folders;
            return folders;
        } catch (error) {
            console.error("Error getting folders from vault:", error);
            return [];
        }
    }

    /**
     * Validates path - checks if it exists in vault
     */
    private validatePath(path: string): boolean {
        if (!path || path.trim() === "") {
            return false;
        }

        const trimmedPath = path.trim();
        const file = this.plugin.app.vault.getAbstractFileByPath(trimmedPath);
        return file !== null && file instanceof TFolder;
    }

    /**
     * Validates all settings items
     */
    private validateAllItems(): boolean {
        let isValid = true;

        this.plugin.settings.items.forEach((item, index) => {
            const isValidPath = this.validatePath(item.path);
            const inputEl = this.inputElements.get(index);

            if (inputEl) {
                if (!isValidPath) {
                    inputEl.addClass("input-error");
                    inputEl.removeClass("input-valid");
                    isValid = false;
                } else {
                    inputEl.removeClass("input-error");
                    inputEl.addClass("input-valid");
                }
            } else {
                if (!isValidPath) {
                    isValid = false;
                }
            }
        });

        return isValid;
    }

    /**
     * Validates a single item by index
     */
    private validateItem(index: number): boolean {
        const item = this.plugin.settings.items[index];
        if (!item) return false;

        const isValid = this.validatePath(item.path);
        const inputEl = this.inputElements.get(index);

        if (inputEl) {
            if (!isValid) {
                inputEl.addClass("input-error");
                inputEl.removeClass("input-valid");
            } else {
                inputEl.removeClass("input-error");
                inputEl.addClass("input-valid");
            }
        }

        return isValid;
    }

    private createInputSetting(
        container: HTMLElement,
        value: string,
        index: number
    ): Setting {
        const setting = new Setting(container)
            .setName(`Item ${index + 1}`)
            .setDesc(INPUT_DESCRIPTION)
            .addText((text) => {
                text.setPlaceholder(INPUT_PLACEHOLDER);
                text.setValue(value);

                // Save reference to input element for validation
                this.inputElements.set(index, text.inputEl);

                // Validation on load
                if (value) {
                    this.validateItem(index);
                }

                // Create autocomplete component with folder retrieval function
                const autocompleteInput = new AutocompleteInput(
                    container,
                    text.inputEl,
                    () => this.getFoldersFromVault(),
                    (newValue: string) => {
                        this.plugin.settings.items[index].path = newValue;
                        // Real-time validation
                        this.validateItem(index);
                    }
                );
                
                // Register component for real-time updates
                this.activeAutocompleteInputs.add(autocompleteInput);

                // Value change handler with real-time validation
                text.onChange((newValue: string) => {
                    this.plugin.settings.items[index].path = newValue;
                    // Real-time validation
                    this.validateItem(index);
                });

                // Validation on blur
                text.inputEl.addEventListener("blur", () => {
                    this.validateItem(index);
                });
            });

        return setting;
    }

    /**
     * Adds dropdown for date format selection
     */
    private addDateFormatComboBox(
        setting: Setting,
        currentFormat: string,
        index: number
    ): void {
        setting.addDropdown((dropdown) => {
            // Add options to dropdown
            DATE_FORMATS.forEach((format) => {
                dropdown.addOption(format.value, format.label);
            });

            // Set current value
            dropdown.setValue(currentFormat || DEFAULT_DATE_FORMAT);

            // Format change handler
            dropdown.onChange((value: string) => {
                this.plugin.settings.items[index].dateFormat = value;
            });
        });
    }

    private addDeleteButton(setting: Setting, index: number): void {
        setting.addExtraButton((button) => {
            button.setIcon("trash")
                .setTooltip("Delete")
                .onClick(() => {
                    this.deleteItem(index);
                });
        });
    }

    private deleteItem(index: number): void {
        this.plugin.settings.items.splice(index, 1);
        this.inputElements.delete(index);
        // Update indices for remaining elements
        const newMap = new Map<number, HTMLInputElement>();
        this.inputElements.forEach((el, oldIndex) => {
            if (oldIndex > index) {
                newMap.set(oldIndex - 1, el);
            } else if (oldIndex < index) {
                newMap.set(oldIndex, el);
            }
        });
        this.inputElements = newMap;
        this.renderItems();
    }

    private renderAddButton(container: HTMLElement): void {
        const buttonContainer = container.createDiv({
            cls: "add-button-container",
        });

        buttonContainer.createEl("button", {
            text: ADD_BUTTON_TEXT,
        }).onclick = () => {
            this.addItem();
        };
    }

    private addItem(): void {
        // Check if there are empty items before adding a new one
        const hasEmptyItems = this.plugin.settings.items.some(
            (item) => !item.path || item.path.trim() === ""
        );

        if (hasEmptyItems) {
            new Notice("Please fill in all existing items before adding a new one.");
            return;
        }

        this.plugin.settings.items.push({
            path: "",
            dateFormat: DEFAULT_DATE_FORMAT,
        });
        this.renderItems();
    }

    /**
     * Renders apply settings button
     */
    private renderApplyButton(container: HTMLElement): void {
        const buttonContainer = container.createDiv({
            cls: "apply-button-container",
        });

        const applyButton = buttonContainer.createEl("button", {
            cls: "apply-button",
            text: APPLY_BUTTON_TEXT,
        });

        applyButton.onclick = async () => {
            await this.applySettings();
        };
    }

    /**
     * Applies settings: validates, saves and shows result
     */
    private async applySettings(): Promise<void> {
        // Remove empty items before validation
        this.plugin.settings.items = this.plugin.settings.items.filter(
            (item) => item.path && item.path.trim() !== ""
        );

        // Validate all items
        const isValid = this.validateAllItems();

        if (!isValid) {
            new Notice("Please fix all errors before applying settings.");
            return;
        }

        // Save settings
        try {
            await this.plugin.saveSettings();
            
            // Remove all validation indicators after successful application
            this.inputElements.forEach((inputEl) => {
                inputEl.removeClass("input-error");
                inputEl.removeClass("input-valid");
            });
            
            new Notice("Settings applied successfully!");
        } catch (error) {
            console.error("Error applying settings:", error);
            new Notice("Error applying settings. Please try again.");
        }
    }
}


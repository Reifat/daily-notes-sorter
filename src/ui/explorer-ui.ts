import { App, FileExplorerView, WorkspaceLeaf } from 'obsidian';
import { FileExplorerUtils } from '../file-explorer-utils';

export class ExplorerUI {
	private app: App;
	private fileExplorerUtils: FileExplorerUtils;

	private readonly SORT_OPTIONS = [
		{ id: 'ascending', label: 'Ascending' },
		{ id: 'descending', label: 'Descending' }
	];

	constructor(app: App, fileExplorerUtils: FileExplorerUtils) {
		this.app = app;
		this.fileExplorerUtils = fileExplorerUtils;
	}

	initialize(fileExplorer: FileExplorerView): void {
		if (!fileExplorer?.headerDom.navButtonsEl) {
			return;
		}

		const sortOptions: string[][] = [this.SORT_OPTIONS.map(opt => opt.id)];
		const descriptions: Record<string, () => string> = {};
		this.SORT_OPTIONS.forEach(opt => {
			descriptions[opt.id] = () => opt.label;
		});

		fileExplorer.headerDom.addSortButton(
			sortOptions,
			descriptions,
			(value: string | number) => {
				const ascending = typeof value === 'string' ? value === 'ascending' : value === 0;
				this.fileExplorerUtils.setSortDirection(ascending);
			},
			() => this.fileExplorerUtils.sortAscending ? 'ascending' : 'descending'
		);

		// Style the button using CSS class and custom color
		setTimeout(() => {
			const button = fileExplorer.headerDom.navButtonsEl?.lastElementChild as HTMLElement;
			if (button) {
				button.addClass("file-explorer-sort-button");
				const svg = button.querySelector("svg") as unknown as HTMLElement;
				if (svg && typeof svg.setCssProps === 'function') {
					svg.setCssProps({
						"--sort-button-icon-color": "#fff"
					});
				}
			}
		}, 100);
	}

	/**
	 * Cleans up the UI by reloading FileExplorer to remove the sort button
	 * This is necessary because the button added via addSortButton() is not automatically removed
	 */
	cleanup(): void {
		const fileExplorerLeaves = this.app.workspace.getLeavesOfType("file-explorer");
		if (fileExplorerLeaves.length > 0) {
			// Save the active leaf to restore focus after reload
			const activeLeaf = this.app.workspace.activeLeaf;
			const wasFileExplorerActive = fileExplorerLeaves.some(leaf => leaf === activeLeaf);
			
			// Save the view states before detaching
			const leavesData = fileExplorerLeaves.map(leaf => ({
				viewState: leaf.getViewState(),
				wasActive: leaf === activeLeaf
			}));
			
			// Detach all FileExplorer leaves
			fileExplorerLeaves.forEach(leaf => {
				leaf.detach();
			});
			
			// Reopen FileExplorer leaves with saved state
			// Use setTimeout to ensure detach completes before reopening
			setTimeout(() => {
				let restoredFileExplorerLeaf: WorkspaceLeaf | null = null;
				
				leavesData.forEach((leafData) => {
					// Try to restore to the same position
					// For FileExplorer, try to use left leaf (most common case)
					let targetLeaf = this.app.workspace.getLeftLeaf(false);
					
					// If left leaf is not available, create a new leaf
					if (!targetLeaf) {
						targetLeaf = this.app.workspace.getLeaf();
					}
					
					if (targetLeaf) {
						targetLeaf.setViewState(leafData.viewState);
						
						// Remember the restored FileExplorer leaf if it was active
						if (wasFileExplorerActive && leafData.wasActive) {
							restoredFileExplorerLeaf = targetLeaf;
						}
					}
				});
				
				// Restore focus only if FileExplorer was active before detach
				if (wasFileExplorerActive && restoredFileExplorerLeaf) {
					this.app.workspace.setActiveLeaf(restoredFileExplorerLeaf, { focus: true });
				}
			}, 0);
		}
	}
}


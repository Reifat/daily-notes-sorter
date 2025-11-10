import type { FileExplorerUtils } from '../file-explorer-utils';
import type { App, FileExplorerView, WorkspaceLeaf } from 'obsidian';


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
		if (!fileExplorer.headerDom.navButtonsEl) {
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
			const button = fileExplorer.headerDom.navButtonsEl?.lastElementChild as HTMLElement | null;
			if (button) {
				button.addClass("file-explorer-sort-button");
				const svg = button.querySelector("svg") as { setCssProps?: (props: Record<string, string>) => void } | null;
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
			// Save the view states before detaching
			const leavesData = fileExplorerLeaves.map(leaf => ({
				viewState: leaf.getViewState()
			}));
			
			// Detach all FileExplorer leaves
			fileExplorerLeaves.forEach(leaf => {
				leaf.detach();
			});
			
			// Reopen FileExplorer leaves with saved state
			// Use setTimeout to ensure detach completes before reopening
			setTimeout(() => {
				// Choose the view state to restore: use the first saved state
				const preferred = leavesData[0];

				// Prefer the left leaf if available, otherwise create a new one
				const targetLeaf: WorkspaceLeaf = this.app.workspace.getLeftLeaf(false) ?? this.app.workspace.getLeaf();

				targetLeaf.setViewState(preferred.viewState)
					.then(() => {
						// Always restore focus to the restored File Explorer leaf
							this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });
					})
					.catch((err: unknown) => {
						console.error("[ExplorerUI] Error setting view state:", err);
					});
			}, 0);
		}
	}
}


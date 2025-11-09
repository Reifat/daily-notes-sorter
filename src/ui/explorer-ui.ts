import { FileExplorerView } from 'obsidian';
import { FileExplorerUtils } from '../file-explorer-utils';

export class ExplorerUI {
	private fileExplorerUtils: FileExplorerUtils;

	private readonly SORT_OPTIONS = [
		{ id: 'ascending', label: 'Ascending' },
		{ id: 'descending', label: 'Descending' }
	];

	constructor(fileExplorerUtils: FileExplorerUtils) {
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

		// Style the button
		setTimeout(() => {
			const button = fileExplorer.headerDom.navButtonsEl?.lastElementChild as HTMLElement;
			button?.querySelector("svg")?.setAttribute("style", "color: #fff;");
		}, 100);
	}
}


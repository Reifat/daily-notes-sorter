/**
 * Class for managing autocomplete in input field
 */
export class AutocompleteInput {
  private suggestionsList: HTMLElement;
  private inputEl: HTMLInputElement;
  private onValueChange: (value: string) => void;
  private getSuggestions: () => string[];

  constructor(
    container: HTMLElement,
    inputEl: HTMLInputElement,
    getSuggestions: () => string[],
    onValueChange: (value: string) => void,
  ) {
    this.inputEl = inputEl;
    this.onValueChange = onValueChange;
    this.getSuggestions = getSuggestions;
    this.suggestionsList = this.createSuggestionsList(container);
    this.attachEventListeners();
  }

  /**
   * Updates suggestion list if it's visible
   */
  public refresh(): void {
    if (!this.suggestionsList.hasClass('hidden')) {
      const query = this.inputEl.value.trim();
      if (query) {
        this.handleInput();
      } else {
        // If query is empty but list is visible, update height
        this.adjustListHeight();
      }
    }
  }

  /**
   * Checks if suggestion list is visible
   */
  public isVisible(): boolean {
    return !this.suggestionsList.hasClass('hidden');
  }

  private createSuggestionsList(container: HTMLElement): HTMLElement {
    return container.createDiv({
      cls: 'suggestions-list_1 hidden',
    });
  }

  private attachEventListeners(): void {
    this.inputEl.addEventListener('input', () => {
      this.handleInput();
    });
    this.inputEl.addEventListener('focus', () => {
      this.handleFocus();
    });
    this.inputEl.addEventListener('blur', () => {
      this.handleBlur();
    });

    // Recalculate height on window resize
    window.addEventListener('resize', () => {
      if (!this.suggestionsList.hasClass('hidden')) {
        this.adjustListHeight();
      }
    });
  }

  private handleInput(): void {
    const query = this.inputEl.value.trim();
    this.suggestionsList.empty();

    if (!query) {
      this.hideSuggestions();
      return;
    }

    const filtered = this.filterSuggestions(query);
    if (filtered.length > 0) {
      this.showSuggestions(filtered);
    } else {
      this.hideSuggestions();
    }
  }

  private handleFocus(): void {
    if (this.inputEl.value.trim()) {
      const query = this.inputEl.value.trim();
      const filtered = this.filterSuggestions(query);
      if (filtered.length > 0) {
        // Clear list before showing suggestions
        this.suggestionsList.empty();
        this.showSuggestions(filtered);
      }
    }
  }

  private handleBlur(): void {
    // Delay for handling click on suggestion
    setTimeout(() => {
      this.hideSuggestions();
    }, 100);
  }

  private filterSuggestions(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const suggestions = this.getSuggestions();
    return suggestions.filter((s) => s.toLowerCase().includes(lowerQuery));
  }

  private showSuggestions(suggestions: string[]): void {
    // Always clear list before adding new elements
    this.suggestionsList.empty();
    this.suggestionsList.removeClass('hidden');

    // Limit number of displayed suggestions for performance
    const maxSuggestions = 20;
    const limitedSuggestions = suggestions.slice(0, maxSuggestions);

    // Get existing element texts for duplicate checking
    const existingTexts = new Set<string>();

    limitedSuggestions.forEach((suggestion) => {
      // Check if such element already exists
      if (!existingTexts.has(suggestion)) {
        this.createSuggestionItem(suggestion);
        existingTexts.add(suggestion);
      }
    });

    // Show message if there are more suggestions
    if (suggestions.length > maxSuggestions) {
      this.suggestionsList.createDiv({
        cls: 'suggestion-item_1 suggestion-more',
        text: `... and ${suggestions.length - maxSuggestions} more`,
      });
    }

    // Adjust list size to content after adding elements
    // Use requestAnimationFrame for correct calculation after DOM update
    requestAnimationFrame(() => {
      this.adjustListHeight();
    });
  }

  /**
   * Adjusts list height to content considering available screen space
   */
  private adjustListHeight(): void {
    // Check if list is visible
    if (this.suggestionsList.hasClass('hidden')) {
      return;
    }

    // Reset any fixed heights for automatic calculation
    this.suggestionsList.setCssProps({
      '--suggestions-list-height': 'auto',
      '--suggestions-list-overflow': 'auto',
    });
    this.suggestionsList.removeClass('no-scroll');

    // Get actual content height
    const contentHeight = this.suggestionsList.scrollHeight;

    // Calculate available screen space
    const rect = this.suggestionsList.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.top;
    const maxAllowedHeight = Math.min(400, Math.max(spaceBelow - 10, 50)); // Minimum 50px, 10px margin from screen edge

    // Set height: either by content or maximum allowed
    if (contentHeight <= maxAllowedHeight && contentHeight > 0) {
      // Content fits, use its actual height
      this.suggestionsList.setCssProps({
        '--suggestions-list-height': `${contentHeight}px`,
        '--suggestions-list-overflow': 'hidden',
      });
      this.suggestionsList.addClass('no-scroll');
    } else if (contentHeight > 0) {
      // Content doesn't fit, set maximum height with scrolling
      this.suggestionsList.setCssProps({
        '--suggestions-list-height': `${maxAllowedHeight}px`,
        '--suggestions-list-overflow': 'auto',
      });
      this.suggestionsList.removeClass('no-scroll');
    }
  }

  private createSuggestionItem(suggestion: string): void {
    // Check if element with such text already exists in list
    const existingItems = Array.from(this.suggestionsList.children);
    const alreadyExists = existingItems.some((child) => {
      return child.textContent.trim() === suggestion;
    });

    if (alreadyExists) {
      return; // Skip if element already exists
    }

    const item = this.suggestionsList.createDiv({
      cls: 'suggestion-item_1',
      text: suggestion,
    });

    item.onclick = () => {
      this.inputEl.value = suggestion;
      this.onValueChange(suggestion);
      this.hideSuggestions();
    };
  }

  private hideSuggestions(): void {
    this.suggestionsList.addClass('hidden');
  }
}

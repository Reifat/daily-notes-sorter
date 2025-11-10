import { TFile, Notice } from 'obsidian';

import type { TFolder, App } from 'obsidian';

class Data {
  day: number;
  month: number;
  year: number;
  constructor(day: string, month: string, year: string) {
    this.day = Number(day);
    this.month = Number(month);
    this.year = Number(year);
  }
}

class SortingItem {
  data: Data | undefined;
  path: string;
  basename: string;

  constructor(data: Data | undefined, path: string, basename: string) {
    this.data = data;
    this.path = path;
    this.basename = basename;
  }
}

export class Sorter {
  private app: App | null = null;

  constructor(app?: App) {
    this.app = app || null;
  }
  /**
   * Maps textual month tokens to a month number (1-12).
   * Supports English and Russian names and common abbreviations (with/without a trailing dot).
   */
  private mapTextMonthToNumber(monthTokenRaw: string): number | undefined {
    const token = monthTokenRaw.toLowerCase().replace(/\.$/, '');
    const months: Record<string, number> = {
      // English
      january: 1,
      jan: 1,
      february: 2,
      feb: 2,
      march: 3,
      mar: 3,
      april: 4,
      apr: 4,
      may: 5,
      june: 6,
      jun: 6,
      july: 7,
      jul: 7,
      august: 8,
      aug: 8,
      september: 9,
      sep: 9,
      sept: 9,
      october: 10,
      oct: 10,
      november: 11,
      nov: 11,
      december: 12,
      dec: 12,
    };
    return months[token];
  }

  /**
   * Attempts to parse a textual date at the beginning of the filename using spaces as separators
   * and a specific component order.
   *
   * Example supported variants depending on order:
   * - ['y','m','d'] → "YYYY Month DD" (or "YY Month DD" for 2-digit year)
   * - ['d','m','y'] → "DD Month YYYY"
   * - ['m','d','y'] → "Month DD YYYY"
   *
   * Month can be in English or Russian, full or abbreviated (with/without dot).
   * expectedYearDigits: 2 or 4. If 2, year will be expanded (00-49 -> 2000-2049, 50-99 -> 1950-1999).
   */
  private parseTextualDate(
    fileName: string,
    order: Array<'y' | 'm' | 'd'>,
    expectedYearDigits: 2 | 4,
  ): Data | undefined {
    const monthWord = '([A-Za-zА-Яа-яЁё\\.]+)';
    const dayNum = '(\\d{1,2})';
    const yearPattern = expectedYearDigits === 2 ? '(\\d{2})' : '(\\d{4})';

    // Build pattern according to order
    const tokenToPattern: Record<'y' | 'm' | 'd', string> = {
      y: yearPattern,
      m: monthWord,
      d: dayNum,
    };
    const parts = order.map((p) => tokenToPattern[p]);
    const re = new RegExp(`^${parts[0]}\\s+${parts[1]}\\s+${parts[2]}`);

    const match = fileName.match(re);
    if (!match) {
      return undefined;
    }

    // match groups depend on order; map them using order
    let dayStr = '';
    let monthStr = '';
    let yearStr = '';

    // The first capturing group index is 1
    const g1 = match[1];
    const g2 = match[2];
    const g3 = match[3];

    order.forEach((part, idx) => {
      const val = idx === 0 ? g1 : idx === 1 ? g2 : g3;
      if (part === 'd') {
        dayStr = val;
      }
      if (part === 'm') {
        monthStr = val;
      }
      if (part === 'y') {
        yearStr = val;
      }
    });

    // Convert textual month to number
    const monthNum = this.mapTextMonthToNumber(monthStr);
    if (!monthNum) {
      return undefined;
    }

    // If expected 4 digits but got 2, or vice versa, do not match
    if (
      (expectedYearDigits === 4 && yearStr.length !== 4) ||
      (expectedYearDigits === 2 && yearStr.length !== 2)
    ) {
      return undefined;
    }

    // Expand 2-digit year if necessary
    let yearNum = parseInt(yearStr, 10);
    if (yearStr.length === 2) {
      yearNum = yearNum < 50 ? 2000 + yearNum : 1900 + yearNum;
    }

    // Basic sanity checks for day/month bounds (not strict calendar validation)
    const dayNumInt = parseInt(dayStr, 10);
    if (dayNumInt < 1 || dayNumInt > 31) {
      return undefined;
    }
    if (monthNum < 1 || monthNum > 12) {
      return undefined;
    }

    return new Data(String(dayNumInt), String(monthNum), String(yearNum));
  }
  /**
   * Extracts date from file name according to specified format
   * Supported formats: YYYY-MM-DD, DD.MM.YYYY, DD.MM.YY, MM/DD/YYYY
   * Parses date from the beginning of file name
   */
  private extractDate(fileName: string, dateFormat: string): Data | undefined {
    let day: string, month: string, year: string;
    let match: RegExpMatchArray | null = null;

    switch (dateFormat) {
      case 'YYYY-MM-DD': {
        // Format: 2024-01-15 (search at the beginning of string)
        match = fileName.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (match) {
          year = match[1];
          month = match[2];
          day = match[3];
        } else {
          // Try textual date fallback with the same order and spaces: "YYYY Month DD"
          return this.parseTextualDate(fileName, ['y', 'm', 'd'], 4);
        }
        break;
      }
      case 'DD.MM.YYYY': {
        // Format: 15.01.2024 (search at the beginning of string)
        match = fileName.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (match) {
          day = match[1];
          month = match[2];
          year = match[3];
        } else {
          // Try textual date fallback with the same order and spaces: "DD Month YYYY"
          return this.parseTextualDate(fileName, ['d', 'm', 'y'], 4);
        }
        break;
      }
      case 'DD.MM.YY': {
        // Format: 15.01.24 (search at the beginning of string)
        match = fileName.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})/);
        if (match) {
          day = match[1];
          month = match[2];
          const yy = parseInt(match[3], 10);
          // Convert two-digit year to four-digit
          // YY < 50 -> 20YY, otherwise 19YY
          year = yy < 50 ? `20${match[3]}` : `19${match[3]}`;
        } else {
          // Try textual date fallback with the same order and spaces: "DD Month YY"
          return this.parseTextualDate(fileName, ['d', 'm', 'y'], 2);
        }
        break;
      }
      case 'MM/DD/YYYY': {
        // Format: 01/15/2024 (search at the beginning of string)
        match = fileName.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (match) {
          month = match[1];
          day = match[2];
          year = match[3];
        } else {
          // Try textual date fallback with the same order and spaces: "Month DD YYYY"
          return this.parseTextualDate(fileName, ['m', 'd', 'y'], 4);
        }
        break;
      }
      default:
        console.warn(`[Sorter] Unsupported date format: ${dateFormat}`);
        return undefined;
    }

    return new Data(day, month, year);
  }

  /**
   * Sorts files in folder by date (year, month, day)
   * Files not matching the format are placed at the top (descending) or bottom (ascending)
   * @param sortedFolder - folder to sort
   * @param fileItems - collection of all file explorer items
   * @param ascending - sort direction: true for ascending, false for descending
   * @param dateFormat - date format for parsing (YYYY-MM-DD, DD.MM.YYYY, MM/DD/YYYY)
   * @returns sorted array of items
   */
  sortFolder(
    sortedFolder: TFolder,
    fileItems: Record<string, unknown>,
    ascending: boolean = true,
    dateFormat: string = 'YYYY-MM-DD',
  ): unknown[] {
    const allFileItemsCollection = fileItems;

    // Separate files into matching and non-matching format
    const filesWithDate: Array<SortingItem> = [];
    const filesWithoutDate: Array<SortingItem> = [];

    sortedFolder.children
      .filter((entry): entry is TFile => {
        return entry instanceof TFile;
      })
      .forEach((item: TFile) => {
        const dateData = this.extractDate(item.basename, dateFormat);
        const sortingItem = new SortingItem(dateData, item.path, item.basename);

        if (dateData) {
          filesWithDate.push(sortingItem);
        } else {
          filesWithoutDate.push(sortingItem);
        }
      });

    // Show notification if there are files not matching the format
    if (filesWithoutDate.length > 0 && this.app) {
      const fileNames = filesWithoutDate
        .slice(0, 3)
        .map((item) => item.basename)
        .join(', ');
      const moreFiles =
        filesWithoutDate.length > 3 ? ` and ${filesWithoutDate.length - 3} more` : '';
      const message = `Found ${filesWithoutDate.length} file(s) in folder "${sortedFolder.path}" that do not match format ${dateFormat}: ${fileNames}${moreFiles}`;

      new Notice(message, 5000);
    }

    // Sort files with date
    if (filesWithDate.length > 0) {
      filesWithDate.sort((a: SortingItem, b: SortingItem) => {
        if (!a.data || !b.data) {
          return !a.data ? 1 : -1;
        }

        const diffYear = a.data.year - b.data.year;
        if (diffYear === 0) {
          const diffMonth = a.data.month - b.data.month;
          if (diffMonth === 0) {
            const diff = a.data.day - b.data.day;
            return ascending ? diff : -diff;
          }
          return ascending ? diffMonth : -diffMonth;
        }
        return ascending ? diffYear : -diffYear;
      });
    }

    // Sort files without date by name (for consistency)
    filesWithoutDate.sort((a: SortingItem, b: SortingItem) => {
      return a.basename.localeCompare(b.basename);
    });

    // Combine results: files without date at top (descending) or bottom (ascending)
    let resultItems: Array<SortingItem>;
    if (ascending) {
      // Ascending: files with date first, then without date
      resultItems = [...filesWithDate, ...filesWithoutDate];
    } else {
      // Descending: files without date first, then with date
      resultItems = [...filesWithoutDate, ...filesWithDate];
    }

    // Convert to FileExplorer items
    const result = resultItems
      .map((item: SortingItem) => allFileItemsCollection[item.path])
      .filter((item) => item !== undefined);

    return result;
  }
}

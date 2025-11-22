// Minimal runtime mock of Obsidian APIs that are used in src/core/sorter.ts
export class TFile {
  path: string;
  basename: string;
  constructor(path: string, basename: string) {
    this.path = path;
    this.basename = basename;
  }
}

export class Notice {
  message: string;
  timeout?: number;
  constructor(message: string, timeout?: number) {
    this.message = message;
    this.timeout = timeout;
    noticeCalls.push({ message, timeout });
  }
}

export type TFolder = {
  children: Array<unknown>;
  path: string;
};

export type App = Record<string, unknown>;

export const noticeCalls: Array<{ message: string; timeout?: number }> = [];
export function resetNoticeCalls(): void {
  noticeCalls.length = 0;
}

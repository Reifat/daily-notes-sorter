import { Sorter } from '../src/core/sorter';
import { TFile, type TFolder, noticeCalls, resetNoticeCalls } from 'obsidian';

describe('Sorter.extractDate via private access', () => {
  const sorter = new Sorter();
  const callExtract = (name: string, fmt: string) =>
    // Access private for focused unit tests
    (sorter as unknown as { extractDate: (n: string, f: string) => unknown }).extractDate(
      name,
      fmt,
    ) as unknown as { day: number; month: number; year: number } | undefined;

  test('YYYY-MM-DD exact', () => {
    const d = callExtract('2024-01-15 note', 'YYYY-MM-DD');
    expect(d).toBeDefined();
    expect(d).toEqual({ day: 15, month: 1, year: 2024 });
  });

  test('YYYY Month DD textual fallback', () => {
    const d = callExtract('2024 Sept. 9 notes', 'YYYY-MM-DD');
    expect(d).toEqual({ day: 9, month: 9, year: 2024 });
  });

  test('DD.MM.YYYY exact', () => {
    const d = callExtract('15.01.2024 tasks', 'DD.MM.YYYY');
    expect(d).toEqual({ day: 15, month: 1, year: 2024 });
  });

  test('DD Month YYYY textual fallback', () => {
    const d = callExtract('15 Aug 2024', 'DD.MM.YYYY');
    expect(d).toEqual({ day: 15, month: 8, year: 2024 });
  });

  test('DD.MM.YY exact with year expansion (<50 -> 20YY)', () => {
    const d = callExtract('05.02.24 todo', 'DD.MM.YY');
    expect(d).toEqual({ day: 5, month: 2, year: 2024 });
  });

  test('DD.MM.YY exact with year expansion (>=50 -> 19YY)', () => {
    const d = callExtract('31.12.67', 'DD.MM.YY');
    expect(d).toEqual({ day: 31, month: 12, year: 1967 });
  });

  test('DD Month YY textual fallback with 2-digit year', () => {
    const d = callExtract('15 Aug 24', 'DD.MM.YY');
    expect(d).toEqual({ day: 15, month: 8, year: 2024 });
  });

  test('MM/DD/YYYY textual fallback "Month DD YYYY" (slashes not allowed in filenames)', () => {
    const d = callExtract('Aug 15 2024 report', 'MM/DD/YYYY');
    expect(d).toEqual({ day: 15, month: 8, year: 2024 });
  });

  test('Out-of-bounds day results in undefined', () => {
    expect(callExtract('32 Jan 2024', 'DD.MM.YYYY')).toBeUndefined();
  });

  test('Mismatched year digits in fallback returns undefined', () => {
    // Expecting 4-digit year for DD.MM.YYYY fallback, provided 2-digit
    expect(callExtract('15 Aug 24', 'DD.MM.YYYY')).toBeUndefined();
  });
});

describe('Sorter.sortFolder', () => {
  const buildFolder = (children: Array<unknown>): TFolder => ({
    children,
    path: '/Daily',
  });

  const buildMap = (files: Array<TFile>): Record<string, unknown> => {
    const map: Record<string, unknown> = {};
    for (const f of files) {
      map[f.path] = { id: f.path };
    }
    return map;
  };

  test('Ascending: dated files first (oldest->newest), then undated by name', () => {
    const f1 = new TFile('/Daily/2023-12-31.md', '2023-12-31');
    const f2 = new TFile('/Daily/2024-01-01.md', '2024-01-01');
    const f3 = new TFile('/Daily/beta.md', 'beta'); // undated
    const f4 = new TFile('/Daily/alpha.md', 'alpha'); // undated
    const notAFile = { kind: 'folder-like' };

    const folder = buildFolder([f1, f2, f3, f4, notAFile]);
    const map = buildMap([f1, f2, f3, f4]);

    const sorter = new Sorter(); // no app -> no Notice
    const result = sorter.sortFolder(folder, map, true, 'YYYY-MM-DD') as Array<{ id: string }>;

    const order = result.map((x) => x.id);
    // Dated ascending: 2023-12-31, 2024-01-01
    // Undated by name ascending: alpha, beta
    expect(order).toEqual([
      '/Daily/2023-12-31.md',
      '/Daily/2024-01-01.md',
      '/Daily/alpha.md',
      '/Daily/beta.md',
    ]);
  });

  test('Descending: undated first (by name), then dated newest->oldest', () => {
    const f1 = new TFile('/Daily/2024-01-01.md', '2024-01-01');
    const f2 = new TFile('/Daily/2023-12-31.md', '2023-12-31');
    const f3 = new TFile('/Daily/beta.md', 'beta'); // undated
    const f4 = new TFile('/Daily/alpha.md', 'alpha'); // undated

    const folder = buildFolder([f1, f2, f3, f4]);
    const map = buildMap([f1, f2, f3, f4]);

    const sorter = new Sorter(); // no app -> no Notice
    const result = sorter.sortFolder(folder, map, false, 'YYYY-MM-DD') as Array<{ id: string }>;
    const order = result.map((x) => x.id);

    // Undated by name asc: alpha, beta; then dated desc: 2024-01-01, 2023-12-31
    expect(order).toEqual([
      '/Daily/alpha.md',
      '/Daily/beta.md',
      '/Daily/2024-01-01.md',
      '/Daily/2023-12-31.md',
    ]);
  });

  test('Notice is shown when undated files exist and app is provided', () => {
    resetNoticeCalls();
    const f1 = new TFile('/Daily/2024-01-01.md', '2024-01-01');
    const f2 = new TFile('/Daily/notes.md', 'notes'); // undated
    const folder = { children: [f1, f2], path: '/Daily' } as TFolder;
    const map = { [f1.path]: { id: f1.path }, [f2.path]: { id: f2.path } };

    const sorter = new Sorter({} as unknown as Record<string, unknown>);
    sorter.sortFolder(folder, map, true, 'YYYY-MM-DD');

    expect(noticeCalls.length).toBe(1);
    expect(noticeCalls[0].message).toContain('Found 1 file(s) in folder "/Daily"');
    expect(noticeCalls[0].message).toContain('that do not match format YYYY-MM-DD');
  });

  test('Textual date formats across supported patterns are sortable', () => {
    // Mix various textual forms that map to the same date format via fallbacks
    const f1 = new TFile('/Daily/a.md', '2024 Sept 9');
    const f2 = new TFile('/Daily/b.md', '09 Sept 2024');
    const f3 = new TFile('/Daily/c.md', '15 Aug 24'); // 2024-08-15
    const f4 = new TFile('/Daily/d.md', 'Aug 15 2024');

    const folder = { children: [f1, f2, f3, f4], path: '/Daily' } as TFolder;
    const map = {
      [f1.path]: { id: f1.path },
      [f2.path]: { id: f2.path },
      [f3.path]: { id: f3.path },
      [f4.path]: { id: f4.path },
    };

    const sorter = new Sorter();
    // We will call sort with a format that triggers fallback per file individually
    const r1 = sorter.sortFolder(folder, map, true, 'YYYY-MM-DD') as Array<{ id: string }>;
    const r2 = sorter.sortFolder(folder, map, true, 'DD.MM.YYYY') as Array<{ id: string }>;
    const r3 = sorter.sortFolder(folder, map, true, 'DD.MM.YY') as Array<{ id: string }>;
    const r4 = sorter.sortFolder(folder, map, true, 'MM/DD/YYYY') as Array<{ id: string }>;

    // Ensure no crashes and all items returned in each case
    expect(r1).toHaveLength(4);
    expect(r2).toHaveLength(4);
    expect(r3).toHaveLength(4);
    expect(r4).toHaveLength(4);
  });
});

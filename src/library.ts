import raw from '../assets/library.json';
import type { Measure } from './measure';

export type LibraryEntry = {
  key: string;
  name: string;
  measure: Measure;
  tags: string[];
};

export const LIBRARY = raw as LibraryEntry[];

function fold(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

/**
 * The library entries that match the text. A match at the start of a word
 * comes first. A tag match comes last.
 */
export function suggest(text: string, limit = 5): LibraryEntry[] {
  const q = fold(text);
  if (!q) return [];
  const scored: { e: LibraryEntry; score: number }[] = [];
  for (const e of LIBRARY) {
    const name = fold(e.name);
    let score = -1;
    if (name.startsWith(q)) score = 3;
    else if (name.split(' ').some((w) => w.startsWith(q))) score = 2;
    else if (name.includes(q)) score = 1;
    else if (e.tags.some((t) => t.startsWith(q))) score = 0;
    if (score >= 0) scored.push({ e, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name))
    .slice(0, limit)
    .map((x) => x.e);
}

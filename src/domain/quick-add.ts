import type { ParsedTask, Size } from './types';

const FLAGS_RE = /^[*!^]+$/;
const SIZE_RE = /^~([sml])$/i;

/**
 * Parses the quick-add syntax: `*` MIT, `!` important, `^` urgent, `~s|~m|~l` size.
 * Flag/size markers are only recognised as standalone words, so `C++` and `hi!` stay text.
 * Returns null when nothing is left for the title.
 */
export function parseQuickAdd(input: string): ParsedTask | null {
  const words = input.split(/\s+/).filter((w) => w.length > 0);

  let mit = false;
  let important = false;
  let urgent = false;
  let size: Size | null = null;
  const titleWords: string[] = [];

  for (const word of words) {
    if (FLAGS_RE.test(word)) {
      if (word.includes('*')) mit = true;
      if (word.includes('!')) important = true;
      if (word.includes('^')) urgent = true;
      continue;
    }
    const sizeMatch = SIZE_RE.exec(word);
    if (sizeMatch) {
      size = sizeMatch[1].toUpperCase() as Size;
      continue;
    }
    titleWords.push(word);
  }

  const title = titleWords.join(' ');
  if (title === '') return null;
  return { title, mit, important, urgent, size };
}

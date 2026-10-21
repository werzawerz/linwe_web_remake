// What the original kept on disk, kept in localStorage: the Top Ten (the original's Lines.res; #1 is
// the King), the F2/F3 switches, and the game in progress so a reload carries on.
import type { Game } from './game/rules';

export interface Entry {
  name: string;
  score: number;
}

export const NAME_MAX = 13;
export const EMPTY_NAME = '- Empty -';

/** The original's table when Lines.res is missing: #1 "Handicap" 100, the rest empty. */
export function defaultTopTen(): Entry[] {
  return [{ name: 'Handicap', score: 100 }, ...Array.from({ length: 9 }, () => ({ name: EMPTY_NAME, score: 0 }))];
}

/** Whether a score earns a place: above #10. */
export function qualifies(top: readonly Entry[], score: number): boolean {
  return score > top[top.length - 1].score;
}

/** Inserts above the first entry with a strictly lower score (an equal score does not displace). */
export function insertEntry(top: readonly Entry[], e: Entry): { table: Entry[]; rank: number } {
  const rank = top.findIndex((t) => t.score < e.score);
  if (rank < 0) return { table: top.slice(), rank: -1 };
  const table = [...top.slice(0, rank), { name: e.name.slice(0, NAME_MAX), score: e.score }, ...top.slice(rank)].slice(0, 10);
  return { table, rank };
}

const KEY = 'color-lines';

export interface Saved {
  top: Entry[];
  sound: boolean;
  showNext: boolean;
  game: Game | null;
}

function validTop(t: unknown): t is Entry[] {
  return Array.isArray(t) && t.length === 10 && t.every((e) => e && typeof e.name === 'string' && typeof e.score === 'number');
}

export function loadSaved(): Saved {
  const fallback: Saved = { top: defaultTopTen(), sound: true, showNext: true, game: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const s = JSON.parse(raw) as Partial<Saved>;
    const g = s.game;
    const game = g && Array.isArray(g.board) && g.board.length === 81 && Array.isArray(g.next) && !g.over ? g : null;
    return {
      top: validTop(s.top) ? s.top : fallback.top,
      sound: s.sound ?? true,
      showNext: s.showNext ?? true,
      game,
    };
  } catch {
    return fallback;
  }
}

export function save(s: Saved): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // private mode or full storage: the game still plays, it just won't be remembered
  }
}

// What the original kept on disk, kept in localStorage: the record holder (the King), the F2/F3 switches,
// and the game in progress so a reload carries on.
import type { Game } from './game/rules';

export interface King {
  name: string;
  score: number;
}

/** The record shown on the original's screenshot: Alisa, 700. */
export const DEFAULT_KING: King = { name: 'Alisa', score: 700 };

const KEY = 'color-lines';

interface Saved {
  king: King;
  sound: boolean;
  showNext: boolean;
  game: Game | null;
}

export function loadSaved(): Saved {
  const fallback: Saved = { king: { ...DEFAULT_KING }, sound: true, showNext: true, game: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const s = JSON.parse(raw) as Partial<Saved>;
    const game = s.game && Array.isArray(s.game.board) && s.game.board.length === 81 && !s.game.over ? s.game : null;
    return {
      king: s.king && typeof s.king.name === 'string' && typeof s.king.score === 'number' ? s.king : fallback.king,
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

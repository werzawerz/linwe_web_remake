// Color Lines rules as the original LINES.EXE plays them (facts from rembish/color-lines-game's
// re/NOTES.md, a reverse-engineering of the original; see .claude/skills/color-lines-reference).
// Pure and deterministic: no DOM, no Date, no Math.random. Cells are y * SIZE + x, x = column;
// 0 = empty, 1..COLORS = ball colour.

export const SIZE = 9;
export const CELLS = SIZE * SIZE;
export const COLORS = 7;
export const START_BALLS = 5;
export const NEXT_BALLS = 3;
export const MIN_LINE = 5;

/** Turbo Pascal's generator: RandSeed = RandSeed * 0x08088405 + 1; Random(n) = (RandSeed >> 16) mod n. */
export function tpRandom(seed: number, n: number): [value: number, seed: number] {
  const s = (Math.imul(seed, 0x08088405) + 1) >>> 0;
  return [(s >>> 16) % n, s];
}

export interface Game {
  board: number[];
  /** The colours that drop after the next move without a line: min(free, 3) of them. */
  next: number[];
  score: number;
  /** Turbo Pascal RandSeed (unsigned 32-bit). */
  rng: number;
  over: boolean;
}

/** One ball dropped by the computer, and the cells its line removed (if it made one). */
export interface Drop {
  cell: number;
  color: number;
  removed: number[];
  points: number;
}

export interface MoveResult {
  path: number[];
  /** Cells removed by the player's line (empty when the move made no line). */
  removed: number[];
  /** Balls dropped after a move without a line, in order, each checked for lines as it lands. */
  drops: Drop[];
  points: number;
}

function random(g: Game, n: number): number {
  const [v, s] = tpRandom(g.rng, n);
  g.rng = s;
  return v;
}

export function emptyCells(board: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < CELLS; i++) if (board[i] === 0) out.push(i);
  return out;
}

/** The original's next_colors: Random(7) + 1 for each of min(free, 3) balls. */
function rollNext(g: Game): void {
  const n = Math.min(emptyCells(g.board).length, NEXT_BALLS);
  g.next = [];
  for (let i = 0; i < n; i++) g.next.push(random(g, COLORS) + 1);
}

/**
 * The original's position draw: k = Random(80), cell k (k mod 9 = column, k div 9 = row); while
 * taken, k + 1, wrapping 81 to 0. Random(80) never gives 80, so the bottom-right cell is only
 * reached by probing. The board must have a free cell.
 */
function randomCell(g: Game): number {
  let k = random(g, 80);
  while (g.board[k] !== 0) k = (k + 1) % CELLS;
  return k;
}

/** Points for a line count after `seconds` of thought: Round(((count - 5)^2 + 5) * (2 - t / 6000 * 0.2)), at least 0. */
export function linePoints(count: number, seconds = 0): number {
  if (count < MIN_LINE) return 0;
  const f = 2.0 - (seconds / 6000.0) * 0.2;
  const p = ((count - 5) * (count - 5) + 5) * f;
  return p > 0 ? Math.round(p) : 0;
}

/** Seeds a game like the original: next colours first, then five balls, each position then colour. */
export function newGame(seed: number): Game {
  const g: Game = { board: new Array<number>(CELLS).fill(0), next: [], score: 0, rng: seed >>> 0, over: false };
  rollNext(g);
  while (emptyCells(g.board).length > CELLS - START_BALLS) {
    const cell = randomCell(g);
    g.board[cell] = random(g, COLORS) + 1;
    const { cells } = checkLines(g.board, cell);
    for (const c of cells) g.board[c] = 0; // a line formed while seeding is removed and replaced
  }
  return g;
}

const UP_DOWN_LEFT_RIGHT: ReadonlyArray<readonly [number, number]> = [[0, -1], [0, 1], [-1, 0], [1, 0]];

/** Shortest path of empty cells (breadth-first, neighbours up, down, left, right) from `from` to `to`; null if none. */
export function findPath(board: readonly number[], from: number, to: number): number[] | null {
  if (from === to || board[to] !== 0) return null;
  const prev = new Int16Array(CELLS).fill(-1);
  prev[from] = from;
  const queue = [from];
  for (let q = 0; q < queue.length && prev[to] === -1; q++) {
    const c = queue[q];
    const x = c % SIZE;
    const y = (c / SIZE) | 0;
    for (const [dx, dy] of UP_DOWN_LEFT_RIGHT) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue;
      const n = ny * SIZE + nx;
      if (prev[n] !== -1 || board[n] !== 0) continue;
      prev[n] = c;
      queue.push(n);
    }
  }
  if (prev[to] === -1) return null;
  const path = [to];
  for (let c = to; c !== from; ) {
    c = prev[c];
    path.push(c);
  }
  return path.reverse();
}

const DIRS: ReadonlyArray<readonly [number, number]> = [[1, 0], [0, 1], [1, 1], [1, -1]];

/**
 * The original's check_lines: for the row, column and both diagonals through `cell`, every run of
 * 5+ of the cell's colour anywhere along that line. `count` adds the runs up, so the centre of a
 * cross counts once per direction (5 + 5 = 10); `cells` lists each cell once.
 */
export function checkLines(board: readonly number[], cell: number): { count: number; cells: number[] } {
  const color = board[cell];
  const hit = new Set<number>();
  let count = 0;
  if (color === 0) return { count, cells: [] };
  const cx = cell % SIZE;
  const cy = (cell / SIZE) | 0;
  for (const [dx, dy] of DIRS) {
    // walk back to the line's first on-board cell, then along all of it
    let x = cx;
    let y = cy;
    while (x - dx >= 0 && x - dx < SIZE && y - dy >= 0 && y - dy < SIZE) {
      x -= dx;
      y -= dy;
    }
    let run: number[] = [];
    const flush = () => {
      if (run.length >= MIN_LINE) {
        count += run.length;
        for (const c of run) hit.add(c);
      }
      run = [];
    };
    for (; x >= 0 && x < SIZE && y >= 0 && y < SIZE; x += dx, y += dy) {
      const c = y * SIZE + x;
      if (board[c] === color) run.push(c);
      else flush();
    }
    flush();
  }
  return { count, cells: [...hit].sort((a, b) => a - b) };
}

/**
 * Moves the ball at `from` to `to` after `seconds` of thought (from the start of the turn to the
 * accepted destination). Returns null for an illegal move (no ball, target taken, no free path).
 * A line vanishes, scores, and the player moves again; otherwise the next balls drop one by one,
 * each checked for lines as it lands, and new next colours are drawn.
 */
export function move(g: Game, from: number, to: number, seconds = 0): MoveResult | null {
  if (g.over || g.board[from] === 0) return null;
  const path = findPath(g.board, from, to);
  if (!path) return null;
  g.board[to] = g.board[from];
  g.board[from] = 0;
  const result: MoveResult = { path, removed: [], drops: [], points: 0 };
  const line = checkLines(g.board, to);
  if (line.count >= MIN_LINE) {
    for (const c of line.cells) g.board[c] = 0;
    result.removed = line.cells;
    result.points = linePoints(line.count, seconds);
    g.score += result.points;
    return result;
  }
  for (const color of g.next) {
    if (emptyCells(g.board).length === 0) break;
    const cell = randomCell(g);
    g.board[cell] = color;
    const drop: Drop = { cell, color, removed: [], points: 0 };
    const l = checkLines(g.board, cell);
    if (l.count >= MIN_LINE) {
      for (const c of l.cells) g.board[c] = 0;
      drop.removed = l.cells;
      drop.points = linePoints(l.count, seconds);
      g.score += drop.points;
      result.points += drop.points;
    }
    result.drops.push(drop);
  }
  rollNext(g);
  if (emptyCells(g.board).length === 0) g.over = true;
  return result;
}

/** The Pretender's growth in the original: score * 20 / best, in whole steps 0..20. */
export function pretenderStep(score: number, best: number): number {
  if (best <= 0) return 20;
  return Math.min(20, Math.floor((score * 20) / best));
}

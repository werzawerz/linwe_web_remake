// Color Lines rules: a pure, deterministic model of the board (no DOM, no Date, no Math.random).
// Board cells are indexed y * SIZE + x; 0 = empty, 1..COLORS = ball colour.

export const SIZE = 9;
export const CELLS = SIZE * SIZE;
export const COLORS = 7;
export const START_BALLS = 5;
export const NEXT_BALLS = 3;
export const MIN_LINE = 5;

/** Mulberry32: small seeded generator; the state is a plain number so games can be saved and replayed. */
export function nextRandom(state: number): [value: number, state: number] {
  const s = (state + 0x6d2b79f5) | 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

export interface Game {
  board: number[];
  next: number[];
  score: number;
  rng: number;
  over: boolean;
}

export interface Placed {
  cell: number;
  color: number;
}

export interface MoveResult {
  path: number[];
  /** Cells removed by the player's line (empty when the move made no line). */
  removed: number[];
  /** Balls the computer dropped after a move without a line. */
  placed: Placed[];
  /** Cells removed by lines the dropped balls happened to form. */
  removedByDrop: number[];
  points: number;
}

function randInt(g: Game, n: number): number {
  const [v, s] = nextRandom(g.rng);
  g.rng = s;
  return Math.floor(v * n);
}

function rollNext(g: Game): number[] {
  const out: number[] = [];
  for (let i = 0; i < NEXT_BALLS; i++) out.push(1 + randInt(g, COLORS));
  return out;
}

export function emptyCells(board: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < CELLS; i++) if (board[i] === 0) out.push(i);
  return out;
}

/** Drops the given colours on random empty cells; stops early when the board fills up. */
function drop(g: Game, colors: readonly number[]): Placed[] {
  const placed: Placed[] = [];
  for (const color of colors) {
    const free = emptyCells(g.board);
    if (free.length === 0) break;
    const cell = free[randInt(g, free.length)];
    g.board[cell] = color;
    placed.push({ cell, color });
  }
  return placed;
}

export function newGame(seed: number): Game {
  const g: Game = { board: new Array<number>(CELLS).fill(0), next: [], score: 0, rng: seed | 0, over: false };
  const first: number[] = [];
  for (let i = 0; i < START_BALLS; i++) first.push(1 + randInt(g, COLORS));
  drop(g, first);
  g.next = rollNext(g);
  return g;
}

/** Shortest path of empty cells (4-neighbour) from `from` to `to`, both included; null if none. */
export function findPath(board: readonly number[], from: number, to: number): number[] | null {
  if (from === to || board[to] !== 0) return null;
  const prev = new Int16Array(CELLS).fill(-1);
  prev[from] = from;
  const queue = [from];
  for (let q = 0; q < queue.length; q++) {
    const c = queue[q];
    if (c === to) break;
    const x = c % SIZE;
    const y = (c / SIZE) | 0;
    const around = [x > 0 ? c - 1 : -1, x < SIZE - 1 ? c + 1 : -1, y > 0 ? c - SIZE : -1, y < SIZE - 1 ? c + SIZE : -1];
    for (const n of around) {
      if (n < 0 || prev[n] !== -1 || board[n] !== 0) continue;
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

/** All cells in lines of MIN_LINE or more of one colour passing through any of `cells`. */
export function findLines(board: readonly number[], cells: readonly number[]): number[] {
  const hit = new Set<number>();
  for (const cell of cells) {
    const color = board[cell];
    if (color === 0) continue;
    const cx = cell % SIZE;
    const cy = (cell / SIZE) | 0;
    for (const [dx, dy] of DIRS) {
      const line = [cell];
      for (const sign of [1, -1]) {
        let x = cx + dx * sign;
        let y = cy + dy * sign;
        while (x >= 0 && x < SIZE && y >= 0 && y < SIZE && board[y * SIZE + x] === color) {
          line.push(y * SIZE + x);
          x += dx * sign;
          y += dy * sign;
        }
      }
      if (line.length >= MIN_LINE) for (const c of line) hit.add(c);
    }
  }
  return [...hit].sort((a, b) => a - b);
}

/** Points for removing `n` balls at once. */
export function linePoints(n: number): number {
  if (n < MIN_LINE) return 0;
  return 10 + 2 * (n - MIN_LINE) * (n - MIN_LINE);
}

function clear(g: Game, cells: readonly number[]): number {
  for (const c of cells) g.board[c] = 0;
  const pts = linePoints(cells.length);
  g.score += pts;
  return pts;
}

/**
 * Moves the ball at `from` to `to`. Returns null for an illegal move (no ball, target taken,
 * no free path). On a line the balls vanish and the player moves again; otherwise the three
 * "next" balls drop, may form lines themselves, and a new "next" is rolled.
 */
export function move(g: Game, from: number, to: number): MoveResult | null {
  if (g.over || g.board[from] === 0) return null;
  const path = findPath(g.board, from, to);
  if (!path) return null;
  g.board[to] = g.board[from];
  g.board[from] = 0;
  const result: MoveResult = { path, removed: [], placed: [], removedByDrop: [], points: 0 };
  result.removed = findLines(g.board, [to]);
  if (result.removed.length > 0) {
    result.points = clear(g, result.removed);
    return result;
  }
  result.placed = drop(g, g.next);
  g.next = rollNext(g);
  result.removedByDrop = findLines(
    g.board,
    result.placed.map((p) => p.cell),
  );
  if (result.removedByDrop.length > 0) result.points = clear(g, result.removedByDrop);
  if (emptyCells(g.board).length === 0) g.over = true;
  return result;
}

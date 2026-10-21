import { describe, expect, it } from 'vitest';
import { CELLS, SIZE, checkLines, emptyCells, findPath, linePoints, move, newGame, pretenderStep, tpRandom, type Game } from './rules';
import { defaultTopTen, insertEntry, qualifies } from '../store';

const at = (x: number, y: number) => y * SIZE + x;

function emptyGame(next = [1, 1, 1]): Game {
  return { board: new Array<number>(CELLS).fill(0), next, score: 0, rng: 1, over: false };
}

describe('Turbo Pascal random numbers', () => {
  it('steps RandSeed * 0x08088405 + 1 and takes the high word mod n', () => {
    const [v, s] = tpRandom(0, 80);
    expect(s).toBe(1);
    expect(v).toBe(0);
    const [v2, s2] = tpRandom(1, 1000);
    expect(s2).toBe(0x08088406);
    expect(v2).toBe(0x0808 % 1000);
  });
});

describe('newGame', () => {
  it('starts with 5 balls and 3 next balls, deterministically from the seed', () => {
    const a = newGame(42);
    expect(newGame(42)).toEqual(a);
    expect(CELLS - emptyCells(a.board).length).toBe(5);
    expect(a.next).toHaveLength(3);
    for (const c of [...a.board.filter(Boolean), ...a.next]) {
      expect(c).toBeGreaterThanOrEqual(1);
      expect(c).toBeLessThanOrEqual(7);
    }
  });
});

describe('findPath', () => {
  it('goes round obstacles and fails when walled in', () => {
    const b = new Array<number>(CELLS).fill(0);
    for (let y = 0; y < 8; y++) b[at(4, y)] = 2;
    const p = findPath(b, at(0, 0), at(8, 0))!;
    expect(p[0]).toBe(at(0, 0));
    expect(p[p.length - 1]).toBe(at(8, 0));
    expect(p).toContain(at(4, 8));
    b[at(4, 8)] = 2;
    expect(findPath(b, at(0, 0), at(8, 0))).toBeNull();
  });
  it('does not move diagonally', () => {
    const b = new Array<number>(CELLS).fill(0);
    b[at(1, 0)] = 3;
    b[at(0, 1)] = 3;
    expect(findPath(b, at(0, 0), at(1, 1))).toBeNull();
  });
});

describe('checkLines', () => {
  it('finds rows, columns and both diagonals of 5+', () => {
    const b = new Array<number>(CELLS).fill(0);
    for (let i = 0; i < 5; i++) b[at(i, i)] = 4;
    expect(checkLines(b, at(2, 2)).count).toBe(5);
    const c = new Array<number>(CELLS).fill(0);
    for (let i = 0; i < 6; i++) c[at(8 - i, i)] = 5;
    expect(checkLines(c, at(8, 0)).count).toBe(6);
    const d = new Array<number>(CELLS).fill(0);
    for (let i = 0; i < 4; i++) d[at(i, 3)] = 1;
    expect(checkLines(d, at(0, 3)).count).toBe(0);
  });
  it('counts the centre of a cross once per direction, removes it once', () => {
    const b = new Array<number>(CELLS).fill(0);
    for (let i = 0; i < 5; i++) b[at(i, 4)] = 6;
    for (let i = 0; i < 5; i++) b[at(2, i + 2)] = 6;
    const r = checkLines(b, at(2, 4));
    expect(r.count).toBe(10);
    expect(r.cells).toHaveLength(9);
  });
});

describe('linePoints (the original: Round(((n - 5)^2 + 5) * (2 - t / 6000 * 0.2)))', () => {
  it('pays 10, 12, 18, 28, 42 for quick lines of 5..9', () => {
    expect([5, 6, 7, 8, 9].map((n) => linePoints(n))).toEqual([10, 12, 18, 28, 42]);
  });
  it('pays a cross of 5 + 5 as a count of 10', () => {
    expect(linePoints(10)).toBe(60);
  });
  it('pays less only after long thought, never below 0', () => {
    expect(linePoints(5, 600)).toBe(10); // 10 minutes: 9.8 rounds to 10
    expect(linePoints(5, 3000)).toBe(10); // 50 minutes: 9.5, Round goes away from zero
    expect(linePoints(5, 4000)).toBe(9);
    expect(linePoints(5, 70000)).toBe(0);
  });
});

describe('move', () => {
  it('removes a line, scores, and gives another move without new balls', () => {
    const g = emptyGame();
    for (let i = 0; i < 4; i++) g.board[at(i, 0)] = 2;
    g.board[at(4, 8)] = 2;
    const r = move(g, at(4, 8), at(4, 0))!;
    expect(r.removed).toHaveLength(5);
    expect(r.drops).toHaveLength(0);
    expect(g.score).toBe(10);
    expect(emptyCells(g.board)).toHaveLength(CELLS);
  });
  it('drops the next balls one by one when no line is made', () => {
    const g = emptyGame([3, 4, 5]);
    g.board[at(0, 0)] = 1;
    const r = move(g, at(0, 0), at(8, 8))!;
    expect(r.drops.map((d) => d.color)).toEqual([3, 4, 5]);
    expect(CELLS - emptyCells(g.board).length).toBe(4);
    expect(g.next).toHaveLength(3);
  });
  it('rejects illegal moves', () => {
    const g = emptyGame();
    g.board[at(0, 0)] = 1;
    g.board[at(1, 0)] = 1;
    expect(move(g, at(5, 5), at(6, 6))).toBeNull();
    expect(move(g, at(0, 0), at(1, 0))).toBeNull();
  });
  it('ends the game when the board fills up', () => {
    const g = emptyGame([1, 2, 3]);
    for (let c = 0; c < CELLS; c++) g.board[c] = (((c % SIZE) + 3 * Math.floor(c / SIZE)) % 7) + 1;
    for (const x of [6, 7, 8]) g.board[at(x, 8)] = 0;
    move(g, at(5, 8), at(8, 8));
    expect(emptyCells(g.board).length).toBe(0);
    expect(g.over).toBe(true);
  });
});

describe('pretender and Top Ten', () => {
  it('grows the pretender in 20 steps of the best score', () => {
    expect(pretenderStep(0, 100)).toBe(0);
    expect(pretenderStep(54, 100)).toBe(10);
    expect(pretenderStep(250, 100)).toBe(20);
  });
  it('starts with Handicap 100 and inserts above the first strictly lower score', () => {
    const top = defaultTopTen();
    expect(top[0]).toEqual({ name: 'Handicap', score: 100 });
    expect(qualifies(top, 0)).toBe(false);
    expect(qualifies(top, 10)).toBe(true);
    const a = insertEntry(top, { name: 'Peti', score: 100 });
    expect(a.rank).toBe(1);
    const b = insertEntry(a.table, { name: 'Alisa', score: 700 });
    expect(b.rank).toBe(0);
    expect(b.table.map((e) => e.name).slice(0, 3)).toEqual(['Alisa', 'Handicap', 'Peti']);
    expect(b.table).toHaveLength(10);
  });
});

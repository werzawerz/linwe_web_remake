import { describe, expect, it } from 'vitest';
import { CELLS, SIZE, emptyCells, findLines, findPath, linePoints, move, newGame, type Game } from './rules';

const at = (x: number, y: number) => y * SIZE + x;

function emptyGame(next = [1, 1, 1]): Game {
  return { board: new Array<number>(CELLS).fill(0), next, score: 0, rng: 1, over: false };
}

describe('newGame', () => {
  it('starts with 5 balls and 3 next balls, deterministically from the seed', () => {
    const a = newGame(42);
    const b = newGame(42);
    expect(a).toEqual(b);
    expect(CELLS - emptyCells(a.board).length).toBe(5);
    expect(a.next).toHaveLength(3);
    for (const c of [...a.board.filter(Boolean), ...a.next]) expect(c).toBeGreaterThanOrEqual(1), expect(c).toBeLessThanOrEqual(7);
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

describe('findLines', () => {
  it('finds rows, columns and both diagonals of 5+', () => {
    const b = new Array<number>(CELLS).fill(0);
    for (let i = 0; i < 5; i++) b[at(i, i)] = 4;
    expect(findLines(b, [at(2, 2)])).toHaveLength(5);
    const c = new Array<number>(CELLS).fill(0);
    for (let i = 0; i < 6; i++) c[at(8 - i, i)] = 5;
    expect(findLines(c, [at(8, 0)])).toHaveLength(6);
    const d = new Array<number>(CELLS).fill(0);
    for (let i = 0; i < 4; i++) d[at(i, 3)] = 1;
    expect(findLines(d, [at(0, 3)])).toHaveLength(0);
  });
  it('joins crossing lines through the moved ball', () => {
    const b = new Array<number>(CELLS).fill(0);
    for (let i = 0; i < 5; i++) b[at(i, 4)] = 6;
    for (let i = 0; i < 5; i++) b[at(2, i + 2)] = 6;
    expect(findLines(b, [at(2, 4)])).toHaveLength(9);
  });
});

describe('move', () => {
  it('removes a line, scores, and gives another move without new balls', () => {
    const g = emptyGame();
    for (let i = 0; i < 4; i++) g.board[at(i, 0)] = 2;
    g.board[at(4, 8)] = 2;
    const r = move(g, at(4, 8), at(4, 0))!;
    expect(r.removed).toHaveLength(5);
    expect(r.placed).toHaveLength(0);
    expect(g.score).toBe(linePoints(5));
    expect(emptyCells(g.board)).toHaveLength(CELLS);
  });
  it('drops the next balls when no line is made', () => {
    const g = emptyGame([3, 4, 5]);
    g.board[at(0, 0)] = 1;
    const r = move(g, at(0, 0), at(8, 8))!;
    expect(r.placed.map((p) => p.color)).toEqual([3, 4, 5]);
    expect(CELLS - emptyCells(g.board).length).toBe(4);
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
    const from = at(5, 8);
    move(g, from, at(8, 8));
    expect(emptyCells(g.board).length).toBe(0);
    expect(g.over).toBe(true);
  });
});

describe('linePoints', () => {
  it('pays far more for longer lines', () => {
    expect([5, 6, 7, 8, 9].map(linePoints)).toEqual([10, 12, 18, 28, 42]);
  });
});

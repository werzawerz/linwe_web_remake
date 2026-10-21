// Color Lines: screens, input and animation around the pure rules in game/rules.ts.
import { CELLS, SIZE, findPath, move, newGame, pretenderStep, type Game, type MoveResult } from './game/rules';
import { CELL_H, CELL_W, LANDSCAPE, PIXEL_ASPECT, PORTRAIT, buttonAt, cellAt, type Figure, type Layout } from './layout';
import { BLACK, DARK, GREEN, GREY, LIGHT, YELLOW } from './gfx/palette';
import { drawBall } from './gfx/balls';
import { bevel, cell, fill, nameSprite, resetNames, scoreBox, text } from './gfx/draw';
import { SRC, loadSheet, type Sheet } from './gfx/sheet';
import { setSound, sfx, soundOn, unlockAudio } from './audio';
import { NAME_MAX, insertEntry, loadSaved, qualifies, save, type Entry } from './store';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('screen') as HTMLCanvasElement;
const g = canvas.getContext('2d')!;

type Screen = 'title' | 'play' | 'help' | 'over';

const saved = loadSaved();
let top: Entry[] = saved.top; // top[0] is the King
let showNext = saved.showNext;
setSound(saved.sound);
let game: Game = saved.game && !params.has('seed') ? saved.game : newGame(seedFromParams());
// debug: ?board=<81 digits, 0 empty / 1..7>&next=<3 digits>&score=N set up any position
const boardParam = params.get('board');
if (boardParam?.length === CELLS) game.board = [...boardParam].map(Number);
const nextParam = params.get('next');
if (nextParam?.length === 3) game.next = [...nextParam].map(Number);
if (params.has('score')) game.score = Number(params.get('score'));
let screen: Screen = params.get('menu') === '0' || params.has('seed') ? 'play' : 'title';
let layout: Layout = LANDSCAPE;
let sheet: Sheet | null = null;
let selected = -1;
let selectedAt = 0;
let lastBounce = -1;
let pressed = -1; // F-key shown pressed (index), until pressedUntil
let pressedUntil = 0;
let newRank = -1; // the player's place in the Top Ten after this game
let enteringName = false;
let turnStart = performance.now(); // the original times each turn's thinking (scores less after ~50 min)
let cursor = 40; // keyboard cursor cell (arrows + Space, as in the original)
let cursorShown = false;
let crownTaken = false;
let typedName = '';
let shownPillar = 0; // animated pretender height fraction

/** An animation step: what the board looks like and which cells are moving, appearing or vanishing. */
interface Anim {
  kind: 'move' | 'appear' | 'vanish';
  board: number[];
  cells: number[];
  color: number;
  start: number;
  dur: number;
}
const anims: Anim[] = [];

const MOVE_STEP_MS = 32;
const APPEAR_MS = 110;
const VANISH_MS = 420;
const BOUNCE_MS = 340;

function seedFromParams(): number {
  const s = params.get('seed');
  return s !== null ? Number(s) | 0 : (Date.now() ^ (Math.random() * 0x7fffffff)) | 0;
}

function persist(): void {
  save({ top, sound: soundOn, showNext, game: game.over || screen === 'over' ? null : game });
}

// ---------------------------------------------------------------------------------------------
// Drawing

function cellCentre(l: Layout, c: number): [number, number] {
  return [l.board.x + (c % SIZE) * CELL_W + 16, l.board.y + Math.floor(c / SIZE) * CELL_H + 11];
}

function drawChrome(l: Layout): void {
  fill(g, GREY, 0, 0, l.w, l.h);
  // outer frame (row 0 is black on the original capture), corners mitred like the original
  fill(g, BLACK, 0, 0, l.w, 1);
  fill(g, LIGHT, 0, 1, 1, l.h - 1);
  fill(g, DARK, l.w - 1, 1, 1, l.h - 1);
  fill(g, LIGHT, 0, 1, l.w, 1);
  fill(g, LIGHT, 0, 2, l.w - 1, 1);
  fill(g, DARK, 1, l.h - 2, l.w - 1, 1);
  fill(g, DARK, 0, l.h - 1, l.w, 1);
  // the black panel, sunk into the grey
  const p = l.panel;
  fill(g, DARK, p.x - 2, p.y - 2, 2, p.h + 4);
  fill(g, LIGHT, p.x + p.w, p.y - 2, 2, p.h + 4);
  fill(g, DARK, p.x - 2, p.y - 2, p.w + 4, 1);
  fill(g, DARK, p.x - 2, p.y - 1, p.w + 3, 1);
  fill(g, LIGHT, p.x, p.y + p.h, p.w + 2, 1);
  fill(g, LIGHT, p.x - 1, p.y + p.h + 1, p.w + 3, 1);
  fill(g, BLACK, p.x, p.y, p.w, p.h);

  scoreBox(g, l.hiscore.x, l.hiscore.y, top[0].score);
  scoreBox(g, l.score.x, l.score.y, game.score);

  fill(g, BLACK, l.next.x, l.next.y, 103, 25);
  for (let i = 0; i < 3; i++) {
    const x = l.next.x + 1 + i * CELL_W;
    cell(g, x, l.next.y + 1);
    if (showNext && screen !== 'title') drawBall(g, game.next[i], x + 16.5, l.next.y + 12.5, 9, 7);
  }

  if (sheet) {
    if (l.nextLabel) g.drawImage(sheet.game, SRC.nextLabel.x, SRC.nextLabel.y, SRC.nextLabel.w, SRC.nextLabel.h, l.nextLabel.x, l.nextLabel.y, SRC.nextLabel.w, SRC.nextLabel.h);
    if (l.colorsLabel) g.drawImage(sheet.game, SRC.colorsLabel.x, SRC.colorsLabel.y, SRC.colorsLabel.w, SRC.colorsLabel.h, l.colorsLabel.x, l.colorsLabel.y, SRC.colorsLabel.w, SRC.colorsLabel.h);
    if (l.logo) g.drawImage(sheet.game, SRC.logo.x, SRC.logo.y, SRC.logo.w, SRC.logo.h, l.logo.x, l.logo.y, SRC.logo.w, SRC.logo.h);
  } else {
    if (l.nextLabel) text(g, 'Next', l.nextLabel.x, l.nextLabel.y - 1, LIGHT, 'left', 12);
    if (l.colorsLabel) text(g, 'Colors', l.colorsLabel.x - 4, l.colorsLabel.y - 1, LIGHT, 'left', 12);
    if (l.logo) text(g, 'GAMOS', l.logo.x + 2, l.logo.y + 12, LIGHT, 'left', 11);
  }

  const lit = [screen === 'help', soundOn, showNext, false];
  const names = ['HELP', 'SOUND', 'NEXT', 'RESTART'];
  const now = performance.now();
  for (let i = 0; i < 4; i++) {
    const b = l.buttons[i];
    const down = pressed === i && now < pressedUntil;
    const on = lit[i] || down;
    if (sheet) {
      const k = SRC.fkey[i];
      g.drawImage(sheet.game, k.x, k.y, k.w, k.h, b.x + (down ? 1 : 0), b.y + (down ? 1 : 0), k.w, k.h);
      g.drawImage(on ? sheet.labelOn[i] : sheet.labelOff[i], b.x + 34, b.y);
    } else {
      bevel(g, b.x, b.y, 31, 25);
      text(g, `F${i + 1}`, b.x + 15, b.y + 8, BLACK, 'center', 10);
      bevel(g, b.x + 34, b.y, 86, 21);
      fill(g, BLACK, b.x + 39, b.y + 3, 76, 15);
      text(g, names[i], b.x + 77, b.y + 5, on ? GREEN : DARK, 'center', 10);
    }
  }
}

function drawBoardFrame(l: Layout): void {
  const { x, y } = l.board;
  fill(g, BLACK, x - 1, y - 1, 307, 217);
  fill(g, LIGHT, x - 3, y - 2, 2, 219);
  fill(g, DARK, x + 306, y - 2, 2, 219);
  fill(g, LIGHT, x - 3, y - 2, 309, 1);
  fill(g, DARK, x - 3, y + 216, 311, 1);
  for (let c = 0; c < CELLS; c++) cell(g, x + (c % SIZE) * CELL_W, y + Math.floor(c / SIZE) * CELL_H);
}

function drawFigure(f: Figure, which: 'king' | 'pretender', frac: number, name: string, crowned: boolean): void {
  const pillarH = Math.round(f.minH + (f.maxH - f.minH) * Math.max(0, Math.min(1, frac)));
  const capTop = f.baseY - pillarH;
  const bodyTop = capTop + SRC.capRows;
  const baseTop = f.baseY - (SRC.pillar.y + SRC.pillar.h - 1 - SRC.pillarBaseY);
  const px = f.x - (SRC.kingPillarX - SRC.pillar.x);
  if (sheet) {
    for (let y = bodyTop; y < baseTop; y++) g.drawImage(sheet.game, SRC.pillar.x, SRC.pillarBodyY + ((y - SRC.pillarBodyY) & 3), SRC.pillar.w, 1, px, y, SRC.pillar.w, 1);
    const baseRows = SRC.pillar.y + SRC.pillar.h - SRC.pillarBaseY;
    const top = Math.max(baseTop, bodyTop);
    const skip = top - baseTop;
    g.drawImage(sheet.game, SRC.pillar.x, SRC.pillarBaseY + skip, SRC.pillar.w, baseRows - skip, px, top, SRC.pillar.w, baseRows - skip);
    const spr = which === 'king' ? (crowned ? sheet.king : sheet.kingBare) : crowned ? sheet.pretenderCrowned : sheet.pretender;
    const src = which === 'king' ? SRC.king : SRC.pretender;
    const centre = which === 'king' ? SRC.kingPillarX : SRC.pretenderPillarX;
    g.drawImage(spr, f.x - (centre - src.x), capTop + SRC.capRows - spr.height);
  } else {
    fill(g, DARK, f.x - 23, capTop, 47, f.baseY - capTop - 4);
    fill(g, GREY, f.x - 19, capTop, 30, f.baseY - capTop - 4);
    fill(g, LIGHT, f.x - 12, capTop, 6, f.baseY - capTop - 4);
    fill(g, GREY, f.x - 26, f.baseY - 4, 53, 5);
    const color = which === 'king' ? '#fb0000' : '#fc00fc';
    drawBall(g, which === 'king' ? 1 : 7, f.x, capTop - 22, 50, 42);
    fill(g, color, f.x - 16, capTop - 4, 10, 4);
    fill(g, color, f.x + 6, capTop - 4, 10, 4);
    if (crowned) {
      fill(g, YELLOW, f.x - 14, capTop - 52, 28, 10);
      fill(g, YELLOW, f.x - 14, capTop - 58, 4, 6);
      fill(g, YELLOW, f.x - 2, capTop - 60, 4, 8);
      fill(g, YELLOW, f.x + 10, capTop - 58, 4, 6);
    }
    if (which === 'pretender') {
      fill(g, LIGHT, f.x + 30, capTop - 50, 2, 28);
      fill(g, YELLOW, f.x + 26, capTop - 22, 10, 2);
    }
  }
  // the original's own lettering for its two names, our gothic font for any other
  const own = !sheet ? null : which === 'pretender' ? SRC.pretenderName : name === 'Alisa' ? SRC.alisa : null;
  if (sheet && own) {
    const cx = which === 'king' ? SRC.kingPillarX : SRC.pretenderPillarX;
    g.drawImage(sheet.game, own.x, own.y, own.w, own.h, f.x + (own.x - cx), f.nameY, own.w, own.h);
    return;
  }
  const n = nameSprite(name);
  g.drawImage(n, Math.round(f.x + 6 - n.width / 2), f.nameY);
}

function drawBalls(l: Layout, now: number): void {
  const a = anims[0];
  const board = a && now >= a.start ? a.board : game.board;
  for (let c = 0; c < CELLS; c++) {
    const color = board[c];
    if (!color) continue;
    const [cx, cy] = cellCentre(l, c);
    if (a && now >= a.start && a.cells.includes(c)) {
      const t = Math.min(1, (now - a.start) / a.dur);
      if (a.kind === 'appear') {
        drawBall(g, color, cx, cy, 25 * t, 19 * t);
      } else if (a.kind === 'vanish') {
        // the original's balls burst: flash, then shrink away
        const k = 1 - t;
        if (t < 0.3 && Math.floor(t * 20) % 2 === 0) drawBall(g, color, cx, cy, 27, 21);
        else drawBall(g, color, cx, cy, 25 * k, 19 * k);
      }
      continue;
    }
    if (c === selected && !a) {
      // the selected ball jumps up and down in its cell
      const ph = ((now - selectedAt) % BOUNCE_MS) / BOUNCE_MS;
      const up = Math.sin(ph * Math.PI);
      const squash = ph < 0.12 || ph > 0.88;
      if (squash) drawBall(g, color, cx, cy + 2, 27, 16);
      else drawBall(g, color, cx, cy - Math.round(up * 4), 25, 19);
      continue;
    }
    drawBall(g, color, cx, cy, 25, 19);
  }
  if (cursorShown && screen === 'play') {
    const x = l.board.x + (cursor % SIZE) * CELL_W;
    const y = l.board.y + Math.floor(cursor / SIZE) * CELL_H;
    fill(g, YELLOW, x + 2, y + 1, 29, 1);
    fill(g, YELLOW, x + 2, y + 21, 29, 1);
    fill(g, YELLOW, x + 2, y + 1, 2, 21);
    fill(g, YELLOW, x + 29, y + 1, 2, 21);
  }
  if (a && a.kind === 'move' && now >= a.start) {
    const step = Math.min(a.cells.length - 1, Math.floor((now - a.start) / MOVE_STEP_MS));
    const [cx, cy] = cellCentre(l, a.cells[step]);
    drawBall(g, a.color, cx, cy, 25, 19);
  }
}

function boxMessage(l: Layout, lines: string[], color = YELLOW, highlight = -1): void {
  const w = 230;
  const h = 14 + lines.length * 14;
  const x = l.board.x + 153 - w / 2;
  const y = l.board.y + 107 - h / 2;
  bevel(g, x - 4, y - 3, w + 8, h + 6);
  fill(g, BLACK, x, y, w, h);
  lines.forEach((s, i) => text(g, s, x + w / 2, y + 7 + i * 14, i === 0 ? color : i === highlight ? YELLOW : LIGHT, 'center', 10));
}

const HELP = [
  'COLOR LINES',
  'Click a ball, then click a free cell',
  'to move it there. A ball can only',
  'go along a path of free cells.',
  '5 or more balls of one colour in a',
  'row, column or diagonal vanish.',
  'Otherwise 3 new balls appear (Next).',
  'Longer lines score much more.',
  'Arrows + Space play by keyboard.',
  'Beat the King to take his place!',
];

function draw(now: number): void {
  const l = layout;
  if (canvas.width !== l.w || canvas.height !== l.h) {
    canvas.width = l.w;
    canvas.height = l.h;
    fit();
  }
  g.imageSmoothingEnabled = false;
  if (screen === 'title') {
    if (sheet?.title && l.name === 'landscape') {
      g.drawImage(sheet.title, 0, 0, l.w, l.h);
      return;
    }
    if (sheet?.title) {
      fill(g, BLACK, 0, 0, l.w, l.h);
      const s = l.w / 640;
      g.drawImage(sheet.title, 0, (l.h - 350 * s) / 2, l.w, 350 * s);
      return;
    }
    fill(g, BLACK, 0, 0, l.w, l.h);
    text(g, 'COLOR LINES', l.w / 2, l.h / 2 - 30, GREEN, 'center', 24);
    text(g, 'GAMOS 1992', l.w / 2, l.h / 2 + 4, LIGHT, 'center', 10);
    text(g, 'click to start', l.w / 2, l.h / 2 + 40, DARK, 'center', 10);
    return;
  }
  drawChrome(l);
  drawBoardFrame(l);
  // the original grows the Pretender in 20 steps: score * 20 / best
  const target = pretenderStep(game.score, top[0].score) / 20;
  shownPillar += (target - shownPillar) * 0.08;
  if (Math.abs(shownPillar - target) < 0.002) shownPillar = target;
  // the Pretender takes the crown as soon as the score passes the best (Top Ten #1)
  const passed = game.score > top[0].score && screen !== 'over';
  if (passed && !crownTaken) sfx.record();
  crownTaken = passed;
  drawFigure(l.king, 'king', 1, top[0].name, !passed);
  drawFigure(l.pretender, 'pretender', shownPillar, 'Pretender', passed);
  drawBalls(l, now);
  if (screen === 'help') boxMessage(l, HELP, GREEN);
  if (screen === 'over' && !anims.length) {
    if (enteringName) boxMessage(l, ['TOP TEN!', `Score: ${game.score}`, 'Enter your name:', `${typedName}_`, 'then press Enter']);
    else boxMessage(l, ['TOP TEN', ...top.map((e, i) => `${String(i + 1).padStart(2)}. ${e.name.padEnd(NAME_MAX)} ${String(e.score).padStart(5)}`)], YELLOW, newRank + 1);
  }
}

// ---------------------------------------------------------------------------------------------
// Game flow

function playAnims(before: number[], from: number, r: MoveResult, now: number): void {
  const color = before[from];
  let t = now;
  const b0 = before.slice();
  b0[from] = 0;
  anims.push({ kind: 'move', board: b0, cells: r.path, color, start: t, dur: r.path.length * MOVE_STEP_MS });
  t += r.path.length * MOVE_STEP_MS;
  const b1 = b0.slice();
  b1[r.path[r.path.length - 1]] = color;
  if (r.removed.length) {
    anims.push({ kind: 'vanish', board: b1, cells: r.removed, color: 0, start: t, dur: VANISH_MS });
    return;
  }
  // the original drops the balls one by one, each checked for a line as it lands
  let b = b1;
  for (const d of r.drops) {
    b = b.slice();
    b[d.cell] = d.color;
    anims.push({ kind: 'appear', board: b, cells: [d.cell], color: 0, start: t, dur: APPEAR_MS });
    t += APPEAR_MS;
    if (d.removed.length) {
      anims.push({ kind: 'vanish', board: b, cells: d.removed, color: 0, start: t, dur: VANISH_MS });
      t += VANISH_MS;
      b = b.slice();
      for (const c of d.removed) b[c] = 0;
    }
  }
}

let lastStep = -1;
function tickAnims(now: number): void {
  const a = anims[0];
  if (!a) return;
  if (a.kind === 'move') {
    const step = Math.floor((now - a.start) / MOVE_STEP_MS);
    if (step !== lastStep && step < a.cells.length) {
      lastStep = step;
      if (step > 0) sfx.step();
    }
  }
  if (now >= a.start + a.dur) {
    anims.shift();
    lastStep = -1;
    const n = anims[0];
    if (n?.kind === 'vanish') sfx.vanish();
    if (n?.kind === 'appear') sfx.appear();
    if (!anims.length) {
      turnStart = now;
      if (game.over) endGame();
    }
  }
}

/** End of a game (board full, or F4 as in the original): the Top Ten, with a name entry if the score earns a place. */
function endGame(): void {
  screen = 'over';
  selected = -1;
  anims.length = 0;
  newRank = -1;
  if (qualifies(top, game.score)) {
    sfx.record();
    askName();
  } else sfx.gameOver();
  persist();
}

function askName(): void {
  if (matchMedia('(pointer: coarse)').matches) {
    const answer = window.prompt(`Top Ten: ${game.score}! Your name:`, '') ?? '';
    enterName(answer);
  } else {
    enteringName = true;
    typedName = '';
  }
}

function enterName(name: string): void {
  const r = insertEntry(top, { name: name.trim() || 'Player', score: game.score });
  top = r.table;
  newRank = r.rank;
  enteringName = false;
  persist();
}

function restart(): void {
  game = newGame(seedFromParams());
  anims.length = 0;
  selected = -1;
  screen = 'play';
  newRank = -1;
  enteringName = false;
  shownPillar = 0;
  turnStart = performance.now();
  persist();
}

function pressButton(i: number): void {
  pressed = i;
  pressedUntil = performance.now() + 150;
  if (i === 0) screen = screen === 'help' ? 'play' : screen === 'play' ? 'help' : screen;
  if (i === 1) setSound(!soundOn);
  if (i === 2) showNext = !showNext;
  if (i === 3) {
    // F4 ends the game and, as in the original, still offers the Top Ten
    if (screen === 'over') {
      if (!enteringName) restart();
    } else if (game.score > 0) endGame();
    else restart();
  }
  persist();
}

function clickCell(c: number, now: number): void {
  if (anims.length || game.over) return;
  if (game.board[c]) {
    selected = c;
    selectedAt = now;
    lastBounce = -1;
    return;
  }
  if (selected < 0) return;
  if (!findPath(game.board, selected, c)) {
    sfx.cantMove();
    return;
  }
  const before = game.board.slice();
  const from = selected;
  const r = move(game, from, c, (now - turnStart) / 1000);
  selected = -1;
  if (!r) return;
  playAnims(before, from, r, now);
  persist();
}

function pointer(e: PointerEvent): void {
  e.preventDefault();
  unlockAudio();
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * layout.w;
  const y = ((e.clientY - rect.top) / rect.height) * layout.h;
  const now = performance.now();
  if (screen === 'title') {
    screen = 'play';
    return;
  }
  const b = buttonAt(layout, x, y);
  if (b >= 0 && !enteringName) {
    pressButton(b);
    return;
  }
  if (screen === 'help') {
    screen = 'play';
    return;
  }
  if (screen === 'over') {
    if (!enteringName && !anims.length) restart();
    return;
  }
  const c = cellAt(layout, x, y);
  if (c >= 0) {
    cursor = c;
    cursorShown = false;
    clickCell(c, now);
  }
}

function key(e: KeyboardEvent): void {
  if (enteringName) {
    e.preventDefault();
    if (e.key === 'Enter') enterName(typedName);
    else if (e.key === 'Backspace') typedName = typedName.slice(0, -1);
    else if (e.key.length === 1 && typedName.length < NAME_MAX) typedName += e.key;
    return;
  }
  const f = ['F1', 'F2', 'F3', 'F4'].indexOf(e.key);
  if (f >= 0) {
    e.preventDefault();
    if (screen === 'title') screen = 'play';
    pressButton(f);
    return;
  }
  if (screen === 'title' || screen === 'help') {
    screen = 'play';
    return;
  }
  if (screen === 'over') {
    if (e.key === 'Enter' || e.key === ' ') restart();
    return;
  }
  const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const d = arrows[e.key];
  if (d) {
    e.preventDefault();
    cursorShown = true;
    const x = Math.max(0, Math.min(SIZE - 1, (cursor % SIZE) + d[0]));
    const y = Math.max(0, Math.min(SIZE - 1, Math.floor(cursor / SIZE) + d[1]));
    cursor = y * SIZE + x;
  } else if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    cursorShown = true;
    clickCell(cursor, performance.now());
  }
}

// ---------------------------------------------------------------------------------------------
// Page

function fit(): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const want: Layout = params.get('layout') === 'portrait' ? PORTRAIT : params.get('layout') === 'landscape' ? LANDSCAPE : vh > vw * 1.15 ? PORTRAIT : LANDSCAPE;
  if (want !== layout) layout = want;
  const s = Math.min(vw / layout.w, vh / (layout.h * PIXEL_ASPECT));
  const w = layout.w * s;
  const h = layout.h * PIXEL_ASPECT * s;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.style.left = `${(vw - w) / 2}px`;
  canvas.style.top = `${(vh - h) / 2}px`;
}

function frame(now: number): void {
  tickAnims(now);
  if (selected >= 0 && !anims.length) {
    const bounce = Math.floor((now - selectedAt) / BOUNCE_MS);
    if (bounce !== lastBounce) {
      lastBounce = bounce;
      sfx.bounce();
    }
  }
  draw(now);
  requestAnimationFrame(frame);
}

canvas.addEventListener('pointerdown', pointer);
window.addEventListener('keydown', key);
window.addEventListener('resize', fit);
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());

fit();
void document.fonts?.load("15px 'UnifrakturMaguntia'").then(resetNames, () => undefined);
// ?noart shows the stand-ins drawn when the original's pictures are not deployed
if (!params.has('noart')) {
  void loadSheet(import.meta.env.BASE_URL).then((s) => {
    sheet = s;
  });
}
if (game.over) restart();
requestAnimationFrame(frame);

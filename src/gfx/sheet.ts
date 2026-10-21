// Pictures cut from the original's own screens (original/game.png and original/title.png, 640x350 EGA
// captures). Everything here is optional: when the files are absent the renderer draws stand-ins.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const r = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

/** Regions of original/game.png, measured with tools/_runs.mjs and tools/_bbox.mjs. */
export const SRC = {
  nextLabel: r(211, 13, 40, 11),
  colorsLabel: r(395, 13, 53, 11),
  logo: r(27, 313, 54, 33),
  fkey: [r(98, 317, 31, 25), r(231, 317, 31, 25), r(365, 317, 31, 25), r(498, 317, 31, 25)],
  label: [r(132, 317, 86, 21), r(265, 317, 86, 21), r(399, 317, 86, 21), r(532, 317, 86, 21)],
  /** King with crown and sceptre, down to the top of his pillar (pillar cap at y 136). */
  king: r(36, 66, 92, 76),
  kingPillarX: 80,
  /** Pretender with sword, down to the top of his pillar (pillar cap at y 219). */
  pretender: r(505, 155, 100, 70),
  pretenderPillarX: 554,
  /** Rows of the figures' rects that belong to the pillar cap, counted from the rect's bottom. */
  capRows: 6,
  pillar: r(50, 142, 63, 97), // body row at y 180, base rows 228..238
  pillarBodyY: 180,
  pillarBaseY: 228,
  /** The names under the pillars as the original wrote them. */
  alisa: r(64, 254, 45, 15),
  pretenderName: r(516, 254, 78, 15),
  /** The crown on the King's head (rows 80..98, the head starts at y 100), passed to the Pretender. */
  crown: r(66, 78, 30, 21),
  /** The Pretender's top-knot, hidden under the crown; his head starts at y 180 (the King's at 100). */
  topKnot: r(538, 155, 36, 25),
  crownShiftX: 554 - 80,
  crownShiftY: 180 - 100,
} as const;

export interface Sheet {
  game: HTMLCanvasElement;
  title: HTMLImageElement | null;
  king: HTMLCanvasElement;
  pretender: HTMLCanvasElement;
  /** The King without his crown, the Pretender wearing it: shown once the score passes the best. */
  kingBare: HTMLCanvasElement;
  pretenderCrowned: HTMLCanvasElement;
  labelOn: HTMLCanvasElement[];
  labelOff: HTMLCanvasElement[];
}

function load(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function crop(src: CanvasImageSource, s: Rect): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = s.w;
  c.height = s.h;
  c.getContext('2d')!.drawImage(src, s.x, s.y, s.w, s.h, 0, 0, s.w, s.h);
  return c;
}

/** Makes the black background around a figure transparent (flood fill from the edges). */
function clearOutside(c: HTMLCanvasElement): HTMLCanvasElement {
  const g = c.getContext('2d')!;
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const w = c.width;
  const h = c.height;
  const black = (i: number) => d[i * 4] === 0 && d[i * 4 + 1] === 0 && d[i * 4 + 2] === 0 && d[i * 4 + 3] !== 0;
  const stack: number[] = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop()!;
    if (!black(i)) continue;
    d[i * 4 + 3] = 0;
    const x = i % w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (i >= w) stack.push(i - w);
    if (i < w * (h - 1)) stack.push(i + w);
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Copy of a button label with its text recoloured: lit (green) or unlit (dark grey). */
function recolor(c: HTMLCanvasElement, lit: boolean): HTMLCanvasElement {
  const out = crop(c, r(0, 0, c.width, c.height));
  const g = out.getContext('2d')!;
  const img = g.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  const from = lit ? [84, 84, 84] : [0, 168, 0];
  const to = lit ? [0, 168, 0] : [84, 84, 84];
  // Only the display inside the box (5..80 x 3..17) holds text; its frame also uses dark grey.
  for (let y = 4; y < 17; y++) {
    for (let x = 7; x < 80; x++) {
      const i = (y * out.width + x) * 4;
      if (d[i] === from[0] && d[i + 1] === from[1] && d[i + 2] === from[2]) {
        d[i] = to[0];
        d[i + 1] = to[1];
        d[i + 2] = to[2];
      }
    }
  }
  g.putImageData(img, 0, 0);
  return out;
}

/** Clears a rect (in game.png coordinates) out of a sprite cut at `origin`. */
function erase(sprite: HTMLCanvasElement, origin: Rect, s: Rect): void {
  sprite.getContext('2d')!.clearRect(s.x - origin.x, s.y - origin.y, s.w, s.h);
}

/** Copy with black made transparent. */
function blackToClear(c: HTMLCanvasElement): HTMLCanvasElement {
  const g = c.getContext('2d')!;
  const img = g.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < img.data.length; i += 4) if (img.data[i] + img.data[i + 1] + img.data[i + 2] === 0) img.data[i + 3] = 0;
  g.putImageData(img, 0, 0);
  return c;
}

export async function loadSheet(base: string): Promise<Sheet | null> {
  const [gameImg, title] = await Promise.all([load(`${base}original/game.png`), load(`${base}original/title.png`)]);
  if (!gameImg) return null;
  const game = crop(gameImg, r(0, 0, gameImg.width, gameImg.height));
  const labels = SRC.label.map((s) => crop(game, s));
  const king = clearOutside(crop(game, SRC.king));
  const pretender = clearOutside(crop(game, SRC.pretender));
  const kingBare = crop(king, r(0, 0, king.width, king.height));
  erase(kingBare, SRC.king, SRC.crown);
  const pretenderCrowned = crop(pretender, r(0, 0, pretender.width, pretender.height));
  erase(pretenderCrowned, SRC.pretender, SRC.topKnot);
  const crown = blackToClear(crop(game, SRC.crown));
  pretenderCrowned.getContext('2d')!.drawImage(crown, SRC.crown.x + SRC.crownShiftX - SRC.pretender.x, SRC.crown.y + SRC.crownShiftY - SRC.pretender.y);
  return {
    game,
    title,
    king,
    pretender,
    kingBare,
    pretenderCrowned,
    labelOn: labels.map((l) => recolor(l, true)),
    labelOff: labels.map((l) => recolor(l, false)),
  };
}

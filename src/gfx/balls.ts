// Ball sprites. The pixel patterns are the original's (read from its screen): "dithered" balls checker two
// tones with the grey cell showing through as the highlight; "flat" balls are one colour with a highlight.
// Other sizes (appear/vanish animation) are the big pattern scaled nearest-neighbour.
import { GREY } from './palette';

// 25x19 board ball and 9x7 "Next" ball. L/D = light/dark tone, F = flat colour, h = highlight, . = clear.
const DITHER_BIG = [".........LDLDLDL.........", "......LDLDLDLDLDLDL......", "....DLLLLLLLDLLLDLDDD....", "...DLDLhLhLhLDLDLDLDLD...", "..DLLLhLhhhLLLLLDLDDDDD..", ".DLDLDLhhhLhLDLDLDLDLDLD.", ".LLLDLhLhLhLLLLLDLDDDDDD.", "LDLDLDLhLhLDLDLDLDLDLDLDD", "DLDLLLLLLLLLLLDLDLDLDDDDD", "LDLDLDLDLDLDLDLDLDLDLDDDD", "DLDLDLLLLLLLDLLLDLDDDDDDD", "LDLDLDLDLDLDLDLDLDLDDDLDD", ".DDLDLDLLLDLDLDLDDDDDDDD.", ".DLDLDLDLDLDLDLDLDLDLDDD.", "..DDDLDDDLDLDLDDDLDDDDD..", "...DLDLDLDLDLDLDLDLDDD...", "....DDDDDDDLDDDDDDDDD....", "......LDLDLDLDLDLDD......", ".........DDDDDDD........."];
const FLAT_BIG = [".........FFFFFFF.........", "......FFFFFFFFFFFFF......", "....FFFFFFFFFFFFFFFFF....", "...FFFFhFhFhFFFFFFFFFF...", "..FFFFhFhhhFFFFFFFFFFFF..", ".FFFFFFhhhFhFFFFFFFFFFFF.", ".FFFFFhFhFhFFFFFFFFFFFFF.", "FFFFFFFhFhFFFFFFFFFFFFFFF", "FFFFFFFFFFFFFFFFFFFFFFFFF", "FFFFFFFFFFFFFFFFFFFFFFFFF", "FFFFFFFFFFFFFFFFFFFFFFFFF", "FFFFFFFFFFFFFFFFFFFFFFFFF", ".FFFFFFFFFFFFFFFFFFFFFFF.", ".FFFFFFFFFFFFFFFFFFFFFFF.", "..FFFFFFFFFFFFFFFFFFFFF..", "...FFFFFFFFFFFFFFFFFFF...", "....FFFFFFFFFFFFFFFFF....", "......FFFFFFFFFFFFF......", ".........FFFFFFF........."];
const DITHER_SMALL = ["..LLLDD..", ".LLLDLDL.", "LLhhLDLDD", "DLLLDLDLD", "LDLDLDDDD", ".LDLDLDD.", "..LDDDD.."];
const FLAT_SMALL = ["..FFFFF..", ".FFFFFFF.", "FFhhFFFFF", "FFFFFFFFF", "FFFFFFFFF", ".FFFFFFF.", "..FFFFF.."];

interface Style {
  dither: boolean;
  /** dithered: L, D (highlight is the cell grey); flat: F, h */
  a: string;
  b: string;
}

/** Colours 1..7. Red, dark red, green, yellow, light blue and blue are seen on the original's screen;
 *  magenta is a guess (the pretender's colours, dithered like red). */
export const STYLES: readonly Style[] = [
  { dither: false, a: '', b: '' },
  { dither: true, a: '#fb0000', b: '#a70000' },
  { dither: true, a: '#a70000', b: '#540000' },
  { dither: true, a: '#00a800', b: '#545454' },
  { dither: false, a: '#fce100', b: '#fcfcfc' },
  { dither: false, a: '#00c3f9', b: '#fcfcfc' },
  { dither: false, a: '#0808ad', b: '#00c3f9' },
  { dither: true, a: '#fc00fc', b: '#a800a8' },
];

const cache = new Map<string, HTMLCanvasElement>();

function render(color: number, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const s = STYLES[color];
  const small = w === 9 && h === 7;
  const pat = s.dither ? (small ? DITHER_SMALL : DITHER_BIG) : small ? FLAT_SMALL : FLAT_BIG;
  const pw = pat[0].length;
  const ph = pat.length;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = pat[Math.floor(((y + 0.5) * ph) / h)][Math.floor(((x + 0.5) * pw) / w)];
      if (ch === '.') continue;
      g.fillStyle = ch === 'L' || ch === 'F' ? s.a : ch === 'D' ? s.b : s.dither ? GREY : s.b;
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

export function ballSprite(color: number, w: number, h: number): HTMLCanvasElement {
  const key = `${color}:${w}:${h}`;
  let s = cache.get(key);
  if (!s) {
    s = render(color, w, h);
    cache.set(key, s);
  }
  return s;
}

/** Draws a ball centred on (cx, cy); w/h are the ball's size in screen pixels. */
export function drawBall(g: CanvasRenderingContext2D, color: number, cx: number, cy: number, w: number, h: number): void {
  w = Math.round(w);
  h = Math.round(h);
  if (w < 1 || h < 1 || !color) return;
  g.drawImage(ballSprite(color, w, h), Math.round(cx - w / 2), Math.round(cy - h / 2));
}

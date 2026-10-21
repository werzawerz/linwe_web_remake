// Small drawing helpers in the original's style: bevels, cells, digits, names.
import { BLACK, DARK, GREEN, GREY, LIGHT, NAME_SHADOW, YELLOW } from './palette';

export function fill(g: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
}

/**
 * A bevelled box: `lw`/`lh` light on the left/top, `dw`/`dh` dark on the right/bottom (EGA pixels are
 * twice as tall as wide, so vertical edges are 2 px and horizontal edges 1 px). Swap colours for sunken.
 */
export function bevel(
  g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  sunken = false, face: string | null = GREY, side = 2, top = 1,
): void {
  const tl = sunken ? DARK : LIGHT;
  const br = sunken ? LIGHT : DARK;
  if (face) fill(g, face, x, y, w, h);
  // corners as in the original: the top edge runs to the last column, the bottom edge from the second
  fill(g, tl, x, y, side, h);
  fill(g, br, x + w - side, y, side, h);
  fill(g, tl, x, y, w - 1, top);
  fill(g, br, x + 1, y + h - top, w - 1, top);
}

/** A board cell (33x23 in the original): light top/left, dark bottom/right, grey face. */
export function cell(g: CanvasRenderingContext2D, x: number, y: number, w = 33, h = 23): void {
  bevel(g, x, y, w, h, false, GREY);
}

/** A score display: raised frame (86x19) with a sunken black window. */
export function scoreBox(g: CanvasRenderingContext2D, x: number, y: number, value: number): void {
  bevel(g, x, y, 86, 19, false, GREY);
  fill(g, DARK, x + 5, y + 3, 2, 13);
  fill(g, LIGHT, x + 80, y + 3, 1, 13);
  fill(g, LIGHT, x + 6, y + 15, 75, 1);
  fill(g, DARK, x + 5, y + 3, 76, 1);
  fill(g, BLACK, x + 7, y + 4, 73, 11);
  digits(g, String(value), x + 71, y + 6, GREEN);
}

// 7x7 digits, 9 px apart, right-aligned (the original's "700" and "0", the rest drawn alike).
const DIGITS: Record<string, string[]> = {
  '0': ['..###..', '.##.##.', '##...##', '##...##', '##...##', '.##.##.', '..###..'],
  '1': ['..##...', '.###...', '..##...', '..##...', '..##...', '..##...', '.####..'],
  '2': ['.####..', '##..##.', '....##.', '...##..', '..##...', '.##....', '######.'],
  '3': ['.####..', '##..##.', '....##.', '..###..', '....##.', '##..##.', '.####..'],
  '4': ['...###.', '..####.', '.##.##.', '##..##.', '#######', '....##.', '....##.'],
  '5': ['######.', '##.....', '#####..', '....##.', '....##.', '##..##.', '.####..'],
  '6': ['..###..', '.##....', '##.....', '#####..', '##..##.', '##..##.', '.####..'],
  '7': ['######.', '##..##.', '....##.', '...##..', '..##...', '..##...', '..##...'],
  '8': ['.####..', '##..##.', '##..##.', '.####..', '##..##.', '##..##.', '.####..'],
  '9': ['.####..', '##..##.', '##..##.', '.#####.', '....##.', '...##..', '.###...'],
};

export function digits(g: CanvasRenderingContext2D, text: string, right: number, y: number, color: string): void {
  g.fillStyle = color;
  let x = right - 7;
  for (let i = text.length - 1; i >= 0; i--, x -= 9) {
    const rows = DIGITS[text[i]];
    if (!rows) continue;
    for (let j = 0; j < 7; j++) for (let k = 0; k < 7; k++) if (rows[j][k] === '#') g.fillRect(x + k, y + j, 1, 1);
  }
}

const nameCache = new Map<string, HTMLCanvasElement>();

/**
 * A name in the original's gothic yellow lettering with a blue shadow, thresholded to hard EGA pixels.
 * Drawn 2x wide like everything on the 640x350 screen.
 */
export function nameSprite(text: string, maxWidth = 120): HTMLCanvasElement {
  const key = `${text}:${maxWidth}`;
  const hit = nameCache.get(key);
  if (hit) return hit;
  const font = "15px 'UnifrakturMaguntia', 'Old English Text MT', serif";
  const m = document.createElement('canvas').getContext('2d')!;
  m.font = font;
  const tw = Math.ceil(m.measureText(text).width);
  const sx = Math.min(1.25, maxWidth / Math.max(1, tw * 1.25 + 2));
  const w = Math.max(1, Math.ceil(tw * 1.25 * sx) + 3);
  const h = 17;
  const mask = document.createElement('canvas');
  mask.width = w;
  mask.height = h;
  const mg = mask.getContext('2d')!;
  mg.font = font;
  mg.fillStyle = '#fff';
  mg.textBaseline = 'alphabetic';
  mg.setTransform(1.25 * sx, 0, 0, 1, 0, 0);
  mg.fillText(text, 0, 13);
  const a = mg.getImageData(0, 0, w, h).data;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const og = out.getContext('2d')!;
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] > 110;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (on(x, y)) og.fillStyle = YELLOW;
      else if (on(x - 2, y - 1)) og.fillStyle = NAME_SHADOW;
      else continue;
      og.fillRect(x, y, 1, 1);
    }
  }
  nameCache.set(key, out);
  return out;
}

/** Plain pixel text for screens the original's pictures don't cover (help, dialogs). */
export function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, align: CanvasTextAlign = 'left', size = 10): void {
  g.font = `bold ${size}px 'Courier New', monospace`;
  g.textAlign = align;
  g.textBaseline = 'top';
  g.fillStyle = color;
  g.save();
  g.translate(x, y);
  g.scale(1.2, 1);
  g.fillText(s, 0, 0);
  g.restore();
  g.textAlign = 'left';
}

/** Forget rendered names (after the web font arrives). */
export function resetNames(): void {
  nameCache.clear();
}

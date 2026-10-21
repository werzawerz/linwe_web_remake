// Screen layouts in the original's pixel units (640x350 EGA, pixels 1.37x taller than wide).
// "landscape" is the original screen measured pixel by pixel; "portrait" rearranges the same pieces
// for phones held upright.

export const PIXEL_ASPECT = 480 / 350; // shown as 640x480 (4:3), like the original monitor

export interface Figure {
  /** Centre x of the pillar and the bottom row of its base. */
  x: number;
  baseY: number;
  /** Visible pillar height from the base bottom up to the cap: tallest (king) and shortest (pretender at 0). */
  maxH: number;
  minH: number;
  nameY: number;
}

export interface Layout {
  name: 'landscape' | 'portrait';
  w: number;
  h: number;
  panel: { x: number; y: number; w: number; h: number };
  bottomBar: number; // y of the bottom bar
  board: { x: number; y: number }; // top-left of the first cell
  hiscore: { x: number; y: number };
  score: { x: number; y: number };
  next: { x: number; y: number }; // black frame of the 3 preview cells
  nextLabel: { x: number; y: number } | null;
  colorsLabel: { x: number; y: number } | null;
  logo: { x: number; y: number } | null;
  /** F1..F4: key cap position; the label box sits 34 px to the right. */
  buttons: { x: number; y: number }[];
  king: Figure;
  pretender: Figure;
}

export const CELL_W = 34;
export const CELL_H = 24;

export const LANDSCAPE: Layout = {
  name: 'landscape',
  w: 640,
  h: 350,
  panel: { x: 12, y: 32, w: 616, h: 277 },
  bottomBar: 311,
  board: { x: 171, y: 61 },
  hiscore: { x: 48, y: 7 },
  score: { x: 500, y: 7 },
  next: { x: 271, y: 4 },
  nextLabel: { x: 211, y: 13 },
  colorsLabel: { x: 395, y: 13 },
  logo: { x: 27, y: 313 },
  buttons: [{ x: 98, y: 317 }, { x: 231, y: 317 }, { x: 365, y: 317 }, { x: 498, y: 317 }],
  king: { x: 80, baseY: 238, maxH: 102, minH: 19, nameY: 254 },
  pretender: { x: 554, baseY: 238, maxH: 102, minH: 19, nameY: 254 },
};

export const PORTRAIT: Layout = {
  name: 'portrait',
  w: 340,
  h: 470,
  panel: { x: 8, y: 32, w: 324, h: 372 },
  bottomBar: 407,
  board: { x: 17, y: 41 },
  hiscore: { x: 6, y: 7 },
  score: { x: 248, y: 7 },
  next: { x: 119, y: 4 },
  nextLabel: null,
  colorsLabel: null,
  logo: null,
  buttons: [{ x: 22, y: 412 }, { x: 186, y: 412 }, { x: 22, y: 440 }, { x: 186, y: 440 }],
  king: { x: 70, baseY: 380, maxH: 48, minH: 12, nameY: 384 },
  pretender: { x: 270, baseY: 380, maxH: 48, minH: 12, nameY: 384 },
};

/** Cell under a point in layout pixels, or -1. */
export function cellAt(l: Layout, x: number, y: number): number {
  const cx = Math.floor((x - l.board.x + 0.5) / CELL_W);
  const cy = Math.floor((y - l.board.y + 0.5) / CELL_H);
  if (x < l.board.x - 1 || y < l.board.y - 1 || cx < 0 || cy < 0 || cx > 8 || cy > 8) return -1;
  return cy * 9 + cx;
}

export function buttonAt(l: Layout, x: number, y: number): number {
  for (let i = 0; i < 4; i++) {
    const b = l.buttons[i];
    if (x >= b.x - 2 && x < b.x + 34 + 86 + 2 && y >= b.y - 2 && y < b.y + 26) return i;
  }
  return -1;
}

---
name: color-lines-reference
description: How the original Color Lines (Gamos, 1992, MS-DOS) plays and looks — rules, screen layout measured pixel by pixel, ball sprites, colours, what is verified and what is still a guess. Read before changing gameplay or graphics.
---

# Color Lines (1992) — reference

Faithful to the original beats modern. When unsure, look at the original instead of guessing,
and record what was found here.

## Sources

- `reference/game.png`, `reference/title.png` (git-ignored): the original's EGA screens, 640x350,
  from myabandonware.com's screenshots (`/media/screenshots/c/color-lines-1rm/color-lines_{1,2}.png`).
  The same files are served from `public/original/` (git-ignored, see "Publishing" below).
- English Wikipedia "Color Lines": rules (9x9, 7 colours, 5 starting balls, 3 per turn, lines of 5+
  in 4 directions, extra move after a line, game ends when the board is full).
- Emulators: archive.org `msdos_Color_Lines_1992` and myabandonware's play page did **not** boot in
  headless Chromium (tried twice); not yet used. Worth another try with a headed browser.

## Rules (src/game/rules.ts)

| Rule | Status |
| --- | --- |
| 9x9 board, 7 colours, starts with 5 balls, 3 "next" balls shown | verified (Wikipedia + screenshot: 5 balls at score 0) |
| Move along free cells, 4-neighbour path | verified (Wikipedia) |
| 5+ in a row/column/diagonal vanish, player moves again, no new balls | verified (Wikipedia) |
| Balls dropped by the computer that complete a line vanish and score | assumed (as in later versions) |
| Points for n balls: 10, 12, 18, 28, 42 for 5..9 (10 + 2(n-5)^2) | **guess** (Lines 98 table); verify in the emulator |
| Game over when the board is full | verified |

## Screen (640x350 EGA, shown at 4:3)

Measured with `tools/_runs.mjs`/`_bbox.mjs`; the remake's landscape screen matches the original
pixel for pixel except names other than "Alisa" (font) and the mouse cursor in the capture.

- Colours: light 252, grey 168, dark 84 (EGA 64-colour palette values as captured).
- Bevels: vertical edges 2 px, horizontal 1 px (EGA pixels are tall). Corners: top edge runs to the
  last-but-one column, bottom edge starts at the second column. The panel and the score windows
  mitre their 2-row edges diagonally (see `drawChrome`).
- Black panel x12..627, y32..308. Board: first cell (171,61), cells 33x23 on a 34x24 pitch, black
  grid lines. Next: 3 cells in a black frame at (271,4). Score boxes 86x19 at (48,7) (record) and
  (500,7) (your score). Labels "Next" (211,13), "Colors" (395,13).
- Bottom bar: Gamos logo, F1 HELP, F2 SOUND, F3 NEXT, F4 RESTART; green text = switched on.
- King (record holder, "Alisa" with 700 on the capture) on a tall pillar left; Pretender (magenta,
  sword) right, on a pillar that is short at score 0 (cap at y219, king's at y136). The remake grows
  it in proportion to score / record — **guess**, verify how the original grows it.
- Balls: 25x19 on the board, 9x7 in Next. Two styles taken from the screen: dithered (red, dark red,
  green: two tones checkered, the highlight is the grey cell showing through) and flat (yellow, light
  blue, blue: one colour + highlight). Magenta is not on the capture: **guess** (dithered fc00fc/a800a8).

## Not yet known (check in the emulator)

- Exact scoring; selected-ball bounce, move, appear and vanish animations and their timing; sounds.
- What "Colors" means (a label, or a switch?), what F1 HELP shows, whether F4 asks for confirmation.
- Game-over and new-record screens (name entry), the default record.
- Does hiding Next (F3) change scoring?

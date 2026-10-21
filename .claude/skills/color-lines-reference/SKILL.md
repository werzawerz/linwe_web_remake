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

Main source: **rembish/color-lines-game** (github.com/rembish/color-lines-game), a reverse-engineering
of the original LINES.EXE with a difftest against recorded games; facts in its `re/NOTES.md`.
Read it for facts only, never copy its code.

- 9x9, 7 colours. Start: draw the next colours, then 5 balls (position, then colour), each checked
  for lines (a line while seeding is removed and replaced).
- Random numbers: Turbo Pascal's, `RandSeed = RandSeed * 0x08088405 + 1`, `Random(n) = (RandSeed >> 16) mod n`.
  Colour `Random(7) + 1`; position `k = Random(80)` (cell k, column k mod 9), probing k + 1 while
  taken, 81 wraps to 0 (so the bottom-right cell is only reached by probing).
- Next colours: `min(free, 3)` of them. F3 only hides them (same random numbers either way).
- Path: breadth-first over empty cells, neighbours up, down, left, right. Unreachable: beep 220 Hz
  200 ms, nothing changes. Clicking another ball reselects.
- Lines: for row, column, both diagonals through the cell, every run of 5+ of its colour along that
  line. `count` sums the runs, so a cross's centre counts once per direction (5 + 5 = 10).
- **Points: `Round(((count - 5)^2 + 5) * f)`, `f = 2.0 - (t / 6000.0) * 0.2`, 0 if negative**, t =
  seconds thought (turn start, after the previous placements, to the accepted destination). Quick
  lines: 5 = 10, 6 = 12, 7 = 18, 8 = 28, 9 = 42; a 5 + 5 cross = 60. Less only after ~50 minutes.
  The original computes in 6-byte Reals; doubles differ by a point only at exact rounding ties.
- After a line: no new balls, move again. Otherwise the next balls drop one by one, each checked
  for lines as it lands (scored the same way), then new next colours.
- Game ends when the board is full; F4 also ends it. Both offer the Top Ten.
- Top Ten (Lines.res): 10 entries, name up to 13 chars. Default: #1 "Handicap" 100, the rest
  "- Empty -" 0. A score above #10 enters, above the first strictly lower score. #1 is the King.
- Pretender grows with `score * 20 / best` (steps 0..20) and takes the crown when the score passes.
- Keyboard: arrows move a cursor, Space selects/moves; F1 help, F2 sound, F3 next, F4 restart, Esc quit.

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
- King (Top Ten #1; "Alisa" with 700 on the capture is someone's saved table) on a tall pillar left; Pretender (magenta,
  sword) right, on a pillar that is short at score 0 (cap at y219, king's at y136). The remake grows
  it in 20 steps (see Rules).
- Balls: 25x19 on the board, 9x7 in Next. Two styles taken from the screen: dithered (red, dark red,
  green: two tones checkered, the highlight is the grey cell showing through) and flat (yellow, light
  blue, blue: one colour + highlight). Magenta is not on the capture: **guess** (dithered fc00fc/a800a8).

## Not yet known (check in the emulator, or the original's LINES.LIB pictures)

- Animations (bounce, move, appear, vanish) and their timing; sounds other than the 220 Hz beep.
- The original Top Ten and Help panels (LINES.LIB has them as PCX), the keyboard cursor's look,
  how the Pretender "takes the crown" on screen. What "Colors" means.

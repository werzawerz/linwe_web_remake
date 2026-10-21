# Roadmap

## Done

- Rules: 9x9, 7 colours, 5 start balls, 3 next, path moves, lines of 5+ in 4 directions, extra move
  after a line, lines formed by dropped balls, game over on a full board (unit tested).
- Game screen recreated from the original's EGA capture; matches it pixel for pixel (frame, board,
  score boxes, Next, F-key bar, King and Pretender, ball sprites).
- Title screen (the original's picture).
- Original scoring (thinking time, crosses), Turbo Pascal random numbers and ball placement,
  ball-by-ball drops: from the LINES.EXE reverse-engineering (rembish/color-lines-game).
- Pretender grows in 20 steps of the best score; Top Ten (default "Handicap" 100) with name entry
  after the game or F4; #1 is the King. Keyboard cursor (arrows + Space).
- F1 help, F2 sound, F3 next on/off, F4 restart; PC-speaker style sounds.
- Mouse and touch; landscape layout and a portrait layout for phones; saved game and record.
- GitHub Pages workflow.

## Next

- Get the original running in an emulator (or read LINES.LIB) and match: animations, sounds,
  Help and Top Ten panels, the crown passing to the Pretender, what "Colors" is.
- Decide whether to publish the original's pictures (`public/original/`).

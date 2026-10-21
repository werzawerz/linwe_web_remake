# Roadmap

## Done

- Rules: 9x9, 7 colours, 5 start balls, 3 next, path moves, lines of 5+ in 4 directions, extra move
  after a line, lines formed by dropped balls, game over on a full board (unit tested).
- Game screen recreated from the original's EGA capture; matches it pixel for pixel (frame, board,
  score boxes, Next, F-key bar, King and Pretender, ball sprites).
- Title screen (the original's picture).
- Pretender's pillar grows towards the King's as the score approaches the record.
- New record: name entry (keyboard on PC, prompt on phones), the record holder becomes King.
- F1 help, F2 sound, F3 next on/off, F4 restart; PC-speaker style sounds.
- Mouse and touch; landscape layout and a portrait layout for phones; saved game and record.
- GitHub Pages workflow.

## Next

- Get the original running in an emulator and verify: scoring, animations, sounds, help text,
  game-over/record screens, how the Pretender grows, what "Colors" is.
- Decide whether to publish the original's pictures (`public/original/`).
- Keyboard cursor play (arrows + space) if the original had it.

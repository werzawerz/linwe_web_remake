---
name: color-lines-conventions
description: Architecture, commands, debug URL parameters, tools and deploy for the Color Lines web remake. Read before working on the code.
---

# Color Lines remake — conventions

## Stack and commands

Vite + TypeScript (strict) + Vitest, plain 2D canvas, no framework.

- `npm run dev` (Vite), `npm test`, `npm run build` (tsc + vite build), `npm run preview`.
- Deploy: `.github/workflows/deploy.yml` builds with `--base=/<repo>/` and publishes to GitHub Pages.
  In Git Bash use `export MSYS_NO_PATHCONV=1` before `--base=/x/`.

## Code

- `src/game/rules.ts`: pure, deterministic rules (seeded Mulberry32 in the state; no DOM, Date or
  Math.random). Tested in `rules.test.ts`.
- `src/layout.ts`: positions in the original's 640x350 pixels. `LANDSCAPE` is the original screen;
  `PORTRAIT` (340x470) rearranges the same pieces for upright phones. Canvas is native size and CSS
  scaled with pixel aspect 480/350.
- `src/gfx/`: palette, ball patterns (`balls.ts`, from the original's screen), bevel/digit/name
  drawing (`draw.ts`), pieces cut from the original's screens (`sheet.ts`; every piece has a drawn
  stand-in when `original/` is missing).
- `src/main.ts`: screens (title, play, help, over), input (pointer + F1..F4), animation queue
  (move, appear, vanish), drawing. `src/store.ts`: localStorage (king, switches, game in progress).
  `src/audio.ts`: square-wave beeps, iOS unlock.

## Debug URL parameters

`?seed=N` (fixed game, skips the title), `?menu=0`, `?layout=portrait|landscape`,
`?board=<81 digits>&next=<3 digits>&score=N` (any position), `?noart` (stand-ins only).

## Tools (`tools/_*.mjs`, git-ignored, need Playwright)

`_shot.mjs url out.png [w h] [clicks]` native canvas capture; `_diff.mjs a b out` pixel diff with
rows listed; `_runs.mjs`, `_bbox.mjs`, `_dump.mjs`, `_crop.mjs` measure the original;
`_play.mjs` drives an emulator page.

## Original files

`reference/` and `public/original/` are git-ignored: publishing the original's pictures is the
owner's decision. Without them the deployed site draws stand-ins.

## Decisions

- Top Ten stays per device (localStorage), like the original's Lines.res on each PC: no online
  leaderboard (owner's choice, 2026-10-21).

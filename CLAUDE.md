# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server at http://localhost:5173
- `npm run build` — `tsc -b && vite build` (type-check, then bundle)
- `npm run preview` — serve the production build locally

No test or lint scripts are configured. TypeScript `strict` plus `noUnusedLocals`/`noUnusedParameters` (`tsconfig.json`) are the only static checks; `npm run build` is the gate for type errors.

## Architecture

Single-page React app that imports a chess game (PGN or FEN), evaluates every position with Stockfish, and renders a chess.com-style move review.

### Pipeline

`GameImport` → `store.importGame` → `buildGameModel` (`src/game/pgn.ts`) parses via chess.js into `{ startingFen, positions[], moves[], headers }`. The Zustand store (`src/state/store.ts`) then calls `startAnalysis`, which walks every FEN through `Engine.evaluate(fen, depth)` (`src/engine/stockfish.ts`) and runs `classifyMove` (`src/engine/classify.ts`) on each consecutive eval pair. `analyses[]` and `classifications[]` are parallel arrays indexed by ply (0 = starting position; `null` until computed).

UI components subscribe to the store: `Board` shows the current FEN with a best-move arrow, `EvalBar` and `EvalGraph` (recharts) render the score, `MoveList` lists moves with classification badges, `ReviewSummary` aggregates per-side accuracy.

### Stockfish worker integration (non-obvious)

- The engine runs as a Web Worker loaded from the absolute URL `/stockfish/stockfish-nnue-16-single.js`. That path only exists because `vite.config.ts` uses `vite-plugin-static-copy` to copy the JS **and** the matching `.wasm` out of `node_modules/stockfish/src/` into `dist/stockfish/` at build time. Both files must live in the same directory or the worker fails to instantiate. Swapping engine versions means updating both `targets` in `vite.config.ts` and the worker URL in `src/engine/stockfish.ts`.
- The wrapper drives UCI by parsing stdout (`info` / `bestmove` lines) and serializes one evaluation at a time — calling `evaluate()` while another is pending throws. Cancellation is a monotonic `runId`: any in-flight result whose `runId` no longer matches is discarded, so start a new analysis by bumping the id rather than trying to abort the worker.
- No COOP/COEP headers, no `SharedArrayBuffer`. The single-threaded NNUE build is used deliberately so the app works on plain static hosting.

### Move classification

`classify.ts` converts centipawns to win % (`cpToWinPct`; mate scores are clipped to ±100000 cp first), then the category for a move is decided by the win-% delta from the mover's POV:

- `best` if the played UCI equals `bestMoveUci` of the prior eval
- otherwise: `excellent < 2%`, `good < 5%`, `inaccuracy < 10%`, `mistake < 20%`, else `blunder`

Per-side accuracy uses a chess.com-style fit: `103.17 * exp(-0.0435 * avg_drop) - 3.17`. The six category names are also defined as Tailwind colors under `theme.colors.cls.*` (`tailwind.config.js`) and referenced in markup as `bg-cls-blunder`, `text-cls-best`, etc. — adding or renaming a category requires updates in `src/game/types.ts`, `classify.ts`, **and** `tailwind.config.js` together.

### Other things to know

- Keyboard shortcuts are bound globally in `App.tsx` (←/→ to step, Home/End to jump, F to flip) and are intentionally suppressed when focus is in an `input`, `textarea`, or `select`.
- No environment variables, no `.env`. Depth presets and the sample PGN/FEN are hardcoded.
- No path aliases — imports are plain relative paths.

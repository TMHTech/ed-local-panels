# ED Local Ship Panels (starter)

Local, JS-first panels for your cockpit: a Node/Express server watches Elite Dangerous journals and broadcasts events over WebSocket; panels are static HTML/JS pages that subscribe and render live HUD data.

## Quick start
1. Copy the `local-panels/` folder into the root of your repo (e.g., `EliteDangerousCockpit/`).
2. From the repo root, run:
   ```bash
   npm install
   cp local-panels/server/config.example.json local-panels/server/config.json
   # On Windows (PowerShell): Copy-Item local-panels/server/config.example.json local-panels/server/config.json
   ```
3. Edit `local-panels/server/config.json` to set the **journalsPath** if auto-detect fails.
4. Start:
   ```bash
   npm run start
   # Server at http://localhost:8787 ; open panels:
   #   - http://localhost:8787/panels/nav/
   #   - http://localhost:8787/panels/eng/
   ```

## What it includes
- **Express** static server (serves `local-panels/panels/*`)
- **Socket.IO** broadcast
- **Watchers** for:
  - `Journal.*.log` (JSON-per-line) → emits selected events
  - `Status.json` → emits ship status snapshot
- **Two panels**: `nav` (system & route), `eng` (heat/shields/hull)

## Git add (example)
```bash
git checkout -b feature/local-panels
git add local-panels package.json
git commit -m "feat(panels): add Local Ship Panels starter (Node WS + Nav/Eng panels)"
git push -u origin feature/local-panels
# Open a PR on GitHub
```

## Notes
- Default journal location (Windows): `%USERPROFILE%\Saved Games\Frontier Developments\Elite Dangerous`
- The watcher picks the **latest** `Journal.*.log` and tails new lines.
- `Status.json` updates frequently; we debounce to avoid thrash.
- Everything is local-only; no cloud or OBS required.


## New in v2
- **Tactical panel** (`/panels/tac/`) showing live `ShipTargeted` intel (+ macro button).
- **Macro endpoint** `POST /macro/:name` (commands mapped in `local-panels/server/config.json` → `macros`).
- **Spaceship HUD theme** with CSS variables + runtime `/theme` route so you can change **colors** and **fonts** without editing CSS.
- Example **PowerShell macro scripts** in `/scripts` (replace with your AHK/Gremlin callouts).

# ED Local Ship Panels

> ⚠️ **Work in Progress**  
> This project is an **early version (v1)**. Features may change, break, or be incomplete.  
> Contributions and feedback are welcome while development continues.

Local, JS-first ship panels for your Elite Dangerous cockpit.  
A lightweight Node/Express server watches Elite Dangerous journal files and broadcasts events over WebSocket.  
Panels are static HTML/JS pages that subscribe to those events and render live HUD data.

---

## 🚀 Quick Start

1. Copy the `local-panels/` folder into your project root (e.g. `EliteDangerousCockpit/`).

2. From the project root, install dependencies and copy the config:
   ```bash
   npm install
   cp local-panels/server/config.example.json local-panels/server/config.json
   ```
   On Windows (PowerShell):
   ```powershell
   Copy-Item local-panels/server/config.example.json local-panels/server/config.json
   ```

3. Edit `local-panels/server/config.json` and set **journalsPath** if auto-detect fails.

4. Start the server:
   ```bash
   npm run start
   ```
   Server runs at: [http://localhost:8787](http://localhost:8787)

   Panels available:
   - [Left Panel](http://localhost:8787/panels/nav/) → system & route info  
   - [Right Panel](http://localhost:8787/panels/eng/) → heat / shields / hull

---

## 📦 Features

- **Express** static server – serves `local-panels/panels/*`
- **Socket.IO** – real-time broadcast of game events
- **Watchers**:
  - `Journal.*.log` → emits selected events
  - `Status.json` → emits ship status snapshots
- **Panels included**:
  - **Left Panel** – navigation & route  
  - **Right Panel** – engineering (heat, shields, hull)

---

## 📒 Notes

- Default journal path (Windows):  
  `%USERPROFILE%\Saved Games\Frontier Developments\Elite Dangerous`
- The watcher tails the **latest** `Journal.*.log` automatically.
- `Status.json` updates are debounced to reduce spam.
- Runs entirely **local-only** — no cloud services or overlays required.

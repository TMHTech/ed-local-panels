import express from 'express';
import { createServer } from 'http';
import { Server as IOServer } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { startJournalWatcher } from './watchers/journal.js';
import { startStatusWatcher } from './watchers/status.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config
const cfgPath = path.join(__dirname, 'config.json');
let cfg = {
  port: 8787,
  journalsPath: process.env.USERPROFILE
    ? path.join(process.env.USERPROFILE, 'Saved Games', 'Frontier Developments', 'Elite Dangerous')
    : path.join(process.env.HOME || '', 'Saved Games', 'Frontier Developments', 'Elite Dangerous'),
  statusJson: null,
  theme: {
    accent: '#B01515',
    bg: '#0a0a0f',
    panel: '#111119',
    panelBorder: '#26263a',
    text: '#e8e8f0',
    muted: '#9aa',
    fontFamily: 'Segoe UI, Roboto, Orbitron, Arial, Helvetica, sans-serif',
    headingFontFamily: 'Russo One, Orbitron, Segoe UI, Roboto, Arial, Helvetica, sans-serif',
    scanlines: 0.06,
    glow: 0.5
  },
  macros: {}
};
if (fs.existsSync(cfgPath)) {
  try { cfg = { ...cfg, ...JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) }; } catch {}
}
if (!cfg.statusJson) cfg.statusJson = path.join(cfg.journalsPath, 'Status.json');

const app = express();
app.use(express.json()); // for macro POSTs
const http = createServer(app);
const io = new IOServer(http, { cors: { origin: '*' } });

// static panels
app.use('/panels', express.static(path.join(__dirname, '..', 'panels')));
app.get('/', (_req, res) => res.redirect('/panels/nav/'));

// theme endpoint for runtime styling
app.get('/theme', (_req, res) => res.json(cfg.theme));

// macro endpoint: POST /macro/:name  {args?: string}
app.post('/macro/:name', (req, res) => {
  const name = req.params.name;
  const m = cfg.macros[name];
  if (!m || !m.command) return res.status(404).json({ error: 'macro not found' });
  const cmd = m.command + (req.body?.args ? (' ' + req.body.args) : '');
  const child = exec(cmd, { cwd: path.join(__dirname, '..', '..') });
  child.once('exit', code => {
    io.emit('Macro', { name, code });
  });
  res.json({ ok: true, started: true, name });
});

// broadcast helper
const emit = (type, payload) => io.emit(type, { type, ts: Date.now(), ...payload });

// start watchers
startJournalWatcher(cfg.journalsPath, emit);
startStatusWatcher(cfg.statusJson, emit);

http.listen(cfg.port, () => {
  console.log(`[ED-Panels] Listening on http://localhost:${cfg.port}`);
  console.log(`[ED-Panels] Panels: /panels (nav, eng, tac)`);
  console.log(`[ED-Panels] Journals: ${cfg.journalsPath}`);
  console.log(`[ED-Panels] Status.json: ${cfg.statusJson}`);
});

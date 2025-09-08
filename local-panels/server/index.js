import express from 'express';
import { createServer } from 'http';
import { Server as IOServer } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { createEventBus } from './bus.js';
import { startJournalWatcher } from './watchers/journal.js';
import { startStatusWatcher } from './watchers/status.js';
import { startSidecarWatcher } from './watchers/sidecars.js';

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
  theme: { /* … your theme defaults … */ },
  macros: {}
};
if (fs.existsSync(cfgPath)) {
  try {
    cfg = { ...cfg, ...JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) };
  } catch {}
}
if (!cfg.statusJson) cfg.statusJson = path.join(cfg.journalsPath, 'Status.json');

const app = express();
app.use(express.json());
const http = createServer(app);
const io = new IOServer(http, { cors: { origin: '*' } });

// static panels
app.use('/panels', express.static(path.join(__dirname, '..', 'panels')));
app.get('/', (_req, res) => res.redirect('/panels/hud/'));

// theme endpoint
app.get('/theme', (_req, res) => res.json(cfg.theme));

// macro endpoint: POST /macro/:name  {args?: string}
app.post('/macro/:name', (req, res) => {
  const name = req.params.name;
  const m = cfg.macros[name];
  if (!m || !m.command) return res.status(404).json({ error: 'macro not found' });
  const cmd = m.command + (req.body?.args ? (' ' + req.body.args) : '');
  const child = exec(cmd, { cwd: path.join(__dirname, '..', '..') });
  child.once('exit', code => io.emit('Macro', { name, code }));
  res.json({ ok: true, started: true, name });
});

// broadcaster (single place)
const bus = createEventBus(io);
const emit = (type, payload) => bus.emit(type, payload);

// watchers
startJournalWatcher(cfg.journalsPath, emit);
startStatusWatcher(cfg.statusJson, emit);
startSidecarWatcher(cfg.journalsPath, emit);

http.listen(cfg.port, () => {
  console.log(`[ED-Panels] http://localhost:${cfg.port}`);
  console.log(`[ED-Panels] Panels: /panels (hud, nav, eng, tac)`);
  console.log(`[ED-Panels] Journals: ${cfg.journalsPath}`);
  console.log(`[ED-Panels] Status.json: ${cfg.statusJson}`);
});

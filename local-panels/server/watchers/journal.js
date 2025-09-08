import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';

/** Pick the latest Journal.*.log in a folder */
function latestJournal(dir) {
  const files = fs.readdirSync(dir).filter(f => f.startsWith('Journal.') && f.endsWith('.log'));
  if (!files.length) return null;
  return files.map(f => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
              .sort((a,b) => b.mtime - a.mtime)[0].f;
}

function normalizeEvent(obj) {
  // Map some common events into small, panel-friendly payloads
  switch (obj.event) {
    case 'FSDJump':
      return ['FSDJump', {
        systemName: obj.StarSystem,
        starClass: obj.StarClass,
        fuelUsed: obj.FuelUsed,
        fuelLevel: obj.FuelLevel,
        coords: obj.StarPos
      }];
    case 'StartJump':
      return ['StartJump', { jumpType: obj.JumpType, to: obj.StarSystem }];
    case 'FSSSignalDiscovered':
      return ['Signal', { signal: obj.SignalName, threat: obj.ThreatLevel }];
    case 'ApproachBody':
      return ['ApproachBody', { body: obj.Body }];
    case 'DockingGranted':
      return ['DockingGranted', { station: obj.StationName, pad: obj.LandingPad }];
    case 'UnderAttack':
      return ['UnderAttack', { by: obj.Target || 'Unknown' }];
    case 'ShieldState':
      return ['ShieldState', { shieldsUp: !!obj.ShieldsUp }];
    case 'ShipTargeted':
      return ['Target', {
        name: obj.TargetLocked ? (obj.PilotName_Localised || obj.PilotName || 'Target') : null,
        ship: obj.Ship_Localised || obj.Ship || null,
        wanted: !!obj.Wanted,
        bounty: obj.Bounty || null,
        legalStatus: obj.LegalStatus || null,
        faction: obj.Faction || null,
        power: obj.Power || null,
        subsystem: obj.Subsystem_Localised || null
      }];
    case 'Targeted':
      return ['Target', {
        name: obj.Target || null,
        subTarget: obj.Target_Localised || null
      }];
    default:
      return [null, null];
  }
}

export function startJournalWatcher(dir, emit) {
  // initial file
  let current = latestJournal(dir);
  if (!current) {
    console.warn('[Journal] No Journal.*.log found yet — waiting...');
  } else {
    console.log('[Journal] Following', current);
  }

  const full = () => current ? path.join(dir, current) : null;

  // watch directory for new files and changes
  const watcher = chokidar.watch(path.join(dir, 'Journal.*.log'), { ignoreInitial: false, usePolling: false });

  let stream;
  function openStream() {
    if (!full() || !fs.existsSync(full())) return;
    stream = fs.createReadStream(full(), { encoding: 'utf-8', flags: 'r', start: fs.statSync(full()).size });
    stream.on('data', chunk => {
      const lines = chunk.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          const [type, payload] = normalizeEvent(obj);
          if (type) emit(type, payload);
        } catch {}
      }
    });
    stream.on('error', () => {});
  }

  watcher.on('add', file => {
    // if a newer journal appears, switch
    const f = path.basename(file);
    if (!current) { current = f; openStream(); return; }
    const nowM = fs.statSync(file).mtimeMs;
    const curM = fs.statSync(full()).mtimeMs;
    if (nowM >= curM) {
      current = f;
      console.log('[Journal] Switched to', current);
      if (stream) try { stream.close(); } catch {}
      openStream();
    }
  });

  watcher.on('change', file => {
    // ensure we have a stream open; new data will arrive via stream 'data' handler
    if (!stream) openStream();
  });

  // open initial stream
  openStream();
}

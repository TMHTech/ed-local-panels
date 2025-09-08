// local-panels/server/watchers/journal.js
import fs from 'fs';
import path from 'path';

const SIDE_FILES = [
  'NavRoute.json',
  'Cargo.json',
  'ModulesInfo.json',
  'ShipLocker.json'
];

function parseLine(line) {
  try { return JSON.parse(line); } catch { return null; }
}

function latestJournalDir(journalsPath) {
  const files = fs.readdirSync(journalsPath).filter(f => f.startsWith('Journal.') && f.endsWith('.log'));
  files.sort(); // lexicographic sorts journal timestamps fine
  return files.length ? path.join(journalsPath, files[files.length - 1]) : null;
}

function emitFSD(emit, e) {
  if (e.event === 'FSDJump') {
    emit('FSDJump', {
      systemName: e.StarSystem,
      starClass: e.StarClass,
      fuelLevel: typeof e.FuelLevel === 'number' ? e.FuelLevel : undefined
    });
  }
  if (e.event === 'StartJump') {
    emit('StartJump', { jumpType: e.JumpType, to: e.StarSystem });
  }
}

function emitTargetish(emit, e, targetState) {
  // Track target info from ShipTargeted / Bounty / Faction etc.
  if (e.event === 'ShipTargeted') {
    // e.TargetLocked, e.Ship, e.PilotName_Localised, e.LegalStatus, e.Bounty, e.Subsystem_Localised
    targetState.name = e.PilotName_Localised || e.PilotName || targetState.name;
    targetState.ship = e.Ship || targetState.ship;
    targetState.legalStatus = e.LegalStatus || targetState.legalStatus;
    targetState.bounty = typeof e.Bounty === 'number' ? e.Bounty : targetState.bounty;
    targetState.subsystem = e.Subsystem_Localised || e.Subsystem || targetState.subsystem;
    emit('Target', { ...targetState });
  }
  if (e.event === 'Bounty') {
    // show “WANTED” and last bounty value
    targetState.wanted = true;
    targetState.bounty = e.TotalReward ?? e.Reward ?? targetState.bounty;
    emit('Target', { ...targetState });
  }
  if (e.event === 'FactionKillBond') {
    targetState.wanted = true;
    emit('Target', { ...targetState });
  }
}

function emitTransactions(emit, e, txn) {
  const push = (type, text) => {
    txn.push({ ts: Date.now(), type, text });
    if (txn.length > 50) txn.shift();
    emit('Transactions', { items: txn });
  };
  switch (e.event) {
    case 'MissionAccepted':
      push('Mission', e.Name_Localised || e.Name || 'Mission accepted');
      break;
    case 'MissionCompleted':
      push('Mission', (e.Name_Localised || e.Name || 'Mission completed') + (e.Reward ? ` (+${e.Reward} CR)` : ''));
      break;
    case 'FinePaid':
    case 'PayFines':
      push('Fine', 'Fine paid');
      break;
    case 'CommitCrime':
      push('Crime', e.CrimeType || 'Crime');
      break;
    case 'Bounty':
      push('Bounty', `Bounty ${e.TotalReward ?? e.Reward ?? ''} CR`);
      break;
  }
}

function emitContacts(emit, e, contacts) {
  // keep a small rolling list of nearby ships/stations from Scanned/Approach events
  if (e.event === 'ApproachBody' || e.event === 'ApproachSettlement' || e.event === 'Docked') {
    const name = e.Body ?? e.StationName ?? e.Name ?? 'Point of Interest';
    contacts.unshift({ name, info: e.event });
    contacts.length = Math.min(contacts.length, 20);
    emit('Contacts', { items: contacts });
  }
}

function watchSideFiles(journalsPath, emit) {
  const f = (name) => path.join(journalsPath, name);
  const safeRead = p => { try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return null; } };

  const sendNavRoute = () => {
    const j = safeRead(f('NavRoute.json'));
    if (j?.Route) {
      const items = j.Route.map(r => ({ name: r.StarSystem, starClass: r.StarClass }));
      emit('NavRoute', { items });
    }
  };
  const sendCargo = () => {
    const j = safeRead(f('Cargo.json'));
    if (j?.Inventory) {
      const items = j.Inventory.map(i => ({ name: i.Name_Localised || i.Name, qty: i.Count }));
      emit('Cargo', { items, total: j.Count });
    }
  };
  const sendModules = () => {
    const j = safeRead(f('ModulesInfo.json'));
    if (j?.Modules) {
      const items = j.Modules.map(m => ({
        name: m.Item_Localised || m.Item,
        power: m.Power, priority: m.Priority, health: m.Health
      }));
      emit('Modules', { items });
    }
  };
  const sendLocker = () => {
    const j = safeRead(f('ShipLocker.json'));
    if (j?.Items || j?.Data || j?.Components || j?.Consumables) {
      emit('Locker', {
        items: j.Items || [],
        data: j.Data || [],
        components: j.Components || [],
        consumables: j.Consumables || []
      });
    }
  };

  // initial blasts
  sendNavRoute(); sendCargo(); sendModules(); sendLocker();

  // watch changes
  for (const name of SIDE_FILES) {
    const p = f(name);
    if (fs.existsSync(p)) fs.watchFile(p, { interval: 1000 }, () => {
      if (name === 'NavRoute.json') return sendNavRoute();
      if (name === 'Cargo.json') return sendCargo();
      if (name === 'ModulesInfo.json') return sendModules();
      if (name === 'ShipLocker.json') return sendLocker();
    });
  }
}

export function startJournalWatcher(journalsPath, emit) {
  let current = latestJournalDir(journalsPath);
  if (!current) {
    console.log('[Journal] No journals found');
  } else {
    console.log('[Journal] Following ' + path.basename(current));
  }

  // also start side-file watchers so Left/Right panels have data
  watchSideFiles(journalsPath, emit);

  let pos = 0;
  const follow = () => {
    try {
      const stat = current ? fs.statSync(current) : null;
      if (!stat || !stat.isFile()) return;
      const size = stat.size;
      if (size < pos) pos = 0; // rotated
      if (size > pos) {
        const buf = Buffer.alloc(size - pos);
        const fd = fs.openSync(current, 'r');
        fs.readSync(fd, buf, 0, buf.length, pos);
        fs.closeSync(fd);
        pos = size;
        const lines = buf.toString('utf-8').split(/\r?\n/).filter(Boolean);
        for (const line of lines) {
          const e = parseLine(line);
          if (!e) continue;
          emitFSD(emit, e);
          emitTargetish(emit, e, (startJournalWatcher._targetState ||= {}));
          emitTransactions(emit, e, (startJournalWatcher._txn ||= []));
          emitContacts(emit, e, (startJournalWatcher._contacts ||= []));
        }
      }
    } catch (err) {
      // swallow; will retry
    }
  };

  // poll every 750ms
  setInterval(() => {
    // detect rotation/newest file
    const latest = latestJournalDir(journalsPath);
    if (latest && latest !== current) {
      current = latest;
      pos = 0;
      console.log('[Journal] Switched to ' + path.basename(current));
    }
    follow();
  }, 750);
}

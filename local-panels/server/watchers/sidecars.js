// Watches ED sidecar JSONs and emits socket events to panels
import fs from 'fs';
import path from 'path';

const FILES = {
  Status:        'Status.json',        // emits: StatusSnapshot
  NavRoute:      'NavRoute.json',      // emits: NavRoute
  Cargo:         'Cargo.json',         // emits: Cargo
  ModulesInfo:   'ModulesInfo.json',   // emits: Modules
  ShipLocker:    'ShipLocker.json',    // emits: Locker
  Market:        'Market.json',        // emits: Market
  Shipyard:      'Shipyard.json',      // emits: Shipyard
  Outfitting:    'Outfitting.json',    // emits: Outfitting
  Backpack:      'Backpack.json',      // emits: Backpack
};

const emitters = {
  StatusSnapshot: (emit, j) => {
    // Minimal snapshot (panels already get live Status; this is for idle boot)
    emit('Status', {
      pips: j.Pips ? { sys:j.Pips[0], eng:j.Pips[1], wep:j.Pips[2] } : undefined,
      fuel: j.Fuel?.FuelMain,
      heading: j.Heading,
      fireGroup: j.FireGroup,
      guiFocus: j.GuiFocus,
      cargoTons: j.Cargo,
      balance: j.Balance,
      destination: j.Destination?.Name
    });
  },
  NavRoute: (emit, j) => {
    // -> Left panel route list
    const items = (j.Route || []).map(r => ({ name:r.StarSystem, starClass:r.StarClass }));
    emit('NavRoute', { items });
  },
  Cargo: (emit, j) => {
    // -> Right/Cargo tab
    const items = (j.Inventory || []).map(i => ({
      name: i.Name_Localised || i.Name, qty: i.Count, stolen: !!i.Stolen
    }));
    emit('Cargo', { items, total: j.Count });
  },
  ModulesInfo: (emit, j) => {
    // -> Right/Modules tab
    const items = (j.Modules || []).map(m => ({
      slot: m.Slot, name: m.Item_Localised || m.Item, power: m.Power, priority: m.Priority
    }));
    emit('Modules', { items });
  },
  ShipLocker: (emit, j) => {
    // -> Right panels (optional Odyssey view)
    emit('Locker', {
      items: j.Items || [], components: j.Components || [],
      consumables: j.Consumables || [], data: j.Data || []
    });
  },
  Market: (emit, j) => emit('Market', j),
  Shipyard: (emit, j) => emit('Shipyard', j),
  Outfitting: (emit, j) => emit('Outfitting', j),
  Backpack: (emit, j) => emit('Backpack', j),
};

function safeRead(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return null; }
}

export function startSidecarWatcher(journalsPath, emit) {
  // initial blasts (so panels populate even when game is closed)
  for (const [key, file] of Object.entries(FILES)) {
    const p = path.join(journalsPath, file);
    if (fs.existsSync(p)) {
      const j = safeRead(p);
      if (j && emitters[key]) emitters[key](emit, j);
    }
  }
  // watch for changes
  for (const [key, file] of Object.entries(FILES)) {
    const p = path.join(journalsPath, file);
    if (!fs.existsSync(p)) continue;
    fs.watchFile(p, { interval: 700 }, () => {
      const j = safeRead(p);
      if (j && emitters[key]) emitters[key](emit, j);
    });
  }
}

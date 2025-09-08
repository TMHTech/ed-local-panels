import { ws } from '../shared/ws.js';

// Tabs
const tabs = Array.from(document.querySelectorAll('.tab'));
const panes = {
  status:  document.getElementById('tab-status'),
  modules: document.getElementById('tab-modules'),
  groups:  document.getElementById('tab-groups'),
  cargo:   document.getElementById('tab-cargo'),
  func:    document.getElementById('tab-func'),
};
tabs.forEach(b => b.addEventListener('click', () => {
  tabs.forEach(t => t.classList.toggle('active', t===b));
  Object.values(panes).forEach(p => p.classList.remove('show'));
  panes[b.dataset.tab].classList.add('show');
}));

// Helpers
const addRow = (container, cols) => {
  const frag = document.createElement('div'); frag.className='row';
  frag.innerHTML = cols.map((c)=>`<div>${c ?? ''}</div>`).join('');
  container.appendChild(frag);
};
const setEmpty = (container, a='—', b='—', c='—') => {
  container.innerHTML='';
  addRow(container, [a,b,c]);
  container.firstElementChild.classList.add('dim');
};

// STATUS
const elCmdr  = document.getElementById('cmdr');
const elShip  = document.getElementById('ship');
const elCr    = document.getElementById('cr');
const elRebuy = document.getElementById('rebuy');
const elRanks = document.getElementById('ranks');
const elNotor = document.getElementById('notor');

ws.on('Status', s => {
  // Sidecar snapshot includes these (Balance, Destination, Fuel, FireGroup, Flags). :contentReference[oaicite:2]{index=2}
  if (s?.balance ?? s?.Balance)   elCr.textContent = (s.balance ?? s.Balance).toLocaleString() + ' CR';
  if (s?.ship)                     elShip.textContent = s.ship;
  // If you emit CMDR / ranks later from Journal (Commander/Rank events), wire them here. :contentReference[oaicite:3]{index=3}
});

// MODULES
const modList = document.getElementById('mod-list');
ws.on('Modules', ({items}) => {
  modList.innerHTML='';
  if (!items || !items.length) return setEmpty(modList, '—','—','—','—');
  // From ModulesInfo.json: Slot, Item(_Localised), Power, Priority → we emit name/slot/power/priority. :contentReference[oaicite:4]{index=4}
  for (const m of items) addRow(modList, [
    m.name || m.item || '—',
    m.slot || '—',
    (m.priority ?? '') + '',
    (typeof m.power === 'number' ? m.power.toFixed(2) : (m.power ?? ''))
  ]);
});

// FIRE GROUPS (placeholder — shows active group from Status.FireGroup)
const fgList = document.getElementById('fg-list');
ws.on('Status', s => {
  if (typeof s?.FireGroup === 'number' || typeof s?.fireGroup === 'number') {
    fgList.innerHTML='';
    addRow(fgList, ['Active Group', (s.fireGroup ?? s.FireGroup) + 1, '—']);
  }
});

// CARGO
const cargoList = document.getElementById('cargo-list');
ws.on('Cargo', ({items, total}) => {
  cargoList.innerHTML='';
  if (!items || !items.length) return setEmpty(cargoList, '—','—','—');
  // From Cargo.json: Inventory[*].Name[_Localised], Count, Stolen → we emit name, qty, stolen. :contentReference[oaicite:5]{index=5}
  for (const c of items) addRow(cargoList, [
    c.name || '—',
    c.qty ?? '0',
    c.stolen ? 'Stolen' : ''
  ]);
  // Add a summary row
  addRow(cargoList, ['Total', total ?? items.reduce((n,x)=>n+(x.qty||0),0), '']);
});

// FUNCTIONS — reflect Status.json flags (read-only lamps)
const flagsToState = (flags=0) => ({
  lights:  !!(flags & 256),           // LightsOn
  gear:    !!(flags & 4),             // LandingGearDown
  scoop:   !!(flags & 512),           // CargoScoopDeployed
  silent:  !!(flags & 1024),          // SilentRunning
  nv:      !!(flags & 268435456),     // NightVision
  beacon:  false                      // (no bit in base flags; leave false)
});
const setLamp = (id, on) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('on', !!on);
};
ws.on('Status', s => {
  const f = s?.Flags ?? s?.flags ?? 0;
  const st = flagsToState(f);
  setLamp('lights', st.lights);
  setLamp('gear',   st.gear);
  setLamp('scoop',  st.scoop);
  setLamp('silent', st.silent);
  setLamp('nv',     st.nv);
  setLamp('beacon', st.beacon);
});

// (Optional) Odyssey inventory pages
ws.on('Locker', (j) => {
  // You can add a new tab later to display Items/Consumables/Data from ShipLocker.json. :contentReference[oaicite:6]{index=6}
});

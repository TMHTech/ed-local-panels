import { ws } from '../shared/ws.js'; // same helper used by your other panels
// Tabs
const tabs = Array.from(document.querySelectorAll('.tab'));
const panes = {
  nav: document.getElementById('tab-nav'),
  txn: document.getElementById('tab-txn'),
  contacts: document.getElementById('tab-contacts'),
  target: document.getElementById('tab-target')
};
tabs.forEach(b => b.addEventListener('click', () => {
  tabs.forEach(t => t.classList.toggle('active', t===b));
  Object.values(panes).forEach(p => p.classList.remove('show'));
  panes[b.dataset.tab].classList.add('show');
}));

// Subtabs (Target)
const subt = Array.from(document.querySelectorAll('.subtab'));
const subpanes = { subs: document.getElementById('sub-subs'), manifest: document.getElementById('sub-manifest') };
subt.forEach(b => b.addEventListener('click', () => {
  subt.forEach(s => s.classList.toggle('active', s===b));
  Object.values(subpanes).forEach(p => p.classList.remove('show'));
  subpanes[b.dataset.sub].classList.add('show');
}));

// NAV summary fields
const loc = document.getElementById('loc');
const next = document.getElementById('next');
const jumps = document.getElementById('jumps');
const dest = document.getElementById('dest');

// NAV list
const navList = document.getElementById('nav-list');
function row(a, b){ const r=document.createElement('div'); r.className='row'; r.innerHTML=`<div>${a}</div><div class="muted">${b||''}</div>`; return r; }
function setEmpty(list, msgA='—', msgB='—'){ list.innerHTML=''; list.appendChild(row(msgA,msgB)); list.firstElementChild.classList.add('dim'); }

// Route legs from NavRoute.json → NavRoute event
ws.on('NavRoute', ({items}) => {
  navList.innerHTML='';
  if (!items || !items.length) return setEmpty(navList, '—','No plotted route');
  for (const it of items) navList.appendChild(row(it.name || '—', it.starClass || ''));
});

// FSD/Status hooks keep the top summary fresh
ws.on('FSDJump', ({ systemName, starClass, fuelLevel }) => {
  if (systemName) loc.textContent = systemName;
  // opportunistically show next/remaining if a route exists
  dest.textContent = dest.textContent || systemName || '—';
});
ws.on('Status', s => {
  // If Sidecar watcher bootstraps a destination, show it
  if (s?.destination) dest.textContent = s.destination;
  // If you emit Route meta later, wire it here: next/jumps
});

// TRANSACTIONS (rolling list)
const txnList = document.getElementById('txn-list');
ws.on('Transactions', ({items}) => {
  txnList.innerHTML='';
  if (!items || !items.length) return setEmpty(txnList, '—', 'No activity');
  for (const t of items) txnList.appendChild(row(t.type, t.text || ''));
});

// CONTACTS (rolling list)
const contactsList = document.getElementById('contacts-list');
ws.on('Contacts', ({items}) => {
  contactsList.innerHTML='';
  if (!items || !items.length) return setEmpty(contactsList, '—', 'No contacts');
  for (const c of items) contactsList.appendChild(row(c.name || 'Contact', c.info || ''));
});

// TARGET (subtargets + manifest placeholders)
// These will populate when you start emitting Target + cargo for the target (if desired).
const subsList = document.getElementById('subs-list');
const manifestList = document.getElementById('manifest-list');
ws.on('Target', x => {
  // if you later emit per-subsystem health, map it here; for now, show a simple line
  subsList.innerHTML='';
  if (!x?.name) return setEmpty(subsList, '—', 'No lock');
  subsList.appendChild(row(x.subsystem || 'Primary', x.health ? `${Math.round(x.health*100)}%` : '—'));
});

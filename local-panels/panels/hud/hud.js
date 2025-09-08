import { ws } from '../shared/ws.js';

// helpers to set CSS variables on elements
const setVar = (el, k, v) => el?.style.setProperty(k, v);

// Heat + Speed gauges
const heatGauge = document.querySelector('.gauge.heat .fill');
const heatText  = document.getElementById('heat-val');

const spdGaugeBlue = document.querySelector('.gauge.speed .blue-zone');
const spdThrottle  = document.querySelector('.gauge.speed .throttle');
const spdText      = document.getElementById('spd-val');

// PIPs
const pipSys = document.getElementById('pip-sys');
const pipEng = document.getElementById('pip-eng');
const pipWep = document.getElementById('pip-wep');

// Right block readouts
const fuelAmt = document.getElementById('fuel-amt');

// Left list (simple demo wiring)
const leftLocation = document.getElementById('left-location');
const leftList = document.getElementById('left-list');

// Target block
const tName = document.getElementById('t-name');
const tShip = document.getElementById('t-ship');
const tStatus = document.getElementById('t-status');

// Defaults
updateHeat(0); updateSpeed(0, 0); updatePips(2,2,2);

// Event wiring
ws.on('FSDJump', ({ systemName }) => {
  leftLocation.textContent = systemName || '—';
  // add a sample entry
  leftList.innerHTML = `<div class="row sel"><span class="bullet"></span><span>${systemName || '—'}</span><span class="dist"></span></div>`;
});

ws.on('Status', s => {
  // fuel
  if (typeof s.fuel === 'number') fuelAmt.textContent = s.fuel.toFixed(1) + ' t';

  // pips (values 0..8 halves, Status.json often 0..8 or 0..4 depending on source)
  const sys = normPip(s?.pips?.sys), eng = normPip(s?.pips?.eng), wep = normPip(s?.pips?.wep);
  updatePips(sys, eng, wep);

  // speed (no direct scalar in Status.json; this is a visual placeholder)
  // map heading (0..360) to a “speed” just to move the bar; replace with your own value if you emit one
  if (typeof s.heading === 'number') {
    const fakeSpeedPct = Math.abs(((s.heading % 360) / 360) * 100);
    const throttleDeg = -135 + (fakeSpeedPct/100) * 270; // -135°..+135°
    updateSpeed(fakeSpeedPct, throttleDeg);
  }
});

// Target intel
ws.on('Target', x => {
  if (!x) return;
  tName.textContent = x.name || '—';
  tShip.textContent = x.ship || '—';
  const bag = [];
  if (x.legalStatus) bag.push(x.legalStatus);
  if (x.wanted) bag.push('WANTED');
  if (typeof x.bounty === 'number') bag.push(x.bounty.toLocaleString() + ' CR');
  tStatus.innerHTML = bag.length ? `<span class="accent">${bag.join(' • ')}</span>` : '—';
});

function updateHeat(pct){
  // pct 0..100
  setVar(heatGauge, '--val', pct + '%');
  heatText.textContent = Math.round(pct) + '%';
}
function updateSpeed(pct, throttleDeg){
  setVar(spdGaugeBlue, '--blue', '26%'); // static “blue zone”
  setVar(spdThrottle, '--thr', throttleDeg + 'deg');
  spdText.textContent = Math.round(pct) + '%';
}
function updatePips(sys, eng, wep){
  setVar(pipSys, '--p', Math.min(100, sys/4*100) + '%'); // if you pass 0..4 pips
  setVar(pipEng, '--p', Math.min(100, eng/4*100) + '%');
  setVar(pipWep, '--p', Math.min(100, wep/4*100) + '%');
}
function normPip(val){
  if (val == null) return 2;
  // handle 0..8 halves or 0..4 whole pips
  return val > 4 ? (val/2) : val;
}

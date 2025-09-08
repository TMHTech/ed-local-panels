import chokidar from 'chokidar';
import fs from 'fs';

export function startStatusWatcher(statusPath, emit) {
  const watcher = chokidar.watch(statusPath, { ignoreInitial: false });
  let timer = null;

  function readOnce() {
    try {
      const txt = fs.readFileSync(statusPath, 'utf-8');
      const j = JSON.parse(txt);
      const out = {
        pips: { sys: j.Pips ? j.Pips[0] : null, eng: j.Pips ? j.Pips[1] : null, wep: j.Pips ? j.Pips[2] : null },
        flags: j.Flags,
        fuel: j.Fuel ? (j.Fuel.FuelMain || null) : null,
        guiFocus: j.GuiFocus,
        fireGroup: j.FireGroup,
        latitude: j.Latitude, longitude: j.Longitude,
        heading: j.Heading,
        altitude: j.Altitude
      };
      emit('Status', out);
    } catch {}
  }

  watcher.on('add', readOnce);
  watcher.on('change', () => { clearTimeout(timer); timer = setTimeout(readOnce, 50); });
}

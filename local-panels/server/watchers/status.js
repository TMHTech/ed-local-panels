import chokidar from 'chokidar';
import fs from 'fs';

export function startStatusWatcher(statusPath, emit) {
  let lastJson = null;
  const watcher = chokidar.watch(statusPath, { ignoreInitial: false });
  let timer = null;

  function readOnce() {
    try {
      const txt = fs.readFileSync(statusPath, 'utf-8');
      const j = JSON.parse(txt);
      lastJson = j;
      const out = {
        pips: { sys: j.Pips?[j.Pips[0]]:null, eng: j.Pips?[j.Pips[1]]:null, wep: j.Pips?[j.Pips[2]]:null },
        flags: j.Flags,
        fuel: j.Fuel ? (j.Fuel.FuelMain || null) : null,
        guiFocus: j.GuiFocus,
        fireGroup: j.FireGroup,
        latitude: j.Latitude, longitude: j.Longitude,
        heading: j.Heading,
        altitude: j.Altitude,
        srv: j.Flags2 && (j.Flags2 & 0x4) ? true : false
      };
      emit('Status', out);
    } catch (e) {
      // ignore
    }
  }

  watcher.on('add', readOnce);
  watcher.on('change', () => {
    // debounce to avoid thrash
    clearTimeout(timer);
    timer = setTimeout(readOnce, 50);
  });
}

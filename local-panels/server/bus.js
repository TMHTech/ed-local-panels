// A tiny cached event bus that wraps Socket.IO emits.
// - Caches the last payload per event type
// - Replays the cache to any new client on connect

export function createEventBus(io) {
  /** @type {Map<string, any>} */
  const cache = new Map();

  function emit(type, payload = {}) {
    const msg = { type, ts: Date.now(), ...payload };
    cache.set(type, msg);      // remember the last payload per type
    io.emit(type, msg);        // broadcast live
  }

  // When a new panel connects, send the whole cache so it never starts blank
  io.on('connection', (socket) => {
    for (const [type, msg] of cache) {
      socket.emit(type, msg);
    }
  });

  // Optional: let routes read the cache (debug/inspect)
  function getSnapshot() {
    const out = {};
    for (const [k, v] of cache) out[k] = v;
    return out;
  }

  return { emit, cache, getSnapshot };
}

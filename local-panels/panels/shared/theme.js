export async function applyTheme() {
  try {
    const res = await fetch('/theme');
    const t = await res.json();
    const r = document.documentElement;
    r.style.setProperty('--bg', t.bg || '#0a0a0f');
    r.style.setProperty('--panel', t.panel || '#111119');
    r.style.setProperty('--panel-border', t.panelBorder || '#26263a');
    r.style.setProperty('--text', t.text || '#e8e8f0');
    r.style.setProperty('--muted', t.muted || '#9aa');

    // pick accent by mode, fallback to base accent
    const modeAccent = (t.mode === 'analysis') ? (t.analysisAccent || t.accent) : (t.combatAccent || t.accent);
    r.style.setProperty('--accent', modeAccent || t.accent || '#B01515');

    r.style.setProperty('--font', t.fontFamily || 'Segoe UI, Roboto, Arial, Helvetica, sans-serif');
    r.style.setProperty('--hfont', t.headingFontFamily || 'Segoe UI, Roboto, Arial, Helvetica, sans-serif');
    r.style.setProperty('--scanlines', (t.scanlines ?? 0.06));
    r.style.setProperty('--glow', (t.glow ?? 0.5));
  } catch {}
}

export function injectFonts(t){
  const head = document.head;
  if (t?.fontHrefPrimary) {
    const l = document.createElement('link'); l.rel='preload'; l.as='font'; l.type='font/woff2'; l.href=t.fontHrefPrimary; l.crossOrigin='anonymous'; head.appendChild(l);
  }
  if (t?.fontHrefHeading) {
    const l = document.createElement('link'); l.rel='preload'; l.as='font'; l.type='font/woff2'; l.href=t.fontHrefHeading; l.crossOrigin='anonymous'; head.appendChild(l);
  }
}

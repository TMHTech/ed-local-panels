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
    r.style.setProperty('--accent', t.accent || '#B01515');
    r.style.setProperty('--font', t.fontFamily || 'Segoe UI, Roboto, Arial, Helvetica, sans-serif');
    r.style.setProperty('--hfont', t.headingFontFamily || 'Segoe UI, Roboto, Arial, Helvetica, sans-serif');
    r.style.setProperty('--scanlines', (t.scanlines ?? 0.06));
    r.style.setProperty('--glow', (t.glow ?? 0.5));
  } catch {}
}
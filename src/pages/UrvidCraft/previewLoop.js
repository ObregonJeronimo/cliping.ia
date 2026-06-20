// Urvid Craft — UN SOLO rAF maestro para TODOS los mini-previews del wizard. Cada card registra un draw(t); el loop
// los llama con un reloj compartido, THROTTLEADO (~24fps) y CAPADO (max activos por tick) -> 30+ canvas no funden la CPU.
// Las cards marcan .active via IntersectionObserver: SOLO lo visible anima. Client-side puro (sin backend, sin costo cloud).
const entries = new Set()
let raf = null, t0 = null, last = 0
const MAX_PER_TICK = 16, FRAME_MS = 42   // ~24 fps; tope de canvas dibujados por frame

function tick(now) {
  if (t0 == null) t0 = now
  if (now - last >= FRAME_MS) {
    last = now
    const t = (now - t0) / 1000
    let k = 0
    for (const e of entries) {
      if (e.active) { try { e.draw(t) } catch { /* noop */ } if (++k >= MAX_PER_TICK) break }
    }
  }
  raf = requestAnimationFrame(tick)
}

export function registerPreview(entry) {
  entries.add(entry)
  if (raf == null && typeof requestAnimationFrame !== 'undefined') raf = requestAnimationFrame(tick)
  return () => {
    entries.delete(entry)
    if (!entries.size && raf != null) { cancelAnimationFrame(raf); raf = null; t0 = null; last = 0 }
  }
}

// Urvid Craft — rAF maestro para los mini-previews. AHORA es HOVER-PLAY: las cards muestran un frame ESTATICO por
// defecto y solo ANIMAN mientras el mouse esta encima (entry.active lo prende/apaga la card en mouseenter/leave). El
// loop corre SOLO mientras hay al menos una card activa (cuando no hay hover, se detiene -> CPU 0 + pagina idle).
// Reloj ABSOLUTO (now/1000) -> la card calcula su fase con (t - t0) para arrancar desde 0 al entrar el mouse.
const entries = new Set()
let raf = null, last = 0
const FRAME_MS = 40   // ~25 fps, suficiente para el preview

function anyActive() { for (const e of entries) if (e.active) return true; return false }
function tick(now) {
  if (now - last >= FRAME_MS) { last = now; const t = now / 1000; for (const e of entries) if (e.active) { try { e.draw(t) } catch { /* noop */ } } }
  if (anyActive() && typeof requestAnimationFrame !== 'undefined') raf = requestAnimationFrame(tick)
  else raf = null
}
// despierta el loop (la card lo llama tras marcar active=true en mouseenter).
export function wakePreview() { if (raf == null && typeof requestAnimationFrame !== 'undefined') { last = 0; raf = requestAnimationFrame(tick) } }
export function registerPreview(entry) { entries.add(entry); return () => { entries.delete(entry) } }

// urvid 1.0 · LOTTIE player — rendea animaciones Lottie (pre-hechas, gateadas) como ACENTO, de forma DETERMINISTA:
// goToAndStop(frame) donde frame = f(t) -> el cuadro es funcion pura de t (no usa reloj). Usa lottie-web (canvas).
// SOLO BROWSER: lottie-web necesita DOM. En Node (los gates) -> no-op: el anim es decoracion, los gates no lo testean,
// asi el determinismo del MOTOR (texto/timing) se verifica igual sin lottie. Carga ASYNC (fetch JSON + init); mientras
// carga no dibuja (aparece cuando esta listo), como el cache del logo en render.js. Cache por id (una sola init).
// GATE de determinismo (mirror de backend has_expressions): las Lotties con expresiones/efectos NO renderizan igual
// frame a frame -> se descartan (el anim es opcional; si una falla el gate, no se dibuja). El manifiesto NO viene
// pre-gateado (escala a miles sin bajar todo), asi que se gatea aca al cargar.
function hasExpressions(json) { try { const b = JSON.stringify(json); return b.indexOf('"ef":[{') >= 0 || b.indexOf('"x":"') >= 0 } catch { return true } }

let _libP = null
function ensureLib() {
  if (_libP) return _libP
  if (typeof window === 'undefined') { _libP = Promise.resolve(null); return _libP }
  _libP = import('lottie-web').then(m => m.default || m).catch(() => null)
  return _libP
}

const _cache = new Map()   // id -> { canvas, anim, frames, ip, fps, ready, dead }

function load(id, fileUrl) {
  let e = _cache.get(id); if (e) return e
  e = { ready: false, dead: false }; _cache.set(id, e)
  if (typeof window === 'undefined' || typeof document === 'undefined') { e.dead = true; return e }
  ;(async () => {
    const lib = await ensureLib(); if (!lib) { e.dead = true; return }
    let json
    try { const r = await fetch(fileUrl); json = await r.json() } catch { e.dead = true; return }
    if (!json || !json.w || !json.h || hasExpressions(json)) { e.dead = true; return }   // gate de determinismo
    // lottie-web (canvas) crea su PROPIO canvas dentro de un container adjunto + dimensionado. Lo copiamos al ctx del
    // motor con drawImage. (Pasarle un context externo no rendea bien; el container propio si.) El div va fuera de pantalla.
    const div = document.createElement('div')
    div.style.cssText = `position:absolute;left:-99999px;top:0;width:${json.w}px;height:${json.h}px;pointer-events:none`
    document.body.appendChild(div)
    let anim
    try {
      anim = lib.loadAnimation({
        container: div, renderer: 'canvas', loop: false, autoplay: false,
        animationData: json, rendererSettings: { clearCanvas: true, preserveAspectRatio: 'xMidYMid meet' },
      })
    } catch { e.dead = true; div.remove(); return }
    e.div = div; e.anim = anim; e.fps = json.fr || 30; e.ip = json.ip || 0
    e.frames = (json.op || (e.fps * 2)) - e.ip
    anim.addEventListener('DOMLoaded', () => { e.ready = true })
    setTimeout(() => { e.ready = true }, 250)   // fallback por si DOMLoaded no dispara
  })()
  return e
}

// dibuja la Lottie `id` (archivo fileUrl) en ctx, en la caja (x,y,w,h), en el tiempo t (s). Loopea a su rate natural.
// Determinista: goToAndStop(frame). Devuelve true si dibujo, false si aun no esta lista / no aplica (Node).
export function drawLottie(ctx, id, fileUrl, t, x, y, w, h) {
  const e = load(id, fileUrl)
  if (!e || e.dead || !e.ready || !e.anim) return false
  const cv = e.div && e.div.querySelector('canvas')
  if (!cv || !cv.width) return false
  const dur = e.fps > 0 ? e.frames / e.fps : 2
  const p = dur > 0 ? ((t % dur) + dur) % dur / dur : 0
  try {
    e.anim.goToAndStop(e.ip + p * e.frames, true)
    // encajar manteniendo aspecto dentro de (w,h)
    const ar = cv.width / cv.height, box = w / h
    let dw = w, dh = h
    if (ar > box) dh = w / ar; else dw = h * ar
    ctx.drawImage(cv, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
    return true
  } catch { return false }
}

// precarga (al elegir el video): arranca la carga async para que este lista cuando el player llegue a mostrarla.
export function preloadLottie(id, fileUrl) { if (id && fileUrl) load(id, fileUrl) }

// urvid 1.0 · RENDER — compositor. drawFrame(ctx, t, video): dibuja el FONDO (continuo) + la ESCENA activa, con
// TRANSICIONES entre escenas. En la ventana de transicion A y B se pintan cada una a un BUFFER offscreen y la lib
// transitions compone los buffers (clip/transform); ademas A se DISUELVE (alpha 1->0) para que su texto no quede
// pisando a B. Sin buffer disponible (Node pelado) cae al modo directo previo. ctx en espacio logico 405x720.
import { get } from './registry.js'
import { W, H, inv, clamp, eOutCubic } from './util.js'
import { resolveMotion } from './motion.js'
import { resolveTypekit } from './typekit.js'
import { resolveTransition } from './transitions.js'
import { resolvePost } from './post.js'

const XF = 0.4   // ventana de transicion entre escenas (s) — corta = snappy, menos tiempo de solape

// SCRATCH (buffer offscreen) para componer escenas en la transicion. En browser/Remotion (Chromium) hay
// OffscreenCanvas; los tools Node (napi-canvas) inyectan su createCanvas con setScratchFactory. Sin ninguno
// (Node pelado) -> null -> la transicion cae al modo directo previo (sin crossfade, comportamiento intacto).
let _scratchFactory = null
export function setScratchFactory(fn) { _scratchFactory = fn }
function makeScratch(w, h) {
  if (_scratchFactory) return _scratchFactory(w, h)
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h)
  if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
  return null
}

// pinta UNA escena (contenido) con la ENTRADA de la personalidad (offset/zoom/rotacion de entrada). Coords logicas.
function paintScene(ctx, sc, t, video, motion, typekit) {
  const mod = get(sc.sceneId); if (!mod) return
  const ts = t - sc.start
  const ep = motion.ease(inv(ts, 0, motion.enterDur || 0.5)), k = 1 - ep
  const en = motion.enter || {}
  // FLUIDEZ vs LEGIBILIDAD: ken-burns = zoom MUY lento (<=1.2%) y MONOTONICO sobre la escena (cine, no marea).
  // NO se aplica la deriva sinusoidal `ambient` (x/y/rot/scale) al CONTENIDO: hacer temblar el cuadro de texto
  // de ida y vuelta por sub-pixeles hace "shimmer"/crawl en los bordes -> se ve TOSCO. El texto queda QUIETO; la
  // vida continua la ponen los propios modulos en su DECO (barras/sheen/glow), no el frame entero.
  const sp = inv(ts, 0, sc.dur || 4), kb = (motion.life || 0) * 0.012 * sp
  const z = 1 + (en.scale || 0) * k + kb
  const ox = (en.dx || 0) * k, oy = (en.dy || 0) * k, rot = (en.rotate || 0) * k
  ctx.save()
  ctx.translate(W / 2 + ox, H / 2 + oy); ctx.rotate(rot); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2)
  mod.render(ctx, ts, { pal: video.palette, content: video.content, fonts: video.fonts, seed: sc.seed, energy: 1, sceneDur: sc.dur, motion, typekit })
  ctx.restore()
}

export function drawFrame(ctx, t, video) {
  ctx.clearRect(0, 0, W, H)
  const motion = resolveMotion(video)   // personalidad de movimiento del video (o default)
  const typekit = resolveTypekit(video) // efecto de texto cinetico del video (o plain)
  const transition = resolveTransition(video) // transicion entre escenas (o cut)
  // CAPAS DE FONDO (viven todo el video): fondo -> textura/substrate -> atmosfera/luz -> (contenido encima)
  const base = { pal: video.palette, content: video.content, energy: 1 }
  if (video.bgId) { const m = get(video.bgId); if (m) m.render(ctx, t, { ...base, seed: video.bgSeed }) }
  if (video.subId) { const m = get(video.subId); if (m) m.render(ctx, t, { ...base, seed: video.subSeed }) }
  if (video.atmId) { const m = get(video.atmId); if (m) m.render(ctx, t, { ...base, seed: video.atmSeed }) }
  // GARNISH markkit (persistente): un icono chico en una ESQUINA, tenue, detras del contenido. NUNCA centrado
  // (no compite con el titulo; la regla "nada de blobs/formas sobre el titulo"). Solo iconos (ver assemble.js).
  if (video.markId) {
    const m = get(video.markId)
    if (m) {
      const corners = [[W * 0.82, H * 0.14], [W * 0.82, H * 0.86], [W * 0.18, H * 0.86]]   // TR / BR / BL
      const [gx, gy] = corners[(video.markSeed >>> 0) % corners.length], s = 0.2
      ctx.save(); ctx.globalAlpha = video.tone === 'light' ? 0.5 : 0.62
      ctx.translate(gx, gy); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2)
      m.render(ctx, t, { ...base, seed: video.markSeed })
      ctx.restore()
    }
  }
  // ESCENA + TRANSICIONES — el CONTENIDO va ENCIMA de las capas (texto siempre legible).
  // Ventana de transicion [B.start, B.start+XF): A (saliente, ya asentada) + B (entrante, recien arrancando su
  // entrada) -> la lib transitions compone (wipe/slide/iris/bars/cut). Asi B SI es visible durante la transicion
  // (con la ventana vieja [B.start-XF, B.start) B salia en scene-time negativo = invisible). Fuera de ventana: 1 escena.
  const scenes = video.scenes
  if (!scenes || !scenes.length) return
  let trans = null
  for (let i = 1; i < scenes.length; i++) {
    const b = scenes[i].start
    if (t >= b && t < b + XF) { trans = { A: scenes[i - 1], B: scenes[i], p: (t - b) / XF }; break }
  }
  if (trans) {
    const p = inv(trans.p, 0, 1)
    // BUFFERS: pintamos A y B cada una en su propio canvas (a resolucion del device) y la transicion compone los
    // buffers. CLAVE para el solape de textos: A se DISUELVE (alpha 1->0) mientras B entra -> el texto saliente
    // DESAPARECE en vez de quedar a opacidad plena debajo del reveal (lo que hacia que "se pisaran" por ~0.5s).
    const ss = (ctx.getTransform && ctx.getTransform().a) || 1
    const bw = Math.ceil(W * ss), bh = Math.ceil(H * ss)
    const bufA = makeScratch(bw, bh), bufB = bufA ? makeScratch(bw, bh) : null
    if (bufA && bufB) {
      const ca = bufA.getContext('2d'); ca.setTransform(ss, 0, 0, ss, 0, 0); paintScene(ca, trans.A, t, video, motion, typekit)
      const cb = bufB.getContext('2d'); cb.setTransform(ss, 0, 0, ss, 0, 0); paintScene(cb, trans.B, t, video, motion, typekit)
      const aFade = 1 - eOutCubic(p)   // A se va; B llega entera (el reveal lo da la geometria de la transicion)
      const blit = (c, buf, a) => { c.save(); c.globalAlpha *= clamp(a, 0, 1); c.drawImage(buf, 0, 0, W, H); c.restore() }
      transition.render(ctx, p, c => blit(c, bufA, aFade), c => blit(c, bufB, 1), { W, H })
    } else {
      // fallback sin buffers (Node pelado): modo directo previo (sin crossfade) -> determinismo/tests intactos.
      transition.render(ctx, p,
        c => paintScene(c, trans.A, t, video, motion, typekit),
        c => paintScene(c, trans.B, t, video, motion, typekit),
        { W, H })
    }
  } else {
    let act = null
    for (const sc of scenes) if (t >= sc.start && t < sc.start + sc.dur) { act = sc; break }
    if (!act) act = t < scenes[0].start ? scenes[0] : scenes[scenes.length - 1]
    paintScene(ctx, act, t, video, motion, typekit)
  }
  // POST: acabado (grano/vignette/leak/grade/scanlines) SOBRE todo el cuadro -> el "film look" que une el frame.
  if (video.postId) { const post = resolvePost(video); post.render(ctx, t, { pal: video.palette, content: video.content, energy: 1, seed: video.postSeed >>> 0 }) }
}

export const beatAt = (t, video) => { const sc = video.scenes.find(s => t >= s.start && t < s.start + s.dur); return sc ? sc.sceneId : '' }

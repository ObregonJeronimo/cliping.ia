// urvid 1.0 · RENDER — compositor. drawFrame(ctx, t, video): dibuja el FONDO (continuo) + la ESCENA activa, con
// TRANSICIONES reales entre escenas (la lib transitions compone A saliente + B entrante via clip/transform, sin
// buffers -> nitido y cross-env). El ctx espera el espacio logico 405x720 (el caller escala a 1080x1920).
import { get } from './registry.js'
import { W, H, inv } from './util.js'
import { resolveMotion } from './motion.js'
import { resolveTypekit } from './typekit.js'
import { resolveTransition } from './transitions.js'

const XF = 0.5   // ventana de transicion entre escenas (s)

// pinta UNA escena (contenido) con la ENTRADA de la personalidad (offset/zoom/rotacion + drift ambiente). Coords logicas.
function paintScene(ctx, sc, t, video, motion, typekit) {
  const mod = get(sc.sceneId); if (!mod) return
  const ts = t - sc.start
  const ep = motion.ease(inv(ts, 0, motion.enterDur || 0.5)), k = 1 - ep
  const en = motion.enter || {}, amb = (motion.ambient ? motion.ambient(ts, sc.seed >>> 0) : null) || {}
  // FLUIDEZ: ken-burns = zoom lento (<=2%) sobre toda la escena, MONOTONICO (cinematografico, no marea). Intensidad
  // = motion.life. + ambient (respiracion/flote continuo). Asi el contenido NUNCA queda muerto-estatico tras entrar.
  const sp = inv(ts, 0, sc.dur || 4), kb = (motion.life || 0) * 0.02 * sp
  const z = 1 + (en.scale || 0) * k + (amb.scale || 0) + kb
  const ox = (en.dx || 0) * k + (amb.x || 0), oy = (en.dy || 0) * k + (amb.y || 0), rot = (en.rotate || 0) * k + (amb.rot || 0)
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
    transition.render(ctx, inv(trans.p, 0, 1),
      c => paintScene(c, trans.A, t, video, motion, typekit),
      c => paintScene(c, trans.B, t, video, motion, typekit),
      { W, H })
  } else {
    let act = null
    for (const sc of scenes) if (t >= sc.start && t < sc.start + sc.dur) { act = sc; break }
    if (!act) act = t < scenes[0].start ? scenes[0] : scenes[scenes.length - 1]
    paintScene(ctx, act, t, video, motion, typekit)
  }
}

export const beatAt = (t, video) => { const sc = video.scenes.find(s => t >= s.start && t < s.start + s.dur); return sc ? sc.sceneId : '' }

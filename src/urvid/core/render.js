// urvid 1.0 · RENDER — compositor. drawFrame(ctx, t, video): dibuja el FONDO (continuo) + la ESCENA activa, con
// TRANSICIONES entre escenas. En la ventana de transicion A y B se pintan cada una a un BUFFER offscreen y la lib
// transitions compone los buffers (clip/transform); ademas A se DISUELVE (alpha 1->0) para que su texto no quede
// pisando a B. Sin buffer disponible (Node pelado) cae al modo directo previo. ctx en espacio logico 405x720.
import { get } from './registry.js'
import { W, H, inv, clamp, eOutCubic, setFormat } from './util.js'
import { resolveMotion } from './motion.js'
import { resolveTypekit } from './typekit.js'
import { resolveTransition } from './transitions.js'
import { resolvePost } from './post.js'
import { resolveLayout } from './layout.js'
import { drawLottie } from '../lottie/player.js'

const XF = 0.4   // ventana de transicion entre escenas (s) — corta = snappy, menos tiempo de solape

// SCRATCH (buffer offscreen) para componer escenas en la transicion. En browser/Remotion (Chromium) hay
// OffscreenCanvas; los tools Node (napi-canvas) inyectan su createCanvas con setScratchFactory. Sin ninguno
// (Node pelado) -> null -> la transicion cae al modo directo previo (sin crossfade, comportamiento intacto).
let _scratchFactory = null
export function setScratchFactory(fn) { _scratchFactory = fn }

// LOGO (brand-kit): se decodifica una vez por dataURL y se cachea. En browser/Remotion usa Image(); en Node pelado
// (sin Image) NO dibuja logo (los tools no lo necesitan). Mientras decodifica, se saltea (cuando esta listo, aparece).
const _logoCache = new Map()
function _getLogo(src) {
  if (!src || typeof Image === 'undefined') return null
  let e = _logoCache.get(src)
  if (!e) { const img = new Image(); e = { img, ready: false }; try { img.onload = () => { e.ready = true } } catch { /* noop */ } img.src = src; _logoCache.set(src, e) }
  return e.ready && e.img.width ? e.img : null
}
function makeScratch(w, h) {
  if (_scratchFactory) return _scratchFactory(w, h)
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h)
  if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
  return null
}
// scratch portatil para hornear tiles/patrones (mismo canvas inyectado: napi en gates/shot, OffscreenCanvas en browser).
// Sin factory ni OffscreenCanvas (Node pelado) devuelve null -> el consumidor degrada a no-op.
export function getScratch(w, h) { return makeScratch(w, h) }

// PUSH CINEMATOGRAFICO DE FONDO (no del texto): zoom+deriva LENTOS y MINIMOS sobre las capas bg/sub. Deriva de
// motion.life (0..1 fluidez) * motion.ambient(t,seed) (oscilacion PURA de t+seed -> DETERMINISTA). z>=1 SIEMPRE (zoom-in
// solo recorta hacia adentro, nunca revela borde sin pintar); la deriva se ACOTA al overscan (z-1)*W/2. El TEXTO no pasa
// por aca (paintScene es aparte) -> glifos pixel-estables, cero shimmer. Hace ctx.save(); el llamador hace ctx.restore().
function bgPush(ctx, t, motion, seed) {
  ctx.save()
  const life = clamp(motion && motion.life != null ? motion.life : 0, 0, 1)
  if (life <= 0 || !motion || typeof motion.ambient !== 'function') return   // sin vida -> sin transform (save ya hecho)
  const amb = motion.ambient(t, (seed >>> 0)) || {}
  const z = Math.max(1, 1 + life * (0.006 + Math.abs(amb.scale || 0)))        // zoom-in MINIMO, SIEMPRE >=1
  const mx = (z - 1) * W / 2, my = (z - 1) * H / 2                            // overscan -> tope de la deriva
  const ox = clamp((amb.x || 0) * life * 0.6, -mx, mx), oy = clamp((amb.y || 0) * life * 0.6, -my, my)
  ctx.translate(W / 2 + ox, H / 2 + oy); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2)
}

// pinta UNA escena (contenido) con la ENTRADA de la personalidad (offset/zoom/rotacion de entrada). Coords logicas.
function paintScene(ctx, sc, t, video, motion, typekit, layout) {
  const mod = get(sc.sceneId); if (!mod) return
  const ts = t - sc.start
  // ENTRADA modulada por SERIEDAD: publico serio (salud/finanzas) -> entrada mas SUTIL y corta; relajado -> mas expresiva.
  // PURA (sin r()). Back-compat: sin seriousness -> dev=0 -> intK=1, factor-dur=1 -> BYTE-IDENTICO. El clamp superior de
  // eDur (0.9s) mantiene la entrada << 0.7*dur_min (=1.54s, piso 2.2s) -> toda escena ASENTADA (k=0) en el muestreo de prefit/qa.
  const s = video.seriousness != null ? video.seriousness : 0.5, dev = 0.5 - s
  const intK = clamp(1 + dev * 0.6, 0.7, 1.3)
  const eDur = clamp((motion.enterDur || 0.5) * clamp(1 + dev * 0.5, 0.75, 1.25), 0.2, 0.9)
  const ep = motion.ease(inv(ts, 0, eDur)), k = 1 - ep
  const en = motion.enter || {}
  // FLUIDEZ vs LEGIBILIDAD: el CONTENIDO (texto incluido) NO se escala ni deriva de forma CONTINUA. El ken-burns
  // (zoom lento <=1.2% sobre toda la escena) re-rasterizaba el glifo a escala sub-pixel cuadro a cuadro -> shimmer/
  // crawl en los bordes = se veia TOSCO en TODOS los videos. Tampoco la deriva sinusoidal `ambient`. Ahora la unica
  // transformacion del frame es la ENTRADA (offset/zoom que DECAE en enterDur y se lee como "pop", no como shimmer):
  // una vez asentado, el texto queda 100% PIXEL-ESTABLE. La vida continua la ponen el fondo/sub/atm (sin texto) y la
  // DECO de cada modulo (barras/sheen/glow). `motion.life` sigue en el contrato de las personalidades pero ya NO
  // mueve el contenido, a proposito (si en el futuro se quiere un push cinematografico, va sobre el FONDO, no el texto).
  const z = 1 + (en.scale || 0) * k * intK
  const ox = (en.dx || 0) * k * intK, oy = (en.dy || 0) * k * intK, rot = (en.rotate || 0) * k * intK
  ctx.save()
  ctx.translate(W / 2 + ox, H / 2 + oy); ctx.rotate(rot); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2)
  mod.render(ctx, ts, { pal: video.palette, content: video.content, fonts: video.fonts, seed: sc.seed, energy: 1, sceneDur: sc.dur, motion, typekit, layout })
  ctx.restore()
}

export function drawFrame(ctx, t, video) {
  setFormat(video.format)   // sincroniza W/H al formato del video (live binding que leen todos los modulos)
  ctx.clearRect(0, 0, W, H)
  const motion = resolveMotion(video)   // personalidad de movimiento del video (o default)
  const typekit = resolveTypekit(video) // efecto de texto cinetico del video (o plain)
  const transition = resolveTransition(video) // transicion entre escenas (o cut)
  const layout = resolveLayout(video)   // arquitectura de composicion (slots) del video (o default centrado)
  // CAPAS DE FONDO (viven todo el video): fondo -> textura/substrate -> atmosfera/luz -> (contenido encima)
  const base = { pal: video.palette, content: video.content, energy: 1 }
  if (video.bgId) { const m = get(video.bgId); if (m) { const _sc = video.scenes && video.scenes.find(s => t >= s.start && t < s.start + s.dur); const _bs = (_sc && _sc.bgSeed != null) ? _sc.bgSeed : video.bgSeed; bgPush(ctx, t, motion, _bs); m.render(ctx, t, { ...base, seed: _bs }); ctx.restore() } }
  if (video.subId) { const m = get(video.subId); if (m) { bgPush(ctx, t, motion, video.subSeed); m.render(ctx, t, { ...base, seed: video.subSeed }); ctx.restore() } }
  if (video.atmId) { const m = get(video.atmId); if (m) m.render(ctx, t, { ...base, seed: video.atmSeed }) }   // atm SIN push (rays/glints crawlean)
  // GARNISH markkit (persistente): un icono chico en una ESQUINA, tenue, detras del contenido. NUNCA centrado
  // (no compite con el titulo; la regla "nada de blobs/formas sobre el titulo"). Solo iconos (ver assemble.js).
  if (video.markId) {
    const m = get(video.markId)
    if (m) {
      const corners = [[W * 0.82, H * 0.14], [W * 0.82, H * 0.86], [W * 0.18, H * 0.86]]   // TR / BR / BL
      const [gx, gy] = corners[(video.markSeed >>> 0) % corners.length], s = 0.2
      // GARNISH-BY-SERIOUSNESS: brief serio -> adorno mas tenue (menos competencia con la lectura); relajado -> mas presente.
      // PURO (sin PRNG). Centrado en s=0.5 = alpha de hoy (sin video.seriousness -> 0.5 -> byte-identico).
      const _gs = video.seriousness != null ? video.seriousness : 0.5
      const _gK = clamp(1 - 0.5 * (_gs - 0.5), 0.7, 1.3)   // s=0.85->0.825 ; s=0.5->1.0 ; s=0.2->1.15
      ctx.save(); ctx.globalAlpha = (video.tone === 'light' ? 0.5 : 0.62) * _gK
      ctx.translate(gx, gy); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2)
      m.render(ctx, t, { ...base, seed: video.markSeed })
      ctx.restore()
    }
  }
  // ANIM (Lottie PRE-HECHA, ruteada por concepto): acento animado en una esquina, DETRAS del contenido (no compite con
  // el titulo). Se rendea con lottie-web por `t` -> determinista; SOLO en browser (en Node drawLottie es no-op, asi los
  // gates no dependen de lottie). Aparece tras un breve delay (carga async; mientras tanto no dibuja). Conserva sus
  // colores de diseno (acento pro). El espacio del titulo nunca lo pisa porque va detras del contenido.
  if (video.animUrl) {
    const corners = [[W * 0.74, H * 0.2], [W * 0.74, H * 0.8], [W * 0.26, H * 0.8]]   // TR / BR / BL (evita TL = marca)
    const [gx, gy] = corners[(video.animSeed >>> 0) % corners.length], sz = W * 0.34
    const a = (video.tone === 'light' ? 0.92 : 1) * inv(t, 0.4, 1.1)
    if (a > 0) { ctx.save(); ctx.globalAlpha = a; drawLottie(ctx, video.animId, video.animUrl, t, gx - sz / 2, gy - sz / 2, sz, sz); ctx.restore() }
  }
  // ANIM POR ESCENA (urvid IA): 1-3 Lotties de la escena ACTIVA, ruteadas por lo que dice esa escena. Detras del contenido,
  // en esquinas (evita TL=marca y el centro=titulo). Browser-only (drawLottie no-op en Node). Fade por tiempo de escena.
  const actAnim = video.scenes && video.scenes.find(s => t >= s.start && t < s.start + s.dur)
  if (actAnim && actAnim.anims && actAnim.anims.length) {
    const slots = [[W * 0.78, H * 0.2], [W * 0.22, H * 0.8], [W * 0.78, H * 0.8]]
    const n = Math.min(actAnim.anims.length, 3), sz = W * (n >= 3 ? 0.22 : n === 2 ? 0.26 : 0.3), lt = t - actAnim.start
    for (let k = 0; k < n; k++) {
      const an = actAnim.anims[k]; if (!an || !an.url) continue
      const [gx, gy] = slots[k % slots.length]
      const a = (video.tone === 'light' ? 0.9 : 1) * inv(lt, 0.2 + k * 0.12, 0.9 + k * 0.12)
      if (a > 0) { ctx.save(); ctx.globalAlpha = a; drawLottie(ctx, an.id, an.url, lt, gx - sz / 2, gy - sz / 2, sz, sz); ctx.restore() }
    }
  }
  // GUARD de texto CENTRALIZADO: scrim radial SUAVE en la zona del titulo (~centro), alpha BAJO -> legibilidad
  // consistente sin que cada fondo lo reimplemente y sin enturbiar fondos ya limpios. Debajo del texto. Determinista.
  {
    const light = video.tone === 'light', a = light ? 0.08 : 0.14
    const g = ctx.createRadialGradient(W / 2, H * 0.47, W * 0.22, W / 2, H * 0.47, W * 0.68)
    g.addColorStop(0, light ? 'rgba(255,255,255,' + a + ')' : 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore()
  }
  // ESCENA + TRANSICIONES — el CONTENIDO va ENCIMA de las capas (texto siempre legible).
  // Ventana de transicion [B.start, B.start+XF): A (saliente, ya asentada) + B (entrante, recien arrancando su
  // entrada) -> la lib transitions compone (wipe/slide/iris/bars/cut). Asi B SI es visible durante la transicion
  // (con la ventana vieja [B.start-XF, B.start) B salia en scene-time negativo = invisible). Fuera de ventana: 1 escena.
  const scenes = video.scenes
  if (!scenes || !scenes.length) return
  const xf = (video && video.xf) || XF   // ventana de transicion por personalidad de movimiento
  let trans = null
  for (let i = 1; i < scenes.length; i++) {
    const b = scenes[i].start
    if (t >= b && t < b + xf) { trans = { A: scenes[i - 1], B: scenes[i], p: (t - b) / xf }; break }
  }
  if (trans) {
    const p = inv(trans.p, 0, 1)
    // TRANSICION SECUENCIADA (no simultanea): el CONTENIDO de A y B NUNCA se ve a la vez. El fondo/sub/atm son
    // continuos (ya dibujados), asi que el contenido "dipea" a traves del fondo, no a negro.
    //   fase 1 [0, .5]: A (saliente) se DISUELVE sobre el fondo. B todavia NO aparece.
    //   fase 2 [.5, 1]: A ya se fue; B ENTRA con la geometria de la transicion (wipe/slide/iris/bars) sobre el fondo.
    // Antes A y B se cruzaban medio-visibles -> "se pisaban por medio segundo" (texto Y efectos). Ahora cero solape.
    const ss = (ctx.getTransform && ctx.getTransform().a) || 1
    const bw = Math.ceil(W * ss), bh = Math.ceil(H * ss)
    const bufA = makeScratch(bw, bh), bufB = bufA ? makeScratch(bw, bh) : null
    const blit = (c, buf, a) => { c.save(); c.globalAlpha *= clamp(a, 0, 1); c.drawImage(buf, 0, 0, W, H); c.restore() }
    if (bufA && bufB) {
      if (p < 0.5) {
        const ca = bufA.getContext('2d'); ca.setTransform(1, 0, 0, 1, 0, 0); ca.clearRect(0, 0, bufA.width, bufA.height); ca.setTransform(ss, 0, 0, ss, 0, 0); paintScene(ca, trans.A, t, video, motion, typekit, layout)
        blit(ctx, bufA, 1 - eOutCubic(p / 0.5))   // A se disuelve sobre el fondo
      } else {
        const cb = bufB.getContext('2d'); cb.setTransform(1, 0, 0, 1, 0, 0); cb.clearRect(0, 0, bufB.width, bufB.height); cb.setTransform(ss, 0, 0, ss, 0, 0); paintScene(cb, trans.B, t, video, motion, typekit, layout)
        transition.render(ctx, eOutCubic((p - 0.5) / 0.5), () => {}, c => blit(c, bufB, 1), { W, H })   // A ya no esta; B entra
      }
    } else {
      // fallback sin buffers (Node pelado): corte seco a mitad de ventana (sin solape, determinismo intacto).
      paintScene(ctx, p < 0.5 ? trans.A : trans.B, t, video, motion, typekit, layout)
    }
  } else {
    let act = null
    for (const sc of scenes) if (t >= sc.start && t < sc.start + sc.dur) { act = sc; break }
    if (!act) act = t < scenes[0].start ? scenes[0] : scenes[scenes.length - 1]
    paintScene(ctx, act, t, video, motion, typekit, layout)
  }
  // POST: acabado (grano/vignette/leak/grade/scanlines) SOBRE todo el cuadro -> el "film look" que une el frame.
  if (video.postId) { const post = resolvePost(video); post.render(ctx, t, { pal: video.palette, content: video.content, energy: 1, seed: video.postSeed >>> 0 }) }
  // LOGO de marca (brand-kit) en una esquina, chico y nitido (despues del post). Un logo NO es "foto real" -> ok.
  if (video.logo) {
    const img = _getLogo(video.logo)
    if (img) {
      const hh = H * 0.06, ww = hh * (img.width / img.height), m = W * 0.05, ap = inv(t, 0.2, 0.7)
      ctx.save(); ctx.globalAlpha = 0.92 * ap; ctx.drawImage(img, m, m, ww, hh); ctx.restore()
    }
  }
}

export const beatAt = (t, video) => { const sc = video.scenes.find(s => t >= s.start && t < s.start + s.dur); return sc ? sc.sceneId : '' }

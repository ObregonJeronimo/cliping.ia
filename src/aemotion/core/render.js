// aemotion 0.1 · COMPOSITOR — drawMotionFrame(ctx,t,video). Cada escena pinta SU placa fullbleed
// (variante de fondo por FAMILIA + polaridad del arc) + camara sutil (drift uniforme de placa, nunca
// per-glifo) + whip solo hacia cortes secos. Transiciones dur>0 con DOBLE BUFFER pooleado (A congelada
// al final, B corriendo su entrada) -> los modulos mueven pixeles. Sin factory en Node: corte seco.
// Determinismo: cero estado entre frames salvo pools idempotentes.
import { get } from './registry.js'
import { paintPlate, inkFor, isDarkPol } from '../libs/backgrounds.js'
import { drawCornerMeta } from '../libs/polish.js'
import { drawPivot } from '../libs/pivot.js'
import { seedFor } from './prng.js'
import { clamp } from './util.js'
import { pooled } from './scratch.js'
import '../libs/index.js'

// --- imagenes (mismo contrato de nombres que urvid/kinetic: los tools ya saben usarlo) ---
// Browser: Image() async con crossOrigin (export sin canvas tainted). Node: loader inyectado
// (setImageLoader con la imagen YA decodificada). Sin imagen -> la escena degrada a tipografia.
let _imageLoader = null
export function setImageLoader(fn) { _imageLoader = fn }
const _imgCache = new Map()
export function getImg(url) {
  if (!url) return null
  let e = _imgCache.get(url)
  if (e !== undefined) return (e && e.ok) ? e.img : null
  if (_imageLoader) {
    const img = _imageLoader(url)
    _imgCache.set(url, img ? { img, ok: true } : { ok: false })
    return img || null
  }
  if (typeof Image === 'undefined') { _imgCache.set(url, { ok: false }); return null }
  const img = new Image()
  e = { img, ok: false }
  _imgCache.set(url, e)
  try { img.crossOrigin = 'anonymous' } catch { /* noop */ }
  img.onload = () => { e.ok = true }
  img.src = url
  return null
}

function sceneAt(video, t) {
  const ss = video.scenes
  for (let i = ss.length - 1; i >= 0; i--) if (t >= ss[i].t0) return ss[i]
  return ss[0]
}
export const beatAt = (t, video) => { const s = sceneAt(video, t); return s ? s.sceneId + ' (' + s.polarity + ')' : '' }

function envFor(sc, ts, video) {
  const dna = video.dna
  const ink = inkFor(sc, dna)
  // SALIDA coreografiada: si la escena termina en corte SECO, sus elementos se despiden en los
  // ultimos ~0.5s (ease-in, stagger inverso). Si termina en transicion, la transicion es el gesto.
  const idx = video.scenes.indexOf(sc)
  const isLast = idx === video.scenes.length - 1
  const outXf = video.cuts.some(c => c.dur > 0 && Math.abs(c.at - (sc.t0 + sc.dur)) < 1e-6)
  const outP = (isLast || outXf) ? 0 : clamp((ts - (sc.dur - 0.5)) / 0.42, 0, 1)
  return {
    W: video.W, H: video.H, t: ts, dur: sc.dur, prog: clamp(ts / sc.dur, 0, 1),
    video, dna, sc, ink, idx, outP,
    acc: sc.polarity === 'accent' ? ink : dna.accent,          // acento legible aun sobre placa de acento
    paper: isDarkPol(sc.polarity) ? dna.paperDark : dna.paperLight,
    dark: isDarkPol(sc.polarity),
    text: sc.text, sub: sc.sub,
    images: video.images || [], getImg,
    rng: ns => seedFor(sc.seed, ns),
    margin: dna.margin,
  }
}

function paintScene(ctx, sc, t, video) {
  const ts = Math.max(0, t - sc.t0)
  const env = envFor(sc, ts, video)
  paintPlate(ctx, video.W, video.H, sc, t, video)
  const mod = get(sc.sceneId)

  // camara sutil: drift uniforme de la placa entera (zoom 1-2.4% + pan chico). Sin whip: la salida
  // ahora es COREOGRAFIADA por elemento (env.outP) — el golpe de escala encima quedaba sucio.
  const W = video.W, H = video.H
  const rc = seedFor(sc.seed, 'am.cam')
  const zIn = rc() < 0.55, zAmt = 0.008 + rc() * 0.016
  const panX = (rc() - 0.5) * 7, panY = (rc() - 0.5) * 7
  const p = clamp(ts / sc.dur, 0, 1)
  const z = 1 + zAmt * (zIn ? p : 1 - p)
  ctx.save()
  ctx.translate(W / 2 + panX * p, H / 2 + panY * p)
  ctx.scale(z, z)
  ctx.translate(-W / 2, -H / 2)
  if (mod) mod.render(ctx, ts, env)
  // metadata de esquina (identidad editorial, uniforme en todo el video; respeta la salida)
  ctx.save()
  ctx.globalAlpha *= clamp(ts * 2.2, 0, 1) * (1 - env.outP)
  drawCornerMeta(ctx, env, t)
  ctx.restore()
  ctx.restore()
}

// grain estatico seedeado (determinista, no flickerea)
function paintTexture(ctx, video) {
  const dna = video.dna
  if (dna.texture === 'clean') return
  const r = seedFor(video.seed, 'am.tex')
  ctx.save()
  ctx.globalAlpha = dna.texIntensity
  ctx.fillStyle = '#808080'
  ctx.globalCompositeOperation = 'overlay'
  for (let i = 0; i < 420; i++) ctx.fillRect(r() * video.W, r() * video.H, 1, 1)
  ctx.restore()
}

export function drawMotionFrame(ctx, t, video) {
  const W = video.W, H = video.H
  t = clamp(t, 0, Math.max(0.001, video.duration - 0.0001))
  try { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high' } catch { /* noop */ }

  // CAMARA GLOBAL con logica (research: zoom progresivo sobre TODO el video = se lee "una sola
  // toma"): scale 1.0 -> ~1.05 con ease lentisimo, encima de escenas Y transiciones.
  const camZ = 1 + 0.048 * (1 - Math.pow(1 - t / video.duration, 2))
  ctx.save()
  ctx.translate(W / 2, H / 2); ctx.scale(camZ, camZ); ctx.translate(-W / 2, -H / 2)

  let tr = null
  for (const c of video.cuts) {
    if (c.dur > 0 && t >= c.at - c.dur / 2 && t < c.at + c.dur / 2) { tr = c; break }
  }

  if (!tr) {
    paintScene(ctx, sceneAt(video, t), t, video)
  } else {
    const A = sceneAt(video, tr.at - 0.001), Bs = sceneAt(video, tr.at + 0.001)
    const p = clamp((t - (tr.at - tr.dur / 2)) / tr.dur, 0, 1)
    const mod = get(tr.id)
    const cw = ctx.canvas ? ctx.canvas.width : W, chh = ctx.canvas ? ctx.canvas.height : H
    const bufA = pooled('am.xf.a', cw, chh), bufB = pooled('am.xf.b', cw, chh)
    if (mod && mod.dur > 0 && bufA && bufB) {
      const ss = cw / W
      const pa = bufA.getContext('2d'), pb = bufB.getContext('2d')
      pa.setTransform(1, 0, 0, 1, 0, 0); pa.clearRect(0, 0, cw, chh); pa.setTransform(ss, 0, 0, ss, 0, 0)
      paintScene(pa, A, Math.min(tr.at - 0.001, A.t0 + A.dur - 0.001), video)    // A congelada al final
      pb.setTransform(1, 0, 0, 1, 0, 0); pb.clearRect(0, 0, cw, chh); pb.setTransform(ss, 0, 0, ss, 0, 0)
      paintScene(pb, Bs, Math.max(Bs.t0, t), video)                               // B ya corre su entrada
      mod.render(ctx, p, bufA, bufB, { W, H, ss, video, seed: tr.seed, dna: video.dna })
    } else {
      paintScene(ctx, p < 0.5 ? A : Bs, t, video)              // fallback: corte seco
    }
  }
  // PIVOTE persistente (match-cut device): por encima de escenas Y transiciones, dentro de la camara
  drawPivot(ctx, t, video)
  ctx.restore()                                                // fin camara global

  // FINISHING PASS (research): vineta universal solo-esquinas (invisible como efecto, visible como
  // "terminado") + grain. Fuera de la camara: pegados al frame, no al mundo.
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.82)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.16)')
  ctx.save(); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); ctx.restore()
  paintTexture(ctx, video)
}

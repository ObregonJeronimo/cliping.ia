// kinetic 1.0 · COMPOSITOR — drawFrame(ctx,t,video). Cada escena pinta SU placa fullbleed (la polaridad es
// de la escena: tecnica 15). Transiciones con dur>0 usan DOBLE BUFFER propio: A congelada al final de su
// escena ("foto" que la transicion deforma), B corriendo su entrada -> el modulo de transicion recibe
// BUFFERS (deforma pixeles: colapso, wipe). Fallback sin canvas factory (Node pelado): corte seco.
// Determinismo: cero estado entre frames salvo caches idempotentes (imagenes/buffers).
import { get } from './registry.js'
import { paintPlate, inkFor, isDarkPol } from '../libs/backgrounds.js'
import { paintGarnish } from '../libs/garnish.js'
import { seedFor } from './prng.js'
import { clamp } from './util.js'

// --- hooks para tools Node (mismo contrato de nombres que urvid: los tools ya saben usarlos) ---
let _scratchFactory = null
export function setScratchFactory(fn) { _scratchFactory = fn }
let _imageLoader = null
export function setImageLoader(fn) { _imageLoader = fn }

const _imgCache = new Map()
export function getImg(url) {
  if (!url) return null
  let e = _imgCache.get(url)
  if (e !== undefined) return (e && e.ok) ? e.img : null
  if (_imageLoader) {                                          // Node (tools): loader sync/decoded
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

// buffers de transicion (reusados; realoc si cambia el tamano)
let _bufA = null, _bufB = null, _bufW = 0, _bufH = 0
function scratch(w, h) {
  if (_scratchFactory) return _scratchFactory(w, h)
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c
}
function buffers(w, h) {
  if (!_bufA || _bufW !== w || _bufH !== h) {
    _bufA = scratch(w, h); _bufB = scratch(w, h); _bufW = w; _bufH = h
  }
  return _bufA && _bufB ? [_bufA, _bufB] : null
}

function sceneAt(video, t) {
  const ss = video.scenes
  for (let i = ss.length - 1; i >= 0; i--) if (t >= ss[i].t0) return ss[i]
  return ss[0]
}
export const beatAt = (t, video) => { const s = sceneAt(video, t); return s ? s.sceneId + ' (' + s.polarity + ')' : '' }

// env que reciben las escenas: TODO lo que necesitan, nada global
function envFor(sc, ts, video) {
  const dna = video.dna
  const ink = inkFor(sc, dna)
  return {
    W: video.W, H: video.H, t: ts, dur: sc.dur, prog: clamp(ts / sc.dur, 0, 1),
    video, dna, sc, ink,
    paper: isDarkPol(sc.polarity) ? dna.paperDark : dna.paperLight,
    dark: isDarkPol(sc.polarity),
    text: sc.text, sub: sc.sub, images: video.images, getImg,
    rng: ns => seedFor(sc.seed, ns),                           // SIEMPRE generador fresco por llamada (seek-safe)
    margin: dna.margin,
  }
}

function paintScene(ctx, sc, t, video) {
  const ts = Math.max(0, t - sc.t0)
  const env = envFor(sc, ts, video)
  sc.ink = env.ink                                             // para garnish
  paintPlate(ctx, video.W, video.H, sc, t, video)
  const mod = get(sc.sceneId)
  if (mod) mod.render(ctx, ts, env)
  paintGarnish(ctx, video.W, video.H, sc, t, video)
}

// textura global (grain/paper) — campo ESTATICO seedeado (no flickerea: determinista y sereno)
function paintTexture(ctx, video) {
  const dna = video.dna
  if (dna.texture === 'clean') return
  const r = seedFor(video.seed, 'kin.tex')
  ctx.save()
  ctx.globalAlpha = dna.texIntensity
  ctx.fillStyle = '#808080'
  ctx.globalCompositeOperation = 'overlay'
  const n = dna.texture === 'grain' ? 420 : 220
  for (let i = 0; i < n; i++) {
    const x = r() * video.W, y = r() * video.H
    if (dna.texture === 'grain') ctx.fillRect(x, y, 1, 1)
    else ctx.fillRect(x, y, r() * 6 + 2, 0.6)                  // fibra de papel
  }
  ctx.restore()
}

export function drawFrame(ctx, t, video, opts = {}) {
  const W = video.W, H = video.H
  t = clamp(t, 0, Math.max(0.001, video.duration - 0.0001))
  try { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high' } catch { /* noop */ }

  // ventana de transicion activa (solo cortes con dur > 0)
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
    const bufs = buffers(ctx.canvas ? ctx.canvas.width : W, ctx.canvas ? ctx.canvas.height : H)
    if (mod && bufs) {
      const ss = (ctx.canvas ? ctx.canvas.width : W) / W
      const pa = bufs[0].getContext('2d'), pb = bufs[1].getContext('2d')
      pa.setTransform(1, 0, 0, 1, 0, 0); pa.clearRect(0, 0, _bufW, _bufH); pa.setTransform(ss, 0, 0, ss, 0, 0)
      paintScene(pa, A, Math.min(tr.at - 0.001, A.t0 + A.dur - 0.001), video)   // A CONGELADA al fin de su escena
      pb.setTransform(1, 0, 0, 1, 0, 0); pb.clearRect(0, 0, _bufW, _bufH); pb.setTransform(ss, 0, 0, ss, 0, 0)
      paintScene(pb, Bs, Math.max(Bs.t0, t), video)                              // B ya corre su entrada
      mod.render(ctx, p, bufs[0], bufs[1], { W, H, ss, video, seed: tr.seed, dna: video.dna, plateB: Bs })
    } else {
      paintScene(ctx, p < 0.5 ? A : Bs, t, video)              // fallback: corte seco (determinismo intacto)
    }
  }

  paintTexture(ctx, video)
}

// motionfx 0.1 — motor de video ALTERNATIVO para Motion AI: usa el LENGUAJE NUEVO (entradas de texto
// variadas: slide/split/whip/punch + transiciones enérgicas whip/zoom/push/slam) y las ANIMACIONES FX
// de la Biblioteca (src/templates/fx.js) como visual hero. Driven por el mismo brief que makeMotionVideo.
// Determinista (función pura de t + seed). Contrato compatible con MotionStudio: makeFxVideo -> video,
// drawFxFrame(ctx, t, video). Relacionado: [[animaciones-fx]], [[motor-ae-research]].
import { drawFX, deriveTemplatePalette } from '../templates/index.js'
import { mulberry32, stableSeed } from '../aemotion/index.js'

const W = 405, H = 720, TAU = Math.PI * 2, PI = Math.PI, FONT = '"Archivo","Arial",sans-serif', SAFE = 0.86 * 405, FPS = 30, TD = 0.17
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t
const easeOutExpo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
const backOut = (t, s = 1.70158) => { const u = t - 1; return 1 + u * u * ((s + 1) * u + s) }
function glow(ctx, c, b, fn) { ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = b; fn(); ctx.restore() }
function fit(ctx, text, size, weight) { ctx.font = weight + ' ' + size + 'px ' + FONT; const w = ctx.measureText(text).width; return w <= SAFE ? size : size * SAFE / w }
const up = s => (s || '').toLocaleUpperCase('es')

// ---------- POOL de entradas de texto (research AE): cada frase entra DISTINTO ----------
function off(mode, e) {
  e = clamp(e, 0, 1)
  const ex = e >= 1 ? 1 : 1 - Math.pow(2, -10 * e), q = 1 - Math.pow(1 - e, 5), alf = clamp(e * 3.6, 0, 1)
  if (mode === 'slideL') return { dx: -118 * (1 - ex), dy: 0, sc: 1, sx: 1, rot: 0, al: alf }
  if (mode === 'slideR') return { dx: 118 * (1 - ex), dy: 0, sc: 1, sx: 1, rot: 0, al: alf }
  if (mode === 'slideUp') return { dx: 0, dy: -95 * (1 - ex), sc: 1, sx: 1, rot: 0, al: alf }
  if (mode === 'slideDown') return { dx: 0, dy: 95 * (1 - ex), sc: 1, sx: 1, rot: 0, al: alf }
  if (mode === 'whipL') return { dx: -225 * (1 - q), dy: 0, sc: 1, sx: 1 + clamp((1 - q) * 2.4, 0, 2.4), rot: 0, al: clamp(e * 6, 0, 1) }
  if (mode === 'whipR') return { dx: 225 * (1 - q), dy: 0, sc: 1, sx: 1 + clamp((1 - q) * 2.4, 0, 2.4), rot: 0, al: clamp(e * 6, 0, 1) }
  if (mode === 'punchRot') { const b = backOut(e, 3.0); return { dx: 0, dy: 0, sc: 0.6 + 0.4 * b, sx: 1, rot: (-9 * PI / 180) * (1 - b), al: clamp(e / 0.25, 0, 1) } }
  return { dx: 0, dy: 0, sc: 0.62 + 0.38 * backOut(e, 2.4), sx: 1, rot: 0, al: clamp(e * 4, 0, 1) }
}
function drawPhrase(ctx, text, x, y, size, weight, color, glowCol, tx) {
  ctx.save(); ctx.font = weight + ' ' + size + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha *= tx.al
  ctx.translate(x + tx.dx, y + tx.dy); ctx.rotate(tx.rot); ctx.scale(tx.sx * tx.sc, tx.sc)
  if (glowCol) glow(ctx, glowCol, size * 0.38, () => { ctx.fillStyle = color; ctx.fillText(text, 0, 0) }); else { ctx.fillStyle = color; ctx.fillText(text, 0, 0) }
  ctx.restore()
}
function animText(ctx, text, x, y, size, weight, color, e, mode, glowCol) {
  e = clamp(e, 0, 1); if (e <= 0.001) return
  if (mode === 'split') return splitText(ctx, text, x, y, size, weight, color, e, glowCol)
  if (mode === 'cascade') return cascadeText(ctx, text, x, y, size, weight, color, e, glowCol)
  const du = 0.06, oN = off(mode, e), oP = off(mode, Math.max(0, e - du))
  const vpx = Math.hypot(oN.dx - oP.dx, oN.dy - oP.dy), N = clamp(Math.round(vpx / 7), 1, 4)
  if (N > 1) { for (let i = 0; i < N; i++) { const f = i / (N - 1); drawPhrase(ctx, text, x, y, size, weight, color, glowCol, { dx: lerp(oP.dx, oN.dx, f), dy: lerp(oP.dy, oN.dy, f), sc: oN.sc, sx: oN.sx, rot: oN.rot, al: oN.al / N }) } }
  else drawPhrase(ctx, text, x, y, size, weight, color, glowCol, oN)
}
function splitText(ctx, text, x, y, size, weight, color, e, glowCol) {
  ctx.save(); ctx.font = weight + ' ' + size + 'px ' + FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
  const words = text.split(' '), full = ctx.measureText(text).width, x0 = x - full / 2; let cx = x0
  const b = backOut(clamp(e, 0, 1), 2.6), al = clamp(e / 0.4, 0, 1)
  words.forEach((wd, k) => {
    const seg = wd + (k < words.length - 1 ? ' ' : ''), sw = ctx.measureText(seg).width, ww = ctx.measureText(wd).width
    const dir = (k % 2 === 0 ? -1 : 1) * 142, dx = dir * (1 - b)
    ctx.save(); ctx.globalAlpha *= al; ctx.textAlign = 'center'; const wx = cx + ww / 2 + dx
    if (glowCol) glow(ctx, glowCol, size * 0.36, () => { ctx.fillStyle = color; ctx.fillText(wd, wx, y) }); else { ctx.fillStyle = color; ctx.fillText(wd, wx, y) }
    ctx.restore(); cx += sw
  })
  ctx.restore()
}
function cascadeText(ctx, text, x, y, size, weight, color, e, glowCol) {
  ctx.save(); ctx.font = weight + ' ' + size + 'px ' + FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
  const chars = [...text], full = ctx.measureText(text).width, x0 = x - full / 2; let cx = x0
  chars.forEach((ch, i) => { const cw = ctx.measureText(ch).width, le = clamp((e - i * 0.05) / 0.55, 0, 1), b = backOut(le, 1.9), dy = 42 * (1 - b), al = clamp(le / 0.45, 0, 1)
    if (al > 0.003) { ctx.save(); ctx.globalAlpha *= al; ctx.fillStyle = color; ctx.fillText(ch, cx, y + dy); ctx.restore() }; cx += cw })
  ctx.restore()
}

// ---------- fondo ----------
function bg(ctx, t, pal) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, pal.bg); g.addColorStop(1, '#06070c'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  const cols = [pal.accent, pal.accent2, pal.accent]
  const orbs = [[W * 0.28 + Math.sin(t * 0.3) * 40, H * 0.24 + Math.cos(t * 0.25) * 30, 0], [W * 0.74 + Math.sin(t * 0.22 + 2) * 40, H * 0.78 + Math.cos(t * 0.3 + 1) * 30, 1], [W * 0.5 + Math.sin(t * 0.18) * 60, H * 0.5, 2]]
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (const [ox, oy, ci] of orbs) { const rg = ctx.createRadialGradient(ox, oy, 0, ox, oy, W * 0.9); rg.addColorStop(0, hexA(cols[ci], ci === 2 ? 0.05 : 0.14)); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H) }
  ctx.restore()
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
}
function hexA(hex, a) { const h = (hex || '#888').replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')' }

// ---------- transiciones enérgicas ----------
const TRANS = ['whipL', 'zoomIn', 'whipR', 'pushUp', 'slam']
function tKind(bi) { const n = TRANS.length; return TRANS[((bi % n) + n) % n] }
function inT(kind, p) { const q = 1 - Math.pow(1 - p, 5), ex = p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)
  if (kind === 'whipL') return { dx: W * 1.15 * (1 - q), dy: 0, sc: 1 }
  if (kind === 'whipR') return { dx: -W * 1.15 * (1 - q), dy: 0, sc: 1 }
  if (kind === 'zoomIn') return { dx: 0, dy: 0, sc: 1.32 - 0.32 * ex }
  if (kind === 'pushUp') return { dx: 0, dy: H * 0.72 * (1 - q), sc: 1 }
  if (kind === 'slam') return { dx: 0, dy: 0, sc: 1.07 - 0.07 * ex }
  return { dx: 0, dy: 0, sc: 1 } }
function outT(kind, p) { const iq = Math.pow(p, 5), ic = Math.pow(p, 3)
  if (kind === 'whipL') return { dx: -W * 1.15 * iq, dy: 0, sc: 1 }
  if (kind === 'whipR') return { dx: W * 1.15 * iq, dy: 0, sc: 1 }
  if (kind === 'zoomIn') return { dx: 0, dy: 0, sc: 1 + 0.85 * ic }
  if (kind === 'pushUp') return { dx: 0, dy: -H * 0.72 * iq, sc: 1 }
  if (kind === 'slam') return { dx: 0, dy: 0, sc: 1 }
  return { dx: 0, dy: 0, sc: 1 } }
function sceneTx(i, ts, dur) {
  const push = 1 + 0.04 * (clamp(ts, 0, dur) / dur)
  let tf = { dx: 0, dy: 0, sc: push, al: 1, shake: 0 }
  if (ts < 0) { const p = clamp((ts + TD) / TD, 0, 1), o = inT(tKind(i - 1), p); tf.dx = o.dx; tf.dy = o.dy; tf.sc = o.sc * push; tf.al = clamp(p * 3.5, 0, 1)
    if (tKind(i - 1) === 'slam') { const fr = 1 - p; tf.shake = 8 * fr * fr * (((Math.floor((ts + TD) * FPS)) % 2) ? 1 : -1) } }
  else if (ts > dur - TD) { const p = clamp((ts - (dur - TD)) / TD, 0, 1), o = outT(tKind(i), p); tf.dx = o.dx; tf.dy = o.dy; tf.sc = o.sc * push; tf.al = (tKind(i) === 'slam') ? 1 : clamp(1 - p * 1.15, 0, 1) }
  return tf
}

// ---------- reproductor ----------
export function drawFxFrame(ctx, t, video) {
  const pal = video.palette, S = video.scenes, DUR = video.duration
  t = clamp(t, 0, Math.max(0.001, DUR - 0.0001))
  try { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high' } catch { /* noop */ }
  bg(ctx, t, pal)
  const drawScene = (i, ts) => {
    const s = S[i]; if (ts < -TD - 0.01 || ts > s.dur + 0.01) return; const dts = clamp(ts, 0, s.dur)
    const tf = sceneTx(i, ts, s.dur); if (tf.al <= 0.004) return
    const one = (dx, a) => { ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2 + dx + tf.shake, H / 2 + tf.dy); ctx.scale(tf.sc, tf.sc); ctx.translate(-W / 2, -H / 2); try { s.draw(ctx, dts, t, pal) } catch { /* escena no rompe frame */ } ctx.restore() }
    const dfr = 1 / FPS, pf = sceneTx(i, ts - dfr, s.dur), vpx = Math.abs(tf.dx - pf.dx), N = clamp(Math.round(vpx / 14), 1, 3)
    if (N > 1) { for (let k = 0; k < N; k++) one(lerp(pf.dx, tf.dx, k / (N - 1)), tf.al / N) } else one(tf.dx, tf.al)
  }
  for (let i = 0; i < S.length; i++) drawScene(i, t - S[i].t0)
  drawScene(0, t - DUR)
  for (let bi = 0; bi < S.length; bi++) { if (tKind(bi) !== 'slam') continue; const B = S[bi].t0 + S[bi].dur, d = t - B
    if (Math.abs(d) < 0.12) { const fa = (1 - Math.abs(d) / 0.12) * 0.45; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,' + fa + ')'; ctx.fillRect(0, 0, W, H); ctx.restore() } }
}

const HERO_FX = ['cromo-liquido', 'blob-respira', 'pulso-anillos', 'giro-estela', 'ondas-agua', 'lampara-lava', 'ondas-interferencia', 'remolino-drenaje', 'resplandor']
const T = (s, d) => (s && String(s).trim()) ? String(s).trim() : d

function buildScenes(brief, pal, rng) {
  const brand = T(brief.brand, 'Marca'), tagline = T(brief.tagline, T(brief.claim, 'Resultados de verdad'))
  const claim = T(brief.claim, tagline), cta = T(brief.cta, 'Probalo gratis')
  const bullets = (brief.bullets || []).filter(x => x && String(x).trim()).slice(0, 3).map(x => String(x).trim())
  const stat = (Array.isArray(brief.stats) && brief.stats[0]) || { value: '+100', label: 'clientes felices' }
  const H1 = [...HERO_FX]; for (let i = H1.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [H1[i], H1[j]] = [H1[j], H1[i]] }
  const A = pal.accent, ink = pal.ink, dim = pal.dim
  const S = []
  // 1 · HOOK — FX hero arriba + kicker marca + tagline (split, acento)
  S.push({ name: 'hook', dur: 2.9, draw(ctx, ts) {
    drawFX(ctx, H1[0], ts, 2.9, { x: W / 2, y: H * 0.28, pal, params: { size: 78 } })
    animText(ctx, up(brand), W / 2, H * 0.51, fit(ctx, up(brand), 24, '800'), '800', dim, (ts - 0.04) / 0.4, 'slideDown', null)
    animText(ctx, tagline, W / 2, H * 0.63, fit(ctx, tagline, 56, '900'), '900', A, (ts - 0.3) / 0.55, 'split', A)
  } })
  // 2 · CLAIM — texto (slide) + FX hero
  S.push({ name: 'claim', dur: 2.6, draw(ctx, ts) {
    drawFX(ctx, H1[1], ts, 2.6, { x: W / 2, y: H * 0.35, pal, params: { size: 72 } })
    animText(ctx, claim, W / 2, H * 0.66, fit(ctx, claim, 44, '800'), '800', ink, (ts - 0.35) / 0.5, 'slideL', null)
  } })
  // 3 · BULLETS (si hay) — líneas alternando lados
  if (bullets.length) {
    S.push({ name: 'bullets', dur: 2.8, draw(ctx, ts) {
      bullets.forEach((b, k) => { const mode = k % 2 === 0 ? 'slideL' : 'slideR', y = H * (0.42 + k * 0.13)
        animText(ctx, '· ' + b, W / 2, y, fit(ctx, '· ' + b, 34, '700'), '700', k === bullets.length - 1 ? A : ink, (ts - 0.15 - k * 0.28) / 0.5, mode, k === bullets.length - 1 ? A : null) })
    } })
  }
  // 4 · STAT — número (punch) + label + FX
  S.push({ name: 'stat', dur: 2.3, draw(ctx, ts) {
    drawFX(ctx, 'pulso-anillos', ts, 2.3, { x: W / 2, y: H * 0.34, pal, params: { size: 92 } })
    animText(ctx, String(stat.value || '+100'), W / 2, H * 0.34, fit(ctx, String(stat.value || '+100'), 90, '900'), '900', ink, (ts - 0.04) / 0.6, 'punchRot', null)
    animText(ctx, T(stat.label, 'clientes'), W / 2, H * 0.55, fit(ctx, T(stat.label, 'clientes'), 24, '600'), '600', dim, (ts - 0.34) / 0.45, 'slideUp', null)
  } })
  // 5 · CTA — cta (split acento) + marca
  S.push({ name: 'cta', dur: 3.0, draw(ctx, ts) {
    drawFX(ctx, H1[2], ts, 3.0, { x: W / 2, y: H * 0.28, pal, params: { size: 70 } })
    animText(ctx, cta, W / 2, H * 0.55, fit(ctx, cta, 66, '900'), '900', A, (ts - 0.14) / 0.55, 'split', A)
    animText(ctx, up(brand), W / 2, H * 0.68, fit(ctx, up(brand), 26, '800'), '800', ink, (ts - 0.7) / 0.45, 'slideUp', null)
  } })
  return S
}

// makeFxVideo(brief, {seed}) -> video (mismo contrato que makeMotionVideo para MotionStudio)
export function makeFxVideo(brief = {}, opts = {}) {
  const seed = (opts.seed != null ? opts.seed : (brief.seed != null ? brief.seed : stableSeed(brief.brand, brief.rubro))) >>> 0
  const pal = deriveTemplatePalette(brief.brandColor, 'dark')
  const rng = mulberry32(seed)
  const scenes = buildScenes(brief, pal, rng)
  let t = 0; for (const s of scenes) { s.t0 = t; t += s.dur }
  const duration = Math.max(1, t)
  return {
    engine: 'motionfx', v: 1, W, H, duration, palette: pal, scenes,
    dna: { familia: 'FX Kinético', pairId: 'archivo', shapeDialect: 'fx', bpm: 120 },
    script: { templateId: 'fx-kinetic' },
    cutTimes: scenes.slice(1).map(s => s.t0),
    images: [], brief,
    recipe: { engine: 'motionfx', seed, sceneNames: scenes.map(s => s.name) },
  }
}

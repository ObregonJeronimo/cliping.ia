// urvid 1.0 · RENDER — compositor. drawFrame(ctx, t, video): dibuja el FONDO (continuo) + la ESCENA activa (con
// cross-fade corto + micro-zoom de entrada). El ctx espera el espacio logico 405x720 (el caller escala a 1080x1920).
import { get } from './registry.js'
import { W, H, inv, eInOutCubic, clamp } from './util.js'

const XF = 0.4   // cross-fade entre escenas

export function drawFrame(ctx, t, video) {
  ctx.clearRect(0, 0, W, H)
  // CAPAS DE FONDO (viven todo el video): fondo -> textura/substrate -> atmosfera/luz -> (contenido encima)
  const base = { pal: video.palette, content: video.content, energy: 1 }
  if (video.bgId) { const m = get(video.bgId); if (m) m.render(ctx, t, { ...base, seed: video.bgSeed }) }
  if (video.subId) { const m = get(video.subId); if (m) m.render(ctx, t, { ...base, seed: video.subSeed }) }
  if (video.atmId) { const m = get(video.atmId); if (m) m.render(ctx, t, { ...base, seed: video.atmSeed }) }
  // ESCENA activa (+ la entrante en el cross-fade) — el CONTENIDO va ENCIMA de las capas (texto siempre legible)
  for (const sc of video.scenes) {
    const s = sc.start, e = sc.start + sc.dur
    if (t < s - XF || t > e) continue
    const a = Math.min(inv(t, s - XF, s + 0.1), 1 - inv(t, e - XF, e))
    if (a <= 0) continue
    const mod = get(sc.sceneId)
    if (!mod) continue
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1)
    const z = 1 + (1 - eInOutCubic(inv(t - s, 0, 0.5))) * 0.03   // micro-zoom de entrada
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2)
    mod.render(ctx, t - s, { pal: video.palette, content: video.content, fonts: video.fonts, seed: sc.seed, energy: 1, sceneDur: sc.dur })
    ctx.restore()
  }
}

export const beatAt = (t, video) => { const sc = video.scenes.find(s => t >= s.start && t < s.start + s.dur); return sc ? sc.sceneId : '' }

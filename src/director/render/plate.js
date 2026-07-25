// director · PLACA — el fondo del video. Se dibuja UNA vez por frame y es lo que da el "material" de
// la pieza: degrade con UNA luz, ornamento, vineta y grano. Todo determinista (prng por seed del look).
//
// Por que importa: el 80% de la sensacion "hecho con After Effects" viene de que el fondo no sea un
// color plano. Un plano liso + texto = plantilla de Canva. Con luz direccional + grano fino + vineta
// sutil, la misma composicion pasa a leerse como pieza de estudio (DIRECCION-DE-ARTE P2/P6).

import { mulberry32, hashStr } from '../core/prng.js'
import { rgba, mixColor, lighten } from '../core/util.js'

// cache del grano por (seed, W, H): es lo unico caro del fondo y no cambia entre frames
const _grano = new Map()

export function drawPlaca(ctx, look, W, H, opts = {}) {
  const orn = opts.orn !== false, grano = opts.grano !== false, vineta = opts.vineta !== false
  const deriva = opts.deriva || 0                        // -0.5..0.5: desplaza la luz (fondo vivo)
  ctx.save()

  // --- base + UNA luz direccional ---
  ctx.fillStyle = look.bg0
  ctx.fillRect(0, 0, W, H)
  const ang = look.luzAng == null ? -1.57 : look.luzAng
  const lx = W / 2 + Math.cos(ang) * W * 0.75 + deriva * W * 1.6, ly = H / 2 + Math.sin(ang) * H * 0.55 + deriva * H * 0.5
  const g = ctx.createRadialGradient(lx, ly, Math.min(W, H) * 0.05, lx, ly, Math.max(W, H) * 0.95)
  g.addColorStop(0, look.bg1)
  g.addColorStop(0.55, mixColor(look.bg1, look.bg0, 0.62))
  g.addColorStop(1, look.bg0)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // --- mesh de acento: SOLO si la pagina realmente es gradient-mesh (DNA-SPEC §4.2) ---
  if ((look.modernidad || []).indexOf('gradient-mesh') >= 0) {
    const r = mulberry32(hashStr('mesh' + look.accent + look.placa))
    for (let i = 0; i < 3; i++) {
      const cx = W * (0.15 + r() * 0.7), cy = H * (0.12 + r() * 0.7), rad = Math.max(W, H) * (0.28 + r() * 0.22)
      const col = i % 2 ? look.accent2 : look.accent
      const mg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
      mg.addColorStop(0, rgba(col, 0.20))
      mg.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = mg
      ctx.fillRect(0, 0, W, H)
    }
  }

  // --- ornamento ---
  if (orn) drawOrnamento(ctx, look, W, H)

  // --- vineta: siempre hacia adentro, nunca un anillo negro evidente ---
  if (vineta) {
    const v = ctx.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.30, W / 2, H * 0.5, Math.max(W, H) * 0.78)
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, look.dark ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0.20)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, W, H)
  }

  // --- grano ---
  if (grano && look.grano > 0) drawGrano(ctx, look, W, H)
  ctx.restore()
}

function drawOrnamento(ctx, look, W, H) {
  const m = Math.round(W * (look.margen * 0.55))
  const col = rgba(look.ink, look.dark ? 0.13 : 0.10)
  ctx.save()
  ctx.strokeStyle = col
  ctx.lineWidth = Math.max(1, W * 0.0022)
  if (look.orn === 'line') {
    // marco interior de una sola linea: encuadra sin encerrar
    ctx.strokeRect(m, m * 1.4, W - m * 2, H - m * 2.8)
  } else if (look.orn === 'corners') {
    const L = W * 0.075, x0 = m, y0 = m * 1.4, x1 = W - m, y1 = H - m * 1.4
    ctx.lineWidth = Math.max(1.5, W * 0.0038)
    const esquina = (x, y, dx, dy) => { ctx.beginPath(); ctx.moveTo(x + dx * L, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * L); ctx.stroke() }
    esquina(x0, y0, 1, 1); esquina(x1, y0, -1, 1); esquina(x0, y1, 1, -1); esquina(x1, y1, -1, -1)
  } else {
    // grilla de puntos: el unico ornamento que soporta bien una composicion densa
    const step = W * 0.085                              // menos denso: una grilla apretada lee 'papel milimetrado'
    ctx.fillStyle = col
    for (let y = m * 1.6; y < H - m; y += step) for (let x = m; x < W - m * 0.5; x += step) {
      ctx.beginPath(); ctx.arc(x, y, Math.max(0.7, W * 0.0018), 0, Math.PI * 2); ctx.fill()
    }
  }
  ctx.restore()
}

// grano: puntos de 1px con alpha bajo. Se genera una vez y se cachea como lista de coordenadas
// (no como ImageData: asi funciona igual en node-canvas y en el browser sin putImageData).
function drawGrano(ctx, look, W, H) {
  const key = `${look.grano}|${W}x${H}|${look.dark ? 1 : 0}`
  let pts = _grano.get(key)
  if (!pts) {
    const r = mulberry32(hashStr('grano' + key))
    const n = Math.round(W * H * 0.055)
    pts = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { pts[i * 3] = r() * W; pts[i * 3 + 1] = r() * H; pts[i * 3 + 2] = r() }
    _grano.set(key, pts)
  }
  ctx.save()
  const a = look.grano
  const claro = look.dark ? 255 : 0
  for (let i = 0; i < pts.length; i += 3) {
    ctx.fillStyle = `rgba(${claro},${claro},${claro},${(0.25 + pts[i + 2] * 0.75) * a})`
    ctx.fillRect(pts[i], pts[i + 1], 1, 1)
  }
  ctx.restore()
}

// util para capas que necesitan un "vidrio" sobre la placa (modernidad glass)
export function drawVidrio(ctx, x, y, w, h, rad, look) {
  ctx.save()
  const g = ctx.createLinearGradient(x, y, x, y + h)
  g.addColorStop(0, rgba(lighten(look.bg1, 0.22), look.dark ? 0.55 : 0.72))
  g.addColorStop(1, rgba(look.bg1, look.dark ? 0.30 : 0.55))
  ctx.fillStyle = g
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, rad); else ctx.rect(x, y, w, h)
  ctx.fill()
  ctx.strokeStyle = rgba(look.ink, 0.14)
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}

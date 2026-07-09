// aemotion 0.1 · SHAPES — shape layers declarativas estilo After Effects: un objeto de DATOS describe
// fill / stroke / trim paths / repeater / wiggle sobre un path, y drawShape lo pinta como funcion pura
// de t. Todos los parametros animables aceptan numero fijo, track de keys.js o funcion (t)=>v.
//   shape = {
//     path: cmds | (t)=>cmds,            // el path (builders de path.js o parsePath)
//     at:   { x, y, rot, scale, sx, sy } // transform propio (cada campo animable)
//     fill: color | (t)=>color,
//     stroke: { color, width, cap, join },
//     trim: { start, end, offset },      // cada uno [0,1] animable — trim paths real (draw-on/estelas)
//     repeat: { count, dx, dy, rot, scale, alphaEnd, ax, ay },  // repeater acumulativo estilo AE
//     wiggle: { amp, freq, step, seed, ns },                   // wiggle path seedeado (liquid barato)
//     alpha: 1,
//   }
// Trim: dash-trick con periodo = longitud total (exacto sobre curvas, wrap natural del offset) para
// paths de UN subpath; para multi-subpath cae a polilineas recortadas (trimmed). Determinismo: el
// wiggle consume el MISMO numero de valores del PRNG en cada frame (fases fijas por vertice).
import { clamp, lerp, TAU } from './util.js'
import { seedFor } from './prng.js'
import { val } from './keys.js'
import { measure, tracePath, tracePolys, traceSmoothClosed, trimmed, resample } from './path.js'

function wigglePolys(m, t, wig) {
  const step = wig.step || 8
  const polys = resample(m, step)
  const r = seedFor((wig.seed ?? 1) >>> 0, wig.ns || 'am-wiggle')
  const amp = val(wig.amp, t) || 0, freq = wig.freq ?? 0.6
  for (const sub of polys) {
    const pts = sub.pts, n = pts.length
    const last = n - 1
    const dupEnd = sub.closed                              // cerrado: ultimo punto == primero (no desplazar 2 veces)
    const cnt = dupEnd ? last : n
    const moved = new Array(n)
    for (let i = 0; i < cnt; i++) {
      const ph = r() * TAU, aj = 0.6 + r() * 0.8           // fase + jitter de amplitud por vertice (fijos)
      const p = pts[i]
      const prev = pts[(i - 1 + cnt) % cnt], next = pts[(i + 1) % cnt]
      let nx = -(next.y - prev.y), ny = next.x - prev.x    // normal desde los vecinos
      const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L
      const d = Math.sin(TAU * freq * t + ph) * amp * aj
      moved[i] = { x: p.x + nx * d, y: p.y + ny * d }
    }
    if (dupEnd) moved[last] = { x: moved[0].x, y: moved[0].y }
    sub.pts = moved
  }
  return polys
}

export function drawShape(ctx, t, shape) {
  const cmds = typeof shape.path === 'function' ? shape.path(t) : shape.path
  if (!cmds || !cmds.length) return
  ctx.save()
  if (shape.alpha != null) ctx.globalAlpha *= clamp(val(shape.alpha, t), 0, 1)
  if (ctx.globalAlpha <= 0.003) { ctx.restore(); return }

  if (shape.at) {
    const a = shape.at
    const ax = val(a.ax, t) || 0, ay = val(a.ay, t) || 0    // ANCLA: rotar/escalar alrededor de (ax,ay)
    ctx.translate((val(a.x, t) || 0) + ax, (val(a.y, t) || 0) + ay)
    if (a.rot != null) ctx.rotate(val(a.rot, t))
    const s = a.scale != null ? val(a.scale, t) : 1
    const sx = a.sx != null ? val(a.sx, t) : s, sy = a.sy != null ? val(a.sy, t) : s
    if (sx !== 1 || sy !== 1) ctx.scale(sx, sy)
    ctx.translate(-ax, -ay)
  }

  const once = c => paintOne(c, t, shape, cmds)
  if (shape.repeat) drawRepeat(ctx, t, shape.repeat, once)
  else once(ctx)
  ctx.restore()
}

function paintOne(ctx, t, shape, cmds) {
  // wiggle convierte el path en polilineas desplazadas (mismo count de PRNG por frame -> determinista)
  let m = null, polys = null
  if (shape.wiggle) {
    m = measure(cmds)
    polys = wigglePolys(m, t, shape.wiggle)
  }

  const smoothWig = shape.wiggle && shape.wiggle.smooth !== false
  const traceWig = c => (smoothWig ? traceSmoothClosed(c, polys) : tracePolys(c, polys))

  if (shape.fill) {
    ctx.fillStyle = val(shape.fill, t)
    if (polys) traceWig(ctx)
    else tracePath(ctx, cmds)
    ctx.fill()
  }

  if (shape.stroke) {
    const st = shape.stroke
    ctx.strokeStyle = val(st.color, t) || '#fff'
    ctx.lineWidth = val(st.width, t) || 2
    ctx.lineCap = st.cap || 'round'
    ctx.lineJoin = st.join || 'round'
    if (shape.trim) {
      const start = clamp(val(shape.trim.start ?? 0, t), 0, 1)
      const end = clamp(val(shape.trim.end ?? 1, t), 0, 1)
      const off = val(shape.trim.offset ?? 0, t) || 0
      const vis = end - start
      if (vis <= 0.0005) { return }
      if (vis >= 0.9995 && !polys) {
        tracePath(ctx, cmds); ctx.setLineDash([]); ctx.stroke()
      } else {
        const mm = polys ? measurePolys(polys) : (m || (m = measure(cmds)))
        const L = mm.length
        if (L <= 0) return
        if (!polys && mm.subs.length === 1) {
          // dash-trick: patron con periodo = L -> ventana exacta sobre las curvas, wrap natural.
          // offset POSITIVO equivalente (L - a·L): el negativo + cap redondo deja un punto fantasma
          // en el arranque del path (visto en napi/Skia).
          const a = ((start + off) % 1 + 1) % 1
          tracePath(ctx, cmds)
          ctx.setLineDash([vis * L, L - vis * L])
          ctx.lineDashOffset = (1 - a) * L
          ctx.stroke()
          ctx.setLineDash([]); ctx.lineDashOffset = 0
        } else {
          // multi-subpath o wiggle: recorte por polilineas (hasta 2 tramos si la ventana da la vuelta)
          const a = ((start + off) % 1 + 1) % 1
          let b = a + vis
          const ranges = b <= 1 ? [[a, b]] : [[a, 1], [0, b - 1]]
          ctx.setLineDash([])
          for (const [ra, rb] of ranges) {
            const segs = trimmed(mm, ra * L, rb * L)
            if (segs.length) { tracePolys(ctx, segs); ctx.stroke() }
          }
        }
      }
    } else {
      if (polys) traceWig(ctx)
      else tracePath(ctx, cmds)
      ctx.setLineDash([])
      ctx.stroke()
    }
  }
}

// measure sobre polilineas ya calculadas (wiggle) — misma forma que measure() de path.js
function measurePolys(polys) {
  let total = 0
  const subs = polys.map(sub => {
    const cum = new Float64Array(sub.pts.length)
    let acc = 0
    for (let i = 1; i < sub.pts.length; i++) {
      acc += Math.hypot(sub.pts[i].x - sub.pts[i - 1].x, sub.pts[i].y - sub.pts[i - 1].y)
      cum[i] = acc
    }
    const s = { pts: sub.pts, closed: sub.closed, cum, len: acc, off: total }
    total += acc
    return s
  })
  return { subs, length: total }
}

// repeater acumulativo estilo AE: dibuja, aplica el delta-transform, repite. alphaEnd interpola 1->alphaEnd.
function drawRepeat(ctx, t, rep, drawOnce) {
  const count = Math.max(1, Math.round(val(rep.count, t) || 1))
  const dx = val(rep.dx, t) || 0, dy = val(rep.dy, t) || 0
  const rot = val(rep.rot, t) || 0
  const sc = rep.scale == null ? 1 : val(rep.scale, t)
  const aEnd = rep.alphaEnd == null ? 1 : val(rep.alphaEnd, t)
  const ax = val(rep.ax, t) || 0, ay = val(rep.ay, t) || 0
  ctx.save()
  const a0 = ctx.globalAlpha
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = a0 * (count > 1 ? lerp(1, aEnd, i / (count - 1)) : 1)
    drawOnce(ctx)
    ctx.translate(ax + dx, ay + dy)
    if (rot) ctx.rotate(rot)
    if (sc !== 1) ctx.scale(sc, sc)
    ctx.translate(-ax, -ay)
  }
  ctx.restore()
}

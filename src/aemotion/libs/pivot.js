// aemotion 0.3 · PIVOT — el ELEMENTO PERSISTENTE que nunca corta (match-cut device del research):
// un satelite del acento vive POR ENCIMA de escenas y transiciones; descansa orbitando el ancla
// focal de cada escena y VUELA al ancla de la siguiente alrededor de cada corte, arrancando ANTES
// (cut-on-action) y atravesando la transicion. Posicion = funcion pura del t GLOBAL -> el ojo tiene
// una cosa que seguir a traves de todo el video y los cortes se leen como UNA pieza.
import { TAU, clamp, lerp, rgba } from '../core/util.js'
import { seedFor } from '../core/prng.js'
import { spring, springVel } from '../core/motion.js'
import { get } from '../core/registry.js'

const FLY_PRE = 0.26, FLY_POST = 0.22                          // el vuelo arranca antes del corte

function anchorOf(sc, video) {
  const mod = get(sc.sceneId)
  if (mod && mod.anchor) return mod.anchor(sc, video)
  return { x: video.W / 2, y: video.H * 0.47, r: 5 }
}
const colorFor = (sc, dna) => (sc.polarity === 'accent' ? dna.inkOnAccent : dna.accent)

// bezier cuadratica (el vuelo hace ARCO, no linea recta)
const q = (u, p0, p1, p2) => (1 - u) * (1 - u) * p0 + 2 * (1 - u) * u * p1 + u * u * p2

function drawMark(ctx, dna, x, y, r, col, glow) {
  ctx.save()
  if (glow > 0.05) { ctx.shadowColor = col; ctx.shadowBlur = 14 * glow }
  ctx.fillStyle = col; ctx.strokeStyle = col
  if (dna.shapeDialect === 'anillos') {
    ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke()
    ctx.beginPath(); ctx.arc(x, y, r * 0.32, 0, TAU); ctx.fill()
  } else if (dna.shapeDialect === 'grid') {
    ctx.lineWidth = 1.8
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke()
  } else if (dna.shapeDialect === 'bloques') {
    ctx.beginPath(); ctx.rect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6); ctx.fill()
  } else {
    ctx.beginPath(); ctx.arc(x, y, r * 0.85, 0, TAU); ctx.fill()
  }
  ctx.restore()
}

export function drawPivot(ctx, t, video) {
  const { scenes, cuts, dna } = video
  if (!scenes || scenes.length < 2) return
  const glowD = dna.glowK

  // ¿estamos en la ventana de VUELO de algun corte? (cut k une scenes[k] y scenes[k+1])
  for (let k = 0; k < cuts.length; k++) {
    const c = cuts[k]
    const w0 = c.at - FLY_PRE, w1 = c.at + FLY_POST + (c.dur > 0 ? c.dur * 0.4 : 0)
    if (t >= w0 && t < w1) {
      const A = scenes[k], B = scenes[k + 1]
      const a = anchorOf(A, video), b = anchorOf(B, video)
      const p = clamp((t - w0) / (w1 - w0), 0, 1)
      const e = spring(p, 0.74, 10.5)
      const ev = springVel(p, 0.74, 10.5)
      const rArc = seedFor(video.seed, 'am.pivot.arc')
      const bend = (rArc() < 0.5 ? 1 : -1) * 0.22
      const mx = (a.x + b.x) / 2 + (b.y - a.y) * bend
      const my = (a.y + b.y) / 2 - (b.x - a.x) * bend
      const x = q(e, a.x, mx, b.x), y = q(e, a.y, my, b.y)
      const r = lerp(a.r, b.r, e)
      const col = p < 0.5 ? colorFor(A, dna) : colorFor(B, dna)
      const gl = (p < 0.5 ? A : B).polarity === 'dark' ? glowD : 0
      // smear hacia atras del vuelo (proporcional a la velocidad del spring)
      const sm = clamp(Math.abs(ev) * 0.09, 0, 1)
      if (sm > 0.15) {
        const u2 = Math.max(0, e - 0.07 * sm), u3 = Math.max(0, e - 0.14 * sm)
        ctx.save(); ctx.globalAlpha *= 0.22 * sm
        drawMark(ctx, dna, q(u3, a.x, mx, b.x), q(u3, a.y, my, b.y), r * 0.8, col, 0)
        ctx.globalAlpha *= 1.6
        drawMark(ctx, dna, q(u2, a.x, mx, b.x), q(u2, a.y, my, b.y), r * 0.9, col, 0)
        ctx.restore()
      }
      drawMark(ctx, dna, x, y, r, col, gl)
      return
    }
  }

  // REPOSO: orbita lenta alrededor del ancla de la escena activa (sutil, alpha bajo — acompana, no grita)
  let i = scenes.length - 1
  while (i > 0 && t < scenes[i].t0) i--
  const sc = scenes[i]
  const a = anchorOf(sc, video)
  const rO = seedFor(sc.seed, 'am.pivot.orbit')
  const ph = rO() * TAU, orbR = 9 + rO() * 7
  const x = a.x + Math.cos(t * TAU / 7.5 + ph) * orbR
  const y = a.y + Math.sin(t * TAU / 9.2 + ph) * orbR * 0.7
  const born = clamp((t - 0.35) / 0.5, 0, 1)                    // aparece tras el arranque del video
  if (born <= 0) return
  ctx.save()
  ctx.globalAlpha *= 0.7 * born
  drawMark(ctx, dna, x, y, a.r, colorFor(sc, dna), sc.polarity === 'dark' ? glowD * 0.7 : 0)
  ctx.restore()
}

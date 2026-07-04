// kinetic 1.0 · GARNISH — decoracion intencional por DIALECTO del Style DNA (anti-fingerprint: cada video
// habla UN dialecto; muchos videos no tienen ninguno). Alpha bajo, nunca compite con el texto.
//  - blueprint: circulos dashed, arcos de "motion path", cruces de anchor (tecnica 12 del reel)
//  - bauhaus:   tile geometrico chico que CICLA patrones al beat (tecnica 10)
//  - organic:   puntitos/particulas quietas muy tenues
import { TAU, clamp } from '../core/util.js'
import { win, spring } from '../core/motion.js'

export function paintGarnish(ctx, W, H, beat, t, video) {
  const dna = video.dna
  if (!beat.garnish || dna.garnishDialect === 'none') return
  const p = beat.dur > 0 ? clamp((t - beat.t0) / beat.dur, 0, 1) : 0
  const ink = beat.ink
  if (dna.garnishDialect === 'blueprint') blueprint(ctx, W, H, beat, p, ink, dna)
  else if (dna.garnishDialect === 'bauhaus') bauhausTile(ctx, W, H, beat, p, video)
  else if (dna.garnishDialect === 'organic') organic(ctx, W, H, beat, p, ink, dna)
}

function blueprint(ctx, W, H, beat, p, ink, dna) {
  const g = beat.garnish   // {cx, cy, r, kind} fijado por el assembler (fuera de la caja de texto)
  ctx.save()
  ctx.globalAlpha *= 0.30
  ctx.strokeStyle = ink; ctx.lineWidth = 1.5
  ctx.setLineDash([5, 7])
  const grow = spring(win(p, 0.08, 0.5), 0.8, 10)
  if (g.kind === 'circle') {
    ctx.beginPath(); ctx.arc(g.cx * W, g.cy * H, g.r * W * grow, 0, TAU); ctx.stroke()
    ctx.beginPath(); ctx.arc(g.cx * W, g.cy * H, g.r * W * 0.62 * grow, 0, TAU); ctx.stroke()
  } else if (g.kind === 'arc') {
    ctx.beginPath(); ctx.arc(g.cx * W, g.cy * H, g.r * W * 1.6, Math.PI * 0.1, Math.PI * (0.1 + 0.75 * grow)); ctx.stroke()
  }
  // cruces de anchor en 2 esquinas del garnish
  ctx.setLineDash([])
  ctx.globalAlpha *= 0.8
  const cross = (x, y) => { ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke() }
  cross(g.cx * W + g.r * W * 1.15, g.cy * H - g.r * W * 0.4)
  cross(g.cx * W - g.r * W * 1.2, g.cy * H + g.r * W * 0.55)
  ctx.restore()
}

// tile bauhaus: card chica con patron geometrico que cambia en tercios del beat (0: diamante, 1: molinete, 2: circulo-centrado)
function bauhausTile(ctx, W, H, beat, p, video) {
  const g = beat.garnish
  const dna = video.dna
  const s = g.r * W * 2                     // lado del tile
  const x = g.cx * W - s / 2, y = g.cy * H - s / 2
  const pop = spring(win(p, 0.05, 0.35), 0.6, 12)
  if (pop <= 0.01) return
  const phase = Math.min(2, Math.floor(p * 3))   // cicla el patron al beat
  ctx.save()
  ctx.translate(x + s / 2, y + s / 2); ctx.scale(pop, pop); ctx.translate(-s / 2, -s / 2)
  ctx.fillStyle = dna.paperLight; ctx.fillRect(0, 0, s, s)
  ctx.fillStyle = dna.accent
  if (phase === 0) {                        // diamante
    ctx.beginPath(); ctx.moveTo(s / 2, s * 0.08); ctx.lineTo(s * 0.92, s / 2); ctx.lineTo(s / 2, s * 0.92); ctx.lineTo(s * 0.08, s / 2); ctx.closePath(); ctx.fill()
    ctx.fillStyle = dna.paperLight; ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.14, 0, TAU); ctx.fill()
  } else if (phase === 1) {                 // molinete: 4 triangulos
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.translate(s / 2, s / 2); ctx.rotate(i * Math.PI / 2)
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s / 2, 0); ctx.lineTo(0, -s / 2); ctx.closePath(); ctx.fill(); ctx.restore()
    }
  } else {                                  // circulo centrado sobre franjas
    ctx.fillRect(0, s * 0.42, s, s * 0.16)
    ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.22, 0, TAU); ctx.fill()
  }
  ctx.restore()
}

function organic(ctx, W, H, beat, p, ink, dna) {
  const g = beat.garnish
  ctx.save()
  ctx.globalAlpha *= 0.20
  ctx.fillStyle = ink
  // anillo de puntitos alrededor del punto de garnish (estatico, solo fade-in)
  const a0 = clamp(p * 3, 0, 1)
  ctx.globalAlpha *= a0
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + g.cx * 7      // fase estable por posicion (determinista)
    const rr = g.r * W * (1.1 + 0.25 * Math.sin(i * 2.3))
    ctx.beginPath(); ctx.arc(g.cx * W + Math.cos(a) * rr, g.cy * H + Math.sin(a) * rr, 2.2, 0, TAU); ctx.fill()
  }
  ctx.restore()
}

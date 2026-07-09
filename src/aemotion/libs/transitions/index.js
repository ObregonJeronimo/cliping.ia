// aemotion 0.1 · TRANSICIONES — modulos que reciben BUFFERS (A congelada al final, B corriendo su
// entrada) y mueven PIXELES de verdad. La regla anti-texto-pisado se cumple por GEOMETRIA, no por
// secuenciado: en iris/push cada pixel muestra A o B (clip complementario / desplazamiento), nunca
// ambos mezclados; en shapewipe la forma de acento cubre el corte.
import { TAU, clamp, rgba } from '../../core/util.js'
import { seedFor } from '../../core/prng.js'
import { cubicInOut, cubicOut, spring } from '../../core/motion.js'

// blob polar en forma cerrada (borde organico del iris) — sin PRNG por frame: fases fijas del seed
function blobPath(ctx, cx, cy, R, ph1, ph2) {
  const N = 44
  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TAU
    const rr = R * (1 + 0.055 * Math.sin(3 * a + ph1) + 0.035 * Math.sin(5 * a + ph2))
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

// blit en espacio LOGICO (hereda el transform actual — la camara global sigue aplicando durante
// la transicion; los buffers vienen rasterizados a ss y se re-mapean al rect W×H)
const blit = (ctx, buf, env, dx = 0, dy = 0) => {
  ctx.drawImage(buf, dx, dy, env.W, env.H)
}

export default [
  { id: 'am.xf.cut', lib: 'transitions', kind: 'cut', weight: 0, dur: 0, render() { /* nunca se llama */ } },

  // IRIS LIQUIDO: B crece desde un punto adentro de un blob organico; A queda afuera. Cada pixel es
  // A o B (clip complementario) -> textos jamas se pisan. Borde con trazo del acento que se apaga.
  {
    id: 'am.xf.iris', lib: 'transitions', kind: 'feature', weight: 1.2, dur: 0.55,
    render(ctx, p, A, B, env) {
      const { W, H, ss, seed, dna } = env
      const r = seedFor(seed, 'am.iris')
      const cx = W * (0.3 + r() * 0.4), cy = H * (0.3 + r() * 0.4)
      const ph1 = r() * TAU, ph2 = r() * TAU
      const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.12
      const R = cubicInOut(p) * maxR
      blit(ctx, A, env)
      if (R > 0.5) {
        ctx.save()
        blobPath(ctx, cx, cy, R, ph1, ph2)
        ctx.clip()
        blit(ctx, B, env)
        ctx.restore()
        ctx.save()
        blobPath(ctx, cx, cy, R, ph1, ph2)
        ctx.strokeStyle = rgba(dna.accent, 0.85 * (1 - p))
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.restore()
      }
    },
  },

  // PUSH REAL: A y B se desplazan JUNTOS (movimiento fisico de pixeles) con settle de spring al final
  // + fantasmas direccionales en el pico de velocidad (smear barato sobre buffers).
  {
    id: 'am.xf.push', lib: 'transitions', kind: 'feature', weight: 1, dur: 0.5,
    render(ctx, p, A, B, env) {
      const { W, H, ss, seed } = env
      // continuidad de direccion (research): TODO el video empuja hacia el mismo lado (flowDir del
      // seed del VIDEO, no del corte) — los cortes se leen como un solo viaje
      const rf = seedFor(env.video.seed, 'am.flow')
      const horiz = rf() < 0.6, dir = rf() < 0.5 ? 1 : -1
      const e = spring(p, 0.78, 9.5)
      const off = e * (horiz ? W : H) * dir
      const vel = clamp(Math.abs(cubicOut(Math.min(p / 0.4, 1)) - cubicOut(Math.min(Math.max(p - 0.04, 0) / 0.4, 1))) * 26, 0, 1)
      const dx = horiz ? -off : 0, dy = horiz ? 0 : -off
      const bx = horiz ? dx + W * dir : 0, by = horiz ? 0 : dy + H * dir
      // fantasmas hacia atras del movimiento (solo mientras hay velocidad)
      if (vel > 0.12) {
        ctx.save(); ctx.globalAlpha = 0.16 * vel
        blit(ctx, A, env, dx + (horiz ? 10 * dir : 0), dy + (horiz ? 0 : 10 * dir))
        blit(ctx, B, env, bx + (horiz ? 10 * dir : 0), by + (horiz ? 0 : 10 * dir))
        ctx.restore()
      }
      blit(ctx, A, env, dx, dy)
      blit(ctx, B, env, bx, by)
    },
  },

  // SHAPE WIPE: una placa del acento barre en diagonal cubriendo A y descubriendo B (el corte queda
  // tapado por la forma -> ningun frame mezcla contenidos). Angulo y sentido del seed.
  {
    id: 'am.xf.shapewipe', lib: 'transitions', kind: 'feature', weight: 0.9, dur: 0.5,
    render(ctx, p, A, B, env) {
      const { W, H, seed, dna } = env
      const r = seedFor(seed, 'am.wipe')
      const rf = seedFor(env.video.seed, 'am.flow')
      rf(); const flowSign = rf() < 0.5 ? 1 : -1               // mismo sentido que el push del video
      const ang = flowSign * (0.16 + r() * 0.2)
      const diag = Math.hypot(W, H) * 1.15
      blit(ctx, p < 0.5 ? A : B, env)
      // la placa entra [0,.5] cubriendo y sale [.5,1] descubriendo, siempre en el mismo sentido
      const e = p < 0.5 ? cubicInOut(p * 2) : cubicInOut((p - 0.5) * 2)
      const x = p < 0.5 ? -diag + e * diag : e * diag
      ctx.save()
      ctx.translate(W / 2, H / 2); ctx.rotate(ang); ctx.translate(-W / 2, -H / 2)
      ctx.fillStyle = dna.accent
      ctx.fillRect(x - diag * 0.1, -H, diag * 1.2, H * 3)
      ctx.restore()
    },
  },
]

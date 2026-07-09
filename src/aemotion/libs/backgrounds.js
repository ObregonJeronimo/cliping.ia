// aemotion 0.1 · FONDOS — cada escena pinta SU placa fullbleed; la VARIANTE la dicta la familia del
// DNA (glow orbital / papel editorial / blobs liquid / grid blueprint / franja poster) y la polaridad
// el arc. Legibilidad: los extras van con alpha bajo y luminancia clampeada -> la tinta siempre pasa.
import { TAU, clamp, rgba } from '../core/util.js'
import { seedFor } from '../core/prng.js'

export const isDarkPol = pol => pol === 'dark'
export function inkFor(sc, dna) {
  if (sc.polarity === 'accent') return dna.inkOnAccent
  return sc.polarity === 'dark' ? dna.inkDark : dna.inkLight
}

export function paintPlate(ctx, W, H, sc, t, video) {
  const dna = video.dna
  const pol = sc.polarity
  const base = pol === 'accent' ? dna.accent : pol === 'dark' ? dna.paperDark : dna.paperLight
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H)
  const drift = sc.dur > 0 ? clamp((t - sc.t0) / sc.dur, 0, 1) : 0
  const r = seedFor(sc.seed, 'am.bg')

  if (dna.bg === 'glow' && pol === 'dark') {
    // orbital: halo radial del acento que respira Y DERIVA (el fondo nunca esta muerto) + vineta
    const ph = r() * TAU
    const cx = W * (0.3 + r() * 0.4) + Math.sin(drift * TAU * 0.4 + ph) * W * 0.06
    const cy = H * (0.22 + r() * 0.2) + Math.cos(drift * TAU * 0.3 + ph) * H * 0.04
    const rad = Math.max(W, H) * (0.5 + r() * 0.25) * (1 + 0.08 * Math.sin(drift * TAU * 0.5 + ph))
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
    g.addColorStop(0, rgba(dna.accent, 0.16 * dna.glowK))
    g.addColorStop(0.55, rgba(dna.accent, 0.05 * dna.glowK))
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75)
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.34)')
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
  } else if (dna.bg === 'blobs' && pol !== 'dark') {
    // liquidpop: 2 manchas enormes del analogo, muy suaves (viven detras del contenido)
    for (let i = 0; i < 2; i++) {
      const cx = W * (0.2 + r() * 0.6 + 0.05 * Math.sin(drift * TAU * (0.3 + i * 0.2)))
      const cy = H * (0.2 + r() * 0.6 + 0.05 * Math.cos(drift * TAU * 0.25))
      const rad = Math.max(W, H) * (0.3 + r() * 0.25)
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
      g.addColorStop(0, rgba(pol === 'accent' ? dna.accent2 : dna.accent, pol === 'accent' ? 0.22 : 0.1))
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    }
  } else if (dna.bg === 'grid') {
    // blueprint: grilla tenue + cruz de registro (estatica por escena: seedeada, no flickerea)
    ctx.save()
    ctx.strokeStyle = rgba(pol === 'dark' ? dna.inkDark : dna.inkLight, 0.055)
    ctx.lineWidth = 1
    const step = 34 + Math.round(r() * 14)
    ctx.beginPath()
    for (let x = step; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H) }
    for (let y = step; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y) }
    ctx.stroke()
    const mx = W * (0.12 + r() * 0.76), my = H * (0.08 + r() * 0.12)
    ctx.strokeStyle = rgba(dna.accent, 0.5); ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(mx - 7, my); ctx.lineTo(mx + 7, my); ctx.moveTo(mx, my - 7); ctx.lineTo(mx, my + 7); ctx.stroke()
    ctx.restore()
  } else if (dna.bg === 'franja' && pol !== 'accent') {
    // poster: franja lateral de acento fina (composicion editorial dura)
    const side = r() < 0.5
    const wF = W * (0.035 + r() * 0.03)
    ctx.fillStyle = rgba(dna.accent, 0.9)
    ctx.fillRect(side ? 0 : W - wF, 0, wF, H)
  }
  // papel editorial: liso a proposito (el lujo es el vacio)
}

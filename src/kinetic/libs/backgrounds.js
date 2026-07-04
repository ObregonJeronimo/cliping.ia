// kinetic 1.0 · FONDOS — cada beat pinta SU placa full-bleed (la polaridad la dicta el arc, no el azar).
// mesh: 2-3 blobs de gradiente radial que DERIVAN (lissajous determinista) y viran hue -> el fondo "vive"
// como en el reel. Legibilidad: la luminancia de los blobs se CLAMPA por polaridad -> la tinta siempre pasa
// contraste contra el extremo peor (verificado por el gate, no por fe).
import { TAU, clamp, hexToHsl, hslToHex, lerp } from '../core/util.js'

// paleta de placa por polaridad: 'light' | 'dark' | 'mesh-light' | 'mesh-dark' | 'accent'
// dna.paper = par de neutros del Style DNA (light/dark propios de cada video -> anti-fingerprint)

export function paintPlate(ctx, W, H, beat, t, video) {
  const dna = video.dna
  const pol = beat.polarity
  if (pol === 'accent') { ctx.fillStyle = dna.accent; ctx.fillRect(0, 0, W, H); return }
  const base = (pol === 'dark' || pol === 'mesh-dark') ? dna.paperDark : dna.paperLight
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H)
  if (pol === 'mesh-light' || pol === 'mesh-dark') paintMesh(ctx, W, H, beat, t, video, pol === 'mesh-dark')
}

// mesh: blobs radiales enormes muy suaves. El hue viene del DNA (accent +- analogos), la LUMINANCIA se
// clampa: sobre claro L in [dna.meshLLight..0.93] (tinta negra sigue legible), sobre oscuro L in [0.10..dna.meshLDark].
export function paintMesh(ctx, W, H, beat, t, video, dark) {
  const dna = video.dna
  const blobs = dna.meshBlobs   // [{hueOff, sat, phx, phy, fx, fy, rk}] fijado por seed en el DNA
  const drift = beat.dur > 0 ? (t - beat.t0) / beat.dur : 0
  const aHsl = hexToHsl(dna.accent)
  ctx.save()
  for (let i = 0; i < blobs.length; i++) {
    const b = blobs[i]
    // deriva lissajous lenta + viraje de hue a lo largo del beat
    const cx = W * (0.5 + 0.34 * Math.sin(b.phx + drift * TAU * b.fx))
    const cy = H * (0.5 + 0.30 * Math.cos(b.phy + drift * TAU * b.fy))
    const r = Math.max(W, H) * b.rk
    const hue = aHsl.h + b.hueOff + dna.meshHueDrift * drift
    const L = dark ? clamp(lerp(0.13, dna.meshLDark, b.lk), 0.08, 0.30)
      : clamp(lerp(dna.meshLLight, 0.93, b.lk), 0.72, 0.95)
    const col = hslToHex(hue, b.sat, L)
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0, col)
    g.addColorStop(1, col + '00')   // hex8 transparente
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  ctx.restore()
}

// tinta correcta para una polaridad dada (el DNA fija las tintas una vez -> consistencia intra-video)
export function inkFor(beat, dna) {
  const pol = beat.polarity
  if (pol === 'accent') return dna.inkOnAccent
  return (pol === 'dark' || pol === 'mesh-dark') ? dna.inkDark : dna.inkLight
}
export const isDarkPol = pol => pol === 'dark' || pol === 'mesh-dark'

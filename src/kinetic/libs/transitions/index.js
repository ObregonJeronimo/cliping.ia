// kinetic 1.0 · TRANSICIONES — contrato: render(ctx, p, bufA, bufB, env {W,H,ss,seed,dna}). Reciben
// BUFFERS (pixeles) porque DEFORMAN la escena saliente: eso es lo que urvid no hace y el genero exige.
// El default del genero es el HARD CUT al beat (dur 0, nunca entra en ventana). 1-2 bordes por video
// llevan una "feature": wipe liquido o el colapso-esfera del reel.
import { clamp, TAU } from '../../core/util.js'
import { liquidWipePath, blobHarmonics } from '../../core/shapes.js'
import { seedFor } from '../../core/prng.js'
import { cubicInOut, quintOut } from '../../core/motion.js'

const blit = (ctx, buf, env) => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(buf, 0, 0); ctx.restore() }

export const cut = {
  id: 'kin.xf.cut', lib: 'transitions', dur: 0, weight: 0,
  render(ctx, p, bufA, bufB, env) { blit(ctx, p < 0.5 ? bufA : bufB, env) },
}

export const fade = {
  id: 'kin.xf.fade', lib: 'transitions', dur: 0.38, weight: 0.7,
  render(ctx, p, bufA, bufB, env) {
    blit(ctx, bufA, env)
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = cubicInOut(p); ctx.drawImage(bufB, 0, 0); ctx.restore()
  },
}

// tecnica 5: B se revela con un BLOB organico que crece desde un borde (armonicos del seed del corte)
export const liquid = {
  id: 'kin.xf.liquid', lib: 'transitions', dur: 0.55, weight: 1.2,
  render(ctx, p, bufA, bufB, env) {
    const r = seedFor(env.seed, 'liquid')                      // fresco por llamada: seek-safe
    const harm = blobHarmonics(r, 0.2)
    const edge = ['left', 'right', 'top', 'bottom'][(r() * 4) | 0]
    blit(ctx, bufA, env)
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    const sc = env.ss || 1
    ctx.scale(sc, sc)
    liquidWipePath(ctx, env.W, env.H, quintOut(clamp(p, 0, 1)), edge, harm)
    ctx.clip()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(bufB, 0, 0)
    ctx.restore()
  },
}

// tecnica 7 (la transicion estrella del reel): la escena A se APRIETA horizontalmente con lobulos
// espejados en los bordes (ilusion cilindro con 3 drawImage), se envuelve en un circulo y COLAPSA a un
// punto sobre la placa de B; B entra despues. Sin WebGL: puro canvas 2D.
export const collapse = {
  id: 'kin.xf.collapse', lib: 'transitions', dur: 0.72, weight: 1,
  render(ctx, p, bufA, bufB, env) {
    const bw = bufA.width, bh = bufA.height
    blit(ctx, bufB, env)                                        // la placa de B ya esta debajo
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (p < 0.62) {
      const q = cubicInOut(p / 0.62)                            // 0..1 fase squeeze+wrap
      const sq = 1 - q * 0.82                                   // ancho del cuerpo central
      const cw = bw * sq
      const cx = (bw - cw) / 2
      const sh = 1 - q * 0.55                                   // tambien se achata un poco
      const cy = bh * (1 - sh) / 2
      // clip circular creciente (wrap a esfera hacia el final de la fase)
      const rad = (1 - q * 0.72) * Math.hypot(bw, bh) * 0.5
      ctx.beginPath(); ctx.arc(bw / 2, bh / 2, rad, 0, TAU); ctx.clip()
      // lobulos espejados (bordes del "cilindro")
      const lw = cw * 0.22 * q
      if (lw > 1) {
        ctx.save(); ctx.translate(cx, cy); ctx.scale(-1, 1); ctx.globalAlpha = 0.55
        ctx.drawImage(bufA, 0, 0, bw, bh, -lw, 0, lw, bh * sh); ctx.restore()
        ctx.save(); ctx.translate(cx + cw, cy); ctx.scale(-1, 1); ctx.globalAlpha = 0.55
        ctx.drawImage(bufA, 0, 0, bw, bh, 0, 0, lw, bh * sh); ctx.restore()
      }
      ctx.globalAlpha = 1
      ctx.drawImage(bufA, 0, 0, bw, bh, cx, cy, cw, bh * sh)
    } else {
      const q = clamp((p - 0.62) / 0.3, 0, 1)                   // esfera -> punto
      const rad = (1 - quintOut(q)) * Math.min(bw, bh) * 0.16 + 0.5
      ctx.beginPath(); ctx.arc(bw / 2, bh / 2, rad, 0, TAU); ctx.clip()
      ctx.drawImage(bufA, bw / 2 - rad, bh / 2 - rad, rad * 2, rad * 2)
    }
    ctx.restore()
  },
}

export default [cut, fade, liquid, collapse]

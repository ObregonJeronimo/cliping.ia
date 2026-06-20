// urvid 1.0 · ANIM · helpers COMPARTIDOS — cada archivo de la lib anim/ los importa (asi varios agentes pueden
// llenar la lib en paralelo, un archivo por concepto, sin pisarse). PUROS + DETERMINISTAS. Color SIEMPRE de env.pal.
import { W, H, TAU } from '../../core/util.js'

export const CX = W / 2, CY = H / 2
export const R = W * 0.17                    // radio base de la pieza (el motor la reubica/escala)
export const LW = Math.max(2.5, W * 0.013)   // grosor de linea base

// fase 0..1 de un loop de periodo `per` segundos (con offset opcional)
export const loop = (t, per, off = 0) => (((t + off) % per) + per) % per / per
// pulso suave 0..1 (respiracion) centrado, amplitud amp, offset de fase
export const pulse = (t, per, amp = 1, off = 0) => 0.5 + 0.5 * Math.sin((loop(t, per, off)) * TAU) * amp
// estilo de trazo comun (linea redondeada en TINTA). Llamar antes de stroke().
export function ink(ctx, pal, w = LW) { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = w; ctx.strokeStyle = pal.ink }
// brillo puntual de ACENTO (glow suave) en (x,y)
export function spark(ctx, pal, x, y, r, a = 1) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = pal.accent; ctx.shadowColor = pal.accent; ctx.shadowBlur = r * 2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore() }
// rect redondeado (arma el path; despues fill/stroke)
export function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r) }
// estrella de 5 puntas centrada en (cx,cy), radio rad (arma el path; despues fill/stroke)
export function starShape(ctx, cx, cy, rad) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 10 * TAU, rr2 = i % 2 ? rad * 0.42 : rad; const px = cx + Math.cos(a) * rr2, py = cy + Math.sin(a) * rr2; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py) }
  ctx.closePath()
}
// poligono regular de n lados centrado en (cx,cy), radio rad, rotacion rot (arma el path)
export function polyShape(ctx, cx, cy, rad, n, rot = 0) {
  ctx.beginPath()
  for (let i = 0; i < n; i++) { const a = rot + i / n * TAU - Math.PI / 2, px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py) }
  ctx.closePath()
}

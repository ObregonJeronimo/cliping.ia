// aemotion 0.1 · DEMO — escena de exhibicion de los cimientos F1, en 3 beats:
//   B1 speed graph + squash&stretch (card entra con keyframes AE, se aplasta al frenar; badge con spring)
//   B2 trim paths (circulo draw-on, subrayado, repeater de estrellas rotando)
//   B3 follow-path (flecha viaja una curva con auto-orientacion y estela por trim) + wiggle blob
// NO es una escena de producto: es el banco de pruebas visual del motor (tools/aemotion-shot.mjs la
// renderiza a contact-sheet). Determinista: funcion pura de (t, seed).
import { clamp, lerp, TAU, fontStr, rgba } from './core/util.js'
import { track, val, velOf } from './core/keys.js'
import { spring, springVel, win, cubicOut, stagger } from './core/motion.js'
import { parsePath, circlePath, rectPath, starPath, linePath, measure, pointAt, tracePath } from './core/path.js'
import { drawShape } from './core/shapes.js'

export const W = 405, H = 720
export const DEMO_DUR = 8.1

const BG = '#0c0e14', INK = '#f2f4f8', ACC = '#5b8cff', ACC2 = '#22e06a'
const B1 = [0.0, 2.7], B2 = [2.7, 5.4], B3 = [5.4, 8.1]

// ---------- B1: speed graph + squash ----------
const cardY = track([
  // arranque violento (sale a 2.6x la velocidad media) y frenada larga estilo graph editor
  { t: 0.25, v: H + 170, out: { speed: -2.6 * ((H + 170 - H * 0.46) / 0.85), influence: 34 } },
  { t: 1.10, v: H * 0.46, in: { speed: 0, influence: 72 } },
])

function beat1(ctx, t) {
  const a = clamp(win(t, B1[0], B1[0] + 0.3) - win(t, B1[1] - 0.25, B1[1]), 0, 1)
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a

  label(ctx, '01 · SPEED GRAPH + SQUASH', 56)

  const cw = 270, chh = 150
  const y = cardY(t)
  const vy = velOf(cardY, t)                                  // velocidad real del track (px/s)
  const cx = W / 2
  ctxWith(ctx, () => {
    // squash orientado a la velocidad, con preservacion de area — se nota en la llegada
    const draw = c => {
      drawShape(c, t, {
        path: rectPath(cx - cw / 2, y - chh / 2, cw, chh, 20),
        fill: '#171c2c',
        stroke: { color: rgba(ACC, 0.9), width: 2 },
      })
      c.fillStyle = INK; c.font = fontStr(800, 26, 'Arial'); c.textAlign = 'center'
      c.fillText('Easy Ease real', cx, y - 8)
      c.fillStyle = rgba(INK, 0.55); c.font = fontStr(400, 14, 'Arial')
      c.fillText('speed + influence, como AE', cx, y + 22)
    }
    const sq = clamp(Math.abs(vy) * 0.00035, 0, 0.16)
    if (sq > 0.002) {
      ctx.translate(cx, y); ctx.scale(1 - sq, 1 + sq); ctx.translate(-cx, -y)  // vertical: aplasta al frenar
    }
    draw(ctx)
  })

  // badge: spring con overshoot + estiramiento guiado por la DERIVADA analitica del spring
  const bt = win(t, 1.15, 2.0)
  if (bt > 0) {
    const z = 0.5, w0 = 13
    const s = spring(bt, z, w0)
    const sv = springVel(bt, z, w0)
    const stretch = 1 + clamp(Math.abs(sv) * 0.022, 0, 0.28)
    const bx = W / 2, by = H * 0.46 + 128
    ctxWith(ctx, () => {
      ctx.translate(bx, by); ctx.scale(s / stretch, s * stretch); ctx.translate(-bx, -by)
      drawShape(ctx, t, { path: circlePath(bx, by, 34), fill: ACC })
      ctx.fillStyle = '#0b0d12'; ctx.font = fontStr(900, 26, 'Arial'); ctx.textAlign = 'center'
      ctx.fillText('9:16', bx, by + 9)
    })
  }
  ctx.restore()
}

// ---------- B2: trim paths + repeater ----------
const drawOn = track([
  { t: 3.0, v: 0, out: { speed: 0, influence: 55 } },
  { t: 4.15, v: 1, in: { speed: 0, influence: 60 } },
])

function beat2(ctx, t) {
  const a = clamp(win(t, B2[0], B2[0] + 0.3) - win(t, B2[1] - 0.25, B2[1]), 0, 1)
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a

  label(ctx, '02 · TRIM PATHS + REPEATER', 56)

  const p = drawOn(t)
  // circulo que se dibuja (trim end animado) con la punta "persiguiendo"
  drawShape(ctx, t, {
    path: circlePath(W / 2, H * 0.40, 92),
    stroke: { color: ACC, width: 5 },
    trim: { start: 0, end: p, offset: -0.25 },
  })
  // dentro: estrella con repeater rotando (4 ecos acumulativos que se apagan y encogen)
  drawShape(ctx, t, {
    path: starPath(W / 2, H * 0.40, 42, 18, 5),
    stroke: { color: rgba(INK, 0.85), width: 2 },
    alpha: win(t, 3.4, 3.9),
    repeat: { count: 4, rot: 0.30 + 0.14 * Math.sin(TAU * 0.12 * t), scale: 0.76, alphaEnd: 0.10, ax: W / 2, ay: H * 0.40 },
  })
  // titulo + subrayado que se dibuja
  ctx.fillStyle = INK; ctx.font = fontStr(800, 30, 'Arial'); ctx.textAlign = 'center'
  ctx.fillText('Trazo que dibuja', W / 2, H * 0.40 + 168)
  drawShape(ctx, t, {
    path: linePath(W / 2 - 118, H * 0.40 + 184, W / 2 + 118, H * 0.40 + 184),
    stroke: { color: ACC2, width: 4 },
    trim: { start: 0, end: win(t, 3.35, 4.0) },
  })
  ctx.restore()
}

// ---------- B3: follow-path + wiggle ----------
const ruta = parsePath(`M 40 ${H * 0.62} C 150 ${H * 0.38}, 240 ${H * 0.72}, 365 ${H * 0.46}`)
const rutaM = measure(ruta)
const viaje = track([
  { t: 5.8, v: 0, out: { speed: 0, influence: 45 } },
  { t: 7.5, v: 1, in: { speed: 0, influence: 62 } },
])

function beat3(ctx, t) {
  const a = clamp(win(t, B3[0], B3[0] + 0.3) - win(t, B3[1] - 0.2, B3[1]), 0, 1)
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a

  label(ctx, '03 · FOLLOW-PATH + WIGGLE', 56)

  // guia punteada de la ruta (tenue)
  ctxWith(ctx, () => {
    tracePath(ctx, ruta)
    ctx.strokeStyle = rgba(INK, 0.14); ctx.lineWidth = 2; ctx.setLineDash([3, 7]); ctx.stroke(); ctx.setLineDash([])
  })

  const s = viaje(t)
  // estela: ventana de trim que persigue a la flecha
  drawShape(ctx, t, {
    path: ruta,
    stroke: { color: ACC, width: 5 },
    trim: { start: Math.max(0, s - 0.22), end: s },
  })
  // flecha auto-orientada sobre la ruta
  if (s > 0.001) {
    const pt = pointAt(rutaM, s * rutaM.length)
    ctxWith(ctx, () => {
      ctx.translate(pt.x, pt.y); ctx.rotate(pt.angle)
      drawShape(ctx, t, { path: parsePath('M 14 0 L -10 -9 L -4 0 L -10 9 Z'), fill: ACC2 })
    })
  }
  // blob organico respirando (wiggle seedeado: liquid barato, determinista)
  drawShape(ctx, t, {
    path: circlePath(W / 2, H * 0.80, 54),
    fill: rgba(ACC, 0.24),
    stroke: { color: rgba(ACC, 0.85), width: 2.5 },
    wiggle: { amp: 8 + 3 * Math.sin(TAU * 0.2 * t), freq: 0.5, step: 16, seed: 7, ns: 'blob' },
  })
  ctx.fillStyle = rgba(INK, 0.6); ctx.font = fontStr(400, 14, 'Arial'); ctx.textAlign = 'center'
  ctx.fillText('wiggle path seedeado', W / 2, H * 0.80 + 84)
  ctx.restore()
}

// ---------- helpers ----------
const ctxWith = (ctx, fn) => { ctx.save(); fn(); ctx.restore() }
function label(ctx, txt, y) {
  ctx.fillStyle = rgba('#9aa4b8', 0.9); ctx.font = fontStr(700, 13, 'Arial')
  ctx.textAlign = 'left'
  ctx.fillText(txt, 24, y)
}

export function drawDemoFrame(ctx, t, seed = 7) {
  ctx.save()
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'alphabetic'
  beat1(ctx, t)
  beat2(ctx, t)
  beat3(ctx, t)
  // marca de agua del banco de pruebas
  ctx.globalAlpha = 0.45
  ctx.fillStyle = '#7c879c'; ctx.font = fontStr(700, 11, 'Arial'); ctx.textAlign = 'left'
  ctx.fillText('aemotion 0.1 · F1 testbed', 24, H - 20)
  ctx.restore()
}

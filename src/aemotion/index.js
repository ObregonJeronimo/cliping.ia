// aemotion 0.1 — motor de motion graphics "calibre AE" (apartado nuevo; NO toca urvid/kinetic).
// F1: cimientos — keyframes con speed graph AE, paths reales (measure/trim/follow), shape layers
// declarativas, springs con derivada analitica + squash&stretch. Ver RESEARCH-MOTOR-AE.md.
// Contrato del ecosistema: todo funcion pura de t + PRNG seedeado (determinismo byte-identico).

export { track, val, velOf } from './core/keys.js'
export { cubicBezier, xSolver, cubicVal, EASY, EASY_STRONG } from './core/ease.js'
export { spring, springVel, wobble, stagger, win, squashFactor, withSquash, linear, expoOut, cubicOut, quintOut, cubicInOut, backOut } from './core/motion.js'
export { parsePath, circlePath, rectPath, polygonPath, starPath, linePath, fromPoints, tracePath, tracePolys, traceSmoothClosed, flatten, measure, pointAt, trimmed, resample } from './core/path.js'
export { drawShape } from './core/shapes.js'
export { mulberry32, hashStr, stableSeed, seedFor } from './core/prng.js'
export { clamp, lerp, TAU, fontStr, rgba, hexToRgb } from './core/util.js'
export { drawDemoFrame, DEMO_DUR, W, H } from './demo.js'

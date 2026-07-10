// aemotion 0.1 — motor de motion graphics "calibre AE" (apartado nuevo; NO toca urvid/kinetic).
// API principal: makeMotionVideo(brief, {seed}) -> video · drawMotionFrame(ctx, t, video).
// Identidad por Style DNA (5 familias visuales, nunca dos videos iguales). Ver RESEARCH-MOTOR-AE.md.
// Contrato del ecosistema: todo funcion pura de t + PRNG seedeado (determinismo byte-identico).
// Node/tools: setScratchFactory(createCanvas) OBLIGATORIO (blur multi-sample + buffers de transicion).

export { makeMotionVideo, MW, MH } from './core/assemble.js'
export { drawMotionFrame, beatAt, setImageLoader, getImg } from './core/render.js'
export { deriveDNA, FAMILIAS } from './core/dna.js'
export { setScratchFactory } from './core/scratch.js'

// catalogo (Biblioteca de contenido): fuentes, fondos y el registro de escenas/transiciones
export { query as listModules } from './core/registry.js'
export { FONT_PAIRS, applyCase, trackPx } from './libs/fonts.js'
export { paintPlate, inkFor } from './libs/backgrounds.js'

// arsenal (para el editor/futuras capas y los tools)
export { track, val, velOf } from './core/keys.js'
export { cubicBezier, xSolver, cubicVal, EASY, EASY_STRONG } from './core/ease.js'
export { spring, springVel, wobble, stagger, win, squashFactor, withSquash, linear, expoOut, cubicOut, quintOut, cubicInOut, backOut } from './core/motion.js'
export { parsePath, circlePath, rectPath, polygonPath, starPath, linePath, fromPoints, tracePath, tracePolys, traceSmoothClosed, flatten, measure, pointAt, trimmed, resample } from './core/path.js'
export { drawShape } from './core/shapes.js'
export { pathMorph, ringOf } from './core/morph.js'
export { metaballPath } from './core/liquid.js'
export { motionBlur } from './core/blur.js'
export { drawAnimatedText, layoutChars, rangeAmount, randomOrder, SEL_SHAPES } from './core/textfx.js'
export { fitFont, wrapFit, drawText } from './core/text.js'
export { mulberry32, hashStr, stableSeed, seedFor } from './core/prng.js'
export { clamp, lerp, TAU, fontStr, rgba, hexToRgb } from './core/util.js'
export { drawDemoFrame, DEMO_DUR, W, H } from './demo.js'

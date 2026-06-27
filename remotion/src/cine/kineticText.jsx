/**
 * kineticText.jsx — Motor de TIPOGRAFIA CINETICA para Cinematicas
 * ================================================================
 * Una libreria de estilos de animacion de texto, CATEGORIZADOS por vibra/rubro.
 * La IA (director) elige el `textAnim` mas conveniente segun el ADN de la marca.
 *
 * Filosofia (escalable a cientos sin codear cientos a mano):
 *   - Cada estilo es una FAMILIA: una funcion chica que, dado el progreso `p` de
 *     entrada de cada unidad, devuelve su CSS (transform/opacity/filter/clipPath).
 *   - Parametros que multiplican variantes: unit ('char'|'word'|'line'), easing,
 *     stagger, direccion. Misma familia + distinto unit/stagger = se siente otra.
 *   - Etiqueta `cat` (vibra) -> la IA mapea marca -> vibra -> estilo.
 *
 * Render: <KineticText lines={[[{t,accent}]]} animId frame fps dur theme />.
 * Robusto: animId desconocido -> cae a 'riseRotate' (nunca rompe).
 */
import React from 'react'
import { EASE, SPRING, prog, spr, clamp } from './motion'

// ---- helper: estilo de color para segmentos de acento (gradiente de marca) ----
const accentStyle = (theme) => ({
  background: theme.accentGrad || theme.accent || 'currentColor',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
})

// ============================================================================
// REGISTRY de estilos. mode 'tf' = transform por unidad; mode 'clip' = clip-path
// sobre la linea entera. cada `fn` recibe { p, frame, fps, delay, dur, energy }.
// ============================================================================
export const TEXT_ANIMS = {
  // ---- calmos / limpios ----
  fadeUp:      { cat: 'calmo',     unit: 'word', mode: 'tf', dur: 18, ease: EASE.out,
    fn: ({ p }) => ({ transform: `translateY(${(1 - p) * 38}px)`, opacity: p }) },
  fadeUpChar:  { cat: 'calmo',     unit: 'char', mode: 'tf', dur: 16, ease: EASE.out, step: [0.4, 1.6],
    fn: ({ p }) => ({ transform: `translateY(${(1 - p) * 26}px)`, opacity: p }) },
  lineUp:      { cat: 'limpio',    unit: 'line', mode: 'tf', dur: 22, ease: EASE.out, step: [3, 10],
    fn: ({ p }) => ({ transform: `translateY(${(1 - p) * 52}px)`, opacity: p }) },

  // ---- energicos ----
  riseRotate:  { cat: 'energico',  unit: 'char', mode: 'tf', dur: 16, ease: EASE.back, step: [0.55, 2.0],
    fn: ({ p, i, energy }) => { const ROT = energy === 'bajo' ? 0 : energy === 'alto' ? 3.4 : 2.2
      return { transform: `translateY(${(1 - p) * 32}px) scale(${0.7 + p * 0.3}) rotate(${(1 - p) * ROT * (i % 2 ? 1 : -1)}deg)`, opacity: clamp(p * 1.6, 0, 1), transformOrigin: 'center bottom' } } },
  zoomBlur:    { cat: 'energico',  unit: 'word', mode: 'tf', dur: 18, ease: EASE.out,
    fn: ({ p }) => ({ transform: `scale(${0.6 + p * 0.4})`, filter: `blur(${(1 - p) * 8}px)`, opacity: clamp(p * 1.4, 0, 1) }) },
  scaleSnap:   { cat: 'bold',      unit: 'word', mode: 'tf', dur: 13, ease: EASE.out,
    fn: ({ p }) => ({ transform: `scale(${1 + (1 - p) * 0.5})`, opacity: clamp(p * 1.8, 0, 1) }) },

  // ---- dinamicos (laterales) ----
  slideRight:  { cat: 'dinamico',  unit: 'word', mode: 'tf', dur: 18, ease: EASE.out,
    fn: ({ p }) => ({ transform: `translateX(${(1 - p) * -64}px)`, opacity: p }) },
  slideLeft:   { cat: 'dinamico',  unit: 'word', mode: 'tf', dur: 18, ease: EASE.out,
    fn: ({ p }) => ({ transform: `translateX(${(1 - p) * 64}px)`, opacity: p }) },

  // ---- playful (resortes / rebotes) ----
  wordPop:     { cat: 'playful',   unit: 'word', mode: 'tf', dur: 22, ease: EASE.out,
    fn: ({ frame, fps, delay }) => { const s = spr(frame, fps, delay, SPRING.pop, 22); return { transform: `scale(${s})`, opacity: clamp(s * 1.4, 0, 1) } } },
  charPop:     { cat: 'playful',   unit: 'char', mode: 'tf', dur: 20, ease: EASE.out, step: [0.5, 1.8],
    fn: ({ frame, fps, delay }) => { const s = spr(frame, fps, delay, SPRING.pop, 20); return { transform: `scale(${s})`, opacity: clamp(s * 1.5, 0, 1) } } },
  dropIn:      { cat: 'playful',   unit: 'char', mode: 'tf', dur: 20, ease: EASE.back, step: [0.5, 1.8],
    fn: ({ p }) => ({ transform: `translateY(${(1 - p) * -54}px)`, opacity: clamp(p * 1.6, 0, 1) }) },

  // ---- elegantes / lujo ----
  blurIn:      { cat: 'elegante',  unit: 'word', mode: 'tf', dur: 22, ease: EASE.out,
    fn: ({ p }) => ({ transform: `translateY(${(1 - p) * 12}px)`, filter: `blur(${(1 - p) * 12}px)`, opacity: p }) },
  trackingExpand: { cat: 'lujo',   unit: 'line', mode: 'tf', dur: 30, ease: EASE.out, step: [4, 12],
    fn: ({ p }) => ({ letterSpacing: `${(1 - p) * 0.42 - 0.02}em`, opacity: p }) },

  // ---- techy ----
  flip3D:      { cat: 'techy',     unit: 'char', mode: 'tf', dur: 18, ease: EASE.out, step: [0.5, 1.7], perspective: true,
    fn: ({ p }) => ({ transform: `perspective(420px) rotateX(${(1 - p) * -90}deg)`, opacity: clamp(p * 1.6, 0, 1), transformOrigin: 'center bottom' }) },

  // ---- editoriales (mascara que revela) ----
  clipUp:      { cat: 'editorial', unit: 'line', mode: 'clip', dur: 24, ease: EASE.out, step: [3, 10],
    fn: ({ p }) => ({ clipPath: `inset(${(1 - p) * 105}% 0 0 0)`, transform: `translateY(${(1 - p) * 10}px)` }) },
  clipWipe:    { cat: 'editorial', unit: 'line', mode: 'clip', dur: 24, ease: EASE.inOut, step: [3, 10],
    fn: ({ p }) => ({ clipPath: `inset(0 ${(1 - p) * 105}% 0 0)` }) },
}

// vibra -> estilo por defecto si la IA no elige (o elige algo invalido)
export const TEXT_ANIM_BY_ENERGY = { bajo: 'fadeUp', medio: 'riseRotate', alto: 'scaleSnap' }

export const isTextAnim = (id) => typeof id === 'string' && !!TEXT_ANIMS[id]

// --------------------------------------------------------------------------
// Componente: renderiza las lineas animadas con el estilo elegido.
// `lines`: [ [ {t, accent} ] ]  (igual estructura que usa KineticStatement)
// --------------------------------------------------------------------------
export function KineticText({ lines = [], animId, frame, fps, dur = 90, theme }) {
  const A = TEXT_ANIMS[animId] || TEXT_ANIMS.riseRotate
  const energy = (theme.art || {}).energy || 'medio'
  const START = 6
  const win = Math.max(10, dur * 0.5 - START)

  // contar unidades para stagger adaptativo (termina de revelar ~50% de la escena)
  const countUnits = () => {
    if (A.unit === 'line') return lines.length
    let n = 0
    for (const segs of lines) for (const s of segs) {
      const words = s.t.split(' ').filter(Boolean)
      n += A.unit === 'char' ? words.reduce((a, w) => a + [...w].length, 0) : words.length
    }
    return n
  }
  const total = Math.max(1, countUnits())
  const [lo, hi] = A.step || [0.45, 2.2]
  const STEP = clamp(win / total, lo, hi)

  let idx = 0
  const styleAt = (i) => {
    const delay = START + i * STEP
    const p = prog(frame, delay, A.dur, A.ease)
    return { ...A.fn({ p, frame, fps, delay, dur, energy, i }), display: 'inline-block' }
  }

  // ---- unidad = LINEA (transform o clip sobre la linea entera) ----
  if (A.unit === 'line') {
    return lines.map((segs, i) => {
      const delay = START + i * STEP
      const p = prog(frame, delay, A.dur, A.ease)
      const st = A.fn({ p, frame, fps, delay, dur, energy, i })
      return (
        <div key={i} style={{ ...st, display: 'block', willChange: 'transform, opacity, clip-path' }}>
          {segs.map((s, j) => (
            <span key={j} style={s.accent ? accentStyle(theme) : undefined}>{s.t}</span>
          ))}
        </div>
      )
    })
  }

  // ---- unidad = PALABRA o CARACTER ----
  return lines.map((segs, i) => (
    <div key={i}>
      {segs.map((s, j) => s.t.split(' ').map((w, k) => {
        if (w === '') return null
        return (
          <span key={`${j}-${k}`} style={{ display: 'inline-block', whiteSpace: 'nowrap', marginRight: '0.26em' }}>
            {A.unit === 'word'
              ? <span style={{ ...styleAt(idx++), ...(s.accent ? accentStyle(theme) : null), [A.perspective ? 'transformStyle' : '_x']: 'preserve-3d' }}>{w}</span>
              : [...w].map((ch, c) => (
                  <span key={c} style={{ ...styleAt(idx++), ...(s.accent ? accentStyle(theme) : null) }}>{ch}</span>
                ))}
          </span>
        )
      }))}
    </div>
  ))
}

export default KineticText

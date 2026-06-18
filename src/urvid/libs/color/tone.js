// urvid 1.0 · biblioteca COLOR — SISTEMAS DE TONO (tone-systems). Prefijo de id: color.tone.<nombre>.
// Un tone-system define la RELACION estructural fondo/tinta/acento: cuanto neutro vs cuanto color, calido vs frio,
// 1 vs 2 acentos, high-key (claro+aireado) vs low-key (oscuro+denso). Cada derive() decide accent/accent2/bg0/bg1
// y SIEMPRE termina en finalize() (el motor agrega ink/dim/inkText/onAccent legibles).
// DETERMINISTA: cero Math.random/Date.now. Azar via seedFor(seed, ns)+range/irange. Tones HONESTOS + legibles.
import { register } from '../../core/registry.js'
import { finalize, tonedBg } from '../../core/palette.js'
import { hexToHsl, hslToHex, clamp } from '../../core/util.js'
import { seedFor, range } from '../../core/prng.js'

const DEF = '#5b8cff'

// ACENTO con luminancia legible para el CHIP: finalize() elige onAccent (blanco si HSL.l<=0.6, tinta si l>0.6).
// Hay una "zona muerta" (l~0.38..0.61) en hues muy luminosos (verde/ambar) donde NINGUN texto contrasta 3.0 con el
// chip. safeAccent() empuja el acento FUERA de esa zona segun tono: dark -> l>=0.62 (onAccent tinta, popea claro);
// light -> l<=0.33 (onAccent blanco, popea oscuro). Verificado WCAG para todo hue+sat. Puro y determinista.
function safeAccent(h, s, tone) {
  if (tone === 'light') return hslToHex(h, clamp(s, 0.5, 0.95), 0.32)
  return hslToHex(h, clamp(s, 0.5, 0.95), 0.63)
}

// ---------------------------------------------------------------------------
// DUOTONE — variantes con distinto angulo de separacion entre los 2 tonos.
// ---------------------------------------------------------------------------

register({
  id: 'color.tone.duotone-tight', lib: 'color', category: 'tone-systems', tones: ['dark', 'light'], rubros: ['*', 'moda', 'tech', 'belleza'], weight: 0.95, tags: ['tonal', 'duotono', 'editorial'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, a.s, tone)
    const accent2 = hslToHex(a.h + 16, clamp(a.s, 0.5, 0.9), tone === 'light' ? 0.42 : 0.66)   // separacion chica -> casi mono
    const bg0 = tone === 'light' ? hslToHex(a.h, 0.18, 0.95) : hslToHex(a.h, clamp(a.s, 0.28, 0.55), 0.10)
    const bg1 = tone === 'light' ? hslToHex(a.h, 0.13, 0.9) : hslToHex(a.h, clamp(a.s, 0.26, 0.5), 0.04)
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.tone.duotone-wide', lib: 'color', category: 'tone-systems', tones: ['dark', 'light'], rubros: ['*', 'moda', 'eventos', 'belleza'], weight: 0.85, tags: ['tonal', 'duotono', 'contraste'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, a.s, tone)
    const accent2 = hslToHex(a.h + 58, clamp(a.s * 0.9, 0.45, 0.85), tone === 'light' ? 0.44 : 0.64)   // separacion amplia -> gradiente rico
    const bg0 = tone === 'light' ? hslToHex(a.h, 0.16, 0.955) : hslToHex(a.h, clamp(a.s, 0.26, 0.5), 0.095)
    const bg1 = tone === 'light' ? hslToHex(a.h + 30, 0.12, 0.91) : hslToHex(a.h + 30, clamp(a.s, 0.24, 0.46), 0.04)
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.tone.duotone-shift', lib: 'color', category: 'tone-systems', tones: ['dark', 'light'], rubros: ['*', 'tech', 'eventos'], weight: 0.8, tags: ['tonal', 'duotono', 'random'],
  derive(brandColor, { tone, seed }) {
    const a = hexToHsl(brandColor || DEF), p = seedFor(seed, 'duo-shift')
    const sep = range(p, 22, 46) * (p() < 0.5 ? -1 : 1)   // angulo aleatorio DETERMINISTA por seed
    const accent = safeAccent(a.h, a.s, tone)
    const accent2 = hslToHex(a.h + sep, clamp(a.s * 0.9, 0.45, 0.88), tone === 'light' ? 0.43 : 0.65)
    const bg0 = tone === 'light' ? hslToHex(a.h, 0.17, 0.95) : hslToHex(a.h, clamp(a.s, 0.26, 0.5), 0.10)
    const bg1 = tone === 'light' ? hslToHex(a.h, 0.12, 0.9) : hslToHex(a.h, clamp(a.s, 0.24, 0.46), 0.04)
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

// ---------------------------------------------------------------------------
// TRITONE — 3 pasos del mismo hue (3er paso es el bg). Tono profundo y cohesivo.
// ---------------------------------------------------------------------------

register({
  id: 'color.tone.tritone', lib: 'color', category: 'tone-systems', tones: ['dark', 'light'], rubros: ['*', 'moda', 'belleza', 'inmobiliaria'], weight: 0.85, tags: ['tonal', 'tritono', 'cohesivo'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, a.s, tone)
    const accent2 = hslToHex(a.h, clamp(a.s * 0.8, 0.4, 0.75), tone === 'light' ? 0.58 : 0.46)   // mismo hue, otra luz
    const bg0 = tone === 'light' ? hslToHex(a.h, 0.14, 0.96) : hslToHex(a.h, clamp(a.s * 0.6, 0.2, 0.45), 0.09)
    const bg1 = tone === 'light' ? hslToHex(a.h, 0.1, 0.91) : hslToHex(a.h, clamp(a.s * 0.55, 0.18, 0.4), 0.035)
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.tone.tritone-deep', lib: 'color', category: 'tone-systems', tones: ['dark'], rubros: ['*', 'moda', 'belleza', 'gastronomia'], weight: 0.7, tags: ['tonal', 'tritono', 'oscuro', 'premium'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, a.s, 'dark')
    const accent2 = hslToHex(a.h, clamp(a.s * 0.75, 0.35, 0.65), 0.42)
    const bg0 = hslToHex(a.h, clamp(a.s * 0.7, 0.25, 0.5), 0.08), bg1 = hslToHex(a.h, clamp(a.s * 0.6, 0.2, 0.45), 0.025)
    return finalize(accent, accent2, bg0, bg1, 'dark')   // tritono profundo solo brilla oscuro
  },
})

// ---------------------------------------------------------------------------
// MONO-GRAPHITE — todo grafito/neutro, el acento apenas insinuado.
// ---------------------------------------------------------------------------

register({
  id: 'color.tone.mono-graphite', lib: 'color', category: 'tone-systems', tones: ['dark', 'light'], rubros: ['*', 'finanzas', 'inmobiliaria', 'tech', 'default'], weight: 0.85, tags: ['sobrio', 'grafito', 'minimal', 'corporativo'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, clamp(a.s * 0.6, 0.5, 0.55), tone)   // acento desaturado (piso 0.5 por la guarda del chip)
    const accent2 = hslToHex(a.h, clamp(a.s * 0.3, 0.08, 0.22), tone === 'light' ? 0.5 : 0.5)
    const [bg0, bg1] = tone === 'light' ? [hslToHex(a.h, 0.03, 0.965), hslToHex(a.h, 0.02, 0.92)] : [hslToHex(a.h, 0.06, 0.085), hslToHex(a.h, 0.05, 0.04)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

// ---------------------------------------------------------------------------
// INK ON PAPER / PAPER AND INK — alto contraste tipografico, casi sin color.
// ---------------------------------------------------------------------------

register({
  id: 'color.tone.ink-on-paper', lib: 'color', category: 'tone-systems', tones: ['light'], rubros: ['*', 'finanzas', 'inmobiliaria', 'corporativo', 'educacion', 'default'], weight: 1.0, tags: ['sobrio', 'papel', 'editorial', 'minimal'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, a.s, 'light')   // un acento legible sobre papel
    const accent2 = hslToHex(a.h, clamp(a.s * 0.4, 0.1, 0.28), 0.34)
    const bg0 = '#f7f4ee', bg1 = '#efe9df'   // papel calido
    return finalize(accent, accent2, bg0, bg1, 'light')
  },
})

register({
  id: 'color.tone.paper-and-ink', lib: 'color', category: 'tone-systems', tones: ['dark', 'light'], rubros: ['*', 'editorial', 'finanzas', 'corporativo', 'default'], weight: 0.9, tags: ['sobrio', 'papel', 'tinta', 'editorial'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, a.s, tone)
    const accent2 = hslToHex(a.h, clamp(a.s * 0.35, 0.08, 0.25), tone === 'light' ? 0.38 : 0.62)
    const bg0 = tone === 'light' ? '#f6f3ec' : '#15130f'   // papel claro / tinta negra calida
    const bg1 = tone === 'light' ? '#ede7da' : '#0b0a07'
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

// ---------------------------------------------------------------------------
// NEUTRAL + ACENTO — gris (calido o frio) dominante + 1 unico acento que popea.
// ---------------------------------------------------------------------------

register({
  id: 'color.tone.neutral-plus-accent', lib: 'color', category: 'tone-systems', tones: ['dark', 'light'], rubros: ['*', 'finanzas', 'tech', 'corporativo', 'inmobiliaria', 'default'], weight: 1.1, tags: ['sobrio', 'neutro', 'minimal'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, a.s, tone)   // el unico color
    const accent2 = hslToHex(a.h, clamp(a.s * 0.25, 0.06, 0.18), tone === 'light' ? 0.55 : 0.55)   // neutro tirando al hue
    const [bg0, bg1] = tone === 'light' ? [hslToHex(a.h, 0.04, 0.97), hslToHex(a.h, 0.03, 0.93)] : [hslToHex(a.h, 0.07, 0.085), hslToHex(a.h, 0.06, 0.04)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.tone.warm-gray-accent', lib: 'color', category: 'tone-systems', tones: ['dark', 'light'], rubros: ['*', 'inmobiliaria', 'gastronomia', 'moda', 'belleza', 'default'], weight: 1.0, tags: ['sobrio', 'neutro', 'calido', 'minimal'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, a.s, tone)
    const accent2 = hslToHex(35, 0.16, tone === 'light' ? 0.5 : 0.52)   // gris CALIDO (hue ~35 sepia)
    const [bg0, bg1] = tone === 'light' ? [hslToHex(35, 0.12, 0.965), hslToHex(35, 0.1, 0.92)] : [hslToHex(35, 0.1, 0.08), hslToHex(32, 0.09, 0.035)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.tone.cool-gray-accent', lib: 'color', category: 'tone-systems', tones: ['dark', 'light'], rubros: ['*', 'tech', 'finanzas', 'salud', 'corporativo', 'default'], weight: 1.0, tags: ['sobrio', 'neutro', 'frio', 'minimal'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, a.s, tone)
    const accent2 = hslToHex(218, 0.14, tone === 'light' ? 0.5 : 0.55)   // gris FRIO (hue ~218 acero)
    const [bg0, bg1] = tone === 'light' ? [hslToHex(218, 0.1, 0.965), hslToHex(218, 0.09, 0.92)] : [hslToHex(218, 0.12, 0.08), hslToHex(220, 0.1, 0.035)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.tone.tinted-neutral', lib: 'color', category: 'tone-systems', tones: ['dark', 'light'], rubros: ['*', 'belleza', 'moda', 'salud', 'default'], weight: 0.9, tags: ['sobrio', 'neutro', 'teñido', 'suave'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, a.s, tone)
    const accent2 = hslToHex(a.h, clamp(a.s * 0.35, 0.1, 0.26), tone === 'light' ? 0.52 : 0.5)
    // neutro TEÑIDO sutilmente por el hue de marca (no gris puro)
    const [bg0, bg1] = tone === 'light' ? [hslToHex(a.h, 0.08, 0.965), hslToHex(a.h, 0.07, 0.92)] : [hslToHex(a.h, 0.14, 0.085), hslToHex(a.h, 0.12, 0.04)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

// ---------------------------------------------------------------------------
// TWO-ACCENT BALANCED — dos acentos de igual peso (complementarios suaves).
// ---------------------------------------------------------------------------

register({
  id: 'color.tone.two-accent-balanced', lib: 'color', category: 'tone-systems', tones: ['dark', 'light'], rubros: ['*', 'eventos', 'educacion', 'tech', 'gastronomia'], weight: 0.85, tags: ['dual', 'balanceado', 'colorido'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, a.s, tone)
    const accent2 = hslToHex(a.h + 165, clamp(a.s, 0.5, 0.88), tone === 'light' ? 0.45 : 0.62)   // casi complementario
    const [bg0, bg1] = tonedBg(a, tone)
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.tone.two-accent-triad', lib: 'color', category: 'tone-systems', tones: ['dark', 'light'], rubros: ['*', 'eventos', 'educacion', 'moda'], weight: 0.75, tags: ['dual', 'triada', 'colorido'],
  derive(brandColor, { tone, seed }) {
    const a = hexToHsl(brandColor || DEF), p = seedFor(seed, 'triad')
    const dir = p() < 0.5 ? 120 : -120   // triada DETERMINISTA
    const accent = safeAccent(a.h, a.s, tone)
    const accent2 = hslToHex(a.h + dir, clamp(a.s * 0.95, 0.5, 0.9), tone === 'light' ? 0.46 : 0.62)
    const [bg0, bg1] = tonedBg(a, tone)
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

// ---------------------------------------------------------------------------
// HIGH-KEY — todo claro, aireado, contraste suave pero legible. Solo light.
// ---------------------------------------------------------------------------

register({
  id: 'color.tone.high-key-system', lib: 'color', category: 'tone-systems', tones: ['light'], rubros: ['*', 'belleza', 'salud', 'moda', 'educacion', 'eventos'], weight: 0.9, tags: ['high-key', 'aireado', 'claro', 'suave'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, a.s, 'light')   // bajado para contrastar sobre claro y sobre el chip
    const accent2 = hslToHex(a.h + 24, clamp(a.s * 0.8, 0.4, 0.7), 0.46)
    const bg0 = hslToHex(a.h, 0.22, 0.975), bg1 = hslToHex(a.h, 0.16, 0.94)   // fondos muy claros y teñidos
    return finalize(accent, accent2, bg0, bg1, 'light')
  },
})

register({
  id: 'color.tone.high-key-pastel', lib: 'color', category: 'tone-systems', tones: ['light'], rubros: ['*', 'belleza', 'salud', 'eventos', 'educacion'], weight: 0.75, tags: ['high-key', 'pastel', 'claro', 'suave'],
  derive(brandColor, { seed }) {
    const a = hexToHsl(brandColor || DEF), p = seedFor(seed, 'pastel')
    const drift = range(p, -18, 18)
    const accent = safeAccent(a.h, a.s, 'light')
    const accent2 = hslToHex(a.h + drift + 40, clamp(a.s * 0.7, 0.35, 0.65), 0.45)
    const bg0 = hslToHex(a.h, 0.30, 0.97), bg1 = hslToHex(a.h + 30, 0.24, 0.945)   // pastel teñido
    return finalize(accent, accent2, bg0, bg1, 'light')
  },
})

// ---------------------------------------------------------------------------
// LOW-KEY — todo oscuro, denso, dramatico. Solo dark.
// ---------------------------------------------------------------------------

register({
  id: 'color.tone.low-key-system', lib: 'color', category: 'tone-systems', tones: ['dark'], rubros: ['*', 'moda', 'belleza', 'gastronomia', 'inmobiliaria', 'eventos'], weight: 0.9, tags: ['low-key', 'denso', 'oscuro', 'dramatico'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, a.s, 'dark')   // sube luz para popear sobre negro y dar chip legible
    const accent2 = hslToHex(a.h - 18, clamp(a.s * 0.85, 0.4, 0.72), 0.56)
    const bg0 = hslToHex(a.h, clamp(a.s * 0.35, 0.1, 0.3), 0.055), bg1 = hslToHex(a.h, clamp(a.s * 0.3, 0.08, 0.25), 0.02)
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

register({
  id: 'color.tone.blackout-accent', lib: 'color', category: 'tone-systems', tones: ['dark'], rubros: ['*', 'moda', 'tech', 'eventos', 'fitness'], weight: 0.85, tags: ['low-key', 'blackout', 'oscuro', 'impacto'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, clamp(a.s + 0.1, 0.6, 0.95), 'dark')   // unico color brillante sobre negro casi puro
    const accent2 = hslToHex(a.h, clamp(a.s * 0.4, 0.15, 0.35), 0.5)
    const bg0 = '#0a0a0c', bg1 = '#040405'   // negro neutro de impacto
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

register({
  id: 'color.tone.low-key-tonal', lib: 'color', category: 'tone-systems', tones: ['dark'], rubros: ['*', 'inmobiliaria', 'finanzas', 'corporativo', 'tech'], weight: 0.8, tags: ['low-key', 'tonal', 'oscuro', 'sobrio'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, a.s, 'dark')
    const accent2 = hslToHex(a.h, clamp(a.s * 0.6, 0.25, 0.5), 0.48)   // mismo hue, sobrio
    const bg0 = hslToHex(a.h, clamp(a.s * 0.45, 0.14, 0.34), 0.075), bg1 = hslToHex(a.h, clamp(a.s * 0.4, 0.12, 0.3), 0.03)
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

// ---------------------------------------------------------------------------
// SOFT TONAL / SOBRIO — bajo contraste de acentos, fondos teñidos suaves.
// ---------------------------------------------------------------------------

register({
  id: 'color.tone.soft-tonal', lib: 'color', category: 'tone-systems', tones: ['dark', 'light'], rubros: ['*', 'salud', 'belleza', 'educacion', 'inmobiliaria', 'default'], weight: 0.95, tags: ['tonal', 'suave', 'sobrio', 'calmo'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, clamp(a.s * 0.85, 0.5, 0.7), tone)   // saturacion bajada (piso 0.5 por el chip)
    const accent2 = hslToHex(a.h + 20, clamp(a.s * 0.65, 0.32, 0.6), tone === 'light' ? 0.5 : 0.56)
    const [bg0, bg1] = tone === 'light' ? [hslToHex(a.h, 0.12, 0.965), hslToHex(a.h, 0.1, 0.925)] : [hslToHex(a.h, 0.16, 0.09), hslToHex(a.h, 0.14, 0.045)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

// ---------------------------------------------------------------------------
// ULTRA-MINIMAL — el maximo de neutro: acento casi imperceptible, fondo limpio.
// ---------------------------------------------------------------------------

register({
  id: 'color.tone.ultra-minimal', lib: 'color', category: 'tone-systems', tones: ['dark', 'light'], rubros: ['*', 'finanzas', 'corporativo', 'tech', 'inmobiliaria', 'default'], weight: 0.9, tags: ['minimal', 'sobrio', 'neutro', 'limpio'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, clamp(a.s * 0.7, 0.5, 0.58), tone)   // acento muy contenido (piso 0.5 por el chip)
    const accent2 = hslToHex(a.h, clamp(a.s * 0.2, 0.05, 0.14), tone === 'light' ? 0.55 : 0.5)
    const [bg0, bg1] = tone === 'light' ? [hslToHex(a.h, 0.02, 0.98), hslToHex(a.h, 0.015, 0.95)] : [hslToHex(a.h, 0.04, 0.075), hslToHex(a.h, 0.03, 0.035)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

// ---------------------------------------------------------------------------
// MONO-WASH — un unico hue lavado en TODO (bg + acentos del mismo color, distinta luz).
// ---------------------------------------------------------------------------

register({
  id: 'color.tone.mono-wash', lib: 'color', category: 'tone-systems', tones: ['dark', 'light'], rubros: ['*', 'moda', 'belleza', 'tech', 'eventos'], weight: 0.85, tags: ['tonal', 'monocromo', 'wash', 'cohesivo'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, a.s, tone)
    const accent2 = hslToHex(a.h, clamp(a.s * 0.85, 0.45, 0.8), tone === 'light' ? 0.56 : 0.5)
    const [bg0, bg1] = tone === 'light' ? [hslToHex(a.h, 0.20, 0.96), hslToHex(a.h, 0.16, 0.91)] : [hslToHex(a.h, clamp(a.s, 0.3, 0.55), 0.095), hslToHex(a.h, clamp(a.s, 0.28, 0.5), 0.04)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

// ---------------------------------------------------------------------------
// STEEL-AND-EMBER — neutro frio de fondo + acento calido (o viceversa). Contraste de temperatura.
// ---------------------------------------------------------------------------

register({
  id: 'color.tone.steel-and-ember', lib: 'color', category: 'tone-systems', tones: ['dark', 'light'], rubros: ['*', 'tech', 'finanzas', 'fitness', 'corporativo'], weight: 0.8, tags: ['contraste-temp', 'frio-calido', 'sobrio'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, a.s, tone)   // acento de marca
    const accent2 = hslToHex(28, 0.6, tone === 'light' ? 0.45 : 0.58)   // ember calido fijo
    const [bg0, bg1] = tone === 'light' ? [hslToHex(214, 0.08, 0.965), hslToHex(214, 0.07, 0.92)] : [hslToHex(214, 0.14, 0.08), hslToHex(214, 0.12, 0.035)]   // steel frio
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

// ---------------------------------------------------------------------------
// CLAY-AND-STONE — neutros terrosos (arcilla/piedra) + acento de marca. Calido, organico.
// ---------------------------------------------------------------------------

register({
  id: 'color.tone.clay-and-stone', lib: 'color', category: 'tone-systems', tones: ['dark', 'light'], rubros: ['*', 'inmobiliaria', 'gastronomia', 'moda', 'belleza'], weight: 0.8, tags: ['terroso', 'organico', 'calido', 'sobrio'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || DEF)
    const accent = safeAccent(a.h, a.s, tone)
    const accent2 = hslToHex(22, 0.34, tone === 'light' ? 0.46 : 0.55)   // arcilla
    const [bg0, bg1] = tone === 'light' ? [hslToHex(34, 0.18, 0.955), hslToHex(28, 0.16, 0.905)] : [hslToHex(28, 0.16, 0.085), hslToHex(24, 0.14, 0.04)]   // piedra
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

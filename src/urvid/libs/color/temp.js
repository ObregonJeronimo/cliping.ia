// urvid 1.0 · biblioteca COLOR — paletas por TEMPERATURA (color-temperature).
// Desplazan hue/bg hacia calido o frio para dar sensacion termica (golden-hour, blue-hour, candlelit, icy-clean...).
// Cada modulo decide accent/accent2/bg0/bg1 (el "esquema" termico) y SIEMPRE termina con finalize() (legibilidad garantizada).
// El brand hue se RESPETA en el acento pero el bg (y a veces el acento2) se empujan a la temperatura del mood.
// DETERMINISTA: cero Math.random/Date.now -> seedFor + range cuando hace falta azar.
import { register } from '../../core/registry.js'
import { finalize, tonedBg, brandAccent } from '../../core/palette.js'
import { hexToHsl, hslToHex, lighten, darken, clamp, contrast } from '../../core/util.js'
import { seedFor, range } from '../../core/prng.js'

// empuja un hue hacia un hue objetivo por una fraccion (0 = queda igual, 1 = llega al objetivo).
// usa el camino angular mas corto para no "dar la vuelta" feo por el circulo cromatico.
function pushHue(h, target, amt) {
  let d = ((target - h + 540) % 360) - 180
  return (h + d * amt + 360) % 360
}

// --- legibilidad del CHIP de acento ---
// finalize() elige onAccent por LUMINANCIA del acento (no por contraste real): en dark da tinta clara salvo
// que el acento sea muy luminoso (-> tinta oscura); en light SIEMPRE blanco. Para hues muy luminosos (verde, ambar)
// hay una franja media donde ni blanco ni casi-negro llegan a 3.0 sobre el acento. safeAccent ajusta SOLO la
// luminancia del acento (conserva hue+sat = el caracter termico) hasta que el onAccent que finalize VA a elegir
// clarea 3.0. Es determinista (busqueda monotona por L). El esquema (hue/sat/bg) no cambia.
function _onAccentFor(accentHex, tone) {
  if (tone === 'light') return '#ffffff'
  return hexToHsl(accentHex).l > 0.6 ? '#14090e' : '#fbf6ec'
}
function safeAccent(accentHex, tone, minC = 3.2) {
  const a = hexToHsl(accentHex)
  // candidato base
  if (contrast(_onAccentFor(accentHex, tone), accentHex) >= minC) return accentHex
  if (tone === 'light') {
    // blanco sobre acento -> el acento tiene que OSCURECER. Bajo L hasta que pase (o piso 0.30).
    for (let l = a.l; l >= 0.30; l -= 0.02) {
      const cand = hslToHex(a.h, a.s, l)
      if (contrast('#ffffff', cand) >= minC) return cand
    }
    return hslToHex(a.h, a.s, 0.30)
  }
  // dark: probar ACLARANDO (tinta oscura sobre acento claro) y OSCURECIENDO (tinta clara sobre acento oscuro),
  // elegir el camino que llega antes a 3.0 con su tinta correspondiente.
  for (let step = 0; step <= 0.5; step += 0.02) {
    const up = clamp(a.l + step, 0, 1), dn = clamp(a.l - step, 0, 1)
    const cUp = hslToHex(a.h, a.s, up), cDn = hslToHex(a.h, a.s, dn)
    if (contrast(_onAccentFor(cUp, tone), cUp) >= minC) return cUp
    if (contrast(_onAccentFor(cDn, tone), cDn) >= minC) return cDn
  }
  return accentHex
}

// --- temperaturas CALIDAS (suelen verse mejor en dark; bg con tinte ambar/dorado) ---

register({
  id: 'color.temp.golden-hour', lib: 'color', category: 'color-temperature', tones: ['dark', 'light'], rubros: ['*', 'inmobiliaria', 'gastronomia', 'moda', 'eventos'], weight: 1.2, tags: ['calido', 'dorado', 'atardecer'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const h = pushHue(a.h, 44, 0.9)                     // brand jala FUERTE al dorado (sin esto un brand azul cae en magenta)
    const accent = safeAccent(brandAccent(brandColor, hslToHex(h, clamp(a.s + 0.05, 0.55, 0.92), tone === 'light' ? 0.5 : 0.62)), tone)
    const accent2 = hslToHex(pushHue(a.h, 28, 0.95), clamp(a.s, 0.5, 0.88), tone === 'light' ? 0.44 : 0.58)
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(38, 0.30, 0.965), hslToHex(34, 0.26, 0.915)]
      : [hslToHex(34, 0.42, 0.075), hslToHex(28, 0.40, 0.035)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.temp.candlelit', lib: 'color', category: 'color-temperature', tones: ['dark'], rubros: ['*', 'gastronomia', 'eventos', 'belleza'], weight: 0.9, tags: ['calido', 'ambar', 'intimo'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = safeAccent(brandAccent(brandColor, hslToHex(pushHue(a.h, 38, 0.92), clamp(a.s + 0.08, 0.6, 0.95), 0.6)), 'dark')
    const accent2 = hslToHex(pushHue(a.h, 24, 0.95), clamp(a.s, 0.55, 0.9), 0.5)
    const bg0 = hslToHex(30, 0.45, 0.07), bg1 = hslToHex(22, 0.5, 0.03)
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

register({
  id: 'color.temp.tungsten', lib: 'color', category: 'color-temperature', tones: ['dark'], rubros: ['*', 'tech', 'eventos', 'moda'], weight: 0.8, tags: ['calido', 'tungsteno', 'interior'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = safeAccent(brandAccent(brandColor, hslToHex(pushHue(a.h, 44, 0.88), clamp(a.s, 0.45, 0.82), 0.63)), 'dark')
    const accent2 = hslToHex(pushHue(a.h, 32, 0.9), clamp(a.s * 0.85, 0.35, 0.7), 0.55)
    const bg0 = hslToHex(36, 0.32, 0.08), bg1 = hslToHex(30, 0.3, 0.04)
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

register({
  id: 'color.temp.amber-night', lib: 'color', category: 'color-temperature', tones: ['dark'], rubros: ['*', 'gastronomia', 'fitness', 'eventos'], weight: 0.9, tags: ['calido', 'ambar', 'nocturno'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = safeAccent(brandAccent(brandColor, hslToHex(pushHue(a.h, 36, 0.92), clamp(a.s + 0.1, 0.65, 0.98), 0.6)), 'dark')
    const accent2 = hslToHex(pushHue(a.h, 18, 0.9), clamp(a.s, 0.55, 0.92), 0.52)
    const bg0 = hslToHex(28, 0.5, 0.065), bg1 = '#0a0503'
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

register({
  id: 'color.temp.ember', lib: 'color', category: 'color-temperature', tones: ['dark'], rubros: ['*', 'fitness', 'gastronomia', 'eventos'], weight: 0.85, tags: ['calido', 'brasa', 'rojo-naranja'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = safeAccent(brandAccent(brandColor, hslToHex(pushHue(a.h, 14, 0.92), clamp(a.s + 0.12, 0.7, 1), 0.56)), 'dark')   // brasa naranja-rojo
    const accent2 = hslToHex(pushHue(a.h, 34, 0.92), clamp(a.s, 0.6, 0.95), 0.58)
    const bg0 = hslToHex(16, 0.5, 0.07), bg1 = '#0b0402'
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

register({
  id: 'color.temp.sunset-glow', lib: 'color', category: 'color-temperature', tones: ['dark', 'light'], rubros: ['*', 'moda', 'belleza', 'eventos', 'inmobiliaria'], weight: 1, tags: ['calido', 'atardecer', 'gradiente'],
  derive(brandColor, { tone, seed }) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const r = seedFor(seed, 'sunset')
    const warm = range(r, 28, 46)
    const accent = safeAccent(brandAccent(brandColor, hslToHex(pushHue(a.h, warm, 0.9), clamp(a.s + 0.06, 0.6, 0.95), tone === 'light' ? 0.5 : 0.62)), tone)
    const accent2 = hslToHex(pushHue(a.h, 350, 0.85), clamp(a.s, 0.55, 0.9), tone === 'light' ? 0.5 : 0.6)  // rosa de sunset
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(32, 0.32, 0.965), hslToHex(350, 0.24, 0.92)]
      : [hslToHex(20, 0.45, 0.08), hslToHex(330, 0.4, 0.035)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.temp.tropical-warm', lib: 'color', category: 'color-temperature', tones: ['dark', 'light'], rubros: ['*', 'gastronomia', 'fitness', 'moda', 'eventos'], weight: 0.9, tags: ['calido', 'tropical', 'vibrante'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = safeAccent(brandAccent(brandColor, hslToHex(pushHue(a.h, 42, 0.88), clamp(a.s + 0.12, 0.7, 1), tone === 'light' ? 0.48 : 0.62)), tone)
    const accent2 = hslToHex(pushHue(a.h, 12, 0.9), clamp(a.s + 0.08, 0.65, 0.98), tone === 'light' ? 0.46 : 0.6)
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(44, 0.34, 0.965), hslToHex(28, 0.3, 0.915)]
      : [hslToHex(30, 0.46, 0.08), hslToHex(18, 0.44, 0.035)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.temp.warm-shift', lib: 'color', category: 'color-temperature', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1, tags: ['calido', 'neutro-calido', 'sutil'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = safeAccent(hslToHex(pushHue(a.h, 40, 0.35), clamp(a.s, 0.5, 0.9), tone === 'light' ? 0.5 : 0.62), tone)  // empujon SUTIL al calido
    const accent2 = hslToHex(pushHue(a.h, 40, 0.5), clamp(a.s * 0.9, 0.4, 0.82), tone === 'light' ? 0.46 : 0.58)
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(36, 0.18, 0.965), hslToHex(34, 0.14, 0.92)]
      : [hslToHex(34, 0.22, 0.08), hslToHex(30, 0.2, 0.04)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.temp.terracotta-warm', lib: 'color', category: 'color-temperature', tones: ['dark', 'light'], rubros: ['*', 'inmobiliaria', 'gastronomia', 'moda'], weight: 0.85, tags: ['calido', 'terracota', 'tierra'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = safeAccent(brandAccent(brandColor, hslToHex(pushHue(a.h, 18, 0.9), clamp(a.s, 0.5, 0.85), tone === 'light' ? 0.46 : 0.58)), tone)  // terracota
    const accent2 = hslToHex(pushHue(a.h, 34, 0.92), clamp(a.s * 0.9, 0.45, 0.8), tone === 'light' ? 0.46 : 0.56)
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(24, 0.26, 0.96), hslToHex(18, 0.22, 0.915)]
      : [hslToHex(18, 0.38, 0.08), hslToHex(14, 0.36, 0.04)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.temp.desert-noon', lib: 'color', category: 'color-temperature', tones: ['light'], rubros: ['*', 'inmobiliaria', 'eventos', 'gastronomia'], weight: 0.8, tags: ['calido', 'desierto', 'arena'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = safeAccent(brandAccent(brandColor, hslToHex(pushHue(a.h, 34, 0.9), clamp(a.s, 0.5, 0.85), 0.46)), 'light')
    const accent2 = hslToHex(pushHue(a.h, 20, 0.9), clamp(a.s * 0.9, 0.45, 0.8), 0.44)
    const bg0 = hslToHex(40, 0.34, 0.955), bg1 = hslToHex(34, 0.3, 0.9)
    return finalize(accent, accent2, bg0, bg1, 'light')
  },
})

// --- temperaturas FRIAS (icy/arctic suelen verse mejor en light; blue-hour/moonlight en dark) ---

register({
  id: 'color.temp.blue-hour', lib: 'color', category: 'color-temperature', tones: ['dark'], rubros: ['*', 'tech', 'finanzas', 'inmobiliaria', 'salud'], weight: 1.1, tags: ['frio', 'azul', 'crepusculo'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = safeAccent(brandAccent(brandColor, hslToHex(pushHue(a.h, 214, 0.9), clamp(a.s + 0.05, 0.5, 0.9), 0.62)), 'dark')
    const accent2 = hslToHex(pushHue(a.h, 232, 0.9), clamp(a.s, 0.45, 0.85), 0.56)
    const bg0 = hslToHex(222, 0.42, 0.085), bg1 = hslToHex(228, 0.45, 0.04)
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

register({
  id: 'color.temp.moonlight', lib: 'color', category: 'color-temperature', tones: ['dark'], rubros: ['*', 'tech', 'belleza', 'salud', 'inmobiliaria'], weight: 0.95, tags: ['frio', 'plateado', 'nocturno'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = safeAccent(brandAccent(brandColor, hslToHex(pushHue(a.h, 212, 0.85), clamp(a.s, 0.35, 0.7), 0.68)), 'dark')   // plateado-azul, suave
    const accent2 = hslToHex(pushHue(a.h, 200, 0.88), clamp(a.s * 0.8, 0.28, 0.6), 0.6)
    const bg0 = hslToHex(216, 0.3, 0.085), bg1 = hslToHex(220, 0.32, 0.04)
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

register({
  id: 'color.temp.fjord', lib: 'color', category: 'color-temperature', tones: ['dark'], rubros: ['*', 'tech', 'finanzas', 'salud'], weight: 0.85, tags: ['frio', 'verde-azulado', 'profundo'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = safeAccent(brandAccent(brandColor, hslToHex(pushHue(a.h, 190, 0.9), clamp(a.s, 0.45, 0.85), 0.6)), 'dark')   // teal frio
    const accent2 = hslToHex(pushHue(a.h, 206, 0.92), clamp(a.s, 0.4, 0.8), 0.54)
    const bg0 = hslToHex(198, 0.4, 0.08), bg1 = hslToHex(206, 0.44, 0.035)
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

register({
  id: 'color.temp.polar', lib: 'color', category: 'color-temperature', tones: ['dark', 'light'], rubros: ['*', 'tech', 'salud', 'finanzas'], weight: 0.9, tags: ['frio', 'polar', 'limpio'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = safeAccent(brandAccent(brandColor, hslToHex(pushHue(a.h, 205, 0.9), clamp(a.s, 0.45, 0.85), tone === 'light' ? 0.46 : 0.62)), tone)
    const accent2 = hslToHex(pushHue(a.h, 190, 0.9), clamp(a.s, 0.4, 0.8), tone === 'light' ? 0.44 : 0.58)
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(206, 0.2, 0.97), hslToHex(200, 0.16, 0.925)]
      : [hslToHex(210, 0.36, 0.08), hslToHex(216, 0.4, 0.035)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.temp.arctic', lib: 'color', category: 'color-temperature', tones: ['light'], rubros: ['*', 'tech', 'salud', 'finanzas', 'belleza'], weight: 1, tags: ['frio', 'artico', 'claro'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = safeAccent(brandAccent(brandColor, hslToHex(pushHue(a.h, 202, 0.9), clamp(a.s, 0.5, 0.88), 0.46)), 'light')
    const accent2 = hslToHex(pushHue(a.h, 216, 0.9), clamp(a.s, 0.45, 0.82), 0.44)
    const bg0 = hslToHex(202, 0.24, 0.975), bg1 = hslToHex(208, 0.2, 0.93)
    return finalize(accent, accent2, bg0, bg1, 'light')
  },
})

register({
  id: 'color.temp.icy-clean', lib: 'color', category: 'color-temperature', tones: ['light'], rubros: ['*', 'salud', 'tech', 'belleza', 'finanzas'], weight: 1, tags: ['frio', 'hielo', 'limpio'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = safeAccent(brandAccent(brandColor, hslToHex(pushHue(a.h, 194, 0.9), clamp(a.s, 0.5, 0.9), 0.44)), 'light')   // cyan-hielo
    const accent2 = hslToHex(pushHue(a.h, 210, 0.9), clamp(a.s, 0.45, 0.85), 0.45)
    const bg0 = hslToHex(196, 0.28, 0.98), bg1 = hslToHex(204, 0.22, 0.935)
    return finalize(accent, accent2, bg0, bg1, 'light')
  },
})

register({
  id: 'color.temp.shade-cool', lib: 'color', category: 'color-temperature', tones: ['dark', 'light'], rubros: ['*', 'tech', 'finanzas', 'inmobiliaria'], weight: 0.95, tags: ['frio', 'sombra', 'sutil'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = safeAccent(hslToHex(pushHue(a.h, 215, 0.35), clamp(a.s, 0.45, 0.85), tone === 'light' ? 0.47 : 0.62), tone)  // empujon SUTIL al frio
    const accent2 = hslToHex(pushHue(a.h, 215, 0.5), clamp(a.s * 0.9, 0.4, 0.8), tone === 'light' ? 0.45 : 0.58)
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(212, 0.14, 0.965), hslToHex(216, 0.12, 0.92)]
      : [hslToHex(214, 0.22, 0.08), hslToHex(220, 0.24, 0.04)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.temp.cool-shift', lib: 'color', category: 'color-temperature', tones: ['dark', 'light'], rubros: ['*'], weight: 1.1, tags: ['frio', 'neutro-frio', 'sutil'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = safeAccent(hslToHex(pushHue(a.h, 220, 0.3), clamp(a.s, 0.5, 0.9), tone === 'light' ? 0.48 : 0.62), tone)
    const accent2 = hslToHex(pushHue(a.h, 200, 0.4), clamp(a.s * 0.9, 0.42, 0.82), tone === 'light' ? 0.46 : 0.58)
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(214, 0.12, 0.97), hslToHex(210, 0.1, 0.925)]
      : [hslToHex(216, 0.2, 0.08), hslToHex(222, 0.22, 0.04)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.temp.daylight-balanced', lib: 'color', category: 'color-temperature', tones: ['dark', 'light'], rubros: ['*', 'tech', 'finanzas', 'salud', 'educacion'], weight: 1.2, tags: ['neutro', 'luz-dia', 'balanceado'],
  derive(brandColor, { tone }) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = safeAccent(hslToHex(a.h, clamp(a.s, 0.5, 0.9), tone === 'light' ? 0.48 : 0.62), tone)   // neutro: respeta el brand hue
    const accent2 = hslToHex(a.h + 16, clamp(a.s * 0.9, 0.42, 0.82), tone === 'light' ? 0.46 : 0.6)
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(a.h, 0.06, 0.97), hslToHex(a.h, 0.05, 0.925)]
      : [hslToHex(a.h, 0.14, 0.08), hslToHex(a.h, 0.12, 0.04)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

register({
  id: 'color.temp.overcast', lib: 'color', category: 'color-temperature', tones: ['light'], rubros: ['*', 'finanzas', 'tech', 'inmobiliaria', 'salud'], weight: 0.9, tags: ['neutro-frio', 'nublado', 'apagado'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = safeAccent(brandAccent(brandColor, hslToHex(pushHue(a.h, 218, 0.85), clamp(a.s * 0.85, 0.35, 0.7), 0.46)), 'light')   // apagado, gris-azul
    const accent2 = hslToHex(pushHue(a.h, 208, 0.88), clamp(a.s * 0.7, 0.25, 0.55), 0.5)
    const bg0 = hslToHex(216, 0.08, 0.955), bg1 = hslToHex(214, 0.06, 0.9)
    return finalize(accent, accent2, bg0, bg1, 'light')
  },
})

register({
  id: 'color.temp.glacier', lib: 'color', category: 'color-temperature', tones: ['light'], rubros: ['*', 'salud', 'tech', 'belleza'], weight: 0.85, tags: ['frio', 'glaciar', 'menta'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = safeAccent(brandAccent(brandColor, hslToHex(pushHue(a.h, 176, 0.9), clamp(a.s, 0.45, 0.85), 0.42)), 'light')   // menta-glaciar
    const accent2 = hslToHex(pushHue(a.h, 196, 0.9), clamp(a.s, 0.4, 0.8), 0.44)
    const bg0 = hslToHex(184, 0.24, 0.975), bg1 = hslToHex(196, 0.2, 0.93)
    return finalize(accent, accent2, bg0, bg1, 'light')
  },
})

register({
  id: 'color.temp.deep-freeze', lib: 'color', category: 'color-temperature', tones: ['dark'], rubros: ['*', 'tech', 'finanzas', 'eventos'], weight: 0.8, tags: ['frio', 'azul-electrico', 'profundo'],
  derive(brandColor) {
    const a = hexToHsl(brandColor || '#5b8cff')
    const accent = safeAccent(brandAccent(brandColor, hslToHex(pushHue(a.h, 206, 0.92), clamp(a.s + 0.08, 0.6, 0.95), 0.62)), 'dark')   // azul electrico
    const accent2 = hslToHex(pushHue(a.h, 188, 0.92), clamp(a.s, 0.5, 0.9), 0.58)
    const bg0 = hslToHex(218, 0.5, 0.07), bg1 = '#020611'
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

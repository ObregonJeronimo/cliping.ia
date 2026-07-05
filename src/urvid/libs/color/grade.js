// urvid 1.0 · biblioteca COLOR — categoria MOOD-GRADING (cinematic looks). Prefijo: color.grade.*
// Cada modulo es un GRADING: define el CARACTER de la paleta ajustando saturacion global, separacion
// accent/accent2 y el bg para dar el mood. Decide accent/accent2/bg0/bg1 y SIEMPRE termina con finalize()
// (el motor agrega ink/dim/inkText/onAccent legibles). DETERMINISTA: cero Math.random / Date.now.
import { register } from '../../core/registry.js'
import { finalize, tonedBg } from '../../core/palette.js'
import { hexToHsl, hslToHex, lighten, darken, clamp, contrast } from '../../core/util.js'
import { seedFor, range } from '../../core/prng.js'

const BRAND = (c) => hexToHsl(c || '#5b8cff')

// finalize() elige onAccent segun el tono: en dark, texto oscuro (#14090e) si accent.l>0.6, si no claro;
// en light, onAccent es SIEMPRE blanco. Para que onAccent contraste >=3.0 sobre el chip de acento (regla dura),
// el acento NO puede caer en la "banda muerta" (mid-luminance de hues verde/amarillo/cyan). safeAccent ajusta
// SOLO la luminancia del acento al borde seguro mas cercano, conservando hue+saturacion (el caracter del mood).
// DETERMINISTA: pura funcion de (h, s, l, tone).
// onAccent EXACTOS de finalize(): light -> '#ffffff'; dark -> '#14090e' si accent.l>0.6, si no '#fbf6ec'.
const ON_LIGHT = '#ffffff', ON_DARK_HI = '#14090e', ON_DARK_LO = '#fbf6ec', MARGIN = 3.2
function onAccentOf(accent, tone) {
  if (tone === 'light') return ON_LIGHT
  return hexToHsl(accent).l > 0.6 ? ON_DARK_HI : ON_DARK_LO
}
function safeAccent(h, s, l, tone) {
  if (tone === 'light') {
    // baja la luz hasta que blanco rinda con margen (algunos hues claros nunca rinden -> piso 0.18)
    let L = clamp(l, 0.18, 0.62)
    while (L > 0.18 && contrast(ON_LIGHT, hslToHex(h, s, L)) < MARGIN) L -= 0.01
    return hslToHex(h, s, clamp(L, 0.18, 0.62))
  }
  // dark: probamos tal cual con el onAccent REAL; si no rinde, subimos al acento brillante (>=0.68 seguro)
  const a0 = hslToHex(h, s, l)
  if (contrast(onAccentOf(a0, 'dark'), a0) >= MARGIN) return a0
  const aHi = hslToHex(h, s, Math.max(l, 0.68))
  return aHi
}

// ANCLA DE MARCA (OLA VISUAL): el ACENTO protagonista hereda el HUE de la marca; S/L del mood se
// conservan (el caracter del grade queda en accent2/bg). Marca ACROMATICA (s<0.12) -> hue del mood
// tal cual. Antes los 14 grades de hue fijo pisaban la marca (verde #22e06a -> video azul, bug eye1).
const brandHue = (a, hMood) => (a.s < 0.12 ? hMood : a.h)


// ---------------------------------------------------------------------------
// NOIR — blanco/negro + 1 acento de marca. Solo oscuro.
register({
  id: 'color.grade.noir', lib: 'color', category: 'mood-grading', tones: ['dark'],
  rubros: ['*', 'moda', 'inmobiliaria', 'eventos'], weight: 0.9, tags: ['noir', 'bn', 'contraste', 'cine'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(a.h, clamp(a.s, 0.55, 0.85), 0.6, 'dark')   // el unico color
    const accent2 = hslToHex(a.h, 0.06, 0.5)                          // gris neutro
    const bg0 = hslToHex(a.h, 0.05, 0.07), bg1 = '#040404'
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

// TEAL-ORANGE — el look de cine por excelencia: sombras teal, acento calido.
register({
  id: 'color.grade.teal-orange', lib: 'color', category: 'mood-grading', tones: ['dark'],
  rubros: ['*', 'eventos', 'gastronomia', 'fitness', 'inmobiliaria'], weight: 1.2, tags: ['teal-orange', 'cine', 'blockbuster'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(brandHue(a, 28), 0.92, 0.58, 'dark')                 // naranja calido fijo (skin/highlight)
    const accent2 = hslToHex(190, 0.7, 0.5)                           // teal fijo
    const bg0 = hslToHex(192, 0.45, 0.085), bg1 = hslToHex(196, 0.5, 0.035)  // sombras teal
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

// PASTEL-DREAM — suave, claro, baja saturacion alta luz. Solo claro.
register({
  id: 'color.grade.pastel-dream', lib: 'color', category: 'mood-grading', tones: ['light'],
  rubros: ['*', 'belleza', 'moda', 'eventos', 'educacion'], weight: 0.9, tags: ['pastel', 'suave', 'claro', 'dreamy'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(a.h, clamp(a.s * 0.7, 0.4, 0.6), 0.5, 'light')
    const accent2 = hslToHex(a.h + 40, clamp(a.s * 0.6, 0.35, 0.55), 0.66)
    const bg0 = hslToHex(a.h, 0.3, 0.97), bg1 = hslToHex(a.h + 30, 0.28, 0.94)
    return finalize(accent, accent2, bg0, bg1, 'light')
  },
})

// MUTED-EARTH — terrosos desaturados, calidos. Ambos tonos.
register({
  id: 'color.grade.muted-earth', lib: 'color', category: 'mood-grading', tones: ['dark', 'light'],
  rubros: ['*', 'inmobiliaria', 'gastronomia', 'moda'], weight: 0.9, tags: ['terroso', 'muted', 'organico', 'calido'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(a.h, clamp(a.s * 0.55, 0.28, 0.5), tone === 'light' ? 0.46 : 0.6, tone)
    const accent2 = hslToHex(a.h - 18, clamp(a.s * 0.5, 0.25, 0.45), tone === 'light' ? 0.5 : 0.58)
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(35, 0.2, 0.95), hslToHex(35, 0.16, 0.9)]
      : [hslToHex(28, 0.22, 0.09), hslToHex(28, 0.2, 0.045)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

// NEON-POP — saturacion al maximo, fondo casi negro. Solo oscuro.
register({
  id: 'color.grade.neon-pop', lib: 'color', category: 'mood-grading', tones: ['dark'],
  rubros: ['*', 'fitness', 'eventos', 'tech', 'moda'], weight: 1, tags: ['neon', 'electrico', 'vibrante', 'noche'],
  derive(brandColor, { tone, seed }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(a.h, clamp(a.s + 0.3, 0.85, 1), 0.6, 'dark')
    const sh = seedFor(seed, 'neon')() < 0.5 ? 60 : -60
    const accent2 = hslToHex(a.h + sh, clamp(a.s + 0.25, 0.8, 1), 0.58)
    const bg0 = hslToHex(a.h, 0.4, 0.06), bg1 = '#030208'
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

// SEPIA-FILM — pelicula vieja, calida, virada a sepia. Ambos.
register({
  id: 'color.grade.sepia-film', lib: 'color', category: 'mood-grading', tones: ['dark', 'light'],
  rubros: ['*', 'eventos', 'gastronomia', 'inmobiliaria'], weight: 0.8, tags: ['sepia', 'vintage', 'film', 'nostalgia'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(brandHue(a, 34), 0.62, tone === 'light' ? 0.44 : 0.58, tone)   // ambar viejo
    const accent2 = hslToHex(22, 0.5, tone === 'light' ? 0.48 : 0.54)
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(40, 0.3, 0.94), hslToHex(38, 0.26, 0.88)]
      : [hslToHex(34, 0.3, 0.09), hslToHex(30, 0.28, 0.04)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

// CLINICAL-COOL — azulado limpio, clinico. salud / tech. Ambos.
register({
  id: 'color.grade.clinical-cool', lib: 'color', category: 'mood-grading', tones: ['dark', 'light'],
  rubros: ['salud', 'tech', 'finanzas', '*'], weight: 1, tags: ['clinico', 'limpio', 'azul', 'frio', 'confiable'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(brandHue(a, 205), 0.78, tone === 'light' ? 0.46 : 0.6, tone)
    const accent2 = hslToHex(180, 0.55, tone === 'light' ? 0.42 : 0.56)
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(205, 0.25, 0.975), hslToHex(200, 0.22, 0.93)]
      : [hslToHex(208, 0.4, 0.08), hslToHex(212, 0.42, 0.035)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

// SUNSET-WARM — atardecer, naranja->rosa. gastronomia. Ambos.
register({
  id: 'color.grade.sunset-warm', lib: 'color', category: 'mood-grading', tones: ['dark', 'light'],
  rubros: ['gastronomia', 'eventos', 'moda', '*'], weight: 1, tags: ['atardecer', 'calido', 'naranja', 'rosa'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(brandHue(a, 18), 0.9, tone === 'light' ? 0.5 : 0.6, tone)
    const accent2 = hslToHex(338, 0.78, tone === 'light' ? 0.52 : 0.62)
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(24, 0.4, 0.97), hslToHex(340, 0.3, 0.93)]
      : [hslToHex(16, 0.45, 0.09), hslToHex(330, 0.4, 0.05)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

// FOREST-DEEP — verdes profundos, natural. Solo oscuro.
register({
  id: 'color.grade.forest-deep', lib: 'color', category: 'mood-grading', tones: ['dark'],
  rubros: ['*', 'inmobiliaria', 'salud', 'gastronomia'], weight: 0.9, tags: ['bosque', 'verde', 'natural', 'profundo'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(brandHue(a, 135), 0.55, 0.55, 'dark')
    const accent2 = hslToHex(95, 0.5, 0.55)
    const bg0 = hslToHex(150, 0.4, 0.075), bg1 = hslToHex(160, 0.45, 0.035)
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

// CANDY — colores caramelo dulces, juveniles. Ambos.
register({
  id: 'color.grade.candy', lib: 'color', category: 'mood-grading', tones: ['dark', 'light'],
  rubros: ['*', 'belleza', 'eventos', 'gastronomia', 'moda'], weight: 0.85, tags: ['candy', 'dulce', 'juvenil', 'pop'],
  derive(brandColor, { tone, seed }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(a.h, clamp(a.s + 0.2, 0.7, 0.95), tone === 'light' ? 0.52 : 0.64, tone)
    const sh = seedFor(seed, 'candy')() < 0.5 ? 130 : -130
    const accent2 = hslToHex(a.h + sh, clamp(a.s + 0.15, 0.65, 0.9), tone === 'light' ? 0.54 : 0.66)
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(a.h + 60, 0.35, 0.975), hslToHex(a.h - 40, 0.3, 0.94)]
      : [hslToHex(a.h, 0.35, 0.09), hslToHex(a.h + 50, 0.3, 0.05)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

// VAPORWAVE — rosa/cyan retro 80s. Solo oscuro.
register({
  id: 'color.grade.vaporwave', lib: 'color', category: 'mood-grading', tones: ['dark'],
  rubros: ['*', 'tech', 'eventos', 'moda'], weight: 0.8, tags: ['vaporwave', 'retro', '80s', 'rosa', 'cyan'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(brandHue(a, 320), 0.85, 0.62, 'dark')     // magenta
    const accent2 = hslToHex(185, 0.8, 0.58)     // cyan
    const bg0 = hslToHex(270, 0.45, 0.09), bg1 = hslToHex(300, 0.4, 0.045)
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

// MATTE-DARK — negro mate, acentos apagados, sobrio. Solo oscuro.
register({
  id: 'color.grade.matte-dark', lib: 'color', category: 'mood-grading', tones: ['dark'],
  rubros: ['*', 'finanzas', 'tech', 'inmobiliaria', 'moda'], weight: 1, tags: ['mate', 'sobrio', 'oscuro', 'minimal'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(a.h, clamp(a.s * 0.7, 0.4, 0.7), 0.58, 'dark')
    const accent2 = hslToHex(a.h, clamp(a.s * 0.3, 0.12, 0.3), 0.5)
    const bg0 = hslToHex(a.h, 0.08, 0.085), bg1 = hslToHex(a.h, 0.06, 0.05)
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

// HIGH-KEY-AIRY — muy luminoso, aireado, blancos. Solo claro.
register({
  id: 'color.grade.high-key-airy', lib: 'color', category: 'mood-grading', tones: ['light'],
  rubros: ['*', 'belleza', 'salud', 'moda', 'educacion'], weight: 0.9, tags: ['high-key', 'aireado', 'luminoso', 'claro'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(a.h, clamp(a.s, 0.5, 0.8), 0.48, 'light')
    const accent2 = hslToHex(a.h + 24, clamp(a.s * 0.8, 0.4, 0.7), 0.5)
    const bg0 = hslToHex(a.h, 0.12, 0.985), bg1 = hslToHex(a.h, 0.1, 0.95)
    return finalize(accent, accent2, bg0, bg1, 'light')
  },
})

// LOW-KEY-MOODY — oscuro dramatico, sombras densas. Solo oscuro.
register({
  id: 'color.grade.low-key-moody', lib: 'color', category: 'mood-grading', tones: ['dark'],
  rubros: ['*', 'moda', 'eventos', 'inmobiliaria'], weight: 0.9, tags: ['low-key', 'moody', 'dramatico', 'sombras'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(a.h, clamp(a.s, 0.5, 0.85), 0.56, 'dark')
    const accent2 = hslToHex(a.h - 22, clamp(a.s * 0.8, 0.4, 0.7), 0.5)
    const bg0 = hslToHex(a.h, 0.18, 0.055), bg1 = '#030203'
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

// BW-ACCENT — gris neutro + 1 color (similar a noir pero ambos tonos y gris real).
register({
  id: 'color.grade.bw-accent', lib: 'color', category: 'mood-grading', tones: ['dark', 'light'],
  rubros: ['*', 'finanzas', 'tech', 'inmobiliaria', 'moda'], weight: 1, tags: ['bn', 'gris', 'mono', 'acento-unico'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(a.h, clamp(a.s, 0.55, 0.9), tone === 'light' ? 0.46 : 0.6, tone)
    const accent2 = hslToHex(0, 0, tone === 'light' ? 0.45 : 0.55)    // gris puro
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(0, 0, 0.97), hslToHex(0, 0, 0.92)]
      : [hslToHex(0, 0, 0.08), hslToHex(0, 0, 0.035)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

// GOLD-NOIR — negro + dorado, lujo nocturno. Solo oscuro.
register({
  id: 'color.grade.gold-noir', lib: 'color', category: 'mood-grading', tones: ['dark'],
  rubros: ['*', 'moda', 'belleza', 'inmobiliaria', 'gastronomia', 'eventos'], weight: 0.9, tags: ['dorado', 'noir', 'lujo', 'premium', 'nocturno'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(brandHue(a, 44), 0.78, 0.58, 'dark')      // dorado
    const accent2 = hslToHex(38, 0.5, 0.5)       // bronce
    const bg0 = hslToHex(40, 0.12, 0.07), bg1 = '#050403'
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

// ICE-MINT — frio menta/celeste, fresco y limpio. Ambos.
register({
  id: 'color.grade.ice-mint', lib: 'color', category: 'mood-grading', tones: ['dark', 'light'],
  rubros: ['salud', 'tech', 'belleza', 'fitness', '*'], weight: 0.9, tags: ['menta', 'hielo', 'frio', 'fresco', 'limpio'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(brandHue(a, 165), 0.65, tone === 'light' ? 0.4 : 0.58, tone)
    const accent2 = hslToHex(195, 0.62, tone === 'light' ? 0.44 : 0.6)
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(170, 0.25, 0.975), hslToHex(190, 0.22, 0.93)]
      : [hslToHex(175, 0.4, 0.08), hslToHex(195, 0.42, 0.04)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

// BERRY-WINE — vinos/borgona profundos, sofisticado. Solo oscuro.
register({
  id: 'color.grade.berry-wine', lib: 'color', category: 'mood-grading', tones: ['dark'],
  rubros: ['*', 'gastronomia', 'moda', 'belleza', 'eventos'], weight: 0.85, tags: ['vino', 'borgona', 'profundo', 'sofisticado'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(brandHue(a, 345), 0.62, 0.55, 'dark')     // vino
    const accent2 = hslToHex(310, 0.5, 0.52)     // ciruela
    const bg0 = hslToHex(345, 0.45, 0.08), bg1 = hslToHex(330, 0.5, 0.035)
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

// DESERT-CLAY — arcilla, terracota, calido seco. Ambos.
register({
  id: 'color.grade.desert-clay', lib: 'color', category: 'mood-grading', tones: ['dark', 'light'],
  rubros: ['*', 'inmobiliaria', 'gastronomia', 'moda'], weight: 0.85, tags: ['arcilla', 'terracota', 'desierto', 'calido'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(brandHue(a, 16), 0.6, tone === 'light' ? 0.46 : 0.58, tone)   // terracota
    const accent2 = hslToHex(32, 0.52, tone === 'light' ? 0.48 : 0.56) // arena tostada
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(28, 0.3, 0.96), hslToHex(18, 0.26, 0.91)]
      : [hslToHex(20, 0.3, 0.09), hslToHex(14, 0.32, 0.045)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

// MIDNIGHT-BLUE — azul medianoche profundo, elegante. Solo oscuro.
register({
  id: 'color.grade.midnight-blue', lib: 'color', category: 'mood-grading', tones: ['dark'],
  rubros: ['*', 'finanzas', 'tech', 'inmobiliaria', 'eventos'], weight: 1, tags: ['medianoche', 'azul', 'profundo', 'elegante'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(brandHue(a, 220), 0.78, 0.62, 'dark')
    const accent2 = hslToHex(245, 0.6, 0.62)
    const bg0 = hslToHex(225, 0.55, 0.08), bg1 = hslToHex(235, 0.6, 0.035)
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

// BLEACH-BYPASS — desaturado alto contraste, look gritty cinematografico. Solo oscuro.
register({
  id: 'color.grade.bleach-bypass', lib: 'color', category: 'mood-grading', tones: ['dark'],
  rubros: ['*', 'fitness', 'tech', 'eventos'], weight: 0.8, tags: ['bleach-bypass', 'desaturado', 'gritty', 'contraste', 'cine'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(a.h, clamp(a.s * 0.45, 0.2, 0.4), 0.62, 'dark')   // color lavado
    const accent2 = hslToHex(a.h, 0.05, 0.55)                          // casi gris
    const bg0 = hslToHex(a.h, 0.06, 0.085), bg1 = hslToHex(a.h, 0.04, 0.04)
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

// COTTON-CANDY — rosa/celeste muy claro, kawaii. Solo claro.
register({
  id: 'color.grade.cotton-candy', lib: 'color', category: 'mood-grading', tones: ['light'],
  rubros: ['*', 'belleza', 'moda', 'eventos'], weight: 0.75, tags: ['algodon-azucar', 'kawaii', 'rosa', 'celeste', 'claro'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(brandHue(a, 330), 0.62, 0.55, 'light')
    const accent2 = hslToHex(200, 0.58, 0.52)
    const bg0 = hslToHex(330, 0.4, 0.975), bg1 = hslToHex(200, 0.35, 0.95)
    return finalize(accent, accent2, bg0, bg1, 'light')
  },
})

// EMERALD-LUX — esmeralda + verde profundo, lujo natural. Solo oscuro.
register({
  id: 'color.grade.emerald-lux', lib: 'color', category: 'mood-grading', tones: ['dark'],
  rubros: ['*', 'finanzas', 'belleza', 'moda', 'inmobiliaria'], weight: 0.85, tags: ['esmeralda', 'verde', 'lujo', 'profundo'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(brandHue(a, 155), 0.7, 0.55, 'dark')
    const accent2 = hslToHex(168, 0.6, 0.5)
    const bg0 = hslToHex(160, 0.4, 0.07), bg1 = hslToHex(150, 0.45, 0.03)
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

// SLATE-PRO — gris pizarra azulado corporativo, neutro pro. Ambos.
register({
  id: 'color.grade.slate-pro', lib: 'color', category: 'mood-grading', tones: ['dark', 'light'],
  rubros: ['finanzas', 'tech', 'inmobiliaria', 'salud', '*'], weight: 1.1, tags: ['pizarra', 'corporativo', 'neutro', 'pro', 'sobrio'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(a.h, clamp(a.s, 0.5, 0.8), tone === 'light' ? 0.45 : 0.6, tone)
    const accent2 = hslToHex(215, 0.22, tone === 'light' ? 0.45 : 0.55)   // pizarra azulada
    const [bg0, bg1] = tone === 'light'
      ? [hslToHex(215, 0.12, 0.97), hslToHex(215, 0.1, 0.92)]
      : [hslToHex(215, 0.22, 0.09), hslToHex(218, 0.24, 0.045)]
    return finalize(accent, accent2, bg0, bg1, tone)
  },
})

// COPPER-DUSK — cobre/oxido sobre azul anochecer, calido-frio. Solo oscuro.
register({
  id: 'color.grade.copper-dusk', lib: 'color', category: 'mood-grading', tones: ['dark'],
  rubros: ['*', 'gastronomia', 'eventos', 'inmobiliaria', 'moda'], weight: 0.8, tags: ['cobre', 'anochecer', 'calido-frio', 'cine'],
  derive(brandColor, { tone }) {
    const a = BRAND(brandColor)
    const accent = safeAccent(brandHue(a, 24), 0.72, 0.56, 'dark')      // cobre
    const accent2 = hslToHex(210, 0.55, 0.58)    // azul anochecer
    const bg0 = hslToHex(216, 0.4, 0.08), bg1 = hslToHex(222, 0.45, 0.035)
    return finalize(accent, accent2, bg0, bg1, 'dark')
  },
})

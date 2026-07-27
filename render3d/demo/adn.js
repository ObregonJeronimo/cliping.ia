// ADN — la identidad visual medida de la página entra al aire.
//
// EL DEFECTO QUE ESTE ARCHIVO ARREGLA
// El motor medía el ADN de cada página —fondo, acento, tinta, tipografía, radios— y después lo TIRABA:
// elegía un aire por rubro y usaba la paleta escrita a mano en ese aire. Resultado: Stripe (violeta
// sobre blanco) salía azul institucional sobre azul marino, igual que Basecamp, igual que Ghost. Nueve
// de los once aires son oscuros, y CINCO DE SIETE páginas reales medidas son claras. Por eso "todos los
// videos se ven iguales": no es que faltaran escenas, es que la marca no llegaba nunca a la pantalla.
//
// LA REGLA DEL REPARTO — y es lo que evita el error opuesto
// Si el ADN pisara todo, los once aires colapsarían en uno solo y perderíamos la personalidad, que es
// la otra mitad del producto. El reparto es:
//
//     EL ADN pone el HUE y la POLARIDAD.     El AIRE pone la ESTRUCTURA.
//     · qué color es la marca                 · cuánta saturación, cuánto contraste
//     · si el mundo es claro u oscuro         · qué relación hay entre acento y acento2
//     · qué tipo de letra usa                 · el bpm, los gestos, el grano, el bloom
//
// Concretamente: `acento2` no se inventa ni se copia del aire — se calcula aplicando al hue de la marca
// el MISMO salto de tono que el aire tenía entre su acento y su acento2. Si "nocturno" separaba sus dos
// acentos 140°, la marca violeta también los separa 140°. La armonía es del aire; los colores, de la
// marca.
//
// SOBRE INVENTAR
// La regla anti-invención del repo prohíbe fabricar lo que la pieza DICE: cifras, claims, CTAs. No
// prohíbe decidir píxeles — un degradé de fondo no afirma nada sobre el negocio. Derivar un acento
// secundario del hue de la marca es composición, no una afirmación. La línea está en el texto.

// ---------------------------------------------------------------- color
// sRGB hex <-> HSL, sin dependencias. Se trabaja en HSL y no en el espacio lineal de Three porque acá
// las decisiones son de diseño ("más oscuro", "el mismo tono corrido 140°") y no de física de luz.
export function aHsl(hex) {
  const s = String(hex || '#000000').replace('#', '')
  const n = s.length === 3 ? s.split('').map(c => c + c).join('') : s
  const r = parseInt(n.slice(0, 2), 16) / 255
  const g = parseInt(n.slice(2, 4), 16) / 255
  const b = parseInt(n.slice(4, 6), 16) / 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  const l = (mx + mn) / 2
  if (d < 1e-6) return { h: 0, s: 0, l }
  const sat = d / (1 - Math.abs(2 * l - 1))
  let h
  if (mx === r) h = ((g - b) / d) % 6
  else if (mx === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return { h: ((h * 60) % 360 + 360) % 360, s: sat, l }
}

export function aHex({ h, s, l }) {
  const H = ((h % 360) + 360) % 360, S = Math.min(1, Math.max(0, s)), L = Math.min(1, Math.max(0, l))
  const c = (1 - Math.abs(2 * L - 1)) * S
  const x = c * (1 - Math.abs(((H / 60) % 2) - 1))
  const m = L - c / 2
  const t = H < 60 ? [c, x, 0] : H < 120 ? [x, c, 0] : H < 180 ? [0, c, x]
    : H < 240 ? [0, x, c] : H < 300 ? [x, 0, c] : [c, 0, x]
  return '#' + t.map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')
}

// Luminancia relativa WCAG. Hace falta la de verdad, no el `l` de HSL: un amarillo puro y un azul puro
// tienen la misma L en HSL (0.5) y una diferencia de luminancia real de 8 a 1. Con la de HSL, un texto
// amarillo sobre blanco pasaba el control de contraste y en pantalla era ilegible.
export function lum(hex) {
  const s = String(hex || '#000').replace('#', '')
  const n = s.length === 3 ? s.split('').map(c => c + c).join('') : s
  const f = i => {
    const v = parseInt(n.slice(i, i + 2), 16) / 255
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(0) + 0.7152 * f(2) + 0.0722 * f(4)
}

export const contraste = (a, b) => {
  const x = lum(a), y = lum(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

// Empuja `c` en lightness hasta que contraste con `fondo` llegue a `objetivo`. Se mueve en la dirección
// que ALEJA del fondo: sobre fondo claro baja, sobre fondo oscuro sube.
function forzarContraste(c, fondo, objetivo) {
  const haciaAbajo = lum(fondo) > 0.35
  let h = aHsl(c)
  for (let i = 0; i < 60 && contraste(aHex(h), fondo) < objetivo; i++) {
    h = { ...h, l: haciaAbajo ? h.l - 0.015 : h.l + 0.015 }
    if (h.l <= 0 || h.l >= 1) break
  }
  return aHex(h)
}

// ---------------------------------------------------------------- paleta
// Por debajo de esto el acento de la marca es GRIS y su tono es ruido de medición: un #6b6b6d tiene un
// hue perfectamente calculable y perfectamente sin sentido. Sólo ahí se descarta el tono de la marca.
// El umbral es bajo a propósito. Con 0.15 —el primer intento— Ghost (#64748b, un azul pizarra de
// saturación 0.16) se salvaba por poco y se le subía la saturación a 0.45: la marca terminaba con un
// azul mucho más encendido que el que eligió. Una marca apagada tiene que salir apagada; lo único
// innegociable es que se vea.
const SAT_GRIS = 0.08
export { SAT_GRIS }

export function paletaDe(aire, dna) {
  const P = (dna && dna.palette) || {}
  const A = aire.paleta
  const bgPag = P.bg || null
  // La polaridad se decide con la luminancia REAL del fondo medido, no con el aire. Un SaaS blanco
  // renderizado en azul marino no es una interpretación: es otra marca.
  const claro = bgPag ? lum(bgPag) > 0.42 : false

  // ACENTO. EL TONO DE LA MARCA SE CONSERVA SIEMPRE que signifique algo; lo único que se ajusta es
  // cuánto se ve. Si el acento medido es gris de verdad, su tono es ruido y ahí sí se toma el del aire,
  // a saturación baja: una pieza sobria pero con un lugar donde apoyar el ojo.
  const accPag = P.accentText || P.accent
  const hAcc = accPag ? aHsl(accPag) : null
  const hAireAcc = aHsl(A.acento)
  let acento
  if (hAcc && hAcc.s >= SAT_GRIS) {
    acento = aHex({ h: hAcc.h, s: Math.min(0.95, Math.max(hAcc.s, 0.32)), l: Math.min(0.66, Math.max(0.38, hAcc.l)) })
  } else {
    acento = aHex({ ...hAireAcc, s: Math.min(hAireAcc.s, 0.34) })
  }
  const hA = aHsl(acento)

  // ACENTO2 y CÁLIDO: se hereda del aire el SALTO de tono, no el color. Así "nocturno" sigue abriendo
  // sus acentos 140° y "corporativo" sigue teniéndolos casi juntos — la armonía es del aire, el color
  // es de la marca.
  const salto = (c) => {
    const hc = aHsl(c)
    return aHex({ h: hA.h + (hc.h - hAireAcc.h), s: hc.s, l: hc.l })
  }
  let acento2 = P.accent2 && aHsl(P.accent2).s >= SAT_GRIS ? P.accent2 : salto(A.acento2)
  let calido = salto(A.calido)

  let bg, bg2, tinta
  if (claro) {
    // MUNDO CLARO. El fondo es el de la página; el segundo es el mismo tono de la marca, y es el que
    // decide si la pieza tiene cuerpo o parece sin terminar.
    //
    // El primer valor fue 0.20 de saturación a 0.88 de lightness, con el argumento de que una landing
    // clara buena tiene el degradé casi invisible. En una PÁGINA es cierto; en un VIDEO no, y el
    // analizador lo dijo con un número: 0.096 de saturación media contra 0.443 de la pieza de
    // referencia, y 0.237 de ocupación de cuadro contra 0.317. Una landing se mira quieta y con el
    // contenido llenándola; un reel de 30 s tiene cuadros donde el fondo ES la imagen, y ahí el blanco
    // liso se lee como que falta algo. 0.40 sigue siendo un degradé suave — no un folleto — pero le da
    // al cuadro un campo de color de la marca en vez de nada.
    bg = bgPag
    bg2 = aHex({ h: hA.h, s: 0.40, l: Math.min(0.93, Math.max(0.80, aHsl(bgPag).l - 0.14)) })
    tinta = forzarContraste(P.inkOnBg || '#111111', bg, 7)
  } else {
    bg = bgPag || A.bg
    // El segundo fondo se levanta HACIA el hue de la marca: es lo que hace que un fondo oscuro se lea
    // como "el negro de esta marca" y no como negro genérico.
    const hbg = aHsl(bg)
    bg2 = aHex({ h: hA.h, s: Math.max(0.30, hbg.s), l: Math.min(0.20, hbg.l + 0.09) })
    tinta = forzarContraste(P.inkOnBg || A.tinta, bg, 7)
  }
  // LOS TRES ACENTOS tienen que verse sobre SU fondo. Un violeta de marca precioso sobre blanco a
  // 2.1:1 es un borrón, y sobre negro un violeta oscuro desaparece. El caso que lo delató: heredar el
  // salto de tono de "tecnico" (−62°) desde un acento azul da un verde #00e56a, que sobre blanco da
  // 1.6:1 — el acento secundario existía en la paleta y era invisible en la pantalla. El salto de tono
  // se conserva; lo que se corrige es la LUMINANCIA, que es lo que no cambia el color percibido.
  const piso = claro ? 3.2 : 2.6
  acento = forzarContraste(acento, bg, piso)
  acento2 = forzarContraste(acento2, bg, piso)
  calido = forzarContraste(calido, bg, piso * 0.85)

  return { paleta: { tinta, bg, bg2, acento, acento2, calido }, claro }
}

// ---------------------------------------------------------------- película
// UNA PIEZA CLARA NO BRILLA. El bloom con umbral 0.62 sobre un fondo blanco (luminancia 1.0) hace
// florecer LA PANTALLA ENTERA: sale una mancha lechosa sin dibujo. Y no es que haya que subir el
// umbral y ya — un diseño claro no tiene glow, tiene sombra y aire. Lo que sostiene la profundidad
// pasa a ser la viñeta suave, como en imprenta.
function peliculaDe(aire, claro) {
  const p = aire.pelicula
  if (!claro) return p
  return {
    ...p,
    bloom: Math.min(p.bloom * 0.24, 0.22),
    umbral: 0.97,
    grano: Math.min(p.grano * 0.55, 0.03),
    vinieta: Math.min(p.vinieta * 0.5, 0.45),
    aberr: p.aberr * 0.5,
  }
}

// ---------------------------------------------------------------- tipografía
// Las pistas del ADN dicen la FAMILIA; la semilla elige DENTRO de la familia. Sin la semilla, las siete
// páginas medidas —que dan `grotesk` las siete— saldrían con exactamente la misma pareja de fuentes.
// El aire igual manda: si el aire declara fuentes, esas ganan, porque una serif editorial en un aire
// técnico no es variedad, es un error de casting.
const FAMILIAS = {
  grotesk: {
    display: ['Anton', 'ArchivoBlack', 'BigShouldersDisplay', 'Oswald', 'Unbounded', 'InterTight'],
    apoyo: ['DMSans', 'Inter', 'HankenGrotesk', 'Onest', 'PlusJakartaSans', 'Sora'],
  },
  serif: {
    display: ['DMSerifDisplay', 'PlayfairDisplay', 'Fraunces', 'Newsreader'],
    apoyo: ['Spectral', 'Newsreader', 'DMSans'],
  },
  mono: {
    display: ['ChakraPetch', 'SpaceGrotesk', 'JetBrainsMono'],
    apoyo: ['IBMPlexMono', 'SpaceMono', 'JetBrainsMono'],
  },
  geometric: {
    display: ['Outfit', 'Righteous', 'Unbounded', 'Quicksand'],
    apoyo: ['Outfit', 'Quicksand', 'DMSans'],
  },
  display: {
    display: ['Caprasimo', 'BagelFatOne', 'PermanentMarker', 'Righteous'],
    apoyo: ['Barlow', 'DMSans', 'Archivo'],
  },
}

function fuentesDe(aire, dna, rnd) {
  if (aire.fuentes && aire.fuentes.display) return aire.fuentes
  const t = (dna && dna.typography) || {}
  const fd = FAMILIAS[t.displayHint] || FAMILIAS.grotesk
  const fa = FAMILIAS[t.bodyHint] || fd
  const pick = a => a[Math.floor(rnd() * a.length) % a.length]
  return { display: pick(fd.display), apoyo: pick(fa.apoyo) }
}

// ---------------------------------------------------------------- ritmo
// El bpm del aire es su carácter; el mood de la página lo corre dentro de un rango estrecho. ±14% es
// lo que se nota sin desarmar el aire: a ±40% un "lujo" a 148 bpm ya no es lujo.
function bpmDe(aire, dna) {
  const e = (dna && dna.mood && dna.mood.energia)
  if (e == null) return aire.bpm
  return Math.round(aire.bpm * (0.86 + e * 0.28))
}

// ---------------------------------------------------------------- API
// personalizar(aire, dna, rnd) -> aire nuevo. NO muta el aire original: los aires son módulos
// compartidos y mutarlos hace que el segundo video de una tanda herede la paleta del primero.
export function personalizar(aire, dna, rnd = () => 0.5) {
  if (!dna) return { ...aire, claro: false }
  const { paleta, claro } = paletaDe(aire, dna)
  return {
    ...aire,
    paleta,
    claro,
    bpm: bpmDe(aire, dna),
    fuentes: fuentesDe(aire, dna, rnd),
    pelicula: peliculaDe(aire, claro),
    // Los radios de la marca viajan para que las tarjetas de las escenas los usen: una marca con
    // botones pastilla y otra con esquinas a noventa grados no pueden dar la misma tarjeta.
    forma: {
      radio: (dna.shape && dna.shape.radiusRatio) || 0,
      pastilla: !!(dna.shape && dna.shape.pill),
      borde: (dna.shape && dna.shape.borderStyle) || 'none',
    },
  }
}

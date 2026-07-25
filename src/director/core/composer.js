// director · COMPOSER — guion + look -> STORYBOARD (escenas ESTATICAS como arboles de capas).
// Esta es la pieza que hace real el "storyboard-first": aca no hay tiempo, ni easings, ni transiciones.
// Cada escena es una IMAGEN bien compuesta. El movimiento lo agrega despues el linker+timeline (F3)
// interpolando ENTRE estas imagenes — por eso una escena mal compuesta no se arregla con animacion.
//
// Reglas de composicion que aplica (docs/director/DIRECCION-DE-ARTE.md):
//   C1 UN foco por escena: exactamente una capa marcada `focal`.
//   C2 Safe areas: nada legible en el 7.5% de arriba ni el 13.5% de abajo (kit/grid.js).
//   C3 Jerarquia: el foco es tipograficamente >= 1.6x lo siguiente.
//   C7 Aire: el bloque de contenido nunca ocupa el 100% del alto util.
//   S-anti-slop: variantes de layout por seed (centrado / rail izquierdo / bajo-tercio) para que dos
//      videos de la misma pagina no se compongan igual.
//
// ANTI-INVENCION en el composer: el composer NO agrega texto que no venga del guion. Ni "swipe up",
// ni "clientes felices", ni rellenos. Si un campo viene vacio, la capa NO EXISTE (en vez de existir
// con un placeholder). Por eso casi todas las capas van con `?.` y filtradas por `.filter(Boolean)`.

import { SB_V, CANVAS } from './schema.js'
import { seedFor, pick, range, weightedPick } from './prng.js'
import { clamp } from './util.js'
import { makeGrid } from '../kit/grid.js'
import { texto, forma, objeto, foto, badge, stepper, priceTag, logoRow, placa, escena, resetIds, SIZE } from '../kit/layers.js'
import { elegirObjetos } from '../kit/objetos.js'

// ---------------------------------------------------------------- fragmentos reutilizables
// El chip de marca: chico, arriba. Lleva matchKey 'brand' -> el linker lo hace VIAJAR entre escenas
// en vez de cortarlo, que es el gesto que mas "hecho por un editor" se ve.
function chipMarca(g, marca, o = {}) {
  if (!marca) return null
  const y = g.y0 + (o.dy || 0)
  return texto([g.x0, y, g.w, 0.03], marca, {
    id: 'brand', role: 'mark', matchKey: 'brand', align: o.align || 'left',
    upper: true, color: 'dim', z: 30, reveal: 'fade',
  })
}
// El rail: la linea de acento. Es el elemento que da CONTINUIDAD visual a todo el video.
function rail(g, o = {}) {
  const vert = !!o.vert
  const gr = o.grueso ? 4.5 : 1                          // barra gruesa: recurso para paginas sin material
  return forma(vert ? [g.x0, o.y, 0.006 * gr, o.h] : [g.x0, o.y, o.w || g.w * 0.22, 0.0045 * gr],
    vert ? 'bar' : 'line', { id: 'rail', matchKey: 'accent', fill: 'accent', z: 20 })
}
// El pie: dominio real de la pagina. Nunca inventado — si no hay URL parseable, no hay pie.
function pie(g, dominio) {
  if (!dominio) return null
  return texto([g.x0, 1 - 0.135 - 0.035, g.w, 0.026], dominio, { id: 'pie', role: 'kicker', align: 'center', color: 'dim', z: 30, reveal: 'fade' })
}

// tres familias de encuadre; cada escena elige por seed -> variedad real sin perder criterio
const ENCUADRES = ['centro', 'rail-izq', 'bajo-tercio']
const encuadreDe = (r, look) => weightedPick(r, ENCUADRES, e =>
  e === 'rail-izq' ? 1 + (look.modernidad.indexOf('brutalist') >= 0 ? 1.2 : 0) + (look.modernidad.indexOf('bigtype') >= 0 ? 0.6 : 0)
    : e === 'bajo-tercio' ? 0.8 + (look.modernidad.indexOf('editorial-photo') >= 0 ? 1.0 : 0)
      : 1.1 + look.formalidad * 0.5)

// ---------------------------------------------------------------- compositores por escena
const C = {}

C['open.brand'] = (c, pm, look, g, r, est) => {
  const enc = encuadreDe(r, look)
  const centrado = enc !== 'rail-izq'
  const [by, bh] = g.band(centrado ? 0.34 : 0.52, centrado ? 0.62 : 0.80)
  return [
    placa(),
    rail(g, { y: by - 0.055, w: g.w * range(r, 0.14, 0.26) * (est.pobre ? 1.9 : 1), grueso: est.pobre }),
    texto([g.x0, by, g.w, bh], c.marca, {
      id: 'brand', role: 'title', matchKey: 'brand', focal: true, align: centrado ? 'center' : 'left',
      // pagina sin material -> la marca se agranda hasta escala display. Un cuadro con una palabra
      // chica en el medio se lee como error de render; grande se lee como decision.
      size: SIZE.title * range(r, 1.0, 1.22) * (est.pobre ? 1.5 : 1),
      upper: look.caseMode === 'upper', lines: 2, z: 40,
    }),
    pie(g, c.kicker || est.dominio),
  ]
}

C['hook.statement'] = C['hook.marca'] = (c, pm, look, g, r, est) => {
  const enc = encuadreDe(r, look)
  const izq = enc === 'rail-izq'
  const bajo = enc === 'bajo-tercio'
  const a = bajo ? 0.50 : 0.24, b = bajo ? 0.90 : 0.66
  const [by, bh] = g.band(a, b)
  return [
    placa(),
    izq ? rail(g, { vert: true, y: by, h: bh * 0.9 }) : rail(g, { y: by - 0.05, w: g.w * range(r, 0.16, 0.3) }),
    chipMarca(g, pm.brand, { align: izq ? 'left' : 'center' }),
    texto([izq ? g.x0 + 0.045 : g.x0, by, izq ? g.w - 0.045 : g.w, bh], c.frase, {
      role: 'title', focal: true, align: izq ? 'left' : 'center', matchKey: 'mensaje',
      size: SIZE.display * look.bigK * range(r, 0.92, 1.08), lines: 3,
      upper: look.caseMode === 'upper', reveal: r() < 0.5 ? 'mask' : 'chars', z: 40,
    }),
    c.apoyo ? texto([g.x0, by + bh + 0.028, g.w, 0.03], c.apoyo, { role: 'kicker', align: izq ? 'left' : 'center', color: 'dim', upper: true, z: 25 }) : null,
  ]
}

C['hero.objeto'] = (c, pm, look, g, r, est) => {
  // el apoyo puede caerse (si ya se mostro ese texto). Se resuelve ANTES de encuadrar: sin texto, el
  // heroe se queda con TODA la banda en vez de dejar medio cuadro vacio, que era el 'beat vacio'.
  const apoyo = est.nuevo(c.apoyo)
  const [oy, oh] = apoyo ? g.band(0.04, 0.58) : g.band(0.02, 0.86)
  return [
    placa(),
    chipMarca(g, c.marca),
    // caja de ancho completo: el objeto se escala por min(w/nw, h/nh), asi una ventana ancha y una
    // botella alta llenan igual de bien. Forzar una caja cuadrada desperdiciaba la mitad del alto.
    objeto([g.x0, oy, g.w, oh], est.proxObjeto(), { id: 'hero', matchKey: 'hero', focal: true, z: 40, hp: [r(), r(), r(), r()] }),
    apoyo ? rail(g, { y: oy + oh + 0.03, w: g.w * range(r, 0.12, 0.22) }) : null,
    apoyo ? texto([g.x0, oy + oh + 0.07, g.w, 0.115], apoyo, { role: 'subtitle', align: 'center', lines: 3, z: 30 }) : null,
  ]
}

C['hero.appwindow'] = (c, pm, look, g, r, est) => {
  const [oy, oh] = g.band(0.06, 0.58)
  const lineas = (c.lineas || []).filter(Boolean).slice(0, 3)
  return [
    placa(),
    chipMarca(g, c.marca),
    objeto([g.x0, oy, g.w, oh], 'window', { id: 'hero', matchKey: 'hero', focal: true, z: 40, hp: [r(), r(), r(), r()] }),
    ...lineas.map((t, i) => texto([g.x0 + 0.06, g.y0 + g.h * (0.66 + i * 0.085), g.w - 0.12, 0.052], t, {
      id: 'ln' + i, role: 'body', align: 'left', matchKey: 'feat' + i, z: 30, reveal: 'fade',
    })),
    ...lineas.map((_, i) => forma([g.x0 + 0.012, g.y0 + g.h * (0.66 + i * 0.085) + 0.021, 0.016, 0.0045], 'line', { id: 'lnb' + i, fill: 'accent', z: 29 })),
  ]
}

C['hero.product'] = (c, pm, look, g, r, est) => {
  const alto = range(r, 0.46, 0.58)
  const sangrado = r() < 0.45
  const box = sangrado ? [0, 0, 1, alto + 0.06] : [g.x0, g.y0, g.w, alto]
  return [
    placa(),
    foto(box, c.foto, { id: 'hero', matchKey: 'hero', focal: true, fit: 'cover', sangra: sangrado, veil: sangrado ? 0.28 : 0, radius: sangrado ? 0 : undefined, z: 40 }),
    chipMarca(g, pm.brand, { align: sangrado ? 'center' : 'left' }),
    est.nuevo(c.titulo) ? texto([g.x0, Math.min(sangrado ? alto + 0.10 : g.y0 + alto + 0.05, 1 - 0.135 - 0.24), g.w, 0.14], c.titulo, {
      role: 'title', align: 'center', lines: 3, size: SIZE.title * 0.82, matchKey: 'mensaje', z: 30,
    }) : null,
    c.precio ? priceTag([0.5 - 0.19, Math.min(sangrado ? alto + 0.27 : g.y0 + alto + 0.22, 1 - 0.135 - 0.085), 0.38, 0.075], c.precio, { id: 'precio', matchKey: 'precio', z: 35 }) : null,
  ]
}

C['proof.punch'] = (c, pm, look, g, r, est) => {
  const [by, bh] = g.band(0.26, 0.58)
  return [
    placa(),
    chipMarca(g, pm.brand),
    texto([g.x0, by, g.w, bh], c.valor, {
      id: 'stat', role: 'stat', matchKey: 'stat', focal: true, align: 'center',
      size: SIZE.stat * range(r, 0.92, 1.12), color: 'accentTxt', lines: 1, reveal: 'mask', z: 40,
    }),
    rail(g, { y: by + bh + 0.018, w: g.w * range(r, 0.10, 0.2) }),
    c.etiqueta ? texto([g.x0, by + bh + 0.05, g.w, 0.07], c.etiqueta, { role: 'statLabel', align: 'center', upper: true, color: 'dim', lines: 2, z: 30 }) : null,
  ]
}

C['proof.quote'] = (c, pm, look, g, r, est) => {
  const [by, bh] = g.band(0.24, 0.64)
  return [
    placa(),
    chipMarca(g, pm.brand),
    forma([g.x0, by - 0.055, 0.10, 0.055], 'quote', { id: 'comilla', fill: 'accent', alpha: 0.5, z: 20 }),
    texto([g.x0, by, g.w, bh], c.cita, {
      role: 'quote', focal: true, align: 'left', matchKey: 'mensaje',
      size: SIZE.quote * range(r, 0.9, 1.1), lines: 5, family: 'display', z: 40,
    }),
    c.autor ? texto([g.x0, by + bh + 0.03, g.w, 0.035], '— ' + c.autor, { role: 'kicker', align: 'left', color: 'dim', z: 30 }) : null,
  ]
}

// LOGOS: la pagina declara que TIENE una fila de logos de clientes, pero nosotros no sabemos CUALES.
// Dibujamos siluetas ANONIMAS (pastillas neutras, sin texto): mostrar prueba social sin inventar de
// quien. El gate prohibe que esta capa lleve texto — un nombre ahi seria un cliente fabricado.
C['proof.logos'] = (c, pm, look, g, r, est) => {
  const [by, bh] = g.band(0.36, 0.52)
  return [
    placa(),
    chipMarca(g, c.marca),
    logoRow([g.x0, by, g.w, bh], 3 + ((r() * 3) | 0), { id: 'logos', matchKey: 'logos', focal: true, z: 40 }),
    rail(g, { y: by - 0.045, w: g.w * 0.14 }),
  ]
}

C['offer.flash'] = (c, pm, look, g, r, est) => {
  const [by, bh] = g.band(0.28, 0.56)
  const conPrecio = !!c.precio
  return [
    placa(),
    chipMarca(g, pm.brand),
    c.urgencia ? badge([0.5 - 0.28, by - 0.06, 0.56, 0.042], c.urgencia, { id: 'urg', matchKey: 'urgencia', z: 35 }) : null,
    texto([g.x0, by, g.w, conPrecio ? bh * 0.55 : bh], c.promo || c.urgencia, {
      role: 'title', focal: true, align: 'center', matchKey: 'mensaje',
      size: SIZE.title * range(r, 0.95, 1.15), lines: 3, upper: look.caseMode === 'upper', z: 40,
    }),
    conPrecio ? priceTag([0.5 - 0.21, by + bh * 0.62, 0.42, 0.085], c.precio, { id: 'precio', matchKey: 'precio', z: 35 }) : null,
  ]
}

C['features.bento'] = (c, pm, look, g, r, est) => {
  const celdas = (c.celdas || []).slice(0, 4)
  const n = celdas.length
  const cajas = n >= 4 ? g.cells(2, 2, 0.14, 0.84) : g.cells(1, n, 0.16, 0.84)
  return [
    placa(),
    chipMarca(g, pm.brand),
    ...cajas.slice(0, n).flatMap((b, i) => [
      forma(b, 'rect', { id: 'cel' + i, fill: i === 0 ? 'accent' : 'bg1', stroke: i === 0 ? null : 'hairline', z: 20 + i, matchKey: 'feat' + i, focal: i === 0 }),
      texto([b[0] + b[2] * 0.08, b[1] + b[3] * 0.34, b[2] * 0.84, b[3] * 0.42], celdas[i].titulo, {
        id: 'cet' + i, role: 'body', align: 'left', lines: 3, color: i === 0 ? 'onAccent' : 'ink',
        size: SIZE.body * (n <= 2 ? 1.35 : 1), z: 30 + i, reveal: 'fade',
      }),
    ]),
  ]
}

C['rafaga.beat'] = (c, pm, look, g, r, est) => {
  const items = (c.items || []).slice(0, 3)
  return [
    placa(),
    chipMarca(g, pm.brand),
    // el alto de cada renglon se reparte entre los items REALES (2 o 3): con 2 items cada uno respira
    // el doble, en vez de dejar un tercio del cuadro vacio abajo.
    ...items.flatMap((t, i) => {
      const paso = 0.66 / items.length
      const [by, bh] = g.band(0.18 + i * paso, 0.18 + i * paso + paso * 0.84)
      return [
        // REGLA VERTICAL, no un guion: se alinea sola con renglones de 1 o de 2 lineas. El guion
        // horizontal quedaba flotando en el medio cuando el item ocupaba dos lineas.
        forma([g.x0, by, 0.0055, bh], 'bar', { id: 'rb' + i, fill: 'accent', z: 20 + i }),
        texto([g.x0 + 0.05, by, g.w - 0.05, bh], t, {
          id: 'ri' + i, role: 'title', align: 'left', matchKey: 'feat' + i,
          size: SIZE.title * 0.68, lines: 2, focal: i === 0, upper: look.caseMode === 'upper', z: 30 + i,
        }),
      ]
    }),
  ]
}

C['howto.steps'] = (c, pm, look, g, r, est) => {
  const pasos = (c.pasos || []).slice(0, 4)
  const [by, bh] = g.band(0.22, 0.78)
  return [
    placa(),
    chipMarca(g, pm.brand),
    stepper([g.x0, by, g.w, bh], pasos, { id: 'pasos', matchKey: 'pasos', focal: true, z: 40, numerado: r() < 0.75 }),
  ]
}

C['cta.booking'] = (c, pm, look, g, r, est) => {
  const [by, bh] = g.band(0.36, 0.58)
  const conCta = !!c.cta
  return [
    placa(),
    texto([g.x0, by, g.w, bh * 0.62], c.marca, {
      id: 'brand', role: 'title', matchKey: 'brand', focal: !conCta, align: 'center',
      size: SIZE.title * 0.9, lines: 2, upper: look.caseMode === 'upper', z: 40,
    }),
    conCta ? badge([0.5 - 0.30, by + bh * 0.78, 0.60, 0.062], c.cta, { id: 'cta', matchKey: 'cta', focal: true, size: SIZE.cta, upper: false, z: 45 }) : null,
    rail(g, { y: by - 0.05, w: g.w * 0.16 }),
    pie(g, c.dominio || est.dominio),
  ]
}

C['outro.cta'] = (c, pm, look, g, r, est) => {
  const [by, bh] = g.band(0.36, 0.62)
  const conCta = !!c.cta
  const dom = c.dominio || est.dominio
  // Sin CTA y con la marca ya mostrada en grande, repetirla es un beat perdido: el cierre util es
  // DONDE ir. El dominio pasa a ser el foco y la marca queda de firma.
  const dominioFoco = !conCta && est.marcaEnGrande && !!dom
  return [
    placa(),
    texto([g.x0, dominioFoco ? by + bh * 0.62 : by, g.w, bh * 0.6], dominioFoco ? dom : c.marca, {
      id: 'brand', role: 'title', matchKey: dominioFoco ? 'dominio' : 'brand', focal: !conCta, align: 'center',
      size: SIZE.title * range(r, 0.86, 1.02) * (dominioFoco ? 0.95 : 1), lines: 2, upper: look.caseMode === 'upper', z: 40,
    }),
    dominioFoco ? texto([g.x0, by, g.w, bh * 0.5], c.marca, { id: 'firma', role: 'kicker', matchKey: 'brand', align: 'center', color: 'dim', upper: true, z: 30 }) : null,
    // sin CTA en la pagina -> el cierre es marca + dominio. Nunca una pildora con un verbo inventado.
    conCta ? badge([0.5 - 0.30, by + bh * 0.76, 0.60, 0.062], c.cta, { id: 'cta', matchKey: 'cta', focal: true, size: SIZE.cta, upper: false, z: 45 }) : null,
    rail(g, { y: by - 0.05, w: g.w * range(r, 0.12, 0.22) * (est.pobre ? 1.9 : 1), grueso: est.pobre }),
    dominioFoco ? null : pie(g, dom),
  ]
}

// ---------------------------------------------------------------- API
// composeStoryboard(pagemodel, guion, look, seed) -> storyboard.v1
// PURO: sin canvas, sin medir, sin Date/Math.random. Mismo input -> mismo JSON byte a byte.
const dominioDe = pm => { try { return new URL(pm.url).hostname.replace(/^www\./, '') } catch { return '' } }

export function composeStoryboard(pm, guion, look, seed) {
  resetIds()
  const g = makeGrid(look)
  // objetos DISTINTOS por video (sin reposicion): la queja del motor viejo era que siempre salia la
  // misma tarjeta. El pool sale del rubro detectado en el texto real de la pagina.
  const objs = elegirObjetos(pm, seed, 3)
  let io_ = 0
  // ANTI-REPETICION: un texto que ya se mostro no se vuelve a mostrar como apoyo de otra escena.
  // Sin esto el hook y el apoyo del hero salian con LA MISMA frase en escenas consecutivas.
  const vistos = new Set()
  // el HOOK es el dueño de la frase principal: se reserva antes de componer aunque su escena vaya
  // tercera. Sin esto, un hero.product previo consumia el queHace y el hook lo repetia dos escenas
  // seguidas (o al reves, el hook quedaba mudo).
  for (const e of guion.escenas) if (e.rol === 'hook' && e.contenido.frase) vistos.add(String(e.contenido.frase).trim().toLowerCase())
  const rico = !!(pm.semantica.queHace || (pm.semantica.features || []).length || (pm.semantica.pruebas.stats || []).length)
  const est = {
    objs, dominio: dominioDe(pm), pobre: !rico,
    // el cierre necesita saber si la marca ya se mostro en grande para no repetirla
    marcaEnGrande: guion.escenas.some(e => e.id === 'open.brand' || e.id === 'hook.marca'),
    proxObjeto: () => objs[io_++ % objs.length],
    nuevo: t => { const k = String(t || '').trim().toLowerCase(); if (!k || vistos.has(k)) return ''; vistos.add(k); return t },
    marcar: t => { const k = String(t || '').trim().toLowerCase(); if (k) vistos.add(k) },
  }
  const scenes = guion.escenas.map((esc, i) => {
    const r = seedFor(seed, 'dir.comp.' + i + '.' + esc.id)
    const fn = C[esc.id]
    if (!fn) throw new Error('composer: escena sin compositor: ' + esc.id)
    // el dominio viaja a TODAS las escenas de cierre aunque el guion no lo ponga (dato real, no inventado)
    const cont = esc.contenido
    const layers = fn(cont, pm, look, g, r, est).filter(Boolean)
    return escena(`s${i}_${esc.id.replace('.', '-')}`, esc.dur, layers, {
      escena: esc.id, familia: esc.familia, rol: esc.rol, t0: esc.t0,
    })
  })
  return { v: SB_V, seed, canvas: { ...CANVAS }, grid: { x0: g.x0, y0: g.y0, w: g.w, h: g.h }, look, guion: { gramatica: guion.gramatica, sesgos: guion.sesgos }, rubro: est.objs, dur: guion.duracion, scenes }
}

// helper para gates/UI: todas las matchKeys que comparten dos escenas consecutivas (insumo del linker)
export function matchesEntre(a, b) {
  const ka = new Map(a.layers.filter(l => l.matchKey).map(l => [l.matchKey, l]))
  const out = []
  for (const l of b.layers) if (l.matchKey && ka.has(l.matchKey) && l.matchKey !== 'plate') out.push({ key: l.matchKey, de: ka.get(l.matchKey), a: l })
  return out
}

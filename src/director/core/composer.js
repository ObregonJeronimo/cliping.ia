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
import { mismaCosa } from './scriptwriter.js'
import { clamp, contrast } from './util.js'
import { makeGrid, SAFE_TOP, SAFE_BOT } from '../kit/grid.js'
import { texto, forma, objeto, foto, elemento, badge, stepper, priceTag, logoRow, placa, escena, resetIds, SIZE } from '../kit/layers.js'
import { elegirObjetos } from '../kit/objetos.js'
import { huellaDe } from '../kit/look.js'


// ---------------------------------------------------------------- fragmentos reutilizables
// El chip de marca: chico, arriba. Lleva matchKey 'brand' -> el linker lo hace VIAJAR entre escenas
// en vez de cortarlo, que es el gesto que mas "hecho por un editor" se ve.
function chipMarca(g, marca, o = {}) {
  const y = g.y0 + (o.dy || 0)
  // Con el logo REAL de la pagina, el chip deja de ser el nombre en mayusculas y pasa a ser la marca
  // tal como ella se dibuja. Mismo id, mismo matchKey y misma caja: para el linker sigue siendo "el
  // chip", asi que sigue VIAJANDO entre escenas en vez de cortarse, que es el gesto que mas se nota.
  const lg = o.logo
  if (lg) {
    // OJO con las unidades: box[2] es fraccion del ANCHO y box[3] del ALTO, y el cuadro es 9:16. Sin
    // el factor H/W un logo de proporcion 4:1 recibia una caja de 0.12x0.03 — que en pixeles es
    // 130x58, o sea proporcion 2.2 — y capaElemento lo ajustaba por el ancho dejandolo a la mitad del
    // alto pedido. No se deformaba (eso lo impide el ajuste), pero salia chico sin motivo.
    const alto = 0.030
    const ancho = Math.min(g.w * 0.5, alto * (lg.ar || 3) * (CANVAS.H / CANVAS.W))
    const x = o.align === 'center' ? 0.5 - ancho / 2 : o.align === 'right' ? g.x0 + g.w - ancho : g.x0
    return elemento([x, y, ancho, alto], lg.url, lg.ar, {
      id: 'brand', role: 'mark', matchKey: 'brand', rol: 'logo', ancla: 'top', z: 30, reveal: 'fade',
    })
  }
  if (!marca) return null
  return texto([g.x0, y, g.w, 0.03], marca, {
    id: 'brand', role: 'mark', matchKey: 'brand', align: o.align || 'left',
    upper: true, color: 'dim', z: 30, reveal: 'fade',
  })
}
// ---------------------------------------------------------------- elementos REALES de la pagina
// El pagemodel puede traer recortes PNG de los objetos de la pagina (su logo, sus tarjetas, su boton).
// Cuando estan, el video muestra la marca; cuando no, el motor dibuja sus figuras como siempre. Todo
// lo de aca es OPCIONAL por diseño: una pagina que bloquea al bot, o una captura sin credenciales de
// hosting, tienen que seguir dando un video entero.
//
// SE VE O NO SE USA. Un recorte trae los colores que tenia EN SU PAGINA, y el look del video no es la
// pagina: un logo negro de una landing clara, puesto sobre el fondo oscuro que eligio el look,
// simplemente no esta. Y "el logo no aparece" es el defecto que el dueño de la marca nota antes que
// ninguno. Por eso todo elemento pasa por `seVe` antes de entrar.
//
// El umbral es 2.2 y no el 4.5 de la tipografia a proposito: esto no es texto que haya que LEER, es
// una forma que hay que DISTINGUIR del fondo, y pedirle contraste de lectura descartaria logos
// perfectamente visibles.
const CONTRASTE_MIN_ELEM = 2.2
function seVe(el, look) {
  if (!el || !el.url) return false
  // sin alfa el recorte trae su propio fondo opaco: se recorta contra si mismo, no contra el video
  if (!el.alfa) return true
  return contrast(el.color || '#808080', look.bg0) >= CONTRASTE_MIN_ELEM
}

// El rail: la linea de acento. Es el elemento que da CONTINUIDAD visual a todo el video.
function rail(g, o = {}) {
  const vert = !!o.vert
  const gr = o.grueso ? 4.5 : 1                          // barra gruesa: recurso para paginas sin material
  if (vert) return forma([g.x0, o.y, 0.006 * gr, o.h], 'bar', { id: 'rail', matchKey: 'accent', fill: 'accent', z: 20 })
  // EL FILETE COMPARTE EJE CON EL FOCO. Anclaba siempre a la izquierda mientras el bloque iba centrado:
  // medido, 121 de 121 escenas con el acento fuera de eje (desplazamiento medio del 35% del ancho).
  // Tres ejes distintos conviviendo en el mismo cuadro es lo que hace que una pieza se lea desordenada.
  const w = o.w || g.w * 0.22
  const x = o.align === 'center' ? 0.5 - w / 2 : o.align === 'right' ? g.x1 - w : g.x0
  return forma([x, o.y, w, 0.0045 * gr], 'line', { id: 'rail', matchKey: 'accent', fill: 'accent', z: 20, align: o.align || 'left' })
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
    rail(g, { y: by - 0.055, w: g.w * range(r, 0.14, 0.26) * (est.pobre ? 1.9 : 1), grueso: est.pobre, align: centrado ? 'center' : 'left' }),
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
    izq ? rail(g, { vert: true, y: by, h: bh * 0.9 }) : rail(g, { y: by - 0.05, w: g.w * range(r, 0.16, 0.3), align: 'center' }),
    // en hook.marca el TITULAR es la marca (fallback honesto de una pagina sin contenido): el chip de
    // arriba la escribiria por segunda vez en el mismo cuadro.
    c.frase === pm.brand ? null : chipMarca(g, pm.brand, { align: izq ? 'left' : 'center' }),
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
  // La caja del heroe NO puede abarcar toda la zona. Un objeto ALTO (una taza con su vapor, una bolsa
  // con su manija) se ajusta por altura y llena la caja EXACTA: si la caja es la zona entera, el
  // objeto queda sin aire y sus extremos chocan con el chip de marca — medido y visto: el vapor de la
  // taza atravesaba "LA PARRILLA DE DON JULIO". El aire tiene que estar en la CAJA, no esperarse del
  // objeto.
  const [oy, oh] = apoyo ? g.band(0.12, 0.56) : g.band(0.12, 0.78)
  return [
    placa(),
    chipMarca(g, c.marca),
    // caja de ancho completo: el objeto se escala por min(w/nw, h/nh), asi una ventana ancha y una
    // botella alta llenan igual de bien. Forzar una caja cuadrada desperdiciaba la mitad del alto.
    objeto([g.x0, oy, g.w, oh], est.proxObjeto(), { id: 'hero', matchKey: 'hero', focal: true, z: 40, hp: [r(), r(), r(), r()] }),
    apoyo ? rail(g, { y: oy + oh + 0.03, w: g.w * range(r, 0.12, 0.22), align: 'center' }) : null,
    apoyo ? texto([g.x0, oy + oh + 0.07, g.w, 0.115], apoyo, { role: 'subtitle', align: 'center', lines: 3, z: 30 }) : null,
  ]
}

C['hero.appwindow'] = (c, pm, look, g, r, est) => {
  const [oy, oh] = g.band(0.12, 0.56)

  // La ventana lista features solo si el video NO tiene una escena dedicada a features. Con las dos,
  // el mismo trio de titulos salia dos veces seguidas — lo caza el gate de monotonia, y aparecio recien
  // con paginas REALES (Ghost, Basecamp, la nuestra): la matriz sintetica no daba esa combinacion.
  // La ventana las muestra como DETALLE del producto; rafaga/bento las muestran como SUJETO. Cuando
  // las dos estan, manda la que las tiene como sujeto.
  const lineas = est.hayEscenaDeFeatures ? [] : (c.lineas || []).filter(Boolean).slice(0, 3)
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
  // El dato tambien elige encuadre. Medido: el 45% de los videos tenia TODAS sus escenas centradas, y
  // "todo centrado siempre" es el delator numero uno de pieza hecha por una maquina. Un numero grande
  // alineado a la izquierda con su etiqueta debajo es una composicion editorial clasica, no un capricho.
  const al = encuadreDe(r, look) === 'rail-izq' ? 'left' : 'center'
  return [
    placa(),
    chipMarca(g, pm.brand, { align: al }),
    texto([g.x0, by, g.w, bh], c.valor, {
      id: 'stat', role: 'stat', matchKey: 'stat', focal: true, align: al,
      size: SIZE.stat * range(r, 0.92, 1.12), color: 'accentTxt', lines: 1, reveal: 'mask', z: 40,
    }),
    rail(g, { y: by + bh + 0.018, w: g.w * range(r, 0.10, 0.2), align: al }),
    c.etiqueta ? texto([g.x0, by + bh + 0.05, g.w, 0.07], c.etiqueta, { role: 'statLabel', align: al, upper: true, color: 'dim', lines: 2, z: 30 }) : null,
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
    rail(g, { y: by - 0.045, w: g.w * 0.14, align: 'center' }),
  ]
}

C['offer.flash'] = (c, pm, look, g, r, est) => {
  const [by, bh] = g.band(0.28, 0.56)
  const conPrecio = !!c.precio
  return [
    placa(),
    chipMarca(g, pm.brand),
    // la pildora SOLO si hay promo Y urgencia: sin promo el titular ya dice la urgencia, y ponerla en
    // los dos lados escribia la misma frase dos veces en el mismo cuadro (medido: 15 de 15 escenas).
    (c.urgencia && c.promo) ? badge([0.5 - 0.28, by - 0.06, 0.56, 0.042], c.urgencia, { id: 'urg', matchKey: 'urgencia', z: 35 }) : null,
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
  const izq = encuadreDe(r, look) === 'rail-izq'
  const al = izq ? 'left' : 'center'
  return [
    placa(),
    texto([g.x0, by, g.w, bh * 0.62], c.marca, {
      id: 'brand', role: 'title', matchKey: 'brand', focal: !conCta, align: al,
      size: SIZE.title * 0.9, lines: 2, upper: look.caseMode === 'upper', z: 40,
    }),
    conCta ? badge([izq ? g.x0 : 0.5 - 0.30, by + bh * 0.78, 0.60, 0.062], c.cta, { id: 'cta', matchKey: 'cta', focal: true, size: SIZE.cta, upper: false, align: al, z: 45 }) : null,
    rail(g, { y: by - 0.05, w: g.w * 0.16, align: al }),
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
  // el cierre tambien elige eje: era la otra escena que salia centrada en el 100% de los videos
  const izq = encuadreDe(r, look) === 'rail-izq'
  const al = izq ? 'left' : 'center'
  return [
    placa(),
    texto([g.x0, dominioFoco ? by + bh * 0.62 : by, g.w, bh * 0.6], dominioFoco ? dom : c.marca, {
      id: 'brand', role: 'title', matchKey: dominioFoco ? 'dominio' : 'brand', focal: !conCta, align: al,
      size: SIZE.title * range(r, 0.86, 1.02) * (dominioFoco ? 0.95 : 1), lines: 2, upper: look.caseMode === 'upper', z: 40,
    }),
    dominioFoco ? texto([g.x0, by, g.w, bh * 0.5], c.marca, { id: 'firma', role: 'kicker', matchKey: 'brand', align: al, color: 'dim', upper: true, z: 30 }) : null,
    // sin CTA en la pagina -> el cierre es marca + dominio. Nunca una pildora con un verbo inventado.
    conCta ? badge([izq ? g.x0 : 0.5 - 0.30, by + bh * 0.76, 0.60, 0.062], c.cta, { id: 'cta', matchKey: 'cta', focal: true, size: SIZE.cta, upper: false, align: al, z: 45 }) : null,
    rail(g, { y: by - 0.05, w: g.w * range(r, 0.12, 0.22) * (est.pobre ? 1.9 : 1), grueso: est.pobre, align: al }),
    dominioFoco ? null : pie(g, dom),
  ]
}

// ---------------------------------------------------------------- reparto del aire
// El composer coloca cada escena con bandas fijas, y eso deja el bloque flotando: medido sobre 263
// escenas, NINGUNA reparte el aire — o el contenido queda arriba y el tercio de abajo vacio
// (proof.logos: 7.8% arriba / 52.3% abajo) o al reves. Dos ejes de lectura distintos en el mismo video.
//
// Este paso corre UNA vez al final, sobre el arbol de capas ya armado, y no toca a los 15 compositores:
// mide el bloque, mide sus anclas y lo recentra. Es geometria pura y determinista (no dibuja nada).
//
// ANCLAS: el chip de marca y el pie de dominio NO se mueven — su trabajo es justamente estar pegados
// al borde. El bloque se recentra en el hueco QUE ELLAS DEJAN, no en el cuadro entero.
const esAncla = l => (l.id === 'brand' && l.role === 'mark') || l.id === 'pie'
function recentrar(layers, g) {
  // Una escena con SANGRADO esta anclada a ese borde a proposito (una foto que se va del cuadro no es
  // un bloque flotando): recentrarla la rompe — medido, empujaba la pastilla de precio fuera del safe
  // area. Ahi el reparto del aire ya lo decidio el sangrado.
  if (layers.some(l => l.sangra && l.kind !== 'plate')) return layers
  const bloque = layers.filter(l => l.kind !== 'plate' && !l.sangra && !esAncla(l))
  if (!bloque.length) return layers
  let y0 = 1, y1 = 0
  for (const l of bloque) { y0 = Math.min(y0, l.box[1]); y1 = Math.max(y1, l.box[1] + l.box[3]) }
  const chip = layers.find(l => l.id === 'brand' && l.role === 'mark')
  const pie = layers.find(l => l.id === 'pie')
  const zTop = chip ? chip.box[1] + chip.box[3] + g.my * 0.9 : g.y0
  const zBot = pie ? pie.box[1] - g.my * 0.9 : g.y1
  const aire = (zBot - zTop) - (y1 - y0)
  // CENTRO OPTICO, no geometrico: el ojo lee un bloque como centrado cuando tiene un poco MENOS de aire
  // arriba que abajo. 0.45/0.55 es el reparto clasico de una pieza vertical.
  // Si el bloque es MAS ALTO que su zona no hay aire que repartir, pero igual se ACOTA: sin esto una
  // caja generosa (el heroe usa casi todo el alto) podia arrancar por encima del chip y pisarlo.
  const dy = aire > 0 ? (zTop + aire * 0.45) - y0 : Math.max(0, zTop - y0) + Math.min(0, zBot - y1)
  if (Math.abs(dy) < 0.002) return layers
  // el desplazamiento se ACOTA para que ninguna capa termine pisando el safe area: mover el bloque no
  // puede convertirse en sacar una pastilla del cuadro.
  const dyOk = Math.max(SAFE_TOP + 0.005 - y0, Math.min(dy, (1 - SAFE_BOT - 0.005) - y1))
  if (Math.abs(dyOk) < 0.002) return layers
  for (const l of bloque) l.box = [l.box[0], +(l.box[1] + dyOk).toFixed(5), l.box[2], l.box[3]]
  return layers
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
  // MISMO criterio que el guionista: un `queHace` que es el nombre repetido no es contenido. Sin esto,
  // una pagina 404 cuyo <title> es el nombre del sitio contaba como "rica" y se quedaba con el chip de
  // marca en todos los cuadros, diciendo lo mismo tres veces seguidas.
  const rico = !!((pm.semantica.queHace && !mismaCosa(pm.semantica.queHace, pm.brand)) || (pm.semantica.features || []).length || (pm.semantica.pruebas.stats || []).length)
  // POOLS DE ELEMENTOS REALES. Se filtran UNA vez por `seVe` (el look ya esta decidido) para que
  // ningun compositor tenga que acordarse de chequearlo. Si la pagina no dio elementos, todo queda
  // vacio y el motor compone exactamente como antes.
  const els = (pm.assets && pm.assets.elementos) || []
  const delRol = rol => els.filter(e => e.rol === rol && seVe(e, look))
  let ip_ = 0
  // ORDEN POR PROPORCION, no por rol. Una pagina se diseña para una pantalla apaisada y sus piezas
  // salen anchas: una tarjeta de 1216x340 puesta en un cuadro 9:16 mide el 13% del alto — una
  // estampilla en el medio de la nada, que es peor que el objeto dibujado que reemplaza. Las piezas
  // que ya vienen con proporcion de pieza vertical entran primero; las apaisadas entran igual pero
  // ultimas, y sangrando (abajo).
  // 1.12 es la proporcion de la caja que los compositores le ceden al heroe (0.88 del ancho por 0.44
  // del alto en un 9:16). Se mide en escala logaritmica porque el mismo desvio duele igual hacia los
  // dos lados: 2.24 esta tan lejos de encajar como 0.56.
  const CAJA_AR = 1.12
  const fotos = [...delRol('foto'), ...delRol('hero')]
    .sort((a, b) => Math.abs(Math.log(a.ar / 0.75)) - Math.abs(Math.log(b.ar / 0.75)))
  const piezas = [...delRol('tarjeta'), ...delRol('hero'), ...delRol('foto')]
    .filter(e => e.ar <= 6 && e.ar >= 0.18)      // mas alla de eso es una franja, no un objeto
    .sort((a, b) => Math.abs(Math.log(a.ar / CAJA_AR)) - Math.abs(Math.log(b.ar / CAJA_AR)))
  const est = {
    objs, dominio: dominioDe(pm), pobre: !rico,
    logoEl: delRol('logo')[0] || null,
    ctaEl: delRol('cta')[0] || null,
    // Las piezas se reparten SIN reposicion, igual que los objetos dibujados: dos escenas seguidas
    // mostrando la misma tarjeta de la pagina es el mismo defecto que el motor viejo tenia con su
    // tarjeta de catalogo, solo que con mejor arte.
    proxPieza: () => (piezas.length ? piezas[ip_++ % piezas.length] : null),
    hayPiezas: piezas.length > 0,
    // para las capas `photo`: nuestro recorte de la MISMA imagen. Se prefiere el de proporcion mas
    // parecida a un cuadro vertical, que es donde va a vivir.
    fotoEl: fotos.length ? (url => (fotos.find(e => e.url === url) ? url : fotos[0].url)) : null,
    // el cierre necesita saber si la marca ya se mostro en grande para no repetirla
    marcaEnGrande: guion.escenas.some(e => e.id === 'open.brand' || e.id === 'hook.marca'),
    hayEscenaDeFeatures: guion.escenas.some(e => e.id === 'rafaga.beat' || e.id === 'features.bento'),
    proxObjeto: () => objs[io_++ % objs.length],
    nuevo: t => { const k = String(t || '').trim().toLowerCase(); if (!k || vistos.has(k)) return ''; vistos.add(k); return t },
    marcar: t => { const k = String(t || '').trim().toLowerCase(); if (k) vistos.add(k) },
  }
  const scenes = guion.escenas.map((esc, i) => {
    const r = seedFor(seed, 'dir.comp:' + huellaDe(pm) + '.' + i + '.' + esc.id)   // el encuadre tambien depende de QUE pagina es
    const fn = C[esc.id]
    if (!fn) throw new Error('composer: escena sin compositor: ' + esc.id)
    // el dominio viaja a TODAS las escenas de cierre aunque el guion no lo ponga (dato real, no inventado)
    const cont = esc.contenido
    let layers = fn(cont, pm, look, g, r, est).filter(Boolean)
    // EL CHIP DE MARCA SOBRA CUANDO LA MARCA ES TODO EL VIDEO. En una pagina sin contenido, el unico
    // material es el nombre: si ademas va de chip en cada cuadro, todas las escenas dicen exactamente
    // lo mismo y el video se lee como un error. Con contenido real el chip si sirve — ancla la marca
    // mientras pasa otra cosa.
    if (est.pobre && est.marcaEnGrande) layers = layers.filter(l => !(l.id === 'brand' && l.role === 'mark'))
    // EL LOGO REAL REEMPLAZA AL CHIP, en un solo lugar y para todas las escenas. Hacerlo aca y no en
    // cada compositor evita tocar los doce que ponen chip, y sobre todo evita que uno se olvide.
    // Solo el CHIP (role 'mark'): cuando la marca es el TITULAR de la escena — una pagina sin material
    // cuyo unico contenido es su nombre — el foco tiene que seguir siendo texto, porque la jerarquia
    // tipografica que exige C3 se mide en tamaño de fuente y una imagen no tiene tamaño de fuente.
    if (est.logoEl) layers = layers.map(l => (l.id === 'brand' && l.role === 'mark' && l.kind === 'text')
      ? chipMarca(g, pm.brand, { logo: est.logoEl, align: l.align, dy: l.box[1] - g.y0 })
      : l)
    // EL OBJETO DIBUJADO CEDE AL OBJETO REAL. Es la sustitucion que hace toda la diferencia: estas
    // escenas existen para mostrar el producto, y hasta ahora mostraban un escudo o una ventana de
    // catalogo teñidos con la paleta de la marca — parecidos a la pagina, pero no la pagina. Cada
    // escena recibe una pieza DISTINTA (sin reposicion), asi que un video de seis escenas recorre
    // seis objetos reales del sitio en vez de repetir el mismo.
    //
    // Se conserva id, matchKey, caja, foco y z: para el linker sigue siendo "el heroe", asi que los
    // match-cuts que conectan una escena con la siguiente siguen funcionando exactamente igual.
    // Va DESPUES de recentrar-no: va antes, porque el recentrado mide cajas y estas no cambian.
    if (est.hayPiezas) layers = layers.map(l => {
      if (l.kind !== 'heroObj') return l
      const p = est.proxPieza()
      if (!p) return l
      // sombra: el recorte trae la que tenia contra el fondo de SU pagina y sobre el fondo del video
      // se pierde, dejando la tarjeta pegada como una calcomania. Sube cuando el objeto casi no
      // contrasta con el fondo — una tarjeta blanca sobre un look claro sin sombra no tiene borde.
      // UN OBJETO NO SE RECORTA; UNA IMAGEN SI. Una tarjeta, un boton o un logo son piezas: cortarles
      // un borde los rompe, asi que entran enteros aunque queden mas chicos. Una foto o una captura
      // de producto son imagenes: recortarlas es lo normal y ademas es lo unico que las salva, porque
      // una captura de dashboard ajustada entera dentro de la caja queda del tamaño de una estampilla
      // y su interfaz se vuelve una mancha. Encuadrada llena el cuadro y se lee.
      if (p.rol === 'foto' || p.rol === 'hero') {
        return foto(l.box, p.url, {
          id: l.id, matchKey: l.matchKey, focal: l.focal, z: l.z, fit: 'cover', reveal: l.reveal,
        })
      }
      const c = contrast(p.color || '#808080', look.bg0)
      // UNA PIEZA ANCHA SANGRA. Ajustada dentro de los margenes queda diminuta y la escena se lee
      // vacia; de borde a borde se lee como una banda, que es una composicion valida y ademas le
      // abre al linker las recetas de transicion que piden `sangra`.
      const ancha = p.ar > 1.9
      const box = ancha
        ? [0, l.box[1] + (l.box[3] - Math.min(l.box[3], (CANVAS.W / p.ar) / CANVAS.H)) / 2, 1, Math.min(l.box[3], (CANVAS.W / p.ar) / CANVAS.H)]
        : l.box
      return elemento(box, p.url, p.ar, {
        id: l.id, matchKey: l.matchKey, focal: l.focal, rol: p.rol, z: l.z,
        sangra: ancha, sombra: ancha ? 0 : (c < 1.6 ? 0.9 : 0.5), reveal: l.reveal,
      })
    })
    // LA FOTO SALE DE NUESTRO RECORTE, no de la URL de la pagina. Es la misma imagen — el extractor la
    // saca del DOM — pero la nuestra esta hospedada por nosotros, recortada y capada de tamaño. La
    // original puede bloquear el hotlink, puede pesar 3MB o puede no existir mañana, y cuando no
    // carga la escena queda con un rectangulo gris donde iba el producto.
    // Se cambia SOLO la url: la capa sigue siendo `photo`, con su recorte a la caja, su veil y su
    // radio. Convertirla en `elemento` cambiaria la composicion, y esta escena esta compuesta con una
    // foto que sangra y un titulo encima.
    if (est.fotoEl) layers = layers.map(l => (l.kind === 'photo' ? { ...l, url: est.fotoEl(l.url) } : l))
    // EL BOTON REAL en el cierre. La pildora dibujada dice el CTA correcto — sale del texto de la
    // pagina — pero con la forma, el color y la tipografia que eligio el motor. El boton recortado es
    // el que el usuario va a ver cuando entre al sitio, y esa continuidad entre el video y la landing
    // es media razon por la que un reel convierte.
    if (est.ctaEl) layers = layers.map(l => {
      if (l.kind !== 'badge' || l.id !== 'cta') return l
      const e = est.ctaEl
      const alto = Math.min(l.box[3] * 1.15, l.box[2] / (e.ar || 4) * (CANVAS.W / CANVAS.H))
      const ancho = alto * (e.ar || 4) * (CANVAS.H / CANVAS.W)
      const x = l.align === 'left' ? l.box[0] : l.align === 'right' ? l.box[0] + l.box[2] - ancho : 0.5 - ancho / 2
      return elemento([x, l.box[1], ancho, alto], e.url, e.ar, {
        id: l.id, matchKey: l.matchKey, focal: l.focal, rol: 'cta', z: l.z, sombra: 0.4,
      })
    })
    layers = recentrar(layers, g)
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

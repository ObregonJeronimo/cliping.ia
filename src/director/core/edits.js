// director · EDITS — la edicion del usuario como OVERLAY DECLARATIVO sobre el storyboard.
//
// POR QUE UN OVERLAY Y NO UNA MUTACION DEL STORYBOARD (ni del MP4): el video no se guarda, se
// RE-GENERA. La galeria guarda (pagemodel, seed, edits) y con esos tres datos vuelve a salir el mismo
// video. Consecuencias directas de esa decision:
//   · una edicion pesa ~200 bytes de JSON en vez de 8 MB de MP4, y se puede sincronizar/versionar;
//   · las ediciones SOBREVIVEN a un cambio de motor: si manana el composer compone mejor o el linker
//     corta distinto, el video editado se regenera con el motor nuevo y las decisiones del usuario
//     siguen puestas ENCIMA en vez de quedar congeladas en un storyboard viejo;
//   · el original nunca se pierde: `edits` es una capa que se apaga entera con emptyEdits().
// Si en cambio guardaramos el storyboard ya modificado, cada mejora del motor dejaria atras a todos
// los videos editados y no habria forma de saber QUE toco el usuario y que puso el motor.
//
// applyEdits es PURA y DETERMINISTA (cero Math.random, cero Date): mismos (sb, edits) -> mismo JSON.
// Y es TOLERANTE por diseño: una entrada invalida se IGNORA y el render sigue saliendo. Quien le
// cuenta el problema a la UI es validateEdits (codigos E-EDIT-*), no una excepcion a mitad del video.

import { CANVAS, err } from './schema.js'
import { seedFor } from './prng.js'
import { clamp, isHex, apcaLc, ensureApca, ensureContrast, contrast, legibleOn, hexToHsl, hslToHex } from './util.js'
import { PLACAS, placaColors } from '../kit/look.js'
import { NOMBRES } from '../kit/objetos.js'

export const EDITS_V = 1

// LIMITES del overlay. Son parte del contrato (la UI los usa para los sliders) y ademas la razon por
// la que una edicion no puede romper el contrato del storyboard: dur queda dentro de [1,8] que exige
// validateStoryboard, y el multiplicador de tamano no puede volver ilegible ni gigante un texto.
export const DUR_MIN = 1.2, DUR_MAX = 6
export const SIZE_MIN = 0.5, SIZE_MAX = 2
// tokens de color que entiende render/draw.js::col(). Un hex tambien vale (el color picker de la UI).
export const COLOR_TOKENS = ['ink', 'dim', 'accent', 'accentTxt', 'accent2', 'onAccent', 'bg0', 'bg1']

// ---------------------------------------------------------------- helpers puros
const R2 = v => Math.round(v * 100) / 100
const R5 = v => Math.round(v * 100000) / 100000
// clon por JSON: el storyboard es JSON puro por contrato (sin funciones, sin undefined, sin ciclos),
// asi que esto es la copia profunda mas barata Y la garantia de que applyEdits no comparte NI UNA
// referencia con la entrada. La pureza se verifica en el gate comparando el JSON de sb antes/despues.
const clonar = v => JSON.parse(JSON.stringify(v))
const esObj = v => !!v && typeof v === 'object' && !Array.isArray(v)
const esNum = v => typeof v === 'number' && Number.isFinite(v)
// capas que tienen texto propio editable. El stepper NO entra: sus items son una lista y editarlos
// es otra operacion (E2), no un reemplazo de string.
const esTextual = l => l && (l.kind === 'text' || l.kind === 'badge')
const esColor = v => typeof v === 'string' && (COLOR_TOKENS.indexOf(v) >= 0 || isHex(v))
// orden estable de "importancia visual" dentro de una escena: primero la z, despues el id (que es
// unico por escena). Se usa para promover el foco y para decidir que capa se salva de un ocultado.
const porPeso = (a, b) => b.z - a.z || String(a.id).localeCompare(String(b.id))
// peso REAL en el cuadro: lo que ocupa. Es el criterio correcto para decidir que capa sostiene una
// escena; la z solo dice quien tapa a quien.
const areaDe = l => (l && l.box ? (l.box[2] || 0) * (l.box[3] || 0) : 0)
const porArea = (a, b) => areaDe(b) - areaDe(a) || porPeso(a, b)
// PESO VISUAL: el area de la caja ponderada por cuanto de esa caja llega a pintarse. Un bloque de
// texto ocupa su caja pero solo los glifos dejan tinta (~45%); una forma o una foto la llenan entera.
// Es la aproximacion barata y determinista de "cuanta imagen aporta esta capa", sin dibujar nada.
const PESO_KIND = { text: 0.45, badge: 0.6, shape: 1, photo: 1, heroObj: 1, stepper: 0.7, priceTag: 0.6, logoRow: 0.8 }
const pesoVisual = l => areaDe(l) * (PESO_KIND[l && l.kind] || 0.6)
// Piso calibrado contra el umbral E-EMPTY-FRAME de los gates (0.8% de tinta medida en pixeles):
// una escena sana ronda 0.08 de peso, una placa de titulo minima 0.07, y con solo ornamento queda en
// 0.011. Estuvo en 0.030 y era demasiado permisivo: en un cierre (marca + pildora + dominio, que suma
// 0.067) ocultar la marca dejaba 0.032, pasaba el chequeo, y el cuadro caia de 2.3% a 0.79% de tinta.
const MIN_PESO = 0.055

// ---------------------------------------------------------------- API: overlay vacio
// El estado inicial del editor. Un overlay vacio aplicado a un storyboard devuelve ese mismo
// storyboard (el gate lo verifica byte a byte): "sin ediciones" no puede significar "otro video".
export function emptyEdits() {
  return { v: EDITS_V, escenas: {}, capas: {}, look: {}, orden: null }
}

// ---------------------------------------------------------------- lectura + validacion del overlay
// analizar(edits, sb) -> { plan, errors }. UNA sola lectura para los dos consumidores: applyEdits usa
// `plan` (lo valido) e ignora `errors`; validateEdits devuelve `errors` y tira el plan. Tenerlo junto
// es lo que garantiza que la UI reporte EXACTAMENTE lo que el motor ignoro, ni mas ni menos.
// `sb` es opcional: sin storyboard solo se puede validar la FORMA; con storyboard se validan ademas
// las referencias (escena/capa existentes, kind correcto) y la regla de escena vacia.
function analizar(edits, sb) {
  const errors = []
  const plan = { escenas: new Map(), capas: new Map(), look: {}, orden: null }
  const E = (code, path, msg) => errors.push(err(code, path, msg))
  if (edits == null) return { plan, errors }
  if (!esObj(edits)) { E('E-EDIT-TYPE', '', 'edits debe ser un objeto'); return { plan, errors } }
  if (edits.v !== EDITS_V) E('E-EDIT-VERSION', 'v', `version ${edits.v} != ${EDITS_V}`)

  const escenasDe = sb && Array.isArray(sb.scenes) ? new Map(sb.scenes.map(s => [s.id, s])) : null

  // --- escenas: por ahora solo `dur` (el resto de la escena se edita por capas) ---
  if (edits.escenas != null) {
    if (!esObj(edits.escenas)) E('E-EDIT-TYPE', 'escenas', 'debe ser un objeto { escenaId: {dur} }')
    else for (const [id, v] of Object.entries(edits.escenas)) {
      const P = 'escenas.' + id
      if (!esObj(v)) { E('E-EDIT-TYPE', P, 'debe ser un objeto'); continue }
      if (escenasDe && !escenasDe.has(id)) { E('E-EDIT-ESCENA', P, 'escena inexistente: ' + id); continue }
      if (v.dur === undefined) continue
      if (!esNum(v.dur)) { E('E-EDIT-DUR', P + '.dur', 'no es un numero: ' + v.dur); continue }
      // fuera de rango NO se descarta: se CLAMPEA (el usuario arrastro el slider hasta el tope) y se
      // reporta para que la UI pueda mostrar el limite en vez de mentir con el valor pedido.
      if (v.dur < DUR_MIN - 1e-9 || v.dur > DUR_MAX + 1e-9) E('E-EDIT-DUR', P + '.dur', `fuera de [${DUR_MIN},${DUR_MAX}]s: ${v.dur} (se clampea)`)
      plan.escenas.set(id, { dur: R2(clamp(v.dur, DUR_MIN, DUR_MAX)) })
    }
  }

  // --- capas: clave "escenaId:capaId" ---
  if (edits.capas != null) {
    if (!esObj(edits.capas)) E('E-EDIT-TYPE', 'capas', 'debe ser un objeto { "escenaId:capaId": {...} }')
    else for (const [k, v] of Object.entries(edits.capas)) {
      const P = 'capas.' + k
      const i = String(k).indexOf(':')
      if (i <= 0 || i >= k.length - 1) { E('E-EDIT-CLAVE', P, 'la clave debe ser "escenaId:capaId"'); continue }
      if (!esObj(v)) { E('E-EDIT-TYPE', P, 'debe ser un objeto'); continue }
      const sid = k.slice(0, i), lid = k.slice(i + 1)
      const sc = escenasDe ? escenasDe.get(sid) : null
      if (escenasDe && !sc) { E('E-EDIT-ESCENA', P, 'escena inexistente: ' + sid); continue }
      const l = sc ? sc.layers.find(x => x.id === lid) : null
      if (sc && !l) { E('E-EDIT-CAPA', P, 'capa inexistente en la escena: ' + lid); continue }
      const out = {}

      if (v.text !== undefined) {
        if (typeof v.text !== 'string') E('E-EDIT-TEXTO', P + '.text', 'debe ser string')
        else if (l && !esTextual(l)) E('E-EDIT-KIND', P + '.text', `la capa es '${l.kind}': solo text/badge llevan texto`)
        else out.text = v.text.replace(/\s+/g, ' ').trim()
      }
      if (v.oculta !== undefined) {
        if (typeof v.oculta !== 'boolean') E('E-EDIT-TYPE', P + '.oculta', 'debe ser booleano')
        // la placa es el fondo del video: sin ella la escena es un rectangulo transparente
        else if (v.oculta && l && l.kind === 'plate') E('E-EDIT-PLATE', P + '.oculta', 'la placa no se puede ocultar')
        else out.oculta = v.oculta
      }
      if (v.size !== undefined) {
        if (!esNum(v.size)) E('E-EDIT-SIZE', P + '.size', 'no es un numero: ' + v.size)
        else if (l && !esNum(l.size)) E('E-EDIT-KIND', P + '.size', `la capa '${l.kind}' no tiene tamano tipografico`)
        else {
          if (v.size < SIZE_MIN - 1e-9 || v.size > SIZE_MAX + 1e-9) E('E-EDIT-SIZE', P + '.size', `multiplicador fuera de [${SIZE_MIN},${SIZE_MAX}]: ${v.size} (se clampea)`)
          out.size = clamp(v.size, SIZE_MIN, SIZE_MAX)
        }
      }
      if (v.color !== undefined) {
        if (!esColor(v.color)) E('E-EDIT-COLOR', P + '.color', `token o hex invalido: ${v.color} (validos: ${COLOR_TOKENS.join(', ')} o #rrggbb)`)
        else out.color = v.color
      }
      if (v.obj !== undefined) {
        if (NOMBRES.indexOf(v.obj) < 0) E('E-EDIT-OBJ', P + '.obj', 'objeto heroe inexistente: ' + v.obj)
        else if (l && l.kind !== 'heroObj') E('E-EDIT-KIND', P + '.obj', `la capa es '${l.kind}': solo heroObj tiene objeto`)
        else out.obj = v.obj
      }
      if (Object.keys(out).length) plan.capas.set(sid + ':' + lid, out)
    }
  }

  // --- look: re-teñido y familia de placa ---
  if (edits.look != null) {
    if (!esObj(edits.look)) E('E-EDIT-TYPE', 'look', 'debe ser un objeto { accent, placa }')
    else for (const [k, v] of Object.entries(edits.look)) {
      if (v === undefined) continue
      if (k === 'accent') {
        if (!isHex(v)) E('E-EDIT-ACCENT', 'look.accent', 'debe ser un hex #rrggbb: ' + v)
        else plan.look.accent = String(v).toLowerCase()
      } else if (k === 'placa') {
        if (PLACAS.indexOf(v) < 0) E('E-EDIT-PLACA', 'look.placa', `familia invalida: ${v} (validas: ${PLACAS.join(', ')})`)
        else plan.look.placa = v
      } else E('E-EDIT-CLAVE', 'look.' + k, 'propiedad de look no editable')
    }
  }

  // --- orden: permutacion de escenas ---
  if (edits.orden != null) {
    if (!Array.isArray(edits.orden)) E('E-EDIT-ORDEN', 'orden', 'debe ser null o un array de ids')
    else {
      const vistos = new Set(), out = []
      edits.orden.forEach((id, i) => {
        if (typeof id !== 'string') { E('E-EDIT-ORDEN', `orden[${i}]`, 'id no es string: ' + id); return }
        if (escenasDe && !escenasDe.has(id)) { E('E-EDIT-ORDEN', `orden[${i}]`, 'escena inexistente: ' + id + ' (se ignora)'); return }
        if (vistos.has(id)) { E('E-EDIT-ORDEN', `orden[${i}]`, 'id repetido: ' + id + ' (se ignora)'); return }
        vistos.add(id); out.push(id)
      })
      // un orden que no dejo NINGUN id util no es un orden: se descarta entero y queda el original.
      // Nunca se devuelve un video sin escenas por una lista mal escrita.
      if (!out.length) E('E-EDIT-ORDEN', 'orden', 'no quedo ningun id valido: se ignora el reordenamiento')
      else plan.orden = out
    }
  }

  // --- regla de escena vacia (necesita el storyboard: es semantica, no forma) ---
  if (escenasDe) for (const sc of sb.scenes) {
    for (const id of ocultadoDe(sc, plan).ignoradas) {
      E('E-EDIT-VACIA', `capas.${sc.id}:${id}`, 'ocultarla dejaria la escena sin contenido: se ignora')
    }
  }
  return { plan, errors }
}

// validateEdits(edits[, sb]) -> { ok, errors:[{code,path,msg}] }
// Sin `sb` valida la FORMA del overlay (tipos, rangos, enums). Con `sb` valida ademas que las escenas
// y capas referidas EXISTAN y que ninguna edicion deje una escena sin contenido (E-EDIT-VACIA).
export function validateEdits(edits, sb = null) {
  const { errors } = analizar(edits, sb)
  return { ok: errors.length === 0, errors }
}

// contarEdits(edits) -> cuantas ediciones ACTIVAS hay (badge "N cambios" en la UI del estudio).
// Cuenta propiedades tocadas, no entradas del objeto: cambiarle el texto Y el color a la misma capa
// son dos decisiones del usuario y la UI tiene que decir 2.
export function contarEdits(edits) {
  if (!esObj(edits)) return 0
  let n = 0
  if (esObj(edits.escenas)) for (const v of Object.values(edits.escenas)) if (esObj(v) && v.dur !== undefined) n++
  if (esObj(edits.capas)) for (const v of Object.values(edits.capas)) {
    if (esObj(v)) for (const k of ['text', 'color', 'size', 'obj', 'oculta']) if (v[k] !== undefined) n++
  }
  if (esObj(edits.look)) for (const k of ['accent', 'placa']) if (edits.look[k] !== undefined) n++
  if (Array.isArray(edits.orden) && edits.orden.length) n++
  return n
}

// ---------------------------------------------------------------- ocultado (con la regla anti-vacio)
// Que capas de esta escena se van, y cuales se NIEGA a sacar el motor. Una capa se va si el usuario la
// oculto explicitamente o si le dejo el texto vacio (dibujar una caja vacia es peor que no dibujarla).
// REGLA DURA: la escena nunca puede quedar en solo-placa — un cuadro de puro fondo es el defecto que
// mas se ve en un reel. Si el ocultado la vaciaria, se conserva la capa de mayor peso visual y esa
// entrada del overlay se IGNORA (validateEdits la reporta como E-EDIT-VACIA).
function ocultadoDe(sc, plan) {
  const propias = sc.layers.filter(l => l.kind !== 'plate')
  const cand = []
  for (const l of propias) {
    const ed = plan.capas.get(sc.id + ':' + l.id)
    if (!ed) continue
    if (ed.oculta === true) cand.push(l)
    else if (ed.text === '' && esTextual(l)) cand.push(l)
  }
  if (!cand.length) return { ocultas: new Set(), ignoradas: [] }

  // La regla vieja era "no se pueden ocultar TODAS". Insuficiente: ocultando solo la capa FOCAL, la
  // escena quedaba con el filete de acento y el dominio, o sea 0.45% de tinta — un cuadro vacio con
  // dos capas adentro. Lo que importa no es cuantas capas quedan sino cuanto PESO VISUAL queda.
  const ocultas = new Set(cand.map(l => l.id))
  const ignoradas = []
  const restante = () => propias.reduce((a, l) => a + (ocultas.has(l.id) ? 0 : pesoVisual(l)), 0)
  // El piso es RELATIVO ademas de absoluto. Un piso fijo dejaba pasar el caso peor: ocultar la capa
  // FOCAL de una escena de dato (el numero gigante) sobrevivia el chequeo porque el chip de marca y
  // la etiqueta juntos lo superaban — y el cuadro caia de 2.6% a 0.79% de tinta, o sea el cascaron de
  // la escena sin lo unico que la escena contaba. Una edicion no puede llevarse mas de la mitad larga
  // de la sustancia de una escena de un saque.
  const total = propias.reduce((a, l) => a + pesoVisual(l), 0)
  const piso = Math.max(MIN_PESO, total * 0.42)
  // se des-ocultan de a una, empezando por la focal y despues por peso, hasta recuperar sustancia
  const orden = cand.slice().sort((a, b) => (b.focal ? 1 : 0) - (a.focal ? 1 : 0) || pesoVisual(b) - pesoVisual(a) || porPeso(a, b))
  for (const l of orden) {
    if (restante() >= piso) break
    ocultas.delete(l.id)
    ignoradas.push(l.id)
  }
  return { ocultas, ignoradas }
}


// ---------------------------------------------------------------- texto: la caja sigue siendo la ley
// NO se pre-encoge el `size` cuando el usuario escribe un texto mas largo. Se intento y estaba mal:
// escalar por la raiz del cociente de longitudes asume que el texto ORIGINAL llenaba su caja, y casi
// nunca la llena (un dato gigante como "30s" usa un tercio de la suya). Con esa premisa, reemplazarlo
// por un parrafo lo encogia a 17px en una caja de 230px de alto: el cuadro quedaba en 0.65% de tinta,
// o sea vacio. La caja ya es la ley — `fitBlock` (render/draw.js) arranca en la intencion y baja hasta
// que el texto COMPLETO entra en ancho y alto, con un piso de legibilidad ABSOLUTO. Dejarlo trabajar
// da el tamano correcto por construccion.
// Lo unico que sigue haciendo falta es la ultima red: hay cajas (un renglon de 0.05 de alto) donde
// NINGUN tamano por encima del piso entra un texto absurdo. Ahi se recorta POR PALABRA a la capacidad
// estimada de la caja sobre el lienzo NOMINAL (405x720, el del export).
// OJO con .length: cuenta unidades UTF-16, asi que un emoji vale 2 y un texto de emojis parece el
// doble de largo de lo que es. Todo lo que mide o corta texto aca trabaja en code points.
const largoDe = t => Array.from(String(t == null ? '' : t)).length
const PISO_PX = 9          // piso duro del renderer (render/draw.js: Math.max(9, size*H))
// Ancho medio de glifo como fraccion del size. 0.60 era el promedio de las familias de TEXTO, pero
// los titulos van en display peso 800-900, que pesa ~0.70 em, y en mayusculas todavia mas. Con la
// estimacion optimista el recorte dejaba pasar textos que despues no entraban ni al piso del fitter.
// Conviene errar por conservador: un texto un poco mas corto es un cuadro correcto; uno derramado no.
const EM_ANCHO = 0.70
const HOLGURA = 0.68       // el wrap por palabra desperdicia el final de cada renglon (medido: ~30%)
// cuantas lineas entran en la caja al piso de legibilidad (geometria pura, sin medir texto)
function lineasDeCaja(l, size) {
  const h = l.box[3] * CANVAS.H
  const lh = esNum(l.lh) && l.lh > 0 ? l.lh : 1.2
  const piso = Math.max(PISO_PX, Math.min(size * CANVAS.H * 0.34, CANVAS.H * 0.020))
  return Math.max(1, Math.floor((h - piso) / (piso * lh)) + 1)
}
function capacidadDe(l, size) {
  const w = l.box[2] * CANVAS.W
  const piso = Math.max(PISO_PX, Math.min(size * CANVAS.H * 0.34, CANVAS.H * 0.020))   // espejo exacto del `min` de render/draw.js::capaTexto
  const porLinea = Math.max(1, Math.floor(w / (piso * (l.upper ? EM_ANCHO * 1.22 : EM_ANCHO))))
  // el tope de lineas de la CAPA manda sobre la geometria: si la capa dibuja una sola linea, la
  // capacidad es la de una linea aunque en la caja entren diez. Sin esto, un parrafo pegado en el
  // dato (que es lines:1) pasaba el filtro y despues el renderer mostraba 30 caracteres en una caja
  // de 156px de alto: el cuadro quedaba vacio.
  const lineas = Math.max(1, Math.min(esNum(l.lines) ? l.lines : 99, lineasDeCaja(l, size)))
  return { cap: Math.max(porLinea, Math.floor(porLinea * lineas * HOLGURA)), porLinea }
}
function recortePorCaja(l, txt, size) {
  const { cap, porLinea } = capacidadDe(l, size)
  const cps = Array.from(String(txt == null ? '' : txt))
  // La capacidad del BLOQUE solo vale si el texto PUEDE envolver. Una sola palabra larguisima ocupa
  // un renglon y se va del cuadro: su capacidad real es la de UNA linea. Sin esto, 500 letras seguidas
  // sin espacios pasaban el filtro (500 <= 661 de capacidad de bloque) y el fitter no podia salvarlo.
  const masLargo = cps.join('').split(/\s+/).reduce((m, t) => Math.max(m, largoDe(t)), 0)
  const capReal = masLargo > porLinea ? Math.min(cap, porLinea) : cap
  if (cps.length <= capReal) return { txt: cps.join(''), recorto: false }
  // slice por CODE POINTS: cortar por unidades UTF-16 partia un par sustituto y dejaba medio emoji en
  // el overlay. Como el overlay se guarda en la galeria y viaja por HTTP, ese medio caracter volvia
  // como U+FFFD y el edit guardado ya no generaba el mismo video que el que se habia compuesto.
  let out = cps.slice(0, capReal).join('')
  const sp = out.lastIndexOf(' ')
  out = sp > 0 ? out.slice(0, sp) : cps.slice(0, porLinea).join('')
  return { txt: out.replace(/[\s,;:.–—-]+$/, ''), recorto: true }
}


// ---------------------------------------------------------------- capas de una escena
function capasEditadas(sc, plan, look) {
  const { ocultas, ignoradas } = ocultadoDe(sc, plan)
  const salvadas = new Set(ignoradas)
  const out = []
  for (const l of sc.layers) {
    if (ocultas.has(l.id)) continue
    const ed = plan.capas.get(sc.id + ':' + l.id)
    if (ed) aplicarCapa(l, ed, salvadas.has(l.id), fondoDe(sc, l, look))
    out.push(l)
  }
  // C1 del composer: EXACTAMENTE un foco por escena. Si el ocultado se llevo el foco, lo hereda la
  // capa de mas peso visual que quedo; sin esto el linker no sabria que capa derivar y el gate de
  // storyboard fallaria en la escena editada.
  const focos = out.filter(l => l.focal && l.kind !== 'plate')
  if (focos.length !== 1) {
    for (const l of out) if (l.focal) delete l.focal
    const nuevo = out.filter(l => l.kind !== 'plate').sort(porPeso)[0]
    if (nuevo) nuevo.focal = true
  }
  return out
}

// muta la capa YA CLONADA (nunca la del storyboard de entrada: applyEdits clona primero)
function aplicarCapa(l, ed, esSalvada, fondo) {
  // la capa salvada por la regla anti-vacio conserva su texto original: aplicarle el string vacio que
  // el usuario pidio dibujaria una caja muda, que es lo mismo que la escena vacia que estamos evitando.
  const cambiaTexto = ed.text != null && esTextual(l) && !(esSalvada && ed.text === '')
  const txt = cambiaTexto ? String(ed.text) : (esTextual(l) ? String(l.text || '') : null)

  // ORDEN CRITICO: primero el `size` DEFINITIVO, despues el recorte. Al reves, el recorte se decidia
  // con el tamano previo al multiplicador y `size: 2` derramaba el titulo (13 de 20 casos medidos):
  // el piso del fitter tambien se duplica, asi que el bloque ya no puede achicar lo suficiente.
  let k = ed.size != null && esNum(l.size) ? ed.size : 1      // multiplicador del usuario sobre el size ORIGINAL
  if (k !== 1 && esNum(l.size)) l.size = R5(l.size * k)

  if (l.kind === 'text' && txt != null && (cambiaTexto || ed.size != null)) {
    // EL TOPE DE LINEAS ERA LA INTENCION DEL CONTENIDO ORIGINAL, no una propiedad de la caja: el dato
    // se compuso con lines:1 porque "30s" es un numero. Si el usuario escribe un parrafo ahi, sostener
    // ese 1 obliga a elegir entre desbordar o mostrar 30 caracteres en una caja de 156px de alto —
    // las dos cosas se midieron. Cuando el texto crece, el tope sube a lo que la CAJA banca (tope 6:
    // mas lineas ya no es un titulo, es un parrafo, y eso no es lo que la escena estaba contando).
    // Solo en cajas ALTAS: en una franja de 22px (el chip de marca) dos lineas al piso de legibilidad
    // no entran, y subir el tope ahi cambiaba el camino de dibujo de 'una linea recortada por palabra'
    // (que nunca desborda) a 'bloque de N lineas' (que desbordaba). 44px es el alto minimo para que
    // dos renglones legibles quepan con aire.
    const cajaAlta = l.box[3] * CANVAS.H >= 44
    if (cambiaTexto && cajaAlta && largoDe(txt) > largoDe(l.text)) l.lines = Math.max(l.lines || 1, Math.min(lineasDeCaja(l, l.size), 6))
    const r = recortePorCaja(l, txt, l.size)
    l.text = r.txt
    if (r.recorto) l.recortado = true                        // insumo para el aviso de la UI
  } else if (cambiaTexto) l.text = txt

  if (ed.color != null) {
    // LEGIBILIDAD: un token perfectamente valido puede ser invisible (texto 'bg0' sobre placa bg0 da
    // APCA 0, medido). El acento ya se rescata en lookEditado; el color que el usuario pinta a mano
    // tiene que pasar por el mismo criterio, o el editor deja publicar un cuadro en blanco.
    let c = ed.color
    if ((l.kind === 'text' || l.kind === 'badge') && fondo) {
      const resuelto = resolverColor(c, fondo.look)
      if (Math.abs(apcaLc(resuelto, fondo.bg)) < 45) { c = ensureApca(resuelto, fondo.bg, 60); l.colorAjustado = true }
    }
    // cada kind guarda su color en el campo que su dibujante lee (render/draw.js)
    if (l.kind === 'shape') l.fill = c
    else if (l.kind === 'heroObj') l.tint = c
    else l.color = c
  }
  if (ed.obj != null && l.kind === 'heroObj') l.obj = ed.obj
}

// token -> hex, con el MISMO mapeo que render/draw.js::col (aca no se puede importar el renderer:
// core no depende de render). Si los dos mapeos se separan, el editor juzga un color y el renderer
// dibuja otro.
function resolverColor(tok, look) {
  if (typeof tok === 'string' && tok[0] === '#') return tok
  const m = {
    ink: look.ink, dim: look.dim, accent: look.accent, accentTxt: look.accentTxt || look.accent,
    accent2: look.accent2, onAccent: look.onAccent, bg0: look.bg0, bg1: look.bg1,
  }
  return m[tok] || look.ink
}
// el fondo REAL de una capa: dentro de un bento la celda tiene relleno propio, no la placa. Medir
// siempre contra bg0 daria falsos positivos (onAccent sobre accent leeria como ilegible).
function fondoDe(sc, l, look) {
  const cx = l.box[0] + l.box[2] / 2, cy = l.box[1] + l.box[3] / 2
  let bajo = null
  for (const o of sc.layers) {
    if (o === l || o.z >= l.z || !o.fill || o.kind !== 'shape' || o.shape === 'line' || o.shape === 'bar') continue
    if (cx >= o.box[0] && cx <= o.box[0] + o.box[2] && cy >= o.box[1] && cy <= o.box[1] + o.box[3]) bajo = o
  }
  return { bg: bajo ? resolverColor(bajo.fill, look) : look.bg0, look }
}


// ---------------------------------------------------------------- look editado
// Re-teñir NO es cambiar un hex: accentTxt (el acento cuando hace de TEXTO) y onAccent (la tinta que
// va ENCIMA del acento) son derivados con APCA del par (acento, placa). Cambiar solo `accent` deja el
// texto del dato mas importante del video ilegible — el gate mide exactamente eso.
function lookEditado(look0, ed, seed) {
  // clon PROFUNDO: con la copia superficial, out.look.fonts y out.look.modernidad seguian siendo el
  // MISMO objeto que el de la entrada. El JSON salia bien (por eso el gate no lo veia), pero un
  // consumidor que mutara tl.look.fonts corrompia el storyboard memoizado del estudio.
  const look = clonar(look0)
  const hue0 = hexToHsl(look0.accent).h
  if (ed.placa && ed.placa !== look.placa) {
    // la familia de placa cambia el FONDO entero (bg0/bg1/ink/dim) y nada mas: tipografia, forma,
    // margenes y ornamento son decisiones ya tomadas del look y el usuario no pidio tocarlas.
    const P = placaColors(ed.placa, hue0, look.acromatica, seedFor(seed, 'dir.edits.placa.' + ed.placa), false)
    look.placa = ed.placa
    look.dark = P.dark; look.bg0 = P.bg0; look.bg1 = P.bg1; look.ink = P.ink; look.dim = P.dim
  }
  if (ed.accent) look.accent = ed.accent
  // el acento tambien tiene que VERSE como relleno (rail, badge, celda): misma regla que kit/look.js.
  if (contrast(look.accent, look.bg0) < 2.2) look.accent = ensureContrast(look.accent, look.bg0, 2.6)
  // accent2 acompaña: se rota el MISMO delta de hue que se movio el acento, para conservar la relacion
  // cromatica que eligio el look (complementario, analogo...) en vez de dejar un segundo color huerfano.
  if (look.acromatica) look.accent2 = look.dim
  else {
    const dh = hexToHsl(look.accent).h - hue0
    const a2 = hexToHsl(look0.accent2 || look0.accent)
    look.accent2 = hslToHex(a2.h + dh, a2.s, a2.l)
  }
  const cands = [look.dark ? '#0b0b0d' : '#0c0a08', '#ffffff', legibleOn(look.accent)]
  let on = cands[0], mejor = -1
  for (const c of cands) { const lc = Math.abs(apcaLc(c, look.accent)); if (lc > mejor) { mejor = lc; on = c } }
  look.onAccent = ensureApca(on, look.accent, 62)
  look.accentTxt = ensureApca(look.accent, look.bg0, 62)
  look.dim = ensureApca(look.dim, look.bg0, 64)
  return look
}

// ---------------------------------------------------------------- orden
// Reordena SOLO escenas existentes. Las que el usuario no nombro se agregan al final en su orden
// original: arrastrar una escena al principio no puede hacer desaparecer a las otras cuatro.
function reordenar(scenes, orden) {
  if (!orden || !orden.length) return scenes
  const porId = new Map(scenes.map(s => [s.id, s]))
  const out = []
  for (const id of orden) { const s = porId.get(id); if (s && out.indexOf(s) < 0) out.push(s) }
  for (const s of scenes) if (out.indexOf(s) < 0) out.push(s)
  return out.length ? out : scenes
}

// ---------------------------------------------------------------- API: aplicar
// applyEdits(sb, edits) -> NUEVO storyboard (el de entrada no se toca), listo para compile().
// Orden de aplicacion, y por que ese: look -> capas -> orden -> tiempos. El look primero porque las
// capas guardan TOKENS de color y re-teñir es cambiar el look, no las capas. Los tiempos al final
// porque dependen tanto de las duraciones editadas como del orden nuevo.
export function applyEdits(sb, edits) {
  if (!sb || typeof sb !== 'object' || !Array.isArray(sb.scenes) || !sb.scenes.length) return sb
  const out = clonar(sb)
  const { plan } = analizar(edits, sb)

  if (plan.look.accent || plan.look.placa) out.look = lookEditado(sb.look, plan.look, sb.seed)

  for (const sc of out.scenes) {
    const e = plan.escenas.get(sc.id)
    if (e && e.dur != null) sc.dur = e.dur
    sc.layers = capasEditadas(sc, plan, out.look)
  }
  out.scenes = reordenar(out.scenes, plan.orden)

  // t0 consecutivos y duracion total = suma. Se recalcula SIEMPRE (aunque no haya ediciones de
  // tiempo): es lo que mantiene el invariante despues de reordenar, y es idempotente.
  let t = 0
  for (const sc of out.scenes) { sc.t0 = R2(t); t += sc.dur }
  out.dur = R2(t)
  return out
}

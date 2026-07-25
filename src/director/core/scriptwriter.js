// director · GUIONISTA SEMANTICO — la pieza que hace que las escenas TENGAN SENTIDO.
// Entrada: pagemodel (que HACE la pagina, como funciona, que vende, que prueba tiene) + seed.
// Salida: un GUION = secuencia de escenas con rol, contenido REAL y duracion — el insumo del composer.
//
// Dos reglas duras que gobiernan todo (docs/MOTOR-DIRECTOR.md §4 y DNA-SPEC §5):
//   1. ANTI-INVENCION: una escena EXISTE solo si su señal esta en el pagemodel. Sin stats no hay escena de
//      dato; sin pasos no hay how-to; sin testimonios no hay cita. Nunca se fabrica contenido de relleno.
//   2. CATALOGO CURADO: el seed elige entre GRAMATICAS validas (no arma secuencias arbitrarias), y dentro
//      de cada gramatica los slots opcionales se llenan solo con material real.
// La MODERNIDAD del DNA (bento/glass/bigtype/editorial-photo/gradient-mesh/brutalist) SESGA los pesos
// (DNA-SPEC §4.2), con el tope de 2 sesgos activos por video: tres lenguajes visuales a la vez = slop.

import { seedFor, weightedPick, weightedSample } from './prng.js'
import { clamp } from './util.js'

// ---------------------------------------------------------------- catalogo de escenas
// requiere(pm) -> bool  ·  contenido(pm) -> objeto con el material REAL que la escena va a mostrar
// familia: para la regla "nunca dos escenas de la misma familia seguidas"
export const ESCENAS = [
  {
    id: 'open.brand', familia: 'apertura', rol: 'hook', dur: 1.9, peso: 1,
    requiere: () => true,
    contenido: pm => ({ marca: pm.brand, kicker: dominioDe(pm) }),
  },
  {
    id: 'hook.statement', familia: 'mensaje', rol: 'hook', dur: 2.7, peso: 1.4,
    requiere: pm => !!pm.semantica.queHace,
    contenido: pm => ({ frase: pm.semantica.queHace, apoyo: '' }),
  },
  {
    // FALLBACK HONESTO: si la pagina no dice que hace (vacia/botwall/404), el ancla es la MARCA a escala
    // display. No inventamos una frase (eso es lo unico prohibido) — mostramos lo unico real que hay.
    id: 'hook.marca', familia: 'mensaje', rol: 'hook', dur: 2.5, peso: 1.0,
    requiere: pm => !pm.semantica.queHace && !!pm.brand,
    contenido: pm => ({ frase: pm.brand, apoyo: dominioDe(pm) }),
  },
  {
    id: 'howto.steps', familia: 'explicacion', rol: 'cuerpo', dur: 3.4, peso: 1.3,
    requiere: pm => (pm.semantica.comoFunciona || []).length >= 2,
    contenido: pm => ({ pasos: pm.semantica.comoFunciona.slice(0, 4) }),
  },
  {
    id: 'features.bento', familia: 'beneficios', rol: 'cuerpo', dur: 3.2, peso: 1.1,
    requiere: pm => (pm.semantica.features || []).length >= 3,   // con 2 la grilla queda coja (DIRECCION-DE-ARTE §4.1)
    contenido: pm => ({ celdas: pm.semantica.features.slice(0, 4) }),
  },
  {
    id: 'rafaga.beat', familia: 'beneficios', rol: 'cuerpo', dur: 2.6, peso: 1.0,
    requiere: pm => (pm.semantica.features || []).length >= 2,
    contenido: pm => ({ items: pm.semantica.features.slice(0, 3).map(f => f.titulo) }),
  },
  {
    id: 'hero.appwindow', familia: 'producto', rol: 'cuerpo', dur: 3.0, peso: 1.2,
    requiere: pm => ['saas', 'app'].indexOf(pm.semantica.tipoNegocio) >= 0,
    contenido: pm => ({ marca: pm.brand, lineas: (pm.semantica.features || []).slice(0, 3).map(f => f.titulo) }),
  },
  {
    id: 'hero.product', familia: 'producto', rol: 'cuerpo', dur: 3.0, peso: 1.3,
    // OJO: 'otro' NO existe en IMG_KIND (schema.js), asi que normalizePageModel lo convertia en
    // 'desconocido' y esta condicion nunca podia ser verdadera. Sumado a que ni el brief legacy ni
    // backend/pagemodel.py clasifican imagenes (todas salen 'desconocido'), la escena de FOTO era
    // codigo muerto: 0 de 60 seeds la producian. Con 'desconocido' aceptado, sale en ~1 de 2.
    requiere: pm => pm.semantica.tipoNegocio === 'ecommerce' && (pm.assets.images || []).some(i => i.kind === 'producto' || i.kind === 'desconocido'),
    contenido: pm => ({
      foto: (pm.assets.images.find(i => i.kind === 'producto') || pm.assets.images[0]).url,   // preferimos la clasificada; si no hay, la mejor del ranking de site_capture (viene primera)
      precio: pm.semantica.oferta.precio || '', titulo: pm.semantica.queHace,
    }),
  },
  {
    id: 'hero.objeto', familia: 'producto', rol: 'cuerpo', dur: 2.9, peso: 1.0,
    requiere: () => true,                                        // el objeto procedural por rubro: siempre disponible
    contenido: pm => ({ marca: pm.brand, apoyo: pm.semantica.queHace }),
  },
  {
    id: 'proof.punch', familia: 'prueba', rol: 'prueba', dur: 2.3, peso: 1.2,
    requiere: pm => (pm.semantica.pruebas.stats || []).length >= 1,
    contenido: pm => ({ valor: pm.semantica.pruebas.stats[0].valor, etiqueta: pm.semantica.pruebas.stats[0].etiqueta || '' }),
  },
  {
    id: 'proof.quote', familia: 'prueba', rol: 'prueba', dur: 2.8, peso: 1.0,
    requiere: pm => (pm.semantica.pruebas.testimonios || []).length >= 1,
    contenido: pm => ({ cita: pm.semantica.pruebas.testimonios[0].texto, autor: pm.semantica.pruebas.testimonios[0].firma || '' }),
  },
  {
    id: 'proof.logos', familia: 'prueba', rol: 'prueba', dur: 2.2, peso: 0.8,
    requiere: pm => !!pm.semantica.pruebas.logosClientes,
    contenido: pm => ({ marca: pm.brand }),
  },
  {
    id: 'offer.flash', familia: 'oferta', rol: 'cuerpo', dur: 2.4, peso: 1.3,
    requiere: pm => !!(pm.semantica.oferta.promo || pm.semantica.oferta.urgencia),
    contenido: pm => ({ promo: pm.semantica.oferta.promo || '', urgencia: pm.semantica.oferta.urgencia || '', precio: pm.semantica.oferta.precio || '' }),
  },
  {
    id: 'cta.booking', familia: 'cierre', rol: 'cierre', dur: 2.8, peso: 1.4,
    requiere: pm => ['reserva', 'contacto'].indexOf(pm.semantica.modeloUso) >= 0,
    contenido: pm => ({ marca: pm.brand, cta: pm.semantica.cta || '', modo: pm.semantica.modeloUso, dominio: dominioDe(pm) }),
  },
  {
    id: 'outro.cta', familia: 'cierre', rol: 'cierre', dur: 2.8, peso: 1,
    requiere: () => true,
    // cta puede venir VACIO (pagina sin llamada a la accion): el composer dibuja marca + dominio y
    // NO una pildora con texto inventado. `cta: ''` es la señal de "cierre sin boton".
    contenido: pm => ({ marca: pm.brand, cta: pm.semantica.cta || '', apoyo: pm.semantica.queHace || '', dominio: dominioDe(pm) }),
  },
]
// OJO: `vozDeMarca` NO se imprime nunca. Es una señal de ESTILO (como escribir), no copy — y ademas
// tiene default ['claro','directo','actual']: mostrarlo pone en pantalla una lista que la pagina nunca
// dijo. Era exactamente el 'listas sin sentido' que se veia en los videos. Se usa solo como sesgo.
const dominioDe = pm => { try { return new URL(pm.url).hostname.replace(/^www\./, '') } catch { return '' } }
const BY_ID = Object.fromEntries(ESCENAS.map(e => [e.id, e]))

// ---------------------------------------------------------------- sesgo por modernidad (DNA-SPEC §4.2)
const SESGO = {
  bento: { 'features.bento': 2.5 },
  glass: { 'hero.appwindow': 1.8, 'features.bento': 1.3 },
  bigtype: { 'hook.statement': 3.0 },
  'editorial-photo': { 'hero.product': 2.2, 'hero.objeto': 0.5 },
  'gradient-mesh': {},
  brutalist: { 'rafaga.beat': 1.5 },
}
// max 2 sesgos activos por video (el 3ro solo desempata): tres lenguajes visuales = slop
export function sesgosActivos(pm) { return (pm.dna.modernidad || []).slice(0, 2) }
function pesoDe(esc, pm, sesgos) {
  let w = esc.peso
  for (const s of sesgos) { const m = SESGO[s] && SESGO[s][esc.id]; if (m) w *= m }
  return w
}

// ---------------------------------------------------------------- gramaticas (secuencias con logica narrativa)
// cada una: ok(pm) — si el contenido la banca — y pasos: ids de escena (los que no aplican se caen solos).
// NOTA: '@explicacion|beneficios' = el hueco del CUERPO explicativo, donde el "como funciona" (si la
// pagina realmente lo tiene) compite con los beneficios. Sin ese slot compartido, howto.steps solo podia
// salir en su propia gramatica y una pagina que EXPLICA su producto casi nunca lo mostraba.
export const GRAMATICAS = [
  { id: 'clasica', peso: 1.2, ok: () => true, pasos: ['open.brand', '@mensaje', '@producto', '@prueba', '@explicacion|beneficios', '@cierre'] },
  { id: 'producto-primero', peso: 1.1, ok: () => true, pasos: ['@producto', '@mensaje', '@explicacion|beneficios', '@prueba', '@cierre'] },
  { id: 'dato-primero', peso: 1.0, ok: pm => (pm.semantica.pruebas.stats || []).length >= 1, pasos: ['proof.punch', '@mensaje', '@producto', '@explicacion|beneficios', '@cierre'] },
  { id: 'rafaga-primero', peso: 0.9, ok: pm => (pm.semantica.features || []).length >= 2, pasos: ['@beneficios', '@producto', '@mensaje', '@cierre'] },
  { id: 'editorial', peso: 0.8, ok: () => true, pasos: ['open.brand', '@mensaje', '@producto', '@cierre'] },
  // --- gramaticas SEMANTICAS (las que la pagina habilita por lo que HACE) ---
  { id: 'howto-primero', peso: 1.5, ok: pm => (pm.semantica.comoFunciona || []).length >= 2, pasos: ['@mensaje', 'howto.steps', '@producto', '@prueba', '@cierre'] },
  { id: 'oferta-primero', peso: 1.6, ok: pm => !!(pm.semantica.oferta.promo || pm.semantica.oferta.urgencia), pasos: ['offer.flash', '@mensaje', '@producto', '@explicacion|beneficios', '@cierre'] },
  { id: 'social-primero', peso: 1.3, ok: pm => (pm.semantica.pruebas.testimonios || []).length >= 1 || (pm.semantica.pruebas.stats || []).length >= 2, pasos: ['@prueba', '@mensaje', '@producto', '@explicacion|beneficios', '@cierre'] },
]

// resuelve un slot '@familia' (o '@fam1|fam2': familias que COMPITEN por el mismo hueco narrativo)
// -> la mejor escena DISPONIBLE, ponderada por seed + sesgo de modernidad.
function resolverSlot(slot, pm, r, sesgos, usadas) {
  const fams = slot.slice(1).split('|')
  const cand = ESCENAS.filter(e => fams.indexOf(e.familia) >= 0 && e.requiere(pm) && !usadas.has(e.id))
  if (!cand.length) return null
  return weightedPick(r, cand, e => pesoDe(e, pm, sesgos))
}

// ---------------------------------------------------------------- API
// buildGuion(pagemodel, seed) -> { gramatica, escenas: [{ id, familia, rol, dur, contenido }], duracion }
export function buildGuion(pm, seed) {
  const r = seedFor(seed, 'dir.guion')
  const sesgos = sesgosActivos(pm)
  const validas = GRAMATICAS.filter(g => g.ok(pm))
  const gram = weightedPick(r, validas, g => g.peso)

  const usadas = new Set()
  const escenas = []
  for (const paso of gram.pasos) {
    const esc = paso.startsWith('@') ? resolverSlot(paso, pm, r, sesgos, usadas) : (BY_ID[paso] && BY_ID[paso].requiere(pm) ? BY_ID[paso] : null)
    if (!esc || usadas.has(esc.id)) continue
    // regla dura: nunca dos escenas de la misma FAMILIA seguidas
    if (escenas.length && escenas[escenas.length - 1].familia === esc.familia) continue
    usadas.add(esc.id)
    escenas.push({ id: esc.id, familia: esc.familia, rol: esc.rol, dur: esc.dur, contenido: esc.contenido(pm) })
  }
  // GARANTIAS del guion (una pagina pobre igual tiene que dar un video que cierre):
  if (!escenas.some(e => e.rol === 'hook')) {
    const h = ['hook.statement', 'hook.marca', 'open.brand'].map(id => BY_ID[id]).find(e => e.requiere(pm) && !usadas.has(e.id)) || BY_ID['open.brand']
    escenas.unshift({ id: h.id, familia: h.familia, rol: h.rol, dur: h.dur, contenido: h.contenido(pm) })
  }
  if (!escenas.some(e => e.rol === 'cierre')) {
    const c = BY_ID['outro.cta']
    escenas.push({ id: c.id, familia: c.familia, rol: c.rol, dur: c.dur, contenido: c.contenido(pm) })
  }
  if (escenas.length < 3) {   // piso: apertura + algo + cierre
    const relleno = BY_ID['hero.objeto']
    if (!usadas.has(relleno.id)) escenas.splice(escenas.length - 1, 0, { id: relleno.id, familia: relleno.familia, rol: relleno.rol, dur: relleno.dur, contenido: relleno.contenido(pm) })
  }

  // RITMO: la energia del DNA comprime o estira (nunca fuera de [1.6, 4.2]s por escena)
  const k = clamp(1.15 - pm.dna.mood.energia * 0.3, 0.85, 1.15)
  let t = 0
  for (const e of escenas) { e.dur = Math.round(clamp(e.dur * k, 1.6, 4.2) * 100) / 100; e.t0 = Math.round(t * 100) / 100; t += e.dur }
  return { gramatica: gram.id, sesgos, escenas, duracion: Math.round(t * 100) / 100 }
}

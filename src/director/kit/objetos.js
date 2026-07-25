// director · OBJETOS — elige QUE objeto heroe le corresponde a esta pagina.
// El catalogo vive en src/shared/objects.js (16 dibujantes por nombre, agrupados en pools por rubro).
// Aca solo esta la DECISION: mapear lo que la pagina realmente dice -> un pool -> un objeto.
//
// Por que hay deteccion por palabras y no solo por tipoNegocio: `tipoNegocio` distingue saas de
// ecommerce, pero no una parrilla de una peluqueria (las dos son 'servicio-local') y el objeto correcto
// es un plato en un caso y un frasco en el otro. Las palabras se buscan en el texto REAL de la pagina
// (marca, que hace, features) — es señal medida, no invencion.

import { createHeroObjects } from '../../shared/objects.js'
import { drawText } from '../core/text.js'
import { lighten, darken, rgba } from '../core/util.js'
import { seedFor, weightedSample } from '../core/prng.js'

const HERO = createHeroObjects({ drawText, lighten, darken, rgba })
// invierte el catalogo: funcion -> nombre, para poder exponer los pools como strings
const NOMBRE = new Map(Object.entries(HERO.byName).map(([n, f]) => [f, n]))
export const POOLS = Object.fromEntries(Object.entries(HERO.pools).map(([k, fs]) => [k, fs.map(f => NOMBRE.get(f)).filter(Boolean)]))
export const NOMBRES = HERO.names

// palabras -> rubro. Sin acentos y en minuscula; se compara contra el texto normalizado de la pagina.
const PISTAS = [
  ['gastronomia', ['restaurant', 'resto', 'parrilla', 'cafe', 'cafeteria', 'bar ', 'pizza', 'sushi', 'menu', 'cocina', 'gastronom', 'delivery', 'panaderia', 'heladeria', 'vino', 'cerveza', 'brunch', 'chef']],
  ['belleza', ['peluqueria', 'barberia', 'estetica', 'belleza', 'spa', 'unas', 'manicur', 'cosmetic', 'skincare', 'maquillaje', 'perfum', 'salon']],
  ['fitness', ['gimnasio', 'gym', 'fitness', 'entrenamiento', 'crossfit', 'pilates', 'yoga', 'musculacion', 'personal trainer', 'entrenador']],
  ['salud', ['clinica', 'consultorio', 'medic', 'odontolog', 'dentista', 'turno', 'salud', 'farmacia', 'psicolog', 'nutricion', 'kinesiolog', 'veterinaria']],
  ['inmobiliaria', ['inmobiliaria', 'propiedad', 'alquiler', 'venta de casas', 'departamento', 'terreno', 'inmueble', 'bienes raices', 'mudanza', 'arquitectura', 'construccion', 'reforma']],
  ['educacion', ['curso', 'academia', 'escuela', 'instituto', 'clases', 'capacitacion', 'aprende', 'ensenanza', 'diplomatura', 'taller', 'alumno', 'universidad', 'idioma']],
  ['eventos', ['evento', 'fiesta', 'entrada', 'ticket', 'festival', 'show', 'concierto', 'boliche', 'line up', 'dj ', 'casamiento', 'catering']],
  ['moda', ['indumentaria', 'ropa', 'moda', 'prenda', 'coleccion', 'talle', 'zapatilla', 'calzado', 'accesorio', 'joyeria', 'atelier', 'sastreria', 'algodon']],
  ['finanzas', ['finanz', 'prestamo', 'credito', 'inversion', 'banco', 'billetera', 'cripto', 'seguro', 'contab', 'impuesto', 'tarjeta', 'cobro', 'pago']],
  ['tech', ['software', 'saas', 'plataforma', 'api', 'dashboard', 'automatiz', 'integrac', 'nube', 'datos', 'inteligencia artificial', ' ia ', 'app ', 'desarrollo web', 'agencia digital']],
]
// fallback por tipoNegocio cuando ninguna pista pega
const POR_TIPO = { saas: 'tech', app: 'tech', ecommerce: 'moda', educacion: 'educacion', evento: 'eventos', media: 'tech', portfolio: 'default', 'servicio-local': 'default', otro: 'default' }

const norm = s => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ')

// textoDe(pm) — el corpus REAL de la pagina con el que se decide el rubro
export function textoDe(pm) {
  const s = pm.semantica || {}
  return norm([
    pm.brand, s.queHace, s.cta,
    ...(s.features || []).map(f => f.titulo + ' ' + (f.detalle || '')),
    ...(s.comoFunciona || []),
    (s.oferta && s.oferta.promo) || '',
  ].join(' '))
}

// rubroDe(pm) -> clave de POOLS. Gana la pista con mas coincidencias; empate -> la primera de la lista.
export function rubroDe(pm) {
  const t = ' ' + textoDe(pm) + ' '
  let mejor = null, max = 0
  for (const [rubro, palabras] of PISTAS) {
    let n = 0
    for (const p of palabras) if (t.indexOf(p) >= 0) n++
    if (n > max) { max = n; mejor = rubro }
  }
  if (mejor) return mejor
  return POR_TIPO[(pm.semantica && pm.semantica.tipoNegocio) || 'otro'] || 'default'
}

// elegirObjetos(pm, seed, n) -> n objetos DISTINTOS del pool del rubro (sin reposicion: dos escenas de
// objeto en el mismo video nunca muestran lo mismo, que era la queja original del motor viejo).
export function elegirObjetos(pm, seed, n = 3) {
  const pool = POOLS[rubroDe(pm)] || POOLS.default
  const r = seedFor(seed, 'dir.obj')
  const sel = weightedSample(r, pool, Math.min(n, pool.length), () => 1)
  return sel.length ? sel : ['shield']
}

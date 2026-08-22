// EL DOCUMENTO DE ESCENA: lo que sale de After Effects y entra a la web.
//
// Este archivo hace dos cosas que hasta ahora vivían adentro de la prueba, y las saca afuera porque
// dejaron de ser andamio: son el formato.
//
//   · `leerVolcado` — lee lo que la sonda escribió en AE (keyframes, eases, tipos de interpolación,
//     tangentes espaciales) y lo arma en objetos.
//   · `segmentos` — convierte eso en la lista de tramos que un motor web puede reproducir, cada uno
//     con su curva ya en la cadena que consume GSAP `CustomEase`.
//
// LO IMPORTANTE ES LO QUE SE NIEGA A CONVERTIR. Un tramo con tangentes espaciales no nulas (una
// trayectoria curva) o con tipos de interpolación mezclados no se aproxima: sale marcado
// `rechazado` con motivo. Convertir lo que no se puede convertir no falla ruidosamente — da algo
// PARECIDO, y "parecido" no se puede señalar con el dedo ni discutir con un cliente. Negarse es
// barato; una animación que se siente distinta cuesta el trabajo entero.

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { aeACubicBezier, evaluar, aCadenaGSAP } from './curvas.mjs'

export function leerVolcado(DIR) {
  const ruta = join(DIR, 'datos.txt')
  if (!existsSync(ruta)) throw new Error(`No existe ${ruta}`)
  const lineas = readFileSync(ruta, 'utf8').split('\n').map(l => l.trim()).filter(Boolean)
  if (!lineas.includes('--- fin ---')) throw new Error('El volcado no tiene el centinela: la sonda murio a mitad de camino.')

  const mundo = {}
  const casos = new Map()
  const notas = []
  let version = '?'
  const enums = {}
  const lee = (s) => { const [v, i] = s.split(';').map(Number); return { velocidad: v, influencia: i } }
  const nums = (s) => (s === 'na' || s === '' ? null : s.split(';').map(Number))

  for (const linea of lineas) {
    const f = linea.split('|')
    switch (f[0]) {
      case 'VERSION': version = f[1]; break
      case 'ENUM':
        for (let i = 1; i < f.length; i += 2) enums[f[i]] = +f[i + 1]
        break
      case 'MUNDO':
        Object.assign(mundo, { ancho: +f[1], alto: +f[2], fps: +f[3], duracion: +f[4], lado: +f[5] })
        break
      case 'NOTA': notas.push(`${f[1]}: ${f.slice(2).join('|')}`); break
      case 'CASO':
        casos.set(f[1], {
          id: f[1], desc: f[2], magnitud: f[3], eje: f[4], espera: f[5] || 'ok',
          keys: [], cuadros: [], valores: new Map(), separadas: null, pedidos: null, expresion: null,
        })
        break
      case 'SEPARADAS': { const c = casos.get(f[1]); if (c) c.separadas = f[2] === 'true'; break }
      case 'PROP': {
        const c = casos.get(f[1]); if (!c) break
        c.expresion = /expresion=SI/.test(linea)
        c.numKeysDeclarado = +String(f[3]).replace('keys=', '')
        break
      }
      case 'KEY': {
        const c = casos.get(f[1]); if (!c) break
        const n = +f[6]
        c.keys.push({
          indice: +f[3], t: +f[4], valor: f[5].split(';').map(Number),
          entrada: f.slice(7, 7 + n).map(lee),
          salida: f.slice(7 + n, 7 + 2 * n).map(lee),
        })
        break
      }
      case 'TIPO': {
        const k = casos.get(f[1])?.keys.find(q => q.indice === +f[3]); if (!k) break
        k.tipoEntrada = +f[4]; k.tipoSalida = +f[5]
        k.roving = f[6] === 'SI'; k.continuo = f[7] === 'SI'; k.autoTemporal = f[8] === 'SI'
        break
      }
      case 'ESPACIAL': {
        const k = casos.get(f[1])?.keys.find(q => q.indice === +f[3]); if (!k) break
        k.tangenteEntrada = nums(f[4]); k.tangenteSalida = nums(f[5]); k.autoEspacial = f[6] === 'SI'
        break
      }
      case 'CUADRO': casos.get(f[1])?.cuadros.push({ k: +f[2], t: +f[3], archivo: f[4] }); break
      case 'VALOR': casos.get(f[1])?.valores.set(+f[2], f[3].split(';').map(Number)); break
      case 'CUADROS_PEDIDOS': { const c = casos.get(f[1]); if (c) c.pedidos = +f[2]; break }
    }
  }
  return { mundo, casos: [...casos.values()], notas, version, enums }
}

// `t >= ` Y NO `t > `: con `>`, un cuadro que cae EXACTAMENTE sobre un keyframe se queda en el tramo
// anterior, y si ese tramo era HOLD devuelve el valor viejo. Son 500 px de error en un cuadro. Lo
// encontró la prueba porque los keyframes caen en tiempos de cuadro exactos.
export function tramoDe(keys, t) {
  let j = 0
  while (j < keys.length - 2 && t >= keys[j + 1].t) j++
  return [keys[j], keys[j + 1]]
}

export const COMPONENTE = { x: 0, y: 1, xy: 0 }
// Se recorta al largo del valor: una propiedad con dimensiones separadas guarda un ESCALAR, y pedirle
// el componente 1 devuelve undefined — que después se propaga hasta convertirse en un cero que parece
// un acierto perfecto.
export const ejeDe = (caso, pedido) =>
  Math.min(pedido ?? COMPONENTE[caso.eje] ?? 0, caso.keys[0].valor.length - 1)

const esCurva = (k) => (k.tangenteEntrada || []).some(v => Math.abs(v) > 1e-6) ||
                       (k.tangenteSalida || []).some(v => Math.abs(v) > 1e-6)

/**
 * Los tramos de una componente, listos para un motor web.
 * Cada uno: { t1, t2, v1, v2, tipo, ease? , motivo? }
 */
export function segmentos(caso, enums, componente = null) {
  const c = ejeDe(caso, componente)
  const keys = caso.keys
  const out = []
  for (let j = 0; j < keys.length - 1; j++) {
    const a = keys[j], b = keys[j + 1]
    const base = { t1: a.t, t2: b.t, v1: a.valor[c], v2: b.valor[c] }

    if (esCurva(a) || esCurva(b)) {
      out.push({ ...base, tipo: 'rechazado', motivo: 'trayectoria curva: tangentes espaciales no nulas' })
      continue
    }
    if (a.tipoSalida === enums.HOLD) { out.push({ ...base, tipo: 'hold' }); continue }

    const linealIzq = a.tipoSalida === enums.LINEAL
    const linealDer = b.tipoEntrada === enums.LINEAL
    if (linealIzq && linealDer) { out.push({ ...base, tipo: 'lineal' }); continue }
    if (linealIzq !== linealDer) {
      out.push({ ...base, tipo: 'rechazado', motivo: `tipos mezclados (salida ${a.tipoSalida}, entrada ${b.tipoEntrada})` })
      continue
    }

    const iSal = a.salida.length > 1 ? Math.min(c, a.salida.length - 1) : 0
    const iEnt = b.entrada.length > 1 ? Math.min(c, b.entrada.length - 1) : 0
    const bez = aeACubicBezier(a.salida[iSal], b.entrada[iEnt], b.t - a.t, b.valor[c] - a.valor[c])
    out.push({ ...base, tipo: 'bezier', bezier: bez, ease: aCadenaGSAP(bez) })
  }
  return out
}

/** El valor de una componente en un instante, según los tramos. Es la referencia de la prueba. */
export function predecirDe(tramos, t) {
  if (!tramos.length) return { valor: NaN }
  if (t <= tramos[0].t1) return { valor: tramos[0].v1 }
  const ult = tramos[tramos.length - 1]
  if (t >= ult.t2) return { valor: ult.v2 }
  let j = 0
  while (j < tramos.length - 1 && t >= tramos[j + 1].t1) j++
  const s = tramos[j]
  if (s.tipo === 'rechazado') return { rechaza: s.motivo }
  if (s.tipo === 'hold') return { valor: s.v1, tipo: 'hold' }
  const u = (t - s.t1) / (s.t2 - s.t1)
  if (s.tipo === 'lineal') return { valor: s.v1 + (s.v2 - s.v1) * u, tipo: 'lineal' }
  return { valor: s.v1 + (s.v2 - s.v1) * evaluar(s.bezier, u), tipo: 'bezier' }
}

/**
 * El documento completo, tal como lo consumiría un motor web.
 * Es el primer prototipo del formato del MCP: nada de AE adentro, sólo tramos y curvas.
 */
export function documentoDe(DIR) {
  const { mundo, casos, enums, version, notas } = leerVolcado(DIR)
  const piezas = []
  for (const caso of casos) {
    if (caso.magnitud === 'piso' || !caso.keys.length) continue
    const pistas = caso.magnitud === 'escala'
      ? [0, 1].map(i => ({ componente: i, tramos: segmentos(caso, enums, i) }))
      : [{ componente: ejeDe(caso, null), tramos: segmentos(caso, enums) }]
    const rechazado = pistas.some(p => p.tramos.some(t => t.tipo === 'rechazado'))
    piezas.push({
      id: caso.id, desc: caso.desc, magnitud: caso.magnitud, eje: caso.eje,
      espera: caso.espera, rechazado,
      motivo: rechazado ? pistas.flatMap(p => p.tramos).find(t => t.tipo === 'rechazado').motivo : null,
      pistas,
    })
  }
  return { version, mundo, notas, piezas }
}

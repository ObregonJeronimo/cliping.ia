// GESTOS SIN CONSECUENCIA — un cursor que hace click sobre algo que no cambia.
//
// ESTA COMPUERTA EXISTE POR EL TIEMPO J DE LA PIEZA-I. Un cursor entraba desde abajo a la derecha,
// llegaba al conmutador, hundia su escala en el cuadro 700 —el gesto universal del click— y el
// conmutador NO PASABA NADA. Ni se movia la pastilla, ni cambiaba el rotulo activo, ni parpadeaba: el
// recurso era UN PNG plano con la pastilla ya dibujada sobre "Vista", asi que el estado final estaba
// horneado desde el primer cuadro en que aparecio.
//
// POR QUE NO LO VIO NINGUNA COMPUERTA. Porque las cinco que habia preguntan por PROPIEDADES DE LA
// IMAGEN —¿se lee?, ¿esta en cuadro?, ¿se ve?, ¿pisa a alguien?, ¿tiene ritmo?— y esto no es una
// propiedad de la imagen: cada cuadro suelto esta perfecto. Es una propiedad de la RELACION entre dos
// capas a lo largo del tiempo. Una interaccion mimada se ve bien cuadro a cuadro y miente en conjunto.
//
// Y LA CAUSA DE FONDO NO ERA LA COREOGRAFIA SINO EL RECURSO. Mientras el estado activo sea un pixel
// horneado, ninguna animacion puede cambiarlo — no habia arreglo posible sin partir el PNG en piezas.
// Por eso la compuerta apunta al recurso y no al movimiento del cursor.
//
// QUE PREGUNTA
//     ¿hay algun actor que haga el gesto de accionar sobre algo, y ese algo no cambie despues?
//
// COMO RECONOCE CADA PARTE
//   actor    una capa cuyo nombre es de la familia del puntero: cursor, puntero, mano, dedo, tap
//   accion   el hundimiento de su escala: un minimo local por debajo del 94% de lo que la rodea. Es el
//            gesto con el que se dibuja un click en TODAS las referencias del barrido
//   blanco   las capas cuya caja proyectada contiene la PUNTA del actor en ese cuadro. La punta no es
//            el centro: una flecha apunta con su esquina de arriba a la izquierda, y usar el centro
//            elegia la capa de al lado
//   cambio   en los 30 cuadros siguientes: el centro se mueve mas de 6 px, o la opacidad cambia mas de
//            20, o el area cambia mas del 4%. Cualquiera de las tres alcanza
//
// LO QUE NO PUEDE DECIR. Si el cambio es el CORRECTO. Una pastilla que se desliza para el lado que no
// es pasa esta compuerta. Contesta si paso algo, no si paso lo que correspondia.
//
// EXENCION, con nombre: comentario que contenga MIMADO en la capa del actor.
//
// USO
//   node tools/ae/gesto-check.mjs [comp.json]
//   node tools/ae/gesto-check.mjs [comp.json] --inyectar N   CONTROL NEGATIVO: congela la capa N

import { existsSync, readFileSync } from 'node:fs'
import { cinematica, rectanguloDe, propEn } from './cinematica.mjs'

const args = process.argv.slice(2)
const RUTA = args.find(a => !a.startsWith('--')) || 'C:/ae-probe/pieza-i.json'
const iIny = args.indexOf('--inyectar')
const INYECTAR = iIny >= 0 ? args[iIny + 1] : null

if (!existsSync(RUTA)) { console.error(`falta ${RUTA}`); process.exit(2) }
const doc = JSON.parse(readFileSync(RUTA, 'utf8'))

if (INYECTAR) {
  // UN CONTROL NEGATIVO QUE NO DISPARA NO PRUEBA NADA, Y EL PRIMERO NO DISPARO.
  //
  // La primera version congelaba UNA capa —la perilla del conmutador— y la compuerta seguia en verde,
  // con razon: el click todavia tenia consecuencia, porque el rotulo "Codigo" se seguia apagando. Para
  // simular una interaccion mimada hay que apagar TODAS las consecuencias posibles, no una. Por eso
  // acepta una lista. Es exactamente el error que esta compuerta busca, cometido en su propia prueba:
  // dar por probado un caso porque una parte de el se comporto.
  const cuales = INYECTAR.split(',').map(s => s.trim()).filter(Boolean)
  for (const n of cuales) {
    const v = doc.capas.find(c => c.nombre === n)
    if (!v) { console.error(`no existe la capa "${n}"`); process.exit(2) }
    // SE CONGELA EN EL VALOR DEL MEDIO DE SU VIDA, NO EN EL PRIMERO. Congelar en la primera clave deja
    // toda capa animada con `vive()` en opacidad CERO, o sea invisible — y entonces la compuerta se
    // pone roja por "el click cae sobre el vacio" en vez de por "nada cambio", que es la rama que hay
    // que probar. Un control negativo que dispara por el motivo equivocado tampoco prueba la rama.
    for (const k of ['posX', 'posY', 'posZ', 'posicion', 'escala', 'opacidad']) {
      const p = v.transformacion[k]
      if (p?.pistas) v.transformacion[k] = { estatico: p.pistas.map(t => t.tramos[Math.floor(t.tramos.length / 2)].v1) }
    }
  }
  console.log(`CONTROL NEGATIVO — congeladas: ${cuales.join(', ')}. La compuerta TIENE que ponerse roja.\n`)
}

const K = cinematica(doc)
const { ancho, alto, fps } = K
const CUADROS = Math.round(doc.comp.duracion * fps)

const ACTOR = /^(cursor|puntero|mano|dedo|tap|click)/i
const dibujables = doc.capas.filter(c => c.tipo !== 'camara' && rectanguloDe(c))
const actores = dibujables.filter(c => ACTOR.test(c.nombre))

if (!actores.length) {
  console.log('GESTO OK — la composicion no tiene punteros; no hay interaccion que verificar')
  process.exit(0)
}

const area = (q) => {
  let a = 0
  for (let i = 0; i < q.length; i++) {
    const j = (i + 1) % q.length
    a += q[i][0] * q[j][1] - q[j][0] * q[i][1]
  }
  return Math.abs(a) / 2
}
const centro = (q) => [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4,
                       (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4]
// LA PUNTA, no el centro: un 18% adentro desde la esquina de arriba a la izquierda del cuadrilatero.
const punta = (q) => [q[0][0] + (q[2][0] - q[0][0]) * 0.18, q[0][1] + (q[2][1] - q[0][1]) * 0.18]
const dentroDe = (p, q) => {
  let dentro = false
  for (let i = 0, j = 3; i < 4; j = i++) {
    const a = q[i], b = q[j]
    if ((a[1] > p[1]) !== (b[1] > p[1]) &&
        p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) dentro = !dentro
  }
  return dentro
}

// ---------------------------------------------------------------- el estado de todo, cuadro a cuadro
const estados = []
for (let f = 0; f < CUADROS; f++) {
  K.enCuadro(f)
  const t = f / fps
  const m = new Map()
  for (const c of dibujables) {
    if (!(t >= c.entra - 1e-9 && t < c.sale - 1e-9 && c.visible !== false)) continue
    const q = K.esquinas(c, t)
    if (!q) continue
    m.set(c.nombre, {
      c, q, area: area(q), centro: centro(q),
      op: propEn(c.transformacion, 'opacidad', 0, t, 100),
      esc: propEn(c.transformacion, 'escala', 0, t, 100),
    })
  }
  estados.push(m)
}

// ---------------------------------------------------------------- los clicks
const fallos = [], hallados = []
for (const a of actores) {
  if (/MIMADO/i.test(a.comentario || '')) {
    hallados.push(`${a.nombre}: declarado MIMADO, no se le exige consecuencia`)
    continue
  }
  const clicks = []
  for (let f = 3; f < CUADROS - 3; f++) {
    const v = estados[f].get(a.nombre), p = estados[f - 3]?.get(a.nombre), s = estados[f + 3]?.get(a.nombre)
    if (!v || !p || !s) continue
    // el hundimiento: minimo local de la escala, y por debajo del 94% de sus vecinos
    if (v.esc < p.esc * 0.94 && v.esc < s.esc * 0.94) {
      if (!clicks.length || f - clicks[clicks.length - 1] > 10) clicks.push(f)
    }
  }
  if (!clicks.length) {
    hallados.push(`${a.nombre}: no hace ningun gesto de accionar (su escala nunca se hunde)`)
    continue
  }
  for (const f of clicks) {
    const v = estados[f].get(a.nombre)
    const pt = punta(v.q)
    const blancos = [...estados[f].values()].filter(o =>
      o.c.nombre !== a.nombre && !ACTOR.test(o.c.nombre) && o.op > 40 &&
      o.area < ancho * alto * 0.9 && dentroDe(pt, o.q))
    if (!blancos.length) {
      fallos.push({ actor: a.nombre, f, motivo: 'el click cae sobre el vacio: no hay nada debajo de la punta' })
      continue
    }
    let cambio = null
    for (const b of blancos) {
      for (let g = f + 1; g <= Math.min(CUADROS - 1, f + 30); g++) {
        const d = estados[g].get(b.c.nombre)
        if (!d) continue
        const dCen = Math.hypot(d.centro[0] - b.centro[0], d.centro[1] - b.centro[1])
        const dOp = d.op - b.op
        const dAr = Math.abs(d.area - b.area) / Math.max(b.area, 1)
        // NO TODA DIFERENCIA ES UNA REACCION, y confundirlas dejaba pasar el caso que hay que cazar.
        //
        // Casi toda capa termina su vida desvaneciendose, asi que si un click ocurre cerca del final de
        // algo, ese desvanecimiento aparece como "cambio despues del click" y la compuerta da verde sin
        // que haya pasado nada. Lo encontro su propio control negativo: con las cuatro capas reactivas
        // congeladas, la compuerta seguia en verde porque la PISTA se estaba yendo igual.
        //
        // El movimiento y la escala se cuentan siempre —una capa no se desplaza sola al despedirse—.
        // Una BAJADA de opacidad solo cuenta si ocurre bien lejos del final de la capa; una SUBIDA
        // cuenta siempre, porque aparecer es lo contrario de irse.
        const seDespide = dOp < 0 && (b.c.sale * fps - g) <= 12
        const opCuenta = Math.abs(dOp) > 20 && !seDespide
        if (dCen > 6 || opCuenta || dAr > 0.04) {
          cambio = { que: b.c.nombre, g, como: dCen > 6 ? `se movio ${dCen.toFixed(0)} px` : opCuenta ? `cambio ${dOp.toFixed(0)} de opacidad` : `cambio ${(dAr * 100).toFixed(0)}% de area` }
          break
        }
      }
      if (cambio) break
    }
    if (cambio) hallados.push(`${a.nombre} acciona en f${f} sobre "${cambio.que}" -> ${cambio.como} en f${cambio.g}`)
    else fallos.push({ actor: a.nombre, f, motivo: `acciona sobre ${blancos.map(b => `"${b.c.nombre}"`).join(', ')} y ninguna cambia en los 30 cuadros siguientes` })
  }
}

console.log(`GESTO — "${doc.comp.nombre}" · ${actores.length} actor(es): ${actores.map(a => a.nombre).join(', ')}`)
console.log('\n  ACCIONES CON CONSECUENCIA')
console.log(hallados.length ? hallados.map(h => `    ${h}`).join('\n') : '    ninguna')
console.log('\n  ACCIONES MIMADAS (el gesto ocurre y no pasa nada)')
if (!fallos.length) console.log('    ninguna')
for (const x of fallos) console.log(`    f${x.f}  ${x.actor}: ${x.motivo}`)

console.log('')
console.log('='.repeat(72))
if (!fallos.length) console.log('GESTO OK — todo puntero que acciona algo produce un cambio')
else console.log(`GESTO NO PASA — ${fallos.length} accion(es) sin consecuencia`)
process.exit(fallos.length ? 1 : 0)

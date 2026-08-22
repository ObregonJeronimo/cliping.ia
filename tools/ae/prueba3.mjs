// PRUEBA 3 v2, LADO NUESTRO.
//
//   El movimiento autorado en After Effects y el reproducido desde sus keyframes, ¿son el mismo?
//
// LA v1 DABA CINCO VERDES Y TENIA UN FALSO POSITIVO DEMOSTRABLE. Cuatro de sus cinco casos tenian
// velocidad 0, con lo cual `y1 = velocidad*(dt/dv)*x1` colapsaba a `y1 = 0` sin importar dt; el unico
// caso con velocidad tenia dt = 1, el neutro de la multiplicacion. Medido: una conversion a la que le
// falte POR COMPLETO el factor dt da 0,0000 px de diferencia en los cinco casos de la v1, y 416 px con
// dt = 0,4. La prueba se veia fuerte —poder discriminante de 686 px contra la interpolacion lineal— y
// el termino mas fragil de la formula no se habia ejecutado nunca.
//
// LO QUE ESTA VERSION HACE DISTINTO
//
//   1. TRES COLUMNAS EN VEZ DE UNA. La sonda vuelca `valueAtTime` de cada cuadro, asi que se separan
//      dos preguntas que la v1 sumaba en un numero solo:
//        · prediccion contra valueAtTime  -> LA CONVERSION, aislada, sin pixeles de por medio
//        · valueAtTime contra el centroide -> EL INSTRUMENTO, aislado
//        · prediccion contra el centroide  -> el total, que es lo unico que la v1 tenia
//      Con un solo numero, un error de conversion y un sesgo del instrumento son indistinguibles. Y si
//      llegaran a compensarse, el resultado saldria MEJOR de lo que la conversion merece.
//
//   2. PRUEBA DE MUTACION en vez de "contra lineal". Nadie iba a implementar interpolacion lineal: es
//      un espantapajaros. Los errores que de verdad se cometen convirtiendo curvas de AE son otros, y
//      aca se implementan a proposito para comprobar que el conjunto de casos los MATA. Un mutante que
//      sobrevive es un agujero de la prueba, no una victoria.
//
//   3. SE NIEGA A CONVERTIR lo que no puede. Trayectoria curva (tangentes espaciales no nulas) y
//      tramos con tipos de interpolacion mezclados no se aproximan: se rechazan con motivo. Negarse es
//      barato; "salio parecido" no se puede señalar con el dedo.
//
//   4. VERIFICA EL INSTRUMENTO en cada cuadro: que la huella mida lo que tiene que medir, que no toque
//      el borde del cuadro, que el PNG tenga canal alfa. Un centroide contaminado da un error suave y
//      plausible — justo el tipo de numero que se le atribuye a la conversion.
//
//   5. EL VEREDICTO INCLUYE TODO. En la v1, `discrimina` se calculaba, se imprimia y NO entraba en el
//      veredicto: los cinco casos podian decir NO DISCRIMINA y el programa imprimia "PRUEBA 3 OK" y
//      salia con 0. Lo mismo los cuadros vacios. Es el mismo defecto que CLAUDE.md ya documenta dos
//      veces: la salida dice una cosa y el codigo de salida dice otra.
//
// USO
//   node tools/ae/prueba3.mjs --ae     construye en AE y despues mide
//   node tools/ae/prueba3.mjs          mide lo que ya esta en disco

import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { leerPNG, medirHuella, esperarPNGs } from './png.mjs'
import { aeACubicBezier, evaluar } from './curvas.mjs'

const DIR = 'C:/ae-probe/p3'
const SALIDA = join(DIR, 'salida')
const AE = 'C:/Program Files/Adobe/Adobe After Effects 2026/Support Files/AfterFX.exe'
const SONDA = new URL('./sondas/prueba3.jsx', import.meta.url).pathname.replace(/^\//, '').replace(/\//g, '\\')

const UMBRAL_PX = 1.0          // criterio PERCEPTUAL: por encima de esto se veria
const TOLERANCIA_HUELLA = 0.5  // cuanto puede apartarse el lado medido del lado real

// ---------------------------------------------------------------- lanzar AE
//
// EL BUZON LO VACIA EL QUE LLAMA, ANTES DE LLAMAR. No lo puede vaciar el que contesta, porque cuando
// hay que vaciarlo el que contesta todavia no existe. Sale de dos carreras que mordieron seguidas: leer
// el centinela de la corrida anterior, y dar por bueno un PNG que era el archivo viejo entero.
// La orquestacion, el vaciado del buzon y la defensa contra carteles modales viven en llamar.mjs, que
// es el UNICO camino por el que se le habla a AE. Ver ahi el por que de cada capa.
if (process.argv.includes('--ae')) {
  const { llamarAE } = await import('./llamar.mjs')
  const r = await llamarAE(SONDA, { buzon: join(DIR, 'datos.txt'), limpiar: [DIR], esperaMs: 300000 })
  console.log(`AE: lanzador ${r.lanzador} ms · volcado completo a los ${r.ms} ms`)
  if (!r.ok) {
    console.error(`AE no completo: ${r.motivo}`)
    if (r.texto) console.error(r.texto.trimEnd())
    process.exit(2)
  }
}

// ---------------------------------------------------------------- leer el volcado
function leerVolcado() {
  const ruta = join(DIR, 'datos.txt')
  if (!existsSync(ruta)) {
    console.error(`No existe ${ruta}. Corre: node tools/ae/prueba3.mjs --ae`)
    process.exit(2)
  }
  const lineas = readFileSync(ruta, 'utf8').split('\n').map(l => l.trim()).filter(Boolean)
  if (!lineas.includes('--- fin ---')) {
    console.error('El volcado no tiene el centinela: la sonda murio a mitad de camino.')
    process.exit(2)
  }

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
      case 'SEPARADAS': {
        const c = casos.get(f[1]); if (c) c.separadas = f[2] === 'true'
        break
      }
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
        const c = casos.get(f[1]); if (!c) break
        const k = c.keys.find(q => q.indice === +f[3]); if (!k) break
        k.tipoEntrada = +f[4]; k.tipoSalida = +f[5]
        k.roving = f[6] === 'SI'; k.continuo = f[7] === 'SI'; k.autoTemporal = f[8] === 'SI'
        break
      }
      case 'ESPACIAL': {
        const c = casos.get(f[1]); if (!c) break
        const k = c.keys.find(q => q.indice === +f[3]); if (!k) break
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

// ---------------------------------------------------------------- predecir, o negarse
//
// LA PARTE QUE DECIDE SI EL FORMATO DEL MCP ES HONESTO.
// Convertir lo que no se puede convertir no falla ruidosamente: da algo parecido. Por eso esto devuelve
// `{ rechaza: motivo }` en vez de un numero cuando el tramo esta fuera de lo que la conversion cubre.
// `t >= ` Y NO `t > `, y no es un detalle: es un defecto real que esta prueba encontro.
// Con `>`, un cuadro que cae EXACTAMENTE sobre un keyframe se queda en el tramo anterior. Si ese tramo
// era HOLD, devuelve el valor viejo: 500 px de error en el caso I, en un solo cuadro. En produccion
// seria un salto de un cuadro justo en el corte — el defecto tipico que se ve y no se sabe de donde
// viene. Lo caza la prueba porque los keyframes caen en tiempos de cuadro exactos.
function tramoDe(caso, t) {
  const keys = caso.keys
  let j = 0
  while (j < keys.length - 2 && t >= keys[j + 1].t) j++
  return [keys[j], keys[j + 1]]
}

// Un eje por caso: casi todos miden un solo numero. `eje` dice cual componente del valor mirar.
// SE RECORTA AL LARGO DEL VALOR: una propiedad con dimensiones separadas guarda un ESCALAR, asi que
// pedirle el componente 1 devuelve undefined — y undefined se propaga hasta convertirse en un cero que
// parece un acierto perfecto. Le paso al caso G: informaba 0.0000 px sin haber medido nada.
const COMPONENTE = { x: 0, y: 1, xy: 0 }
const ejeDe = (caso, pedido) => Math.min(pedido ?? COMPONENTE[caso.eje] ?? 0, caso.keys[0].valor.length - 1)

function predecir(caso, t, enums, mutante = null, comp = null) {
  const keys = caso.keys
  const c = ejeDe(caso, comp)
  if (t <= keys[0].t) return { valor: keys[0].valor[c] }
  const ultimo = keys[keys.length - 1]
  if (t >= ultimo.t) return { valor: ultimo.valor[c] }

  const [a, b] = tramoDe(caso, t)

  // TANGENTES ESPACIALES NO NULAS => TRAYECTORIA CURVA => NO SE CONVIERTE.
  // El ease temporal gobierna el avance por largo de arco sobre la curva, no cada eje por separado.
  const curva = (k) => (k.tangenteEntrada || []).some(v => Math.abs(v) > 1e-6) ||
                       (k.tangenteSalida || []).some(v => Math.abs(v) > 1e-6)
  if (curva(a) || curva(b)) {
    return { rechaza: 'trayectoria curva: tangentes espaciales no nulas' }
  }

  // TIPO DE INTERPOLACION DEL TRAMO. Lo gobierna la SALIDA del keyframe izquierdo.
  if (a.tipoSalida === enums.HOLD) return { valor: a.valor[c], tipo: 'hold' }
  const dt = b.t - a.t
  const u = (t - a.t) / dt
  const linealIzq = a.tipoSalida === enums.LINEAL
  const linealDer = b.tipoEntrada === enums.LINEAL
  if (linealIzq && linealDer) return { valor: a.valor[c] + (b.valor[c] - a.valor[c]) * u, tipo: 'lineal' }
  if (linealIzq !== linealDer) {
    return { rechaza: `tramo con tipos mezclados (salida ${a.tipoSalida}, entrada ${b.tipoEntrada})` }
  }

  // dv ES CON SIGNO. Math.hypot nunca es negativo: usarlo tal cual haria que un movimiento hacia la
  // izquierda con velocidad no nula tuviera la manija para el lado contrario, y ningun caso que vaya
  // de izquierda a derecha lo notaria.
  const dRecta = b.valor[c] - a.valor[c]
  const dv = dRecta

  // el ease del eje: una sola entrada para posicion (gobierna el arco), una por componente si no
  const iSal = a.salida.length > 1 ? Math.min(c, a.salida.length - 1) : 0
  const iEnt = b.entrada.length > 1 ? Math.min(c, b.entrada.length - 1) : 0
  let salida = a.salida[iSal], entrada = b.entrada[iEnt]

  let bez
  if (mutante === 'intercambiado') bez = aeACubicBezier(entrada, salida, dt, dv)
  else if (mutante === 'sin-dt') {
    const x1 = Math.min(100, Math.max(0.1, salida.influencia)) / 100
    const i2 = Math.min(100, Math.max(0.1, entrada.influencia))
    bez = dv ? { x1, y1: salida.velocidad * (1 / dv) * x1, x2: 1 - i2 / 100, y2: 1 - entrada.velocidad * (1 / dv) * (i2 / 100) }
             : { x1, y1: 0, x2: 1 - i2 / 100, y2: 1 }
  } else if (mutante === 'sin-complemento') {
    const b0 = aeACubicBezier(salida, entrada, dt, dv)
    bez = { ...b0, x2: Math.min(100, Math.max(0.1, entrada.influencia)) / 100 }
  } else if (mutante === 'influencia-cruda') {
    bez = aeACubicBezier({ ...salida, influencia: salida.influencia / 100 },
                         { ...entrada, influencia: entrada.influencia / 100 }, dt, dv)
  } else {
    bez = aeACubicBezier(salida, entrada, dt, dv)
  }

  return { valor: a.valor[c] + (b.valor[c] - a.valor[c]) * evaluar(bez, u), tipo: 'bezier', bez }
}

// ---------------------------------------------------------------- medir contra el pixel
function analizar(caso, mundo, enums) {
  const filas = [], vacias = [], faltantes = [], invalidas = []
  for (const c of caso.cuadros) {
    const ruta = join(DIR, c.archivo)
    if (!existsSync(ruta)) { faltantes.push(c.archivo); continue }
    const img = leerPNG(ruta)
    if (img.ancho !== mundo.ancho || img.alto !== mundo.alto) {
      throw new Error(`${c.archivo} mide ${img.ancho}x${img.alto} y la comp es ${mundo.ancho}x${mundo.alto}. ` +
        `Casi seguro resolutionFactor: AE guarda a la resolucion del visor.`)
    }
    // EL FONDO TIENE QUE SER TRANSPARENTE. Sin alfa, `pesos` cae a luminancia y el fondo entero suma
    // masa: el area se va por un factor ~4,7 y el caso de escala rompe solo, con un numero plausible.
    if (img.canales !== 4) { invalidas.push(`${c.archivo}: sin canal alfa (${img.canales} canales)`); continue }

    const h = medirHuella(img)
    if (h.vacia) { vacias.push({ k: c.k }); continue }
    if (h.tocaBorde) { invalidas.push(`f${c.k}: la huella toca el borde del cuadro, el centroide no vale`); continue }

    const valorAE = caso.valores.get(c.k)
    // el caso del piso no tiene keyframes: el solido esta QUIETO y lo que se mide es el instrumento
    if (caso.magnitud === 'piso') {
      filas.push({ k: c.k, t: c.t, medido: h.x, teorico: valorAE[0], deAE: valorAE[0], rechaza: null, tipo: 'quieto' })
      continue
    }
    const comp = ejeDe(caso, null)
    const compAE = Math.min(comp, (valorAE || [0]).length - 1)
    const esperado = predecir(caso, c.t, enums)

    let medido, deAE, teorico
    if (caso.magnitud === 'escala') {
      // ancho y alto por separado: es lo que permite ver una curva distinta por eje
      medido = { ancho: h.anchoHuella, alto: h.altoHuella }
      const pX = predecir(caso, c.t, enums, null, 0)
      const pY = predecir(caso, c.t, enums, null, 1)
      teorico = { ancho: mundo.lado * pX.valor / 100, alto: mundo.lado * pY.valor / 100 }
      deAE = valorAE ? { ancho: mundo.lado * valorAE[0] / 100, alto: mundo.lado * valorAE[1] / 100 } : null
    } else {
      medido = caso.eje === 'y' ? h.y : h.x
      teorico = esperado.rechaza ? null : esperado.valor
      deAE = valorAE ? valorAE[compAE] : null
      if (!esperado.rechaza && (teorico === undefined || deAE === undefined)) {
        invalidas.push(`f${c.k}: no hay valor para comparar (componente ${comp} de un valor de ${(valorAE || []).length})`)
        continue
      }
    }

    // EL INSTRUMENTO SE VERIFICA EN CADA CUADRO. La huella tiene que ser el solido que puse: si hay una
    // capa de mas, si el PNG salio a media resolucion o si el fondo no es transparente, el centroide se
    // corre sin romper nada y el error resultante se le atribuye a la conversion.
    if (caso.magnitud !== 'escala' && Math.abs(h.lado - mundo.lado) > TOLERANCIA_HUELLA) {
      invalidas.push(`f${c.k}: la huella mide ${h.lado.toFixed(2)} px de lado y el solido es ${mundo.lado}`)
      continue
    }

    filas.push({
      k: c.k, t: c.t, medido, teorico, deAE, rechaza: esperado.rechaza || null, tipo: esperado.tipo,
      huella: { y: h.y, lado: h.lado, ancho: h.anchoHuella, alto: h.altoHuella },
    })
  }
  return { filas, vacias, faltantes, invalidas }
}

const dif = (a, b) => (a === null || b === null || a === undefined || b === undefined) ? null
  : (typeof a === 'object' ? Math.max(Math.abs(a.ancho - b.ancho), Math.abs(a.alto - b.alto)) : a - b)

// ---------------------------------------------------------------- informe
const { mundo, casos, notas, version, enums } = leerVolcado()
console.log(`PRUEBA 3 v2 — AFTER EFFECTS CONTRA NUESTRA CONVERSION DE CURVAS`)
console.log(`${version} · comp ${mundo.ancho}x${mundo.alto} @ ${mundo.fps}fps · solido de ${mundo.lado}px · ${casos.length} casos`)
console.log(`enums de AE: LINEAL=${enums.LINEAL} BEZIER=${enums.BEZIER} HOLD=${enums.HOLD}\n`)

let rojo = false
const problemas = []

// LAS NOTAS DE LA SONDA SE LEEN. En la v1 se descartaban en silencio: si `dimensionsSeparated` fallaba,
// el caso del sobrepaso pasaba a ser una posicion 2D donde el sobrepaso es geometricamente imposible,
// daba error chico, decia OK, y uno creia haber probado el sobrepaso.
if (notas.length) {
  console.log('LA SONDA DEJO NOTAS (algo no salio como se pidio):')
  for (const n of notas) console.log(`  ${n}`)
  console.log('')
  problemas.push(`la sonda dejo ${notas.length} nota(s)`)
  rojo = true
}
for (const c of casos) {
  if (c.separadas === false) { problemas.push(`${c.id}: NO se pudieron separar dimensiones`); rojo = true }
  if (c.expresion) { problemas.push(`${c.id}: la propiedad tiene una EXPRESION activa`); rojo = true }
  if (c.pedidos !== null && c.pedidos !== c.cuadros.length) {
    problemas.push(`${c.id}: pidio ${c.pedidos} cuadros y volco ${c.cuadros.length}`); rojo = true
  }
}

const todas = casos.flatMap(c => c.cuadros.map(q => join(DIR, q.archivo)))
const espera = await esperarPNGs(todas, 180000)
if (espera.faltan.length) {
  console.error(`Tras ${(espera.ms / 1000).toFixed(1)} s faltan ${espera.faltan.length} de ${todas.length} PNG.`)
  console.error(`  ${espera.faltan.slice(0, 5).map(r => r.split(/[\\/]/).slice(-2).join('/')).join(', ')}`)
  process.exit(1)
}
console.log(`${todas.length} PNG completos (espera ${(espera.ms / 1000).toFixed(1)} s)\n`)

const resultados = []
for (const caso of casos) {
  const r = analizar(caso, mundo, enums)
  for (const x of r.faltantes) { problemas.push(`${caso.id}: falta el PNG ${x}`); rojo = true }
  for (const x of r.vacias) { problemas.push(`${caso.id}: cuadro f${x.k} sin nada pintado`); rojo = true }
  for (const x of r.invalidas) { problemas.push(`${caso.id}: ${x}`); rojo = true }
  resultados.push({ caso, ...r })
}

// ---------------------------------------------------------------- el piso de ruido
const piso = resultados.find(r => r.caso.magnitud === 'piso')
let PISO = null
if (piso && piso.filas.length) {
  const errs = piso.filas.map(f => Math.abs(dif(f.medido, f.deAE)))
  PISO = Math.max(...errs)
  console.log(`PISO DE RUIDO DEL INSTRUMENTO (el solido quieto en posiciones fraccionarias)`)
  for (const f of piso.filas) {
    console.log(`  x pedida ${f.deAE.toFixed(2)}  ->  centroide ${f.medido.toFixed(4)}  ` +
      `error ${(f.medido - f.deAE >= 0 ? '+' : '')}${(f.medido - f.deAE).toFixed(4)} px`)
  }
  console.log(`  piso = ${PISO.toFixed(4)} px. AE ${PISO < 0.02 ? 'RASTERIZA EN SUBPIXEL' : 'parece cuantizar'}: ` +
    `${PISO < 0.02 ? 'la medicion subpixel es real y el umbral significa lo que creemos.' : 'ojo, el error podria ser redondeo de AE.'}\n`)
}

// ---------------------------------------------------------------- tabla principal
console.log('caso   conversion    instrumento   total       tipo        veredicto')
console.log('       (pred vs AE)  (AE vs pixel) (pred vs px)')
console.log('-'.repeat(84))

for (const r of resultados) {
  const { caso, filas } = r
  if (caso.magnitud === 'piso') continue

  const rechazados = filas.filter(f => f.rechaza)
  const buenas = filas.filter(f => !f.rechaza)

  // ---- el caso frontera: se ESPERA el rechazo, y el exito es rechazar
  if (caso.espera === 'frontera') {
    const ok = rechazados.length > 0
    if (!ok) { problemas.push(`${caso.id}: se esperaba que la conversion se NEGARA y no lo hizo`); rojo = true }
    console.log(`${caso.id.padEnd(7)}${'—'.padEnd(14)}${'—'.padEnd(14)}${'—'.padEnd(12)}${'frontera'.padEnd(12)}` +
      (ok ? `SE NIEGA (bien): ${rechazados[0].rechaza}` : 'NO SE NEGO — la convirtio igual'))
    continue
  }

  // FILTRAR ANTES DE Math.abs, Y NO DESPUES. `Math.abs(null)` vale CERO: con el orden al reves, "no
  // hay dato para comparar" se convierte en "error perfecto de 0,0000 px". El caso G informo 0.0000 OK
  // sin haber medido una sola cosa. Es la misma familia que el contador de FAIL de CLAUDE.md.
  const columna = (fn) => buenas.map(fn).filter(v => v !== null && v !== undefined && !Number.isNaN(v)).map(Math.abs)
  const eC = columna(f => dif(f.teorico, f.deAE))
  const eI = columna(f => dif(f.deAE, f.medido))
  const eT = columna(f => dif(f.teorico, f.medido))
  if (eT.length < buenas.length) {
    problemas.push(`${caso.id}: ${buenas.length - eT.length} cuadro(s) sin dato comparable`); rojo = true
  }
  const max = (a) => a.length ? Math.max(...a) : NaN
  const tipos = [...new Set(buenas.map(f => f.tipo).filter(Boolean))].join('+')

  if (rechazados.length) { problemas.push(`${caso.id}: rechazo ${rechazados.length} tramo(s): ${rechazados[0].rechaza}`); rojo = true }
  const pasa = max(eC) < UMBRAL_PX && max(eT) < UMBRAL_PX
  if (!pasa) rojo = true

  console.log(`${caso.id.padEnd(7)}${(max(eC).toFixed(4) + ' px').padEnd(14)}${(max(eI).toFixed(4) + ' px').padEnd(14)}` +
    `${(max(eT).toFixed(3) + ' px').padEnd(12)}${(tipos || '?').padEnd(12)}${pasa ? 'OK' : 'FALLA'}`)
  r.eC = max(eC); r.eT = max(eT)
}

// ---------------------------------------------------------------- prueba de mutacion
//
// EL CONTROL NEGATIVO DE VERDAD. "Contra lineal" era un espantapajaros: nadie iba a implementar
// interpolacion lineal. Estos cuatro son los errores que se cometen de verdad al convertir curvas de
// AE. Si un mutante sobrevive a los diez casos, la prueba NO PUEDE detectarlo — y eso es un agujero,
// no una victoria.
const MUTANTES = [
  ['intercambiado',    'usar el ease de entrada donde va el de salida'],
  ['sin-dt',           'olvidar el factor dt en la normalizacion de velocidad'],
  ['sin-complemento',  'x2 = i2/100 en vez de 1 - i2/100 (manija derecha al reves)'],
  ['influencia-cruda', 'tratar la influencia como 0-1 en vez de 0-100'],
]
console.log('\nPRUEBA DE MUTACION — cuanto error habria dado cada conversion mal hecha (px)')
console.log(`${'mutante'.padEnd(18)}${resultados.filter(r => r.caso.espera === 'ok').map(r => r.caso.id.slice(3).padStart(9)).join('')}   lo mata?`)
console.log('-'.repeat(84))
let mutantesVivos = []
const mutaciones = []
for (const [mut, desc] of MUTANTES) {
  const cols = []
  let mayor = 0
  for (const r of resultados) {
    if (r.caso.espera !== 'ok') continue
    let peor = 0
    for (const f of r.filas) {
      if (f.rechaza) continue
      const p = predecir(r.caso, f.t, enums, mut)
      if (p.rechaza) continue
      const d = r.caso.magnitud === 'escala'
        ? Math.abs(mundo.lado * p.valor / 100 - f.teorico.ancho)
        : Math.abs(p.valor - f.teorico)
      if (d > peor) peor = d
    }
    mayor = Math.max(mayor, peor)
    cols.push(peor.toFixed(1).padStart(9))
  }
  const muere = mayor > 5 * UMBRAL_PX
  mutaciones.push({ nombre: mut, desc, mayor })
  if (!muere) mutantesVivos.push(`${mut} (${desc})`)
  console.log(`${mut.padEnd(18)}${cols.join('')}   ${muere ? 'SI' : 'NO — SOBREVIVE'}`)
}
if (mutantesVivos.length) {
  console.log('\nMUTANTES QUE SOBREVIVEN — la prueba no los puede detectar:')
  for (const m of mutantesVivos) console.log(`  ${m}`)
  problemas.push(`${mutantesVivos.length} mutante(s) sobreviven`)
  rojo = true
}

// ---------------------------------------------------------------- detalle
console.log('\ndetalle del peor cuadro de cada caso (columna total):')
for (const r of resultados) {
  const { caso } = r
  if (caso.espera !== 'ok' || !r.filas.length) continue
  const buenas = r.filas.filter(f => !f.rechaza)
  if (!buenas.length) continue
  const p = buenas.reduce((a, b) => Math.abs(dif(b.teorico, b.medido)) > Math.abs(dif(a.teorico, a.medido)) ? b : a)
  const fmt = (v) => v === null || v === undefined ? '—'
    : (typeof v === 'object' ? `${v.ancho.toFixed(2)}x${v.alto.toFixed(2)}` : v.toFixed(3))
  console.log(`  ${caso.id}  f${String(p.k).padStart(2)} t=${p.t.toFixed(4)}  ` +
    `AE dice ${fmt(p.deAE)}  predijimos ${fmt(p.teorico)}  midio ${fmt(p.medido)}  ` +
    `error ${Math.abs(dif(p.teorico, p.medido)).toFixed(4)} px`)
}

// ---------------------------------------------------------------- veredicto
console.log('\n' + '='.repeat(84))
if (problemas.length) {
  console.log(`NO ES VERDE — ${problemas.length} problema(s):`)
  for (const p of problemas) console.log(`  · ${p}`)
}
if (PISO !== null) {
  const peorTotal = Math.max(...resultados.filter(r => r.eT !== undefined).map(r => r.eT))
  console.log(`\npiso del instrumento ${PISO.toFixed(4)} px · peor error total ${peorTotal.toFixed(4)} px ` +
    `(${(peorTotal / Math.max(PISO, 1e-9)).toFixed(1)}x el piso)`)
  console.log(`umbral perceptual ${UMBRAL_PX} px · umbral de regresion sugerido ${(5 * PISO).toFixed(3)} px`)
}
// ---------------------------------------------------------------- la figura que SI juzga
//
// La v1 dibujaba los cuadros de AE escalados a 1:6 con nuestra prediccion encima. Se veia bien y era
// INUTIL como juez: un error de 1 px de composicion son 0,17 px de lienzo, o sea invisible por diseño.
// Servia para detectar un desastre grosero y nada mas, y es justo el tipo de figura que despues se cita
// como "lo verifique visualmente".
//
// Esta muestra lo que la prueba mide: el error por cuadro en escala logaritmica, contra el piso del
// instrumento y contra lo que habrian dado las conversiones mal hechas. Los cinco ordenes de magnitud
// entre una banda y la otra son el argumento entero, y aca se ven de un vistazo.
async function componer(resultados, mutaciones, piso) {
  const { createCanvas } = await import('@napi-rs/canvas')
  const W = 1500, H = 860, IZQ = 92, DER = 250, ARR = 74, ABA = 62
  const cv = createCanvas(W, H)
  const g = cv.getContext('2d')
  g.fillStyle = '#0e0e12'; g.fillRect(0, 0, W, H)

  const LO = 1e-5, HI = 1e4
  const ejeY = (v) => ARR + (H - ARR - ABA) * (1 - (Math.log10(Math.max(v, LO)) - Math.log10(LO)) / (Math.log10(HI) - Math.log10(LO)))
  const ejeX = (k) => IZQ + (W - IZQ - DER) * (k / 30)

  g.fillStyle = '#f0f0f4'; g.font = 'bold 19px sans-serif'
  g.fillText('PRUEBA 3 — error de la conversion, cuadro por cuadro', IZQ, 32)
  g.fillStyle = '#8b90a0'; g.font = '13px sans-serif'
  g.fillText('escala logaritmica. Abajo: lo que da nuestra conversion. Arriba: lo que darian cuatro conversiones mal hechas.', IZQ, 54)

  // rejilla por decada
  g.font = '11px monospace'
  for (let e = -5; e <= 4; e++) {
    const y = ejeY(Math.pow(10, e))
    g.strokeStyle = '#1e1e26'; g.lineWidth = 1
    g.beginPath(); g.moveTo(IZQ, y); g.lineTo(W - DER, y); g.stroke()
    g.fillStyle = '#6a6f7e'
    g.fillText(e < 0 ? `1e${e}` : Math.pow(10, e).toString(), 12, y + 4)
  }
  g.fillStyle = '#6a6f7e'; g.font = '12px sans-serif'
  g.save(); g.translate(18, ARR + 340); g.rotate(-Math.PI / 2)
  g.fillText('error en pixeles', 0, 0); g.restore()
  g.font = '11px monospace'

  // bandas de referencia
  const banda = (v, txt, col) => {
    const y = ejeY(v)
    g.strokeStyle = col; g.lineWidth = 1.5; g.setLineDash([7, 5])
    g.beginPath(); g.moveTo(IZQ, y); g.lineTo(W - DER, y); g.stroke(); g.setLineDash([])
    g.fillStyle = col; g.font = 'bold 11px sans-serif'
    g.fillText(txt, W - DER + 8, y + 4)
  }
  if (piso !== null) banda(piso, `piso del instrumento  ${piso.toFixed(4)} px`, '#5f6c7a')
  if (piso !== null) banda(5 * piso, `umbral de regresion  ${(5 * piso).toFixed(3)} px`, '#c9a227')
  banda(UMBRAL_PX, 'umbral perceptual  1 px', '#e05a5a')

  const COLORES = ['#4fc3f7', '#81c784', '#ffb74d', '#ba68c8', '#f06292', '#4db6ac', '#9575cd', '#aed581']
  let ci = 0
  const leyenda = []
  for (const r of resultados) {
    if (r.caso.espera !== 'ok' || !r.filas.length) continue
    const col = COLORES[ci % COLORES.length]; ci++
    g.strokeStyle = col; g.lineWidth = 2; g.beginPath()
    let primero = true
    for (const f of r.filas) {
      if (f.rechaza) continue
      const d = dif(f.teorico, f.deAE)
      if (d === null || Number.isNaN(d)) continue
      const y = ejeY(Math.abs(d))
      if (primero) { g.moveTo(ejeX(f.k), y); primero = false } else g.lineTo(ejeX(f.k), y)
    }
    g.stroke()
    leyenda.push([r.caso.id, col, r.caso.desc])
  }

  // LOS MUTANTES, arriba. Sus errores caen todos cerca de 1e3, asi que las etiquetas se pisaban:
  // se separan un minimo de 15 px y se tira una guia hasta el punto real, para no mover el dato.
  const ordenados = [...mutaciones].sort((a, b) => b.mayor - a.mayor)
  let ultimaY = -Infinity
  g.font = '11px sans-serif'
  for (const m of ordenados) {
    const y = ejeY(m.mayor)
    const yTexto = Math.max(y, ultimaY + 15)
    ultimaY = yTexto
    g.fillStyle = 'rgba(224,90,90,.9)'
    g.beginPath(); g.arc(W - DER - 14, y, 4.5, 0, 7); g.fill()
    if (Math.abs(yTexto - y) > 1) {
      g.strokeStyle = 'rgba(224,90,90,.35)'; g.lineWidth = 1
      g.beginPath(); g.moveTo(W - DER - 10, y); g.lineTo(W - DER + 5, yTexto - 4); g.stroke()
    }
    g.fillStyle = '#e88'
    g.fillText(`${m.nombre}  ${m.mayor.toFixed(0)} px`, W - DER + 8, yTexto)
  }
  g.fillStyle = '#8b90a0'; g.font = 'italic 11px sans-serif'
  g.fillText('conversiones mal hechas a proposito', W - DER + 8, ejeY(1e4) + 14)

  // eje x
  g.strokeStyle = '#2a2a34'; g.lineWidth = 1
  g.beginPath(); g.moveTo(IZQ, H - ABA); g.lineTo(W - DER, H - ABA); g.stroke()
  g.fillStyle = '#6a6f7e'; g.font = '11px monospace'
  for (let k = 0; k <= 30; k += 5) g.fillText(String(k), ejeX(k) - 5, H - ABA + 18)
  g.fillText('cuadro', (IZQ + W - DER) / 2 - 18, H - ABA + 36)

  // leyenda
  g.font = '12px sans-serif'
  let ly = H - 30
  let lx = IZQ
  for (const [id, col, desc] of leyenda) {
    g.fillStyle = col; g.fillRect(lx, ly - 8, 10, 3)
    g.fillStyle = '#b8bdc9'; g.fillText(`${id.slice(3)} ${desc.slice(0, 26)}`, lx + 16, ly - 2)
    lx += 175
    if (lx > W - DER - 160) { lx = IZQ; ly += 17 }
  }

  if (!existsSync(SALIDA)) mkdirSync(SALIDA, { recursive: true })
  const png = join(SALIDA, 'prueba3.png')
  writeFileSync(png, cv.toBuffer('image/png'))
  return png
}

const figura = await componer(resultados, mutaciones, PISO)
console.log(`\nfigura: ${figura}`)

console.log(rojo
  ? '\nPRUEBA 3 NO PASA. Mira la lista de arriba: un caso que no prueba no es un caso que pasa.'
  : '\nPRUEBA 3 OK — la conversion temporal de After Effects viaja, y los cuatro mutantes mueren.')
process.exit(rojo ? 1 : 0)

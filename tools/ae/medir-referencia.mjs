// EL BARRIDO DE REFERENCIAS — medir varios videos del mismo genero para separar la REGLA del ESTILO
// de la DECISION de un aviso.
//
// POR QUE EXISTE. Medi UNA referencia a 30 fps y saque de ahi la forma del titular (entra a 3x, se
// queda 21 cuadros, sale a 8x). Con una sola muestra no hay forma de saber si eso es la gramatica del
// genero o la mania de ese aviso: las dos hipotesis dan exactamente el mismo dato.
//
// Es la misma leccion que este repo ya tiene escrita sobre `retrato.py` en el CLAUDE.md — "calibrar
// sobre una pagina no es calibrar; una receta que no varia no esta midiendo" — un nivel mas arriba.
// Ahi el barrido son doce capturas; aca son siete videos.
//
// TODO SE INFORMA EN SEGUNDOS, NO EN CUADROS, y no es cosmetico: las siete referencias corren a
// cadencias distintas (23,976 · 24 · 29,97 · 30 · 60). "Veintiun cuadros de quietud" no significa lo
// mismo en un video de 24 que en uno de 60, y compararlos como numeros seria inventar una diferencia
// del 150% que no existe.
//
// QUE MIDE
//   CAMBIOS       saltos grandes de un cuadro al siguiente -> el pulso visual y cuanto dura cada tramo
//                 (NO son "cortes": ver la nota de abajo, la diferencia entre cuadros no los distingue)
//   ESCALONADO    cuadros repetidos -> si la pieza esta animada "a unos" o "a doses" (el look sketch)
//   ENERGIA       diferencia media por cuadro -> el pulso, el factor de cresta y los silencios
//   TITULARES     tramos de poca tinta compacta -> la curva de tamano de un rotulo, entrada y salida
//
// QUE NO MIDE, dicho para que nadie confie de mas: no lee texto, no reconoce objetos y no sabe de
// color — trabaja sobre luminancia. Dice DONDE mirar y con que forma se mueve; que dice el cartel lo
// tiene que mirar una persona.
//
// EL FONDO NO SE SUPONE. Apple y Figma son claros, Gemini y Linear oscuros: la "tinta" se define como
// lo que se aparta de la MEDIANA del cuadro, no como lo que es brillante. Un umbral de brillo fijo
// mide el titular en un video y mide el fondo en el otro.
//
// USO
//   ffmpeg -i ref.mp4 -vf "scale=320:-1,format=gray" C:/ae-probe/refs/f/apple/n%05d.png
//   node tools/ae/medir-referencia.mjs C:/ae-probe/refs/f/apple 23.976 [--json salida.json]

import { readdirSync, existsSync, writeFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import { leerPNG } from './png.mjs'

const DIR = process.argv[2]
const FPS = +(process.argv[3] || 30)
if (!DIR || !existsSync(DIR)) { console.error('uso: node tools/ae/medir-referencia.mjs <carpeta> <fps>'); process.exit(2) }

const archivos = readdirSync(DIR).filter(f => /\.png$/i.test(f)).sort()
if (!archivos.length) { console.error(`no hay cuadros en ${DIR}`); process.exit(2) }

const seg = (f) => f / FPS

// ---------------------------------------------------------------- la pasada
// UNA SOLA PASADA Y MEMORIA CONSTANTE: se guarda solo el cuadro anterior. Leer catorce mil imagenes
// acumulandolas es como se cuelga esta maquina — hay un evento 2004 de Windows con node.exe pidiendo
// 42 GB por exactamente esta clase de bucle.
let previo = null
const dif = [], tinta = [], altoTinta = [], anchoTinta = []

for (let i = 0; i < archivos.length; i++) {
  const im = leerPNG(join(DIR, archivos[i]))
  const n = im.ancho * im.alto
  const canal = im.datos.length / n            // gris=1 no existe en mi lector: siempre expande a RGBA
  const L = new Uint8Array(n)
  for (let p = 0; p < n; p++) L[p] = im.datos[p * canal]

  // diferencia media contra el cuadro anterior, normalizada
  if (previo) {
    let s = 0
    for (let p = 0; p < n; p++) s += Math.abs(L[p] - previo[p])
    dif.push(s / n / 255)
  } else dif.push(0)

  // LA TINTA SE DEFINE CONTRA LA MEDIANA DEL CUADRO, no contra un brillo fijo. Con histograma, que
  // para 8 bits son 256 cubetas y sale exacto sin ordenar.
  const h = new Uint32Array(256)
  for (let p = 0; p < n; p++) h[L[p]]++
  let acum = 0, mediana = 0
  for (let v = 0; v < 256; v++) { acum += h[v]; if (acum >= n / 2) { mediana = v; break } }

  let cuenta = 0, xMin = im.ancho, xMax = -1, yMin = im.alto, yMax = -1
  for (let y = 0; y < im.alto; y++) {
    for (let x = 0; x < im.ancho; x++) {
      if (Math.abs(L[y * im.ancho + x] - mediana) <= 60) continue
      cuenta++
      if (x < xMin) xMin = x
      if (x > xMax) xMax = x
      if (y < yMin) yMin = y
      if (y > yMax) yMax = y
    }
  }
  tinta.push(cuenta / n)
  altoTinta.push(yMax >= 0 ? (yMax - yMin) / im.alto : 0)
  anchoTinta.push(xMax >= 0 ? (xMax - xMin) / im.ancho : 0)
  previo = L
}

const N = dif.length
const orden = [...dif].sort((a, b) => a - b)
const med = orden[Math.floor(N / 2)]
const p = (q) => orden[Math.min(N - 1, Math.floor(N * q))]

// ---------------------------------------------------------------- CORTES
// EL PISO FIJO ERA EL DEFECTO, y es la clase de error que este repo colecciona: una guarda escrita
// para un caso que ciega en otro.
//
// La primera version usaba `max(0,10, mediana*8)`. El 0,10 estaba para no marcar como corte cualquier
// movimiento fuerte... y en una pieza que es 85% negro puro un CORTE DURO sólo mueve el 3-8% de la
// luminancia del cuadro. Medido sobre linear: sus ocho cortes reales tienen picos de 0,014 a 0,082 —
// los ocho por debajo del piso. La herramienta informó "0 cortes en 55 s" y hasta lo dijo con
// autoridad: "plano mediano 54,85 s". Era ceguera, no un hallazgo.
//
// Ahora el umbral es LOCAL —seis veces la mediana de su propio vecindario de dos segundos— y el piso
// absoluto baja a 0,008, que es ruido de compresión. Además se exige que el pico sea máximo local: un
// movimiento rápido levanta la diferencia durante varios cuadros seguidos, un corte la levanta en UNO.
// Y ESTO NO CUENTA CORTES, CUENTA CAMBIOS ABRUPTOS — la distincion importa y no es pedanteria.
// La diferencia entre dos cuadros no puede separar un corte duro de una transicion veloz que llena el
// cuadro, y en este genero eso NO es una limitacion del metodo: es el genero. Ninguna de las ocho
// referencias usa una cortinilla generica; la transicion es siempre un objeto de la escena que
// atraviesa la lente en tres o cuatro cuadros, o sea algo hecho a proposito PARA que se lea como un
// corte. Medir "cambios visuales abruptos" es medir el pulso, que es lo que sirve para componer.
const VENT_C = Math.max(4, Math.round(FPS * 1.0))
const cortes = []
for (let i = 2; i < N - 1; i++) {
  const a = Math.max(1, i - VENT_C), b = Math.min(N - 1, i + VENT_C)
  const vec = dif.slice(a, b).sort((x, y) => x - y)
  const medLocal = vec[Math.floor(vec.length / 2)]
  const umbral = Math.max(0.008, medLocal * 6)
  if (dif[i] <= umbral) continue
  if (dif[i] < dif[i - 1] || dif[i] < dif[i + 1]) continue          // tiene que ser un pico, no una rampa
  if (cortes.length && i - cortes[cortes.length - 1] < Math.round(FPS * 0.3)) continue
  cortes.push(i)
}
const largos = []
for (let i = 0; i < cortes.length; i++) {
  const desde = i ? cortes[i - 1] : 0
  largos.push(seg(cortes[i] - desde))
}
largos.push(seg(N - (cortes[cortes.length - 1] || 0)))
const largosOrd = [...largos].sort((a, b) => a - b)

// ---------------------------------------------------------------- ESCALONADO
// Un cuadro "quieto" es uno practicamente identico al anterior. El umbral no puede ser cero: el video
// esta comprimido con perdida, asi que dos cuadros IDENTICOS en el original salen apenas distintos.
const QUIETO = 0.0022
const quietos = dif.filter((d, i) => i > 0 && d < QUIETO).length

// EL PASO SE MIDE SOLO DONDE ALGO SE ESTA MOVIENDO, y esta correccion es la diferencia entre medir y
// no medir. La primera version tomaba todo el video: un plano QUIETO de dos segundos aporta sesenta
// cuadros repetidos, y eso se lee igual que una animacion "a doses" aunque no tenga nada que ver.
// Notion salio con 84,6% de cuadros quietos y paso 1 — las dos cosas a la vez, que es imposible, y es
// el sintoma de estar mezclando dos fenomenos en un numero.
//
// Un cuadro esta ACTIVO si en su vecindad (un cuarto de segundo a cada lado) pasa algo por encima del
// ruido. El paso se calcula solo sobre esos.
const VEC = Math.max(2, Math.round(FPS / 4))
const actividad = new Float64Array(N)
for (let i = 0; i < N; i++) {
  let s = 0, c = 0
  for (let k = Math.max(0, i - VEC); k <= Math.min(N - 1, i + VEC); k++) { s += dif[k]; c++ }
  actividad[i] = s / c
}
const actOrd = [...actividad].sort((a, b) => a - b)
const PISO_ACT = Math.max(0.0015, actOrd[Math.floor(N * 0.6)])
const cambia = []
for (let i = 1; i < N; i++) if (dif[i] >= QUIETO && actividad[i] >= PISO_ACT) cambia.push(i)
const huecos = {}
for (let i = 1; i < cambia.length; i++) {
  const g = cambia[i] - cambia[i - 1]
  if (g <= 6) huecos[g] = (huecos[g] || 0) + 1
}
const pasoOrden = Object.entries(huecos).sort((a, b) => b[1] - a[1])
const paso = pasoOrden.length ? +pasoOrden[0][0] : 1
const totalHuecos = Object.values(huecos).reduce((a, b) => a + b, 0) || 1
// y cuantos cuadros quietos hay DENTRO de lo activo: eso si es escalonado y no plano estatico
let activos = 0, quietosActivos = 0
for (let i = 1; i < N; i++) if (actividad[i] >= PISO_ACT) { activos++; if (dif[i] < QUIETO) quietosActivos++ }

// ---------------------------------------------------------------- ESCALONADO, POR PERIODICIDAD
// CONTAR CUADROS REPETIDOS NO DISTINGUE "ANIMADO A DOSES" DE "MOVIMIENTO MUY LENTO", y esa confusion
// hacia que la herramienta le llevara la contra al usuario sobre Figma. Los dos casos dan cuadros casi
// identicos; lo que los separa es que el escalonado es PERIODICO.
//
// Si una pieza esta animada a doses, TODOS los cambios caen en cuadros de la misma paridad. Se mide
// asi: para cada k, que fraccion de los cuadros que cambian cae en la clase de resto mas poblada
// modulo k. Con animacion a cadencia completa los cambios se reparten parejo y esa fraccion tiende a
// 1/k; con escalonado a k tiende a 1.
//
// Y se mide POR VENTANAS, no sobre el video entero: en una pieza como la de Figma el escalonado esta
// en las partes dibujadas y no en las demas. Un promedio global lo diluiria hasta hacerlo desaparecer,
// que es justo lo que pasaba.
const VENT = Math.max(12, Math.round(FPS * 1.5))
const ventanas = []
for (let a = 0; a + VENT <= N; a += Math.round(VENT / 2)) {
  const cambios = []
  for (let i = a + 1; i < a + VENT; i++) if (dif[i] >= QUIETO && actividad[i] >= PISO_ACT) cambios.push(i)
  if (cambios.length < 6) continue                 // sin cambios no hay nada que clasificar
  let mejorK = 1, mejorFrac = 0
  for (let k = 2; k <= 4; k++) {
    const cubetas = new Array(k).fill(0)
    for (const c of cambios) cubetas[c % k]++
    const frac = Math.max(...cubetas) / cambios.length
    // la ventaja sobre el azar tiene que ser grande: 1/k es lo que da una animacion a cadencia completa
    if (frac > 0.82 && frac - 1 / k > mejorFrac - 1 / mejorK) { mejorK = k; mejorFrac = frac }
  }
  ventanas.push(mejorK)
}
const escalonadas = ventanas.filter(k => k > 1)
const pasoDominante = escalonadas.length
  ? +Object.entries(escalonadas.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {}))
      .sort((a, b) => b[1] - a[1])[0][0]
  : 1
const fraccionEscalonada = ventanas.length ? escalonadas.length / ventanas.length : 0

// ---------------------------------------------------------------- ENERGIA
const pico = Math.max(...dif)
const cresta = med > 0 ? pico / med : Infinity
// un silencio es un tramo sin nada que se mueva por encima del ruido
const PISO = Math.max(0.004, med * 0.35)
const silencios = []
let corre = 0
for (let i = 1; i < N; i++) {
  if (dif[i] < PISO) corre++
  else { if (corre >= Math.round(FPS * 0.2)) silencios.push(corre); corre = 0 }
}
if (corre >= Math.round(FPS * 0.2)) silencios.push(corre)

// ---------------------------------------------------------------- TITULARES
// Un tramo de "rotulo": poca tinta (cabe un titular, no una interfaz) y sostenido. Sobre esos tramos
// la altura de la caja de tinta ES la curva de tamano del titular, que es lo que se quiere comparar.
// EL TECHO DE TINTA NO PUEDE SER 0,10, y ese fue el segundo fallo. Un titular que ENTRA a 3x tiene
// nueve veces mas tinta que en reposo: con el techo bajo, justo los cuadros que llevan la senal quedan
// afuera del tramo y `entra` da 1,00 en todos lados. Una columna que no varia es una columna que no
// mide, y la primera corrida daba 1,00 en cinco de siete.
//
// Ahora un rotulo es "poca tinta Y en forma de franja": puede ocupar mucho ancho, no puede ocupar todo
// el alto. Eso admite el titular gigante y sigue descartando una captura de interfaz a pantalla llena.
const ES_ROTULO = (i) => tinta[i] > 0.002 && tinta[i] < 0.35 && altoTinta[i] < 0.55
const tramos = []
let ini = -1
for (let i = 0; i < N; i++) {
  if (ES_ROTULO(i)) { if (ini < 0) ini = i }
  else { if (ini >= 0 && i - ini >= Math.round(FPS * 0.4)) tramos.push([ini, i]); ini = -1 }
}
if (ini >= 0 && N - ini >= Math.round(FPS * 0.4)) tramos.push([ini, N])

function mediana2(v) { const o = [...v].sort((a, b) => a - b); return o[Math.floor(o.length / 2)] }
function pct(v, q) { const o = [...v].sort((a, b) => a - b); return o[Math.min(o.length - 1, Math.floor(o.length * q))] }

// De cada tramo: cuanto es mas grande al ENTRAR y al SALIR respecto de su tamano de reposo.
//
// Se mide contra la MESETA (la mediana del tramo), no contra el primer cuadro, y se toma el MAXIMO del
// primer y del ultimo tercio en vez del cuadro extremo: asi el numero no depende de donde justo cayo
// el borde del tramo, que es una decision del detector y no del video.
const formas = []
for (const [a, b] of tramos) {
  const h = altoTinta.slice(a, b)
  if (h.length < 6) continue
  const meseta = mediana2(h)
  if (meseta <= 0) continue
  const t = Math.max(2, Math.round(h.length / 3))
  let mejor = 0, actual = 0
  for (let i = 1; i < h.length; i++) {
    if (Math.abs(h[i] - h[i - 1]) / Math.max(h[i - 1], 1e-6) < 0.015) { actual++; if (actual > mejor) mejor = actual }
    else actual = 0
  }
  formas.push({
    desde: seg(a), dur: seg(b - a),
    entra: Math.max(...h.slice(0, t)) / meseta,
    sale: Math.max(...h.slice(-t)) / meseta,
    quietoSeg: seg(mejor),
    rango: Math.max(...h) / Math.max(Math.min(...h), 1e-6),
    tintaMax: Math.max(...tinta.slice(a, b)),
  })
}

// ---------------------------------------------------------------- el informe
const nombre = basename(DIR)
const R = {
  video: nombre, fps: FPS, cuadros: N, duracion: seg(N),
  cortes: {
    n: cortes.length,
    porSegundo: cortes.length / seg(N),
    medianaSeg: largosOrd[Math.floor(largosOrd.length / 2)],
    p10Seg: largosOrd[Math.floor(largosOrd.length * 0.1)],
    p90Seg: largosOrd[Math.floor(largosOrd.length * 0.9)],
  },
  escalonado: {
    fraccionQuietos: quietos / N,
    quietosEnMovimiento: activos ? quietosActivos / activos : 0,
    paso,
    confianzaPaso: (huecos[paso] || 0) / totalHuecos,
    pasoDominante,
    fraccionEscalonada,
    cadenciaEfectiva: FPS / (pasoDominante || 1),
  },
  // LA CRESTA CONTRA LA MEDIANA SE ROMPE cuando mas de la mitad de los cuadros son identicos: la
  // mediana da 0 y la cresta da infinito (Notion: 29971, que no es un dato, es una division por cero
  // disfrazada). Se usa el percentil 60 de lo ACTIVO como piso, que es el pulso real de la pieza.
  energia: { mediana: med, media: dif.reduce((a, b) => a + b, 0) / N, pico, cresta: pico / PISO_ACT, p90: p(0.9) },
  silencios: { n: silencios.length, masLargoSeg: seg(Math.max(0, ...silencios)) },
  // LA MEDIANA CONTESTA "COMO ES EL TITULAR TIPICO"; EL PERCENTIL 90 CONTESTA "USA ESTE GENERO GESTOS
  // GRANDES DE ESCALA". Son dos preguntas distintas y la segunda es la que importa para copiar un
  // recurso: un aviso puede tener once titulares mansos y UNO que se va encima de la camara, y ese uno
  // es el que uno quiere poder hacer. Con la mediana sola, ese gesto no existe — es el mismo error que
  // ya me escondio la senal dos veces en esta sesion.
  titulares: {
    n: formas.length,
    entradaMediana: formas.length ? mediana2(formas.map(f => f.entra)) : null,
    entradaP90: formas.length ? pct(formas.map(f => f.entra), 0.9) : null,
    salidaMediana: formas.length ? mediana2(formas.map(f => f.sale)) : null,
    salidaP90: formas.length ? pct(formas.map(f => f.sale), 0.9) : null,
    rangoP90: formas.length ? pct(formas.map(f => f.rango), 0.9) : null,
    quietoMedianaSeg: formas.length ? mediana2(formas.map(f => f.quietoSeg)) : null,
    durMedianaSeg: formas.length ? mediana2(formas.map(f => f.dur)) : null,
  },
}

const j = process.argv.indexOf('--json')
if (j > 0 && process.argv[j + 1]) writeFileSync(process.argv[j + 1], JSON.stringify({ ...R, formas }, null, 1))

console.log(`\n${nombre.toUpperCase()} — ${R.duracion.toFixed(1)} s · ${FPS} fps · ${N} cuadros`)
console.log(`  CAMBIOS       ${R.cortes.n} abruptos (${R.cortes.porSegundo.toFixed(2)}/s) · tramo mediano ${R.cortes.medianaSeg.toFixed(2)} s · p10 ${R.cortes.p10Seg.toFixed(2)} · p90 ${R.cortes.p90Seg.toFixed(2)}`)
const esc = R.escalonado
console.log(`  ESCALONADO    ${(esc.fraccionEscalonada * 100).toFixed(0)}% del video animado A ${esc.pasoDominante > 1 ? esc.pasoDominante + 'ES' : 'UNOS'}` +
  (esc.pasoDominante > 1 ? ` -> ${(FPS / esc.pasoDominante).toFixed(1)} fps efectivos en esas partes` : ''))
console.log(`                cuadros repetidos: ${(esc.fraccionQuietos * 100).toFixed(1)}% del total · ${(esc.quietosEnMovimiento * 100).toFixed(1)}% dentro de lo que se mueve`)
console.log(`  ENERGIA       mediana ${med.toFixed(4)} · piso activo ${PISO_ACT.toFixed(4)} · pico ${pico.toFixed(4)} · cresta ${R.energia.cresta.toFixed(1)}`)
console.log(`  SILENCIOS     ${R.silencios.n} · el mas largo ${R.silencios.masLargoSeg.toFixed(2)} s`)
if (formas.length) {
  console.log(`  TITULARES     ${formas.length} tramos · dura ${R.titulares.durMedianaSeg.toFixed(2)} s · quieto ${R.titulares.quietoMedianaSeg.toFixed(2)} s`)
  console.log(`                entra x${R.titulares.entradaMediana.toFixed(2)} (p90 x${R.titulares.entradaP90.toFixed(2)}) · sale x${R.titulares.salidaMediana.toFixed(2)} (p90 x${R.titulares.salidaP90.toFixed(2)}) · rango p90 x${R.titulares.rangoP90.toFixed(2)}`)
} else {
  console.log(`  TITULARES     ninguno aislado (la pantalla nunca queda con poca tinta: es una pieza de interfaz llena)`)
}

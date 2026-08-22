// EL ENCUADRE — que lo que esta quieto no este cortado por el borde del cuadro.
//
// ESTA COMPUERTA EXISTE PORQUE EL USUARIO VIO EN CINCO SEGUNDOS ALGO QUE TRES COMPUERTAS EN VERDE NO
// VIERON. La PIEZA-I paso lectura, escena y colision, y el panel del tiempo C sale cortado por arriba
// durante toda su vida. No es una capa perdida: es una capa que se ve, que se lee, que no pisa a nadie
// — y que esta mal puesta.
//
// POR QUE NO LO CAZO `escena-check`. Su pregunta es "¿se gasta movimiento que nadie ve?" y su umbral
// esta en `escena-check.mjs:115`: `if (v.visible > 0.25) continue`. Una capa cortada al 40% tiene el
// 60% en pantalla, o sea mas del doble del umbral, y sale por esa linea antes de que nadie la mire. El
// umbral es correcto PARA SU PREGUNTA: 0,25 separa "esta capa esta desperdiciada" de "esta capa se ve".
// Lo que no existia era la otra pregunta. Estar en pantalla y estar bien encuadrado son dos cosas, y yo
// tenia compuerta para una sola.
//
// Y hay una segunda razon, mas fea, en `escena-check.mjs:86`: la fraccion se mide contra
// `Math.min(areaDeLaCapa, areaDelCuadro)`. Esa exencion se agrego para que un fondo sobredimensionado
// no diera rojo, y es correcta para un fondo — pero convierte a CUALQUIER capa mas grande que el cuadro
// en "100% encuadrada" por definicion.
//
// LA PREGUNTA QUE HACE ESTA. No "¿esta algo fuera de cuadro?" —eso es normal: las capas entran y salen
// volando, y un fondo sangra a proposito— sino:
//
//     ¿hay alguna capa que este QUIETA, VISIBLE, y CORTADA por un borde del cuadro?
//
// Las tres condiciones juntas. Quieta descarta las entradas y las salidas, que estan cortadas por
// construccion. Visible descarta lo que todavia no aparecio. Y cortada por un borde es el defecto: si
// una capa termino su entrada, se quedo, y le falta un pedazo, nadie lo pidio.
//
// LO QUE NO PUEDE DECIR. Si la composicion es LINDA. Un elemento perfectamente contenido puede estar
// igual de mal colocado —muy a la izquierda, o pisado contra el borde inferior— y esta compuerta lo da
// por bueno. Por eso ademas de fallar informa una TABLA de encuadre con el centro de cada capa quieta
// en fracciones del cuadro, que no reprueba nada y sirve para mirar la composicion con numeros.
//
// EXENCIONES, TODAS CON NOMBRE Y NUNCA EN SILENCIO. Una compuerta que exime callada es una compuerta
// que miente. Se eximen: las capas cuyo comentario en AE contiene SANGRA (declaracion explicita del
// autor), y los prefijos estructurales `fondo`, `grano`, `luz-` y `deco-`. Todo lo demas tiene que
// entrar entero o salir en rojo. Las exenciones aplicadas se imprimen.
//
// USO
//   node tools/ae/marco-check.mjs [comp.json]
//   node tools/ae/marco-check.mjs [comp.json] --tabla        toda la tabla de encuadre, no solo lo roto
//   node tools/ae/marco-check.mjs [comp.json] --inyectar N   CONTROL NEGATIVO: sube 300 px la capa N
//
// EL CONTROL NEGATIVO NO ES DECORACION. Una compuerta que nunca se vio fallar no esta probada, esta
// escrita. `--inyectar` mueve una capa hasta cortarla y la compuerta TIENE que ponerse roja; si sigue
// verde, el roto es el instrumento.

import { existsSync, readFileSync } from 'node:fs'
import { cinematica, rectanguloDe, propEn } from './cinematica.mjs'

const args = process.argv.slice(2)
const RUTA = args.find(a => !a.startsWith('--')) || 'C:/ae-probe/pieza-i.json'
const TABLA = args.includes('--tabla')
const iIny = args.indexOf('--inyectar')
const INYECTAR = iIny >= 0 ? args[iIny + 1] : null

if (!existsSync(RUTA)) { console.error(`falta ${RUTA}`); process.exit(2) }
const doc = JSON.parse(readFileSync(RUTA, 'utf8'))

// ---------------------------------------------------------------- el control negativo
// Se corre ANTES de construir la cinematica, sobre el documento crudo, para que el defecto entre por la
// misma puerta que entraria uno de verdad: una capa colocada mal por el autor.
if (INYECTAR) {
  const v = doc.capas.find(c => c.nombre === INYECTAR)
  if (!v) { console.error(`no existe la capa "${INYECTAR}"`); process.exit(2) }
  const T = v.transformacion
  const clave = v.separadas ? 'posY' : 'posicion'
  const comp = v.separadas ? 0 : 1
  const pista = (T[clave]?.pistas || []).find(p => p.componente === comp)
  if (pista) { for (const s of pista.tramos) { s.v1 -= 300; s.v2 -= 300 } }
  else {
    // sin claves: el valor fijo vive en el propio documento
    const q = T[clave]
    if (q && Array.isArray(q.fijo)) q.fijo[comp] -= 300
    else if (q && typeof q.fijo === 'number') q.fijo -= 300
    else { console.error(`la capa "${INYECTAR}" no tiene posicion inyectable`); process.exit(2) }
  }
  console.log(`CONTROL NEGATIVO — "${INYECTAR}" subida 300 px. La compuerta TIENE que ponerse roja.\n`)
}

const K = cinematica(doc)
const { ancho, alto, fps } = K
const CUADROS = Math.round(doc.comp.duracion * fps)
const CUADRO = [[0, 0], [ancho, 0], [ancho, alto], [0, alto]]

// ---------------------------------------------------------------- recorte exacto de poligonos
//
// SE RECORTA EL CUADRILATERO, NO SU CAJA ENVOLVENTE. Un panel girado 30 grados tiene una envolvente
// mucho mas grande que el, y medir con ella declara "cortado" a paneles que entran enteros. Con el
// escorzo de esta familia de piezas eso no es un detalle: la envolvente de `panel-hola` es un 22% mas
// alta que el panel.
function recortar(poli, a, b) {
  const dentro = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0
  const corte = (p, q) => {
    const d1 = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
    const d2 = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0])
    const u = d1 / (d1 - d2)
    return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]
  }
  const salida = []
  for (let i = 0; i < poli.length; i++) {
    const p = poli[i], q = poli[(i + 1) % poli.length]
    const dp = dentro(p), dq = dentro(q)
    if (dp) salida.push(p)
    if (dp !== dq) salida.push(corte(p, q))
  }
  return salida
}
function enElCuadro(q) {
  let p = q
  for (let i = 0; i < 4 && p.length; i++) p = recortar(p, CUADRO[i], CUADRO[(i + 1) % 4])
  return p
}
const area = (q) => {
  if (q.length < 3) return 0
  let a = 0
  for (let i = 0; i < q.length; i++) {
    const j = (i + 1) % q.length
    a += q[i][0] * q[j][1] - q[j][0] * q[i][1]
  }
  return Math.abs(a) / 2
}
const centro = (q) => [
  q.reduce((s, p) => s + p[0], 0) / q.length,
  q.reduce((s, p) => s + p[1], 0) / q.length,
]

// ---------------------------------------------------------------- autotest del recortador
// La compuerta anterior de este repo tuvo dos signos dados vuelta en una interpolacion y la rama nunca
// funciono: solo lo descubrio el control negativo. Un recortador se prueba en tres lineas, asi que se
// prueba.
{
  const todo = [[100, 100], [300, 100], [300, 300], [100, 300]]
  if (Math.abs(area(enElCuadro(todo)) - 40000) > 1) throw new Error('autotest: un rectangulo interior perdio area')
  const mitad = [[-100, 100], [100, 100], [100, 300], [-100, 300]]
  if (Math.abs(area(enElCuadro(mitad)) - 20000) > 1) throw new Error('autotest: la mitad izquierda no dio la mitad')
  const fuera = [[-400, -400], [-200, -400], [-200, -200], [-400, -200]]
  if (area(enElCuadro(fuera)) > 1) throw new Error('autotest: un rectangulo de afuera dio area')
}

// ---------------------------------------------------------------- las capas que se miden
const EXENTAS = /^(fondo|grano|luz-|deco-)/i
const dibujables = doc.capas.filter(c => c.tipo !== 'camara' && rectanguloDe(c))
const eximidas = []
const medidas = dibujables.filter(c => {
  if (/SANGRA/i.test(c.comentario || '')) { eximidas.push(`${c.nombre} — declarada SANGRA en el comentario`); return false }
  if (EXENTAS.test(c.nombre)) { eximidas.push(`${c.nombre} — prefijo estructural`); return false }
  return true
})

// ---------------------------------------------------------------- la medicion
const REPOSO = 2.5      // px/cuadro de desplazamiento del centro: mas que esto es transito
const D_AREA = 0.006    // cambio relativo de area por cuadro: mas que esto es una escala en curso
const OPACA = 40        // por debajo de esto la capa esta entrando o saliendo por opacidad
const ENTERA = 0.995    // por encima de esto se considera que entra entera (tolerancia de redondeo)

const serie = new Map()   // nombre -> [{f, dentro, cx, cy, area, op, bordes}]
for (let f = 0; f < CUADROS; f++) {
  K.enCuadro(f)
  const t = f / fps
  for (const c of medidas) {
    if (!(t >= c.entra - 1e-9 && t < c.sale - 1e-9 && c.visible !== false)) continue
    const q = K.esquinas(c, t)
    if (!q) continue
    const A = area(q)
    if (A < 4) continue
    const dentro = area(enElCuadro(q)) / A
    const bordes = []
    if (q.some(p => p[1] < -0.5)) bordes.push('arriba')
    if (q.some(p => p[1] > alto + 0.5)) bordes.push('abajo')
    if (q.some(p => p[0] < -0.5)) bordes.push('izquierda')
    if (q.some(p => p[0] > ancho + 0.5)) bordes.push('derecha')
    const [cx, cy] = centro(q)
    if (!serie.has(c.nombre)) serie.set(c.nombre, [])
    serie.get(c.nombre).push({
      f, dentro, cx, cy, area: A, bordes,
      op: propEn(c.transformacion, 'opacidad', 0, t, 100),
      caja: [Math.min(...q.map(p => p[0])), Math.min(...q.map(p => p[1])),
             Math.max(...q.map(p => p[0])), Math.max(...q.map(p => p[1]))],
    })
  }
}

// ---------------------------------------------------------------- quieta + visible + cortada
const rotas = []
const quietas = []
for (const [nombre, s] of serie) {
  let corrida = null
  const cerrar = () => {
    if (corrida && corrida.n >= 6) rotas.push(corrida)   // menos de 6 cuadros es el filo de un gesto
    corrida = null
  }
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1], v = s[i]
    if (v.f !== a.f + 1) { cerrar(); continue }
    const vel = Math.hypot(v.cx - a.cx, v.cy - a.cy)
    const dA = Math.abs(v.area - a.area) / Math.max(a.area, 1)
    const enReposo = vel <= REPOSO && dA <= D_AREA
    if (enReposo && v.op >= OPACA) quietas.push({ nombre, ...v })
    if (enReposo && v.op >= OPACA && v.dentro < ENTERA) {
      if (!corrida) corrida = { nombre, desde: v.f, hasta: v.f, n: 0, peor: 1, bordes: new Set(), falta: 0 }
      corrida.hasta = v.f
      corrida.n++
      if (v.dentro < corrida.peor) {
        corrida.peor = v.dentro
        corrida.bordes = new Set(v.bordes)
        corrida.falta = Math.max(
          v.bordes.includes('arriba') ? -v.caja[1] : 0,
          v.bordes.includes('abajo') ? v.caja[3] - alto : 0,
          v.bordes.includes('izquierda') ? -v.caja[0] : 0,
          v.bordes.includes('derecha') ? v.caja[2] - ancho : 0)
      }
    } else cerrar()
  }
  cerrar()
}
rotas.sort((a, b) => a.peor - b.peor)

// ---------------------------------------------------------------- la tabla de encuadre (informa, no falla)
const porCapa = new Map()
for (const q of quietas) {
  const g = porCapa.get(q.nombre) || { n: 0, sx: 0, sy: 0, dentro: 1, area: 0 }
  g.n++; g.sx += q.cx / ancho; g.sy += q.cy / alto
  g.dentro = Math.min(g.dentro, q.dentro)
  g.area = Math.max(g.area, q.area / (ancho * alto))
  porCapa.set(q.nombre, g)
}

// ---------------------------------------------------------------- LA CAMARA INCLINADA SIN QUERER
//
// ESTO NOMBRA LA CAUSA, NO EL SINTOMA, y por eso vale mas que todo lo de arriba. Cuando la PIEZA-I dio
// tres paneles cortados, el diagnostico tardo porque la compuerta decia "panel-hola sale 236 px por
// arriba" — verdadero, util, y a 240 px del problema real, que era una sola linea en la camara.
//
// `addCamera(nombre, [960, 540])` NO coloca la camara en [960, 540]: ese argumento es el PUNTO DE
// INTERES. La posicion queda en [0, 0, -zoom]. Si el autor le pone claves a X y a Z —lo normal— esas
// claves pisan el valor equivocado en dos ejes y dejan el tercero roto: la camara queda a la altura del
// borde SUPERIOR de la composicion, mirando hacia abajo, y todo lo que vive en z>0 sube en el cuadro.
//
// Una inclinacion puede ser deliberada. Se distingue asi: si el eje que la produce esta ANIMADO o
// declarado, es una decision; si esta en su valor por defecto y sin una sola clave, es el descuido.
const camaraDoc = doc.capas.find(c => c.tipo === 'camara')
const avisosCam = []
if (camaraDoc) {
  const T = camaraDoc.transformacion
  const clavesEn = (k) => (T[k]?.pistas?.[0]?.tramos?.length || 0) > 0
  const val = (k, c, def) => propEn(T, k, c, 0, def)
  const px = camaraDoc.separadas ? val('posX', 0, ancho / 2) : val('posicion', 0, ancho / 2)
  const py = camaraDoc.separadas ? val('posY', 0, alto / 2) : val('posicion', 1, alto / 2)
  const pz = camaraDoc.separadas ? val('posZ', 0, -2666) : val('posicion', 2, -2666)
  const ax = val('anclaje', 0, ancho / 2), ay = val('anclaje', 1, alto / 2), az = val('anclaje', 2, 0)
  const dz = az - pz
  const cabeceo = Math.atan2(ay - py, dz) * 180 / Math.PI
  const guinada = Math.atan2(ax - px, dz) * 180 / Math.PI
  const yAnimada = camaraDoc.separadas ? clavesEn('posY') : clavesEn('posicion')
  console.log(`\n  LA CAMARA  posicion [${px.toFixed(0)}, ${py.toFixed(0)}, ${pz.toFixed(0)}]  ` +
    `mira a [${ax.toFixed(0)}, ${ay.toFixed(0)}, ${az.toFixed(0)}]  ` +
    `cabeceo ${cabeceo.toFixed(1)} grados  guinada ${guinada.toFixed(1)} grados`)
  if (Math.abs(cabeceo) > 2 && !yAnimada) {
    avisosCam.push(`la camara mira ${cabeceo.toFixed(1)} grados ${cabeceo > 0 ? 'hacia abajo' : 'hacia arriba'} ` +
      `y su Y (${py.toFixed(0)}) no tiene una sola clave: es el valor con que la dejo addCamera, no una decision. ` +
      `Centrarla con pos(cam).setValue([${ancho / 2}, ${alto / 2}, z]) ANTES de separar dimensiones.`)
  }
  if (Math.abs(guinada) > 2 && !(camaraDoc.separadas ? clavesEn('posX') : clavesEn('posicion'))) {
    avisosCam.push(`la camara mira ${guinada.toFixed(1)} grados al costado y su X no tiene claves: mismo caso.`)
  }
  for (const a of avisosCam) console.log(`    >>> ${a}`)
}

console.log(`\nMARCO — "${doc.comp.nombre}" · ${CUADROS} cuadros · ${medidas.length} capas medidas`)

console.log('\n  QUIETAS, VISIBLES Y CORTADAS POR EL BORDE')
if (!rotas.length) console.log('    ninguna')
for (const r of rotas) {
  console.log(`    ${String(r.n).padStart(4)} cuadros  ${(r.peor * 100).toFixed(0)}% dentro  ` +
    `${r.nombre.padEnd(22)} ${r.desde}-${r.hasta}  corta por ${[...r.bordes].join(' y ')} ` +
    `(${Math.round(r.falta)} px afuera)`)
}

if (TABLA || rotas.length) {
  console.log('\n  DONDE QUEDA CADA COSA CUANDO SE QUEDA QUIETA (fraccion del cuadro; 0,50 es el centro)')
  const filas = [...porCapa].sort((a, b) => a[1].sy - b[1].sy)
  for (const [n, g] of filas) {
    if (!TABLA && g.dentro >= ENTERA && Math.abs(g.sy / g.n - 0.5) < 0.18) continue
    const x = (g.sx / g.n), y = (g.sy / g.n)
    const senal = g.dentro < ENTERA ? ' <- cortada' : (y < 0.30 || y > 0.70) ? ' <- pegada al borde' : ''
    console.log(`    x ${x.toFixed(2)}  y ${y.toFixed(2)}  ocupa ${(g.area * 100).toFixed(0)}% del cuadro  ` +
      `${String(g.n).padStart(4)} cuadros quieta  ${n}${senal}`)
  }
}

if (eximidas.length) {
  console.log('\n  EXIMIDAS (se dicen siempre: una exencion callada es una compuerta que miente)')
  for (const e of eximidas) console.log(`    ${e}`)
}

console.log('')
console.log('='.repeat(72))
if (!rotas.length && !avisosCam.length) console.log('MARCO OK — la camara mira derecho y nada quieto queda cortado')
else console.log(`MARCO NO PASA — ${rotas.length} capa(s) quietas y cortadas${avisosCam.length ? " · " + avisosCam.length + " defecto(s) de camara" : ""}`)
process.exit(rotas.length + avisosCam.length ? 1 : 0)

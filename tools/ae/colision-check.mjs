// ¿DOS COSAS LEGIBLES CAEN EN EL MISMO LUGAR DEL CUADRO? — sin renderizar.
//
// POR QUE EXISTE. Es el unico defecto que aparecio en TODAS las piezas y que ninguna compuerta caza.
// En la PIEZA-H aparecio cuatro veces (cuadros 490, 650, 1510 y 1775) y las tres compuertas dieron
// verde, porque cada una contesta otra pregunta:
//   `lectura-check`  mide si CADA texto llega a un tamano legible.
//   `escena-check`   mide si CADA capa llega a la pantalla.
//   `ritmo`          mide CUANDO se mueve cada cosa.
// Ninguna pregunta si dos cosas legibles POR SEPARADO caen encima una de la otra. Y el defecto no da
// error, no da NOSOP, y en un cuadro suelto ni siquiera se ve mal: se ve como ruido.
//
// LO QUE HACE DIFICIL LA PREGUNTA, y por que no alcanza con solapar cajas: una etiqueta ENCIMA de su
// pildora es correcto y es el caso mas comun de la pieza. Un titular encima de un panel que tiene su
// propio texto es un defecto. Las dos son "un texto sobre una imagen" y la diferencia no esta en la
// geometria: esta en QUE HAY DEBAJO.
//
// Por eso esta compuerta MIRA ADENTRO DEL PNG. De cada recurso se calcula una vez una grilla gruesa de
// OCUPACION —cuanta estructura hay en cada celda, medida como energia de gradiente entre pixeles
// opacos— y despues, por cuadro, la caja del texto se proyecta a coordenadas del panel con bilineal
// inversa y se consulta esa grilla. Una pildora es plana por dentro: no dispara. Un documento lleno de
// renglones dispara.
//
// LO QUE NO DICE: si la colision fue a proposito. Hay composiciones que superponen texto sobre textura
// a sabiendas. Por eso una capa que se llame `deco-` o `fondo` no cuenta como estorbo, y el informe da
// el cuadro y los dos nombres para poder ir a mirar.
//
// USO
//   node tools/ae/colision-check.mjs [comp.json] [--medios CARPETA] [--inyectar]

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cinematica, rectanguloDe, propEn } from './cinematica.mjs'
import { leerPNG } from './png.mjs'

const RUTA = process.argv.find(a => a.endsWith('.json')) || 'C:/ae-probe/p3/motor/comp.json'
const iM = process.argv.indexOf('--medios')
const MEDIOS = iM > 0 ? process.argv[iM + 1] : 'C:/ae-probe/medios'
if (!existsSync(RUTA)) { console.error(`falta ${RUTA}`); process.exit(2) }
const doc = JSON.parse(readFileSync(RUTA, 'utf8'))

// ---------------------------------------------------------------- los umbrales, y de donde salen
const OPACIDAD_MINIMA = 22      // por debajo de esto una capa es una veladura, no un estorbo
const ALTURA_ROTULO = 0.028     // 2,8% del alto: por debajo es una etiqueta, no un titular
const SOLAPE_MINIMO = 0.18      // 18% de la caja del titular pisada
const OCUPACION_ALTA = 0.30     // fraccion de celdas con estructura bajo el titular
const CUADROS_MINIMOS = 6       // un cruce de un parpadeo no es un defecto; medio pie de segundo si
// DOS COSAS QUE SE CRUZAN EN TRANSITO NO SON UN DEFECTO: SON UN CRUCE.
//
// La primera version marcaba trece choques y once eran las letras del estallido pasando unas por
// encima de otras — o sea exactamente el gesto que la pieza esta haciendo. Solapar cajas no distingue
// "la palabra se desarma" de "el titular cayo encima del panel", y la diferencia no es geometrica:
// es CINEMATICA. Un defecto es dos cosas legibles QUIETAS en el mismo lugar; si las dos van a toda
// velocidad, se estan cruzando.
//
// Y LA VELOCIDAD DE CADA UNA TAMPOCO ALCANZA. Con eso quedaban nueve choques y siete seguian siendo el
// estallido: al ARRANCAR, las letras se mueven despacio (la curva C3 sale lenta) y se cruzan igual.
//
// Lo que separa los dos casos es LA SEPARACION ENTRE LAS DOS. Dos letras que se desarman se ALEJAN —
// su distancia crece varios pixeles por cuadro. Un titular encima de un panel mantiene la distancia,
// aunque los dos esten viajando juntos. Se mide el cambio de la distancia entre centros, no la
// velocidad de cada uno, y de paso queda bien el caso de dos capas emparentadas que viajan pegadas: ahi
// la separacion no cambia y ES un defecto.
const APERTURA = 2.5            // px por cuadro que puede cambiar la distancia entre los dos centros
const GX = 48, GY = 28          // la grilla de ocupacion por recurso


const esDecorativa = (c) => /^deco|^fondo|^grano|^textura/i.test(c.nombre)

// DOS LETRAS DE UNA MISMA PALABRA DESARMADA NO SE ESTAN PISANDO: SON LA MISMA PALABRA.
//
// Quedaban tres falsos positivos despues de filtrar por apertura, y los tres eran letras del estallido
// volando EN PARALELO — su separacion no cambia porque van juntas, aunque las dos esten a toda
// velocidad. No hay geometria ni cinematica que distinga eso de un apilado: hace falta saber que las
// dos pertenecen al MISMO objeto tipografico, y eso solo lo sabe quien escribio la pieza.
//
// Se declara por nombre, con la misma convencion que ya usan las piezas: una capa por caracter se
// llama `letra-<i>-<c>`. Dos capas `letra-*` son partes de una palabra y su cruce es el gesto. Un
// titular contra una letra NO esta exento — y es justo el defecto que esta compuerta encontro.
const esCaracter = (c) => /^letra-/i.test(c.nombre)

// ---------------------------------------------------------------- la grilla de ocupacion
// Se mide ENERGIA DE GRADIENTE entre pixeles opacos, no brillo. Un panel con degradado suave es
// brillante y no tiene estructura; un renglon de texto gris sobre negro es oscuro y si la tiene. Lo que
// estorba a un titular es la estructura, no la luz.
const cacheGrilla = new Map()
function ocupacionDe(archivo) {
  if (cacheGrilla.has(archivo)) return cacheGrilla.get(archivo)
  const ruta = join(MEDIOS, archivo)
  if (!existsSync(ruta)) { cacheGrilla.set(archivo, null); return null }
  let im
  try { im = leerPNG(ruta) } catch { cacheGrilla.set(archivo, null); return null }
  const canal = im.datos.length / (im.ancho * im.alto)
  const G = new Float64Array(GX * GY), n = new Float64Array(GX * GY)
  const L = (x, y) => im.datos[(y * im.ancho + x) * canal]
  const A = (x, y) => (canal === 4 ? im.datos[(y * im.ancho + x) * canal + 3] : 255)
  for (let y = 1; y < im.alto - 1; y++) {
    const gy = Math.min(GY - 1, Math.floor(y / im.alto * GY))
    for (let x = 1; x < im.ancho - 1; x++) {
      if (A(x, y) < 128) continue
      const gx = Math.min(GX - 1, Math.floor(x / im.ancho * GX))
      const g = Math.abs(L(x + 1, y) - L(x - 1, y)) + Math.abs(L(x, y + 1) - L(x, y - 1))
      G[gy * GX + gx] += g
      n[gy * GX + gx]++
    }
  }
  // una celda esta OCUPADA si su gradiente medio pasa el umbral de un borde real. Medido sobre los
  // recursos de este repo: una mancha de luz radial da 0,4-1,5; un panel de documento da 18-60.
  const celdas = new Uint8Array(GX * GY)
  for (let i = 0; i < GX * GY; i++) celdas[i] = n[i] > 20 && G[i] / n[i] > 12 ? 1 : 0
  const r = { celdas, densidad: celdas.reduce((a, b) => a + b, 0) / (GX * GY) }
  cacheGrilla.set(archivo, r)
  return r
}

// ---------------------------------------------------------------- EL CONTROL NEGATIVO
// UNA COMPUERTA QUE NUNCA SE VIO FALLAR NO ESTA PROBADA. La rama de "titular sobre contenido" no
// disparo ni una vez sobre la pieza que la motivo —porque esa pieza ya estaba corregida— y una rama
// que nunca corrio puede estar rota de cualquier forma: un signo cambiado, una coordenada al reves.
//
// `--inyectar` fabrica el defecto a proposito: agarra el titular mas grande y el recurso con mas
// estructura, los hace convivir y clava el titular en el centro del panel. Si con eso la compuerta NO
// falla, la compuerta esta rota y da igual lo que diga sobre las piezas de verdad.
if (process.argv.includes('--inyectar')) {
  const K0 = cinematica(doc)
  const textos0 = doc.capas.filter(c => c.tipo === 'texto' && rectanguloDe(c) && !/^deco|^letra-/i.test(c.nombre))
  const av0 = doc.capas.filter(c => c.tipo === 'av' && c.origen?.copiado && rectanguloDe(c))
  const titular = textos0.sort((a, b) => (b.texto?.tamano || 0) - (a.texto?.tamano || 0))[0]
  let panel = null, mejor = -1
  for (const c of av0) {
    const g = ocupacionDe(c.origen.copiado)
    if (g && g.densidad > mejor) { mejor = g.densidad; panel = c }
  }
  if (!titular || !panel) { console.error('no hay con que inyectar'); process.exit(2) }
  // el titular pasa a vivir exactamente cuando vive el panel
  titular.entra = panel.entra; titular.sale = panel.sale
  const f0 = Math.round((panel.entra + panel.sale) / 2 * K0.fps)
  K0.enCuadro(f0)
  const q = K0.esquinas(panel, f0 / K0.fps)
  // NO EL CENTRO GEOMETRICO: EL CENTRO DE LO OCUPADO. Un panel de documento tiene el texto arriba a la
  // izquierda y el medio vacio; clavar el titular en el centro lo pone justo donde no estorba, y la
  // inyeccion sale verde por el motivo equivocado. Se apunta al centroide de las celdas con estructura.
  const g0 = ocupacionDe(panel.origen.copiado)
  let su = 0, sv = 0, sn = 0
  for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
    if (!g0.celdas[gy * GX + gx]) continue
    su += (gx + 0.5) / GX; sv += (gy + 0.5) / GY; sn++
  }
  const u = sn ? su / sn : 0.5, v = sn ? sv / sn : 0.5
  const bil = (i) => (1 - u) * (1 - v) * q[0][i] + u * (1 - v) * q[1][i] + u * v * q[2][i] + (1 - u) * v * q[3][i]
  const cx = bil(0), cy = bil(1)
  const fijo = (v) => ({ estatico: [v], pistas: [], base: [v] })
  titular.transformacion.posX = fijo(cx)
  titular.transformacion.posY = fijo(cy)
  titular.transformacion.opacidad = fijo(100)
  titular.transformacion.escala = { estatico: [100, 100], pistas: [], base: [100, 100] }
  // Y SE CONGELA TAMBIEN EL PANEL. Un control negativo tiene que aislar UNA cosa: si el panel sigue
  // entrando, el filtro de transito descarta el par por moverse — que es correcto — y la rama que se
  // queria probar no llega a correr. Congelado en su pose de ese instante, lo unico que se pone a
  // prueba es "hay estructura debajo del titular".
  for (const k of ['posX', 'posY', 'posZ', 'escala', 'rotacion', 'opacidad']) {
    const pr = panel.transformacion[k]
    if (!pr) continue
    const dims = Math.max(1, pr.pistas?.length || 1)
    const val = []
    for (let d = 0; d < dims; d++) val.push(propEn(panel.transformacion, k, d, f0 / K0.fps, k === 'opacidad' ? 100 : 0))
    panel.transformacion[k] = { estatico: val, pistas: [], base: val }
  }
  panel.transformacion.opacidad = fijo(100)
  console.log(`INYECTADO: "${titular.nombre}" clavado en el centro de "${panel.nombre}" ` +
    `(densidad ${(mejor * 100).toFixed(0)}%), ${panel.entra.toFixed(2)}-${panel.sale.toFixed(2)} s\n`)
}

const PORQUE = process.argv.includes('--porque')
const PORQUE_DATOS = []

const K = cinematica(doc)
const { ancho, alto, fps } = K
const CUADROS = Math.round(doc.comp.duracion * fps)


// ---------------------------------------------------------------- bilineal inversa
// Pasar de un punto de pantalla a coordenadas (u,v) del panel. Con perspectiva fuerte el cuadrilatero
// NO es un paralelogramo, asi que interpolar sobre su caja envolvente se equivoca por decenas de
// pixeles justo donde importa. La inversa exacta es una cuadratica y se resuelve una vez por punto.
function uvEn(q, px, py) {
  const [p0, p1, p2, p3] = q
  const ax = p0[0] - p1[0] + p2[0] - p3[0], ay = p0[1] - p1[1] + p2[1] - p3[1]
  const bx = p1[0] - p0[0], by = p1[1] - p0[1]
  const cx = p3[0] - p0[0], cy = p3[1] - p0[1]
  const dx = px - p0[0], dy = py - p0[1]
  // LOS SIGNOS SALEN DE LA DERIVACION, NO DE LA MEMORIA. La primera version tenia A y medio B
  // invertidos respecto de C, asi que la cuadratica era otra ecuacion: devolvia (u,v) fuera de [0,1]
  // SIEMPRE, y la compuerta informaba "0 de 45 muestras dentro del panel" con un solape del 100%. Sin
  // el control negativo se publicaba una rama que no funcionaba nunca.
  //   d = u·b + v·c + uv·a   ->   igualando las dos despejadas de u:
  //   (cx·ay − cy·ax)·v² + (dy·ax − dx·ay + cx·by − cy·bx)·v + (dy·bx − dx·by) = 0
  const A = cx * ay - cy * ax
  const B = dy * ax - dx * ay + cx * by - cy * bx
  const C = dy * bx - dx * by
  let v
  if (Math.abs(A) < 1e-9) { if (Math.abs(B) < 1e-12) return null; v = -C / B }
  else {
    const disc = B * B - 4 * A * C
    if (disc < 0) return null
    const r = Math.sqrt(disc)
    const v1 = (-B + r) / (2 * A), v2 = (-B - r) / (2 * A)
    v = (v1 >= -0.02 && v1 <= 1.02) ? v1 : v2
  }
  const den1 = bx + v * ax, den2 = by + v * ay
  const u = Math.abs(den1) > Math.abs(den2) ? (dx - v * cx) / den1 : (dy - v * cy) / den2
  if (!isFinite(u) || !isFinite(v)) return null
  return [u, v]
}

// PRUEBA DE LA INVERSA, con una respuesta que se conoce de antemano. Corre siempre porque cuesta
// microsegundos y porque una funcion geometrica equivocada no da error: da numeros.
;(function pruebaUV() {
  const cuadrado = [[100, 100], [300, 100], [300, 200], [100, 200]]
  const casos = [[[100, 100], 0, 0], [[300, 100], 1, 0], [[300, 200], 1, 1], [[100, 200], 0, 1], [[200, 150], 0.5, 0.5]]
  for (const [pt, u0, v0] of casos) {
    const r = uvEn(cuadrado, pt[0], pt[1])
    if (!r || Math.abs(r[0] - u0) > 1e-6 || Math.abs(r[1] - v0) > 1e-6) {
      console.error(`bilineal inversa ROTA: ${pt} deberia dar (${u0},${v0}) y dio ${r}`)
      process.exit(3)
    }
  }
  // y uno con perspectiva de verdad: un trapecio, comprobado yendo y volviendo
  const trapecio = [[100, 100], [500, 140], [420, 300], [160, 260]]
  for (const [u0, v0] of [[0.25, 0.4], [0.8, 0.15], [0.6, 0.9]]) {
    const bx = (i) => (1 - u0) * (1 - v0) * trapecio[0][i] + u0 * (1 - v0) * trapecio[1][i] +
                      u0 * v0 * trapecio[2][i] + (1 - u0) * v0 * trapecio[3][i]
    const r = uvEn(trapecio, bx(0), bx(1))
    if (!r || Math.abs(r[0] - u0) > 1e-5 || Math.abs(r[1] - v0) > 1e-5) {
      console.error(`bilineal inversa ROTA en perspectiva: (${u0},${v0}) volvio como ${r}`)
      process.exit(3)
    }
  }
})()

const caja = (q) => ({
  x0: Math.min(...q.map(p => p[0])), x1: Math.max(...q.map(p => p[0])),
  y0: Math.min(...q.map(p => p[1])), y1: Math.max(...q.map(p => p[1])),
})
const solape = (a, b) => {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
  if (w <= 0 || h <= 0) return 0
  return (w * h) / Math.max(1, (a.x1 - a.x0) * (a.y1 - a.y0))
}

// ---------------------------------------------------------------- la pasada
const textos = doc.capas.filter(c => c.tipo === 'texto' && rectanguloDe(c) && !esDecorativa(c))
const imagenes = doc.capas.filter(c => c.tipo === 'av' && c.origen?.copiado && rectanguloDe(c) && !esDecorativa(c))
const choques = new Map()
const separacionPrevia = new Map()   // "a|b" -> distancia entre centros en el cuadro anterior
// devuelve true si los dos se estan separando (o juntando) rapido: eso es un cruce, no un apilado
function enTransito(clave, ax, ay, bx, by) {
  const d = Math.hypot(ax - bx, ay - by)
  const ant = separacionPrevia.get(clave)
  separacionPrevia.set(clave, d)
  return ant !== undefined && Math.abs(d - ant) > APERTURA
}

const anotar = (clase, a, b, f, dato) => {
  const clave = `${clase}|${a}|${b}`
  const g = choques.get(clave) || { clase, a, b, cuadros: [], peor: 0, dato: '' }
  g.cuadros.push(f)
  if (dato.valor > g.peor) { g.peor = dato.valor; g.dato = dato.texto }
  choques.set(clave, g)
}

for (let f = 0; f < CUADROS; f++) {
  K.enCuadro(f)
  const t = f / fps
  const vivos = (c) => t >= c.entra - 1e-9 && t < c.sale - 1e-9 && c.visible !== false

  const rotulos = []
  for (const c of textos) {
    if (!vivos(c)) continue
    const op = propEn(c.transformacion, 'opacidad', 0, t, 100)
    if (op < 55) continue
    const q = K.esquinas(c, t)
    if (!q) continue
    const cj = caja(q)
    // ALTURA EFECTIVA DE CARACTER, igual que en `lectura-check`: la caja de tinta depende del alfabeto
    const factor = (cj.y1 - cj.y0) / Math.max(c.caja.alto, 1)
    const h = (c.texto.tamano * factor) / alto
    if (h < ALTURA_ROTULO) continue
    rotulos.push({ c, q, cj, op, h, cx: (cj.x0 + cj.x1) / 2, cy: (cj.y0 + cj.y1) / 2 })
  }

  // ---- texto sobre texto: los dos legibles, en el mismo lugar
  for (let i = 0; i < rotulos.length; i++) {
    for (let j = i + 1; j < rotulos.length; j++) {
      const s = Math.max(solape(rotulos[i].cj, rotulos[j].cj), solape(rotulos[j].cj, rotulos[i].cj))
      if (s < SOLAPE_MINIMO) continue
      const A = rotulos[i], B = rotulos[j]
      if (esCaracter(A.c) && esCaracter(B.c)) continue                   // la misma palabra desarmada
      if (enTransito(`t${A.c.indice}|${B.c.indice}`, A.cx, A.cy, B.cx, B.cy)) continue
      const [a, b] = rotulos[i].h >= rotulos[j].h ? [rotulos[i], rotulos[j]] : [rotulos[j], rotulos[i]]
      anotar('texto sobre texto', a.c.nombre, b.c.nombre, f,
        { valor: s, texto: `${(s * 100).toFixed(0)}% de solape, los dos al ${Math.round(Math.min(a.op, b.op))}% o mas` })
    }
  }
  if (!rotulos.length) continue

  // ---- texto sobre contenido ocupado
  for (const c of imagenes) {
    if (!vivos(c)) continue
    const op = propEn(c.transformacion, 'opacidad', 0, t, 100)
    if (op < OPACIDAD_MINIMA) continue
    const grilla = ocupacionDe(c.origen.copiado)
    if (!grilla || grilla.densidad < 0.02) continue          // un recurso vacio no estorba
    const q = K.esquinas(c, t)
    if (!q) continue
    const cj = caja(q)
    const cx = (cj.x0 + cj.x1) / 2, cy = (cj.y0 + cj.y1) / 2
    for (const r of rotulos) {
      const sol = solape(r.cj, cj)
      const trans = enTransito(`i${r.c.indice}|${c.indice}`, r.cx, r.cy, cx, cy)
      // UNA COMPUERTA QUE NO DISPARA TIENE QUE PODER DECIR POR QUE. Sin esto, "no encontro nada" y
      // "esta rota" se ven exactamente igual — y ya me paso: la rama del panel no disparaba ni con el
      // defecto inyectado a proposito, y sin este informe habria seguido buscando en el lugar
      // equivocado. `--porque` imprime el descarte de cada par que llego a mirarse.
      if (PORQUE && sol > 0.05) {
        PORQUE_DATOS.push(`f${f} "${r.c.nombre}" vs "${c.nombre}": solape ${(sol * 100).toFixed(0)}%` +
          (sol < SOLAPE_MINIMO ? ' -> DESCARTE por solape chico' : trans ? ' -> DESCARTE por transito' : ''))
      }
      if (sol < SOLAPE_MINIMO) continue
      if (trans) continue
      // se muestrea la caja del titular en una grilla de 9x5 y se pregunta que hay debajo
      let dentro = 0, ocupadas = 0
      for (let sy = 0; sy < 5; sy++) {
        for (let sx = 0; sx < 9; sx++) {
          const px = r.cj.x0 + (r.cj.x1 - r.cj.x0) * (sx + 0.5) / 9
          const py = r.cj.y0 + (r.cj.y1 - r.cj.y0) * (sy + 0.5) / 5
          const uv = uvEn(q, px, py)
          if (!uv || uv[0] < 0 || uv[0] > 1 || uv[1] < 0 || uv[1] > 1) continue
          dentro++
          const gx = Math.min(GX - 1, Math.floor(uv[0] * GX))
          const gy = Math.min(GY - 1, Math.floor(uv[1] * GY))
          if (grilla.celdas[gy * GX + gx]) ocupadas++
        }
      }
      if (PORQUE) PORQUE_DATOS.push(`      muestras dentro del panel ${dentro}/45 · ocupadas ${ocupadas} (${dentro ? (100 * ocupadas / dentro).toFixed(0) : 0}%)`)
      if (dentro < 6) continue
      const fr = ocupadas / dentro
      if (fr < OCUPACION_ALTA) continue
      anotar('titular sobre contenido', r.c.nombre, c.nombre, f,
        { valor: fr, texto: `${(fr * 100).toFixed(0)}% del titular sobre estructura, el panel al ${Math.round(op)}%` })
    }
  }
}

// ---------------------------------------------------------------- el veredicto
const lista = [...choques.values()]
  .filter(g => g.cuadros.length >= CUADROS_MINIMOS)
  .sort((a, b) => b.cuadros.length - a.cuadros.length)

console.log(`COLISION — "${doc.comp.nombre}" · ${CUADROS} cuadros · ${textos.length} textos · ${imagenes.length} imagenes`)
console.log(`  umbrales: rotulo >=${(ALTURA_ROTULO * 100).toFixed(1)}% del alto · solape >=${SOLAPE_MINIMO * 100}% · ocupacion >=${OCUPACION_ALTA * 100}% · duracion >=${CUADROS_MINIMOS} cuadros\n`)

if (!lista.length) console.log('  ninguna')
for (const g of lista) {
  const a = Math.min(...g.cuadros), b = Math.max(...g.cuadros)
  console.log(`  ${g.clase}`)
  console.log(`    "${g.a}"  sobre  "${g.b}"`)
  console.log(`    cuadros ${a}-${b} (${g.cuadros.length}) · peor: ${g.dato}\n`)
}

if (PORQUE) {
  console.log('  POR QUE NO DISPARO (los primeros 25 pares que se miraron):')
  for (const l of PORQUE_DATOS.slice(0, 25)) console.log('    ' + l)
  console.log('')
}
console.log('='.repeat(72))
if (!lista.length) console.log('COLISION OK — nada legible cae encima de otra cosa legible')
else console.log(`COLISION NO PASA — ${lista.length} choque(s)`)
process.exit(lista.length ? 1 : 0)

// PONER UNA IMAGEN PROPIA EN LUGAR DE UN PLACEHOLDER DE LA PIEZA.
//
// El sistema de recursos del motor son seis lineas (`tools/ae/gesto/nucleo.jsx:459`): el nombre del
// archivo ES la clave, y la ruta se arma concatenando `RECURSOS + "/" + nombre + ".png"`. O sea que
// para cambiar una imagen alcanza con dejar un PNG con el mismo nombre en la carpeta. No hay
// manifiesto, no hay registro y no hay validacion de ningun tipo.
//
// Justamente por eso existe esta herramienta: "alcanza con dejar el archivo" es cierto y es una
// trampa. Hay cinco cosas que si se hacen mal no dan error, no las caza ninguna compuerta, y se
// descubren mirando el video:
//
//   1. LA EXTENSION ESTA CLAVADA. `.png` esta concatenado en el codigo. Un JPG, un WEBP o un AVIF no
//      entran ni renombrando el `.jsx`. Aca se convierten.
//
//   2. LA ESCALA ES UN PORCENTAJE DEL NATIVO, no un tamano. Si tu imagen tiene otra cantidad de
//      pixeles que el placeholder, se dibuja MAS CHICA O MAS GRANDE en pantalla y la composicion se
//      corre. Por defecto esto redimensiona tu imagen a los pixeles del placeholder, y asi la escala
//      de la pieza NO SE TOCA.
//
//   3. EL TAMANO EN PANTALLA NO ES `nativo x escala`. Hay camara, las capas viven en Z distintos y
//      algunas cuelgan de un padre. `marca` esta al 50,5% de 1040 px —526 por la cuenta plana— y en
//      pantalla mide 576, un 8,7% mas, porque z=+30 con la camara ya adelantada. La primera version de
//      esta herramienta hacia la cuenta plana y por eso informaba "2,09x, bien" sobre un caso que en
//      realidad daba 1,91x, por debajo del piso. Aca se proyecta con `cinematica.mjs`, el mismo
//      evaluador que usa la compuerta, asi que los numeros son los de la compuerta.
//
//   4. LA NITIDEZ QUE IMPORTA ES LA DE TU ARCHIVO, y depende del modo. En `cubrir` se descarta parte
//      de la imagen, asi que contar todos sus pixeles miente hacia el lado peligroso: una panoramica
//      de 4000 px recortada al 77% deja ~880 px utiles, y decir "8,33x, bien" cuando son 1,83x es
//      exactamente al reves de lo que hay que decir. La cuenta correcta es una sola para los tres
//      modos: los pixeles de origen QUE SOBREVIVEN, contra los pixeles de pantalla que ocupan.
//
//   5. EL FILO GRIS VIENE HORNEADO EN EL PLACEHOLDER. Los recortes son pedazos de una pagina blanca
//      (#FFFFFF) apoyados sobre papel (#FAFAF8): 2% de diferencia, o sea que sin un borde dibujado no
//      se ve donde termina el recorte (`recursos-m/interfaz.mjs:468`). Se decide midiendo los cuatro
//      bordes POR SEPARADO y quedandose con el peor: promediarlos deja que dos bordes con contenido
//      tapen dos bordes que se derriten en el papel, y ese falso negativo ya se midio.
//
// TODO SALE DEL DOCUMENTO EXPORTADO, no de una tabla escrita a mano. Una tabla se desactualiza en
// silencio la primera vez que alguien cambia una escala; el documento no puede.
//
// USO
//   node tools/ae/poner-imagen.mjs --listar
//   node tools/ae/poner-imagen.mjs m-corte-1 C:/fotos/mi-foto.jpg
//   node tools/ae/poner-imagen.mjs m-web C:/fotos/captura.png --modo encajar
//   node tools/ae/poner-imagen.mjs m-corte-2 C:/fotos/otra.png --filo
//   node tools/ae/poner-imagen.mjs --restaurar m-corte-1
//   node tools/ae/poner-imagen.mjs --restaurar-todo
//
// DESPUES DE CAMBIAR CUALQUIER COSA HAY QUE RECONSTRUIR. After Effects cachea el metraje importado:
// si se reemplaza el PNG en disco y no se reconstruye la comp, AE sigue dibujando el viejo. No es una
// teoria — el 21/8/2026 se cambiaron cuatro recortes, se pidieron los cuadros y salieron identicos
// byte a byte hasta reconstruir.

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { loadImage, createCanvas } from '@napi-rs/canvas'
import { cinematica, rectanguloDe } from './cinematica.mjs'

const DOC = process.env.PIEZA_JSON || 'C:/ae-probe/pieza-m.json'
const RECURSOS = process.env.RECURSOS_M || 'C:/ae-probe/recursos-m'
const RESPALDO = join(RECURSOS, '_originales')
const PIEZA = 'tools/ae/sondas/pieza-m.jsx'

const PAPEL = [250, 250, 248]
const BLANCO = [255, 255, 255]
const FILO = [201, 202, 200]   // P.grisClaro de los generadores
const FILO_PX = 3              // el mismo grosor que `interfaz.mjs:479`
const UMBRAL_FILO = 12         // en unidades de 0..255, sobre el PEOR de los cuatro bordes

// Las que `lectura-check.mjs:47` exime de Q2 por nombre de capa. Se repite aca para poder DECIR que la
// compuerta no las va a mirar, en vez de prometer un numero que nunca se va a imprimir.
const EXENTAS_Q2 = /^deco|^textura|^grano/i

const n2 = (v) => (Number.isFinite(v) ? (Math.round(v * 100) / 100).toFixed(2) : '?')
const dist = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))

function morir (msg) { console.error('\n  ' + msg + '\n'); process.exit(1) }

// ---------------------------------------------------------------- la proyeccion, igual que la compuerta
//
// `cinematica.mjs` es el evaluador del repo: aplica la camara, la Z, la cadena de padres, la escala
// vectorial y el escorzo. Reimplementarlo con `ancho * escala / 100` es lo que hacia la version
// anterior, y daba hasta 31,7% de error sobre `deco-fondo`.
function huellaMaxima (K, capa, fps, cuadros) {
  let mejor = null
  const f0 = Math.max(0, Math.round(capa.entra * fps))
  const f1 = Math.min(cuadros - 1, Math.round(capa.sale * fps) - 1)
  for (let f = f0; f <= f1; f++) {
    K.enCuadro(f)
    let q = null
    try { q = K.esquinas(capa, f / fps) } catch (e) { q = null }
    if (!q) continue
    const xs = q.map(v => v[0]), ys = q.map(v => v[1])
    const ancho = Math.max(...xs) - Math.min(...xs)
    const alto = Math.max(...ys) - Math.min(...ys)
    if (!Number.isFinite(ancho) || !Number.isFinite(alto)) continue
    if (!mejor || ancho > mejor.ancho) mejor = { ancho, alto, cuadro: f }
  }
  return mejor
}

function escalaEn (prop) {
  if (!prop) return null
  if (prop.estatico) return Math.abs(prop.estatico[0])
  if (prop.horneado && prop.horneado.length) {
    let m = 0
    for (const v of prop.horneado) { const x = Math.abs(Array.isArray(v) ? v[0] : v); if (x > m) m = x }
    return m
  }
  if (prop.pistas && prop.pistas.length) {
    const eje = prop.pistas.find(p => p.componente === 0) || prop.pistas[0]
    let m = 0
    for (const t of (eje.tramos || [])) for (const v of [t.v1, t.v2]) { const x = Math.abs(v); if (x > m) m = x }
    return m
  }
  return null
}

// ---------------------------------------------------------------- el censo
//
// UNA RANURA PUEDE TENER VARIOS USOS Y NO SE PUEDEN PROMEDIAR. `m-punto` es a la vez la tapa de la
// pildora (48%, cuadros 0-72) y las dos puntas de la barra de datos (2,5%, cuadros 372-434). Juntarlos
// en un `min/max` producia tres mentiras de una: un rango "0-434" que incluye 300 cuadros donde el
// recurso no esta en pantalla, un cuadro sugerido (217) donde NINGUNA de las cuatro capas existe, y un
// consejo de escala que nombraba una capa y le daba el numero de otra.
function censo () {
  if (!existsSync(DOC)) {
    morir(`no encuentro el documento ${DOC}.\n  ` +
          `Exportalo primero:  printf 'PIEZA-M' > C:/ae-probe/exportar-comp.txt\n  ` +
          `                    node tools/ae/llamar.mjs tools/ae/sondas/exportar.jsx\n  ` +
          `                    node tools/ae/comp.mjs --json ${DOC}`)
  }
  const doc = JSON.parse(readFileSync(DOC, 'utf8'))
  const fps = doc.comp.fps || 30            // del documento, no clavado en 30
  const cuadros = Math.max(...doc.capas.map(c => Math.round((c.sale || 0) * fps)), 1)
  const K = cinematica(doc)
  const ranuras = new Map()

  for (const c of doc.capas) {
    const o = c.origen
    if (!o || !o.copiado || !rectanguloDe(c)) continue
    const nombre = o.copiado.replace(/\.png$/i, '')
    const h = huellaMaxima(K, c, fps, cuadros)
    if (!h) continue
    const uso = {
      capa: c.nombre,
      escala: escalaEn(c.transformacion && c.transformacion.escala),
      anchoDib: h.ancho,
      altoDib: h.alto,
      entra: Math.round(c.entra * fps),
      sale: Math.round(c.sale * fps),
      exenta: EXENTAS_Q2.test(c.nombre),
    }
    const previo = ranuras.get(nombre)
    if (previo) previo.usos.push(uso)
    else ranuras.set(nombre, { nombre, ancho: o.ancho, alto: o.alto, fps, usos: [uso] })
  }
  // el uso PRINCIPAL es el que se dibuja mas grande: es el que decide cuantos pixeles hacen falta
  for (const r of ranuras.values()) {
    r.usos.sort((a, b) => b.anchoDib - a.anchoDib)
    r.principal = r.usos[0]
  }
  return ranuras
}

// UN RESPALDO DE 0 BYTES NO ES UN RESPALDO. `existsSync` como unico test dejaba pasar un archivo
// truncado, y despues `--restaurar` dejaba la ranura vacia diciendo "restaurado el original".
function respaldoValido (nombre) {
  const p = join(RESPALDO, nombre + '.png')
  if (!existsSync(p)) return null
  try { return statSync(p).size > 64 ? p : null } catch (e) { return null }
}

// ---------------------------------------------------------------- --listar
function listar () {
  const ranuras = censo()
  console.log(`\n  RANURAS DE ${basename(DOC)} — lo que se puede reemplazar\n`)
  console.log('  ' + 'ranura'.padEnd(20) + 'nativo'.padEnd(13) + 'en pantalla'.padEnd(14) +
              'cuadros'.padEnd(12) + 'estado')
  console.log('  ' + '-'.repeat(84))
  const orden = [...ranuras.values()].sort((a, b) => a.principal.entra - b.principal.entra)
  for (const r of orden) {
    const p = r.principal
    console.log('  ' + r.nombre.padEnd(20) +
                `${r.ancho}x${r.alto}`.padEnd(13) +
                `${Math.round(p.anchoDib)}x${Math.round(p.altoDib)}`.padEnd(14) +
                `${p.entra}-${p.sale}`.padEnd(12) +
                (respaldoValido(r.nombre) ? 'TUYA (hay respaldo)' : 'original'))
    if (r.usos.length > 1 || r.usos[0].exenta) {
      for (const u of r.usos) {
        console.log('  ' + ' '.repeat(20) + `${u.capa}  esc ${n2(u.escala)}%  ` +
                    `${Math.round(u.anchoDib)}x${Math.round(u.altoDib)} px  cuadros ${u.entra}-${u.sale}` +
                    (u.exenta ? '  [Q2 la exime]' : ''))
      }
    }
  }

  // Las que el generador escribe y la pieza NO usa. `Gf.ecualizador` y `Gf.barraQueSeLlena` reciben los
  // parametros `archivo` y `cama` Y NO LOS LEEN — arman solidos. Saberlo evita una tarde de "lo cambie
  // y no pasa nada".
  const enDisco = existsSync(RECURSOS)
    ? readdirSync(RECURSOS).filter(f => /\.png$/i.test(f)).map(f => f.replace(/\.png$/i, ''))
    : []
  const huerfanas = enDisco.filter(f => !ranuras.has(f))
  if (huerfanas.length) {
    console.log(`\n  EN LA CARPETA PERO SIN USO EN LA PIEZA (cambiarlas no cambia el video):`)
    console.log('    ' + huerfanas.join(', '))
  }
  console.log(`\n  carpeta: ${RECURSOS}   ·   ${ranuras.size} ranuras   ·   ${orden[0].fps} fps`)
  console.log(`  para reemplazar:  node tools/ae/poner-imagen.mjs <ranura> <tu-archivo>\n`)
}

// ---------------------------------------------------------------- --restaurar
function restaurar (cual) {
  const ranuras = censo()
  if (!existsSync(RESPALDO)) morir('no hay ningun respaldo: no reemplazaste nada todavia.')
  // SOLO SE RESTAURAN NOMBRES DEL CENSO. Sin esto, `--restaurar ../mi-foto` escribia FUERA de la
  // carpeta de recursos, y cualquier PNG suelto dentro de `_originales` se copiaba como si fuera un
  // respaldo. `poner` ya validaba contra el censo; `restaurar` no validaba nada.
  if (cual !== '*' && !ranuras.has(cual)) {
    morir(`"${cual}" no es una ranura de ${basename(DOC)}.\n  ` +
          `Vela todas con:  node tools/ae/poner-imagen.mjs --listar`)
  }
  const hay = readdirSync(RESPALDO)
    .filter(f => /\.png$/i.test(f))
    .map(f => f.replace(/\.png$/i, ''))
    .filter(n => ranuras.has(n))
  const lista = cual === '*' ? hay : [cual]
  if (!lista.length) morir('no hay respaldos que restaurar.')
  let n = 0
  for (const nombre of lista) {
    const orig = respaldoValido(nombre)
    if (!orig) { console.log(`  ${nombre}: no tiene respaldo valido, lo dejo como esta`); continue }
    copyFileSync(orig, join(RECURSOS, nombre + '.png'))
    // EL RESPALDO SE BORRA AL RESTAURAR. Si queda, `--listar` sigue diciendo "TUYA (hay respaldo)"
    // sobre una ranura que ya volvio al original, y el conjunto de `--restaurar-todo` solo crece.
    rmSync(orig)
    console.log(`  ${nombre}: restaurado el original`)
    n++
  }
  if (n) console.log(`\n  Reconstrui para que AE lo tome:  node tools/ae/llamar.mjs ${PIEZA}\n`)
}

// ---------------------------------------------------------------- medir alfa y bordes
//
// TRES CATEGORIAS, NO DOS. Contar como "transparente" todo lo que no sea opaco puro hacia informar que
// `m-sombra-contacto` era "100% transparente" — y es una mancha con tinta visible en el 54% de sus
// pixeles. Semitransparente no es transparente.
async function perfilAlfa (ruta) {
  try {
    const im = await loadImage(ruta)
    const c = createCanvas(Math.min(im.width, 240), Math.min(im.height, 240))
    const g = c.getContext('2d')
    g.drawImage(im, 0, 0, c.width, c.height)
    const d = g.getImageData(0, 0, c.width, c.height).data
    let vacio = 0, medio = 0, opaco = 0
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] < 8) vacio++; else if (d[i] < 250) medio++; else opaco++
    }
    const n = vacio + medio + opaco
    return n ? { vacio: vacio / n, medio: medio / n, opaco: opaco / n } : null
  } catch (e) { return null }
}

// LOS CUATRO BORDES POR SEPARADO, Y DECIDE EL PEOR. Promediados, una imagen con dos bordes a distancia
// 0 del papel y dos con contenido daba 14/255 y no ponia filo — falso negativo medido, con el borde de
// arriba y el de abajo derritiendose en el fondo.
function medirBordes (ctx, w, h) {
  const franja = Math.max(2, Math.round(Math.min(w, h) * 0.01))
  const zonas = {
    arriba: [0, 0, w, franja], abajo: [0, h - franja, w, franja],
    izquierda: [0, 0, franja, h], derecha: [w - franja, 0, franja, h],
  }
  const out = []
  for (const [lado, [x, y, aw, ah]] of Object.entries(zonas)) {
    const d = ctx.getImageData(x, y, aw, ah).data
    let r = 0, g = 0, b = 0, n = 0
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue
      r += d[i]; g += d[i + 1]; b += d[i + 2]; n++
    }
    if (!n) { out.push({ lado, medio: null, cerca: 999, contra: '-' }); continue }
    const medio = [r / n, g / n, b / n]
    const aPapel = dist(medio, PAPEL), aBlanco = dist(medio, BLANCO)
    out.push({ lado, medio, cerca: Math.min(aPapel, aBlanco), contra: aPapel <= aBlanco ? 'papel' : 'blanco' })
  }
  const conTinta = out.filter(o => o.medio !== null)
  const peor = conTinta.length ? conTinta.reduce((a, b) => (b.cerca < a.cerca ? b : a)) : null
  return { bordes: out, peor }
}

// Canvas descarta EN SILENCIO un fillStyle impareseable y deja el anterior. Se detecta poniendo un
// centinela conocido antes: si no cambio, el color no se tomo. Sin esto, `--relleno pepito` pintaba
// 620 px de banda NEGRA sobre papel claro, el informe decia "relleno pepito", y salia con codigo 0.
function colorValido (css) {
  if (typeof css !== 'string' || !css.trim()) return false
  const g = createCanvas(1, 1).getContext('2d')
  g.fillStyle = '#010203'
  g.fillStyle = css
  return g.fillStyle !== '#010203'
}

// ---------------------------------------------------------------- poner
async function poner (nombre, fuente, opciones) {
  const ranuras = censo()
  const r = ranuras.get(nombre)
  if (!r) {
    const cercanas = [...ranuras.keys()].filter(k => k.startsWith(nombre.slice(0, 6)))
    morir(`la ranura "${nombre}" no existe en ${basename(DOC)}.` +
          (cercanas.length ? `\n  Quisiste decir: ${cercanas.join(', ')}?` : '') +
          `\n  Vela todas con:  node tools/ae/poner-imagen.mjs --listar`)
  }
  if (!existsSync(fuente)) morir(`no encuentro el archivo ${fuente}`)
  if (resolve(fuente) === resolve(join(RECURSOS, nombre + '.png'))) {
    morir('la fuente y el destino son el mismo archivo.')
  }

  const yaHay = respaldoValido(nombre)
  const original = yaHay || join(RECURSOS, nombre + '.png')
  const alfaOriginal = existsSync(original) ? await perfilAlfa(original) : null

  let img
  try { img = await loadImage(fuente) } catch (e) {
    morir(`no pude leer ${basename(fuente)} como imagen (${e.message}).\n  ` +
          `Formatos que entran: png, jpg, webp, avif. Un PDF, un SVG o un video NO.`)
  }
  const sw = img.width, sh = img.height
  if (sw < 2 || sh < 2) morir(`${basename(fuente)} mide ${sw}x${sh}. Eso no es una imagen utilizable.`)
  const alfaFuente = await perfilAlfa(fuente)
  if (alfaFuente && alfaFuente.vacio > 0.995) {
    morir(`${basename(fuente)} es ${Math.round(alfaFuente.vacio * 100)}% transparente: no tiene nada ` +
          `dibujado.\n  Si la pusiera, la ranura "${nombre}" desapareceria del video sin que nada avise.`)
  }

  const p = r.principal
  const dw = opciones.sinRedimensionar ? sw : r.ancho
  const dh = opciones.sinRedimensionar ? sh : r.alto

  // EL RECORTE SE CALCULA CONTRA LA FORMA QUE SE VE, NO CONTRA LA DEL ARCHIVO.
  //
  // `pildora-barra` tiene escala vectorial `[24, 48, 100]`: su PNG es 2080x880 (aspecto 2,36) y en
  // pantalla sale 499x422 (aspecto 1,18), o sea aplastado al 51% en horizontal. Recortar con el
  // aspecto del archivo elegia un pedazo distinto del que iba a quedar a la vista.
  const aspectoArchivo = dw / dh
  const aspectoPantalla = p.altoDib > 0 ? p.anchoDib / p.altoDib : aspectoArchivo
  const aplastada = Math.abs(aspectoPantalla / aspectoArchivo - 1) > 0.03

  const cv = createCanvas(dw, dh)
  const g = cv.getContext('2d')
  g.imageSmoothingEnabled = true
  g.imageSmoothingQuality = 'high'

  let nota = ''
  let anchoUtil = sw            // pixeles de ORIGEN que sobreviven, a lo ancho
  let fraccionEnPantalla = 1    // que parte del ancho dibujado ocupa la imagen (encajar deja relleno)

  if (opciones.sinRedimensionar) {
    g.drawImage(img, 0, 0)
    nota = 'sin redimensionar'
  } else if (opciones.modo === 'cubrir') {
    let cw = sw, ch = sw / aspectoPantalla
    if (ch > sh) { ch = sh; cw = sh * aspectoPantalla }
    g.drawImage(img, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, dw, dh)
    anchoUtil = cw
    const usado = Math.round((cw * ch) / (sw * sh) * 100)
    nota = `cubrir: se usa el ${usado}% de tu imagen (el resto se recorta para llenar la caja)`
  } else if (opciones.modo === 'encajar') {
    g.fillStyle = opciones.relleno
    g.fillRect(0, 0, dw, dh)
    const aspFuente = sw / sh
    const w = aspFuente >= aspectoPantalla ? dw : dw * (aspFuente / aspectoPantalla)
    const h = aspFuente >= aspectoPantalla ? dh * (aspectoPantalla / aspFuente) : dh
    g.drawImage(img, (dw - w) / 2, (dh - h) / 2, w, h)
    fraccionEnPantalla = w / dw
    const banda = Math.round(Math.max(dw - w, dh - h) / 2)
    nota = `encajar: entra completa, con ${banda} px de relleno ${opciones.relleno} ` +
           `(ocupa el ${Math.round(fraccionEnPantalla * 100)}% del ancho de la ranura)`
  } else {
    const h = Math.round(sh * (dw / sw))
    const cv2 = createCanvas(dw, h)
    const g2 = cv2.getContext('2d')
    g2.imageSmoothingEnabled = true
    g2.imageSmoothingQuality = 'high'
    g2.drawImage(img, 0, 0, dw, h)
    return terminar(nombre, fuente, cv2, r, sw, sh, opciones, {
      nota: `ajustar: ancho ${dw}, alto ${h} (el placeholder media ${r.alto}; en pantalla va a quedar ` +
            `${h > r.alto ? 'MAS ALTA' : h < r.alto ? 'MAS BAJA' : 'igual'})`,
      anchoUtil: sw, fraccionEnPantalla: 1, alfaOriginal, alfaFuente, aplastada, aspectoPantalla, yaHay,
    })
  }

  return terminar(nombre, fuente, cv, r, sw, sh, opciones,
    { nota, anchoUtil, fraccionEnPantalla, alfaOriginal, alfaFuente, aplastada, aspectoPantalla, yaHay })
}

function terminar (nombre, fuente, cv, r, sw, sh, opciones, info) {
  const g = cv.getContext('2d')
  const p = r.principal

  const m = medirBordes(g, cv.width, cv.height)
  let filoPuesto = false
  const auto = m.peor !== null && m.peor.cerca <= UMBRAL_FILO
  const queHacer = opciones.filo === 'si' ? true : opciones.filo === 'no' ? false : auto
  if (queHacer) {
    const px = Math.max(FILO_PX, Math.round(cv.width / 800 * FILO_PX))
    g.strokeStyle = `rgb(${FILO[0]},${FILO[1]},${FILO[2]})`
    g.lineWidth = px
    g.strokeRect(px / 2, px / 2, cv.width - px, cv.height - px)
    filoPuesto = true
  }

  if (!existsSync(RESPALDO)) mkdirSync(RESPALDO, { recursive: true })
  const destino = join(RECURSOS, nombre + '.png')
  const respaldo = join(RESPALDO, nombre + '.png')
  let respaldado = false
  if (existsSync(destino) && !info.yaHay) { copyFileSync(destino, respaldo); respaldado = true }
  const hayVuelta = respaldado || !!info.yaHay
  writeFileSync(destino, cv.toBuffer('image/png'))

  // ------------------------------------------------------------ el informe
  const factor = opciones.sinRedimensionar ? cv.width / r.ancho : 1
  const anchoPantalla = p.anchoDib * factor

  console.log(`\n  ${nombre}  <-  ${basename(fuente)}`)
  console.log(`  ${'-'.repeat(76)}`)
  console.log(`  tu archivo        ${sw}x${sh}`)
  console.log(`  se guardo como    ${cv.width}x${cv.height}   ${destino}`)
  console.log(`  modo              ${info.nota}`)
  console.log(`  filo gris         ${filoPuesto ? 'SI' : 'no'} — ` +
              (m.peor === null
                ? 'todos los bordes son transparentes'
                : `el borde mas parecido al fondo es el de ${m.peor.lado}, a ${Math.round(m.peor.cerca)}/255 ` +
                  `del ${m.peor.contra} (umbral ${UMBRAL_FILO})`) +
              (opciones.filo !== 'auto' ? '  [lo pediste a mano]' : ''))
  if (respaldado) console.log(`  respaldo          ${respaldo}`)
  else if (info.yaHay) console.log(`  respaldo          ya existia de un reemplazo anterior`)

  console.log(`\n  DONDE SE VE (proyectado con la camara, igual que la compuerta):`)
  for (const u of r.usos) {
    console.log(`    ${u.capa.padEnd(24)} ${Math.round(u.anchoDib * factor)}x${Math.round(u.altoDib * factor)} px  ` +
                `cuadros ${u.entra}-${u.sale}${u === p ? '   <- el mas grande, manda la resolucion' : ''}`)
  }

  if (info.aplastada) {
    console.log(`\n  OJO, ESTA RANURA SE APLASTA: su PNG tiene aspecto ${n2(r.ancho / r.alto)} y en pantalla sale`)
    console.log(`  ${n2(info.aspectoPantalla)} (la capa lleva escala vectorial). El recorte se calculo contra el aspecto`)
    console.log(`  de PANTALLA, que es el que vas a ver — no contra el del archivo.`)
  }

  // LA NITIDEZ HONESTA: pixeles de origen que sobreviven, contra los pixeles de pantalla que ocupan.
  // Una sola cuenta para los tres modos. En `cubrir` `anchoUtil` es el recorte, no el archivo entero;
  // en `encajar` la imagen ocupa solo una fraccion del ancho dibujado.
  const anchoImagenEnPantalla = anchoPantalla * info.fraccionEnPantalla
  const nitidez = info.anchoUtil / anchoImagenEnPantalla
  const veredicto = nitidez >= 2 ? 'bien' : nitidez >= 1 ? 'JUSTO' : 'POCO'
  console.log(`\n  NITIDEZ REAL      ${n2(nitidez)}x  (${veredicto})  — ${Math.round(info.anchoUtil)} px utiles ` +
              `de tu imagen para ${Math.round(anchoImagenEnPantalla)} px de pantalla`)
  if (nitidez < 2) {
    console.log(`                    el piso del oficio es 2x. Con esta proporcion te haria falta una ` +
                `imagen de ${Math.ceil(sw * (2 / nitidez))} px de ancho.`)
    // Q2 NO SE PREDICE, SE EXPLICA. Predecir el numero exacto ya salio mal dos veces (se calculaba con
    // la cuenta plana y ni siquiera caia en la misma banda de la compuerta), y el "y va a decir que
    // esta bien" estaba clavado en el texto aunque el valor cayera en `justo`. Lo unico que el usuario
    // necesita entender es POR QUE la compuerta no lo puede proteger aca.
    console.log(`                    Y LA COMPUERTA NO TE VA A AVISAR: Q2 mide el PNG que acabamos de ` +
                `escribir, que ya tiene`)
    console.log(`                    ${cv.width} px, no los ${Math.round(info.anchoUtil)} que tenias de verdad.`)
  }
  if (p.exenta) {
    console.log(`                    (ademas esta capa esta EXENTA de Q2 por su nombre: la compuerta ni la mira)`)
  }

  if (info.alfaOriginal && info.alfaFuente) {
    const oRec = info.alfaOriginal.vacio + info.alfaOriginal.medio
    const fRec = info.alfaFuente.vacio + info.alfaFuente.medio
    if (oRec > 0.02 && fRec < 0.02) {
      console.log(`\n  ALFA              el placeholder era RECORTADO (${Math.round(info.alfaOriginal.vacio * 100)}% vacio, ` +
                  `${Math.round(info.alfaOriginal.medio * 100)}% semitransparente)`)
      console.log(`                    y tu imagen es un rectangulo opaco: va a tapar mas de lo que tapaba.`)
    }
  }

  if (opciones.sinRedimensionar && cv.width !== r.ancho) {
    console.log(`\n  COMO NO REDIMENSIONE, para conservar el encuadre hay que cambiar la escala de TODAS ` +
                `las capas que usan este archivo (en ${PIEZA}):`)
    for (const u of r.usos) {
      console.log(`    ${u.capa.padEnd(24)} escala ${n2(u.escala)} -> ${n2(u.escala * r.ancho / cv.width)}`)
    }
  }

  const cuadro = Math.round((p.entra + p.sale) / 2)
  console.log(`\n  AHORA, EN ESTE ORDEN:`)
  console.log(`    1. node tools/ae/llamar.mjs ${PIEZA}          <- obligatorio, AE cachea el metraje`)
  console.log(`    2. node tools/ae/cuadro-ae.mjs PIEZA-M ${cuadro}   <- ahi se ve ${p.capa}`)
  console.log(`\n  Y NO CORRAS los generadores de recursos-m/: redibujan el placeholder y te pisan el archivo.`)
  if (hayVuelta) console.log(`  Para volver atras:  node tools/ae/poner-imagen.mjs --restaurar ${nombre}`)
  else console.log(`  SIN VUELTA ATRAS para esta ranura: no habia un PNG previo que respaldar.`)
  console.log('')
}

// ---------------------------------------------------------------- linea de comandos
const args = process.argv.slice(2)
if (!args.length || args.includes('--ayuda') || args.includes('-h')) {
  const txt = readFileSync(new URL(import.meta.url)).toString()
  console.log('\n' + txt.split('// USO')[1].split('\nimport')[0]
    .split('\n').map(l => l.replace(/^\/\/ ?/, '  ')).join('\n'))
  process.exit(0)
}

if (args[0] === '--listar') { listar(); process.exit(0) }
if (args[0] === '--restaurar-todo') {
  // RECHAZA UN ARGUMENTO DE MAS. `--restaurar-todo m-corte-1` se leia como "restaurar TODO" y devolvia
  // cuatro ranuras, incluidas las que el usuario no habia tocado en esa sesion.
  if (args[1]) morir(`--restaurar-todo no lleva argumentos. Para una sola:  --restaurar ${args[1]}`)
  restaurar('*'); process.exit(0)
}
if (args[0] === '--restaurar') {
  if (!args[1]) morir('decime que ranura restaurar, o usa --restaurar-todo')
  restaurar(args[1]); process.exit(0)
}

const nombre = args[0]
const fuente = args[1]
if (!fuente || fuente.startsWith('--')) {
  morir(`falta el archivo.\n  node tools/ae/poner-imagen.mjs ${nombre} C:/ruta/a/tu-imagen.jpg`)
}

const valorDe = (bandera) => {
  const i = args.indexOf(bandera)
  if (i < 0) return null
  const v = args[i + 1]
  if (v === undefined || v.startsWith('--')) morir(`${bandera} necesita un valor.`)
  return v
}

const modo = valorDe('--modo') || 'cubrir'
if (!['cubrir', 'ajustar', 'encajar'].includes(modo)) {
  morir(`modo "${modo}" desconocido. Son tres:\n` +
        `    cubrir   (por defecto) llena la caja y recorta lo que sobra. La composicion no se mueve.\n` +
        `    encajar  entra completa, con relleno a los costados.\n` +
        `    ajustar  respeta el ancho y el alto queda donde caiga. La imagen manda sobre el diseno.`)
}
const relleno = valorDe('--relleno') || '#FFFFFF'
if (!colorValido(relleno)) {
  morir(`"${relleno}" no es un color que el lienzo entienda, y si lo dejara pasar pintaria NEGRO en\n` +
        `  silencio. Usa #RRGGBB, rgb(...) o un nombre CSS.`)
}

await poner(nombre, fuente, {
  modo,
  filo: args.includes('--filo') ? 'si' : args.includes('--sin-filo') ? 'no' : 'auto',
  sinRedimensionar: args.includes('--sin-redimensionar'),
  relleno,
})

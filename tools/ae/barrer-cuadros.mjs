// MIRAR UN VIDEO ENTERO, CUADRO POR CUADRO, SIN QUE NADIE TENGA QUE MANDAR CAPTURAS
//
// ================================================================================================
// POR QUE EXISTE
// ================================================================================================
//
// Thiago, despues de la tercera vez que tuvo que mandarme capturas de pantalla explicandome que
// pasaba en el video original:
//
//   "de verdad miras a detalle los videos? Si de verdad lo hicieras, esto no estaria pasando, de
//    tener que mandarte screenshots y explicarte a detalle lo que pasa en las escenas del video
//    original. Capaz me decis 'bueno si puedo ver los videos pero tendria que sacar 1200 capturas
//    para ver todo a detalle y no perderme de nada' — si es asi, cuanto pesaria cada captura?"
//
// La respuesta es que si puedo, que cuesta mucho menos de lo que parece, y que hasta ahora no lo
// estaba haciendo. El error concreto: arme el mapa de la referencia desde una hoja de contacto en
// GRIS a 320 px con un cuadro cada medio segundo. A esa cadencia y a esa resolucion, un plano de 9,7 s
// que en realidad son cuatro mecanicas encadenadas se ve como una imagen quieta. Me perdi la barra de
// busqueda entera — el plano con mas mecanica de la pieza.
//
// ================================================================================================
// LOS NUMEROS, MEDIDOS SOBRE ESTE VIDEO (53 s, 3187 cuadros a 59,94 fps)
// ================================================================================================
//
// EN DISCO — medido, no estimado:
//     PNG 1920x1080 .... 95 KB por cuadro ...... 296 MB el video entero
//     JPG  960x540 ......  9 KB por cuadro ......  27 MB el video entero
//
//   O sea: el disco NO es el limite. Guardar cada uno de los 3187 cuadros a resolucion completa
//   cuesta menos que un solo render.
//
// EN CONTEXTO — sale de la formula de tokens de imagen (ancho x alto / 750), con el reescalado a
// 1568 px de lado mayor que se aplica siempre:
//     una imagen abierta, cualquiera sea su contenido ......... ~1.850 tokens
//     -> 1 cuadro por imagen (1568x882) ...................... 1.850 por cuadro
//     -> 4 cuadros por hoja (mosaico 2x2, 784x441 cada uno) ..... 460 por cuadro
//     -> 9 cuadros por hoja (mosaico 3x3, 522x294 cada uno) ..... 205 por cuadro
//
//   El video entero, cuadro por cuadro:
//     de a uno a resolucion completa .... 5,9 M de tokens   (y 3187 idas y vueltas: impracticable)
//     de a 4 por hoja ................... 1,5 M de tokens   (797 hojas)
//     de a 9 por hoja ................... 654 K de tokens   (355 hojas)
//
// ================================================================================================
// LA CADENCIA SE ELIGE POR LO QUE SE BUSCA, Y ESA ES LA PARTE QUE HAY QUE ACERTAR
// ================================================================================================
//
//   MAPA (que pasa y en que orden) ......... 1 cada 15 cuadros, 9 por hoja ....  ~40 K de tokens
//   MECANICA (como se mueve cada cosa) ..... TODOS los cuadros, 4 por hoja ....  460 por cuadro
//
// El mapa es barato y hay que hacerlo entero. La mecanica es cara y hay que hacerla SOLO en los planos
// que tienen mecanica — pero ahi, completa. Un plano de 3 s a 60 fps son 180 cuadros: 45 hojas,
// 83 K de tokens. Eso es lo que no estaba haciendo.
//
// A 522 px por tira NO se lee texto de interfaz; a 784 si. Por eso el modo mecanica va de a 4 y no de
// a 9: la diferencia entre las dos no es de comodidad, es entre ver el defecto y no verlo.
//
// ================================================================================================
// USO
//   node tools/ae/barrer-cuadros.mjs <video> --carpeta <nombre> [opciones]
//
//     --desde N --hasta N    el tramo en cuadros del video (por defecto, entero)
//     --paso N               1 = todos los cuadros (por defecto 1)
//     --por-hoja N           4 (mecanica, por defecto) o 9 (mapa)
//     --ancho N              px por tira; por defecto 784 con 4 por hoja, 522 con 9
//     --solo-costo           no extrae nada: dice cuanto costaria
//
//   Todo queda bajo C:/ae-probe/barridos/<nombre>/ para poder borrarlo de una.
//
//   Ejemplos:
//     node tools/ae/barrer-cuadros.mjs C:/ae-probe/ref-p/v.mp4 --carpeta mapa --paso 15 --por-hoja 9
//     node tools/ae/barrer-cuadros.mjs C:/ae-probe/ref-p/v.mp4 --carpeta barra --desde 250 --hasta 445
// ================================================================================================

import { existsSync, mkdirSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const num = (bandera, porDefecto) => {
  const i = args.indexOf(bandera)
  return i >= 0 ? Number(args[i + 1]) : porDefecto
}
const txt = (bandera, porDefecto) => {
  const i = args.indexOf(bandera)
  return i >= 0 ? args[i + 1] : porDefecto
}

const VIDEO = args.find(a => !a.startsWith('--') && /\.(mp4|mov|mkv|webm)$/i.test(a))
const CARPETA = txt('--carpeta', null)
const SOLO_COSTO = args.includes('--solo-costo')

if (!VIDEO || (!CARPETA && !SOLO_COSTO)) {
  console.error('uso: node tools/ae/barrer-cuadros.mjs <video> --carpeta <nombre> [--desde N --hasta N]')
  console.error('                                    [--paso N] [--por-hoja 4|9] [--ancho N] [--solo-costo]')
  process.exit(2)
}
if (!existsSync(VIDEO)) { console.error(`no existe ${VIDEO}`); process.exit(2) }

// cuantos cuadros tiene el video, preguntado y no supuesto
const sonda = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
  '-show_entries', 'stream=nb_frames,r_frame_rate,width,height',
  '-show_entries', 'format=duration', '-of', 'default=nw=1', VIDEO], { encoding: 'utf8' })
if (sonda.status !== 0) { console.error('ffprobe fallo:\n' + sonda.stderr); process.exit(1) }
const campos = Object.fromEntries(sonda.stdout.trim().split('\n').map(l => l.split('=')))
const [numFps, denFps] = (campos.r_frame_rate || '30/1').split('/').map(Number)
const FPS = numFps / denFps

// EL TOTAL SE CALCULA DE LA DURACION CUANDO EL CONTENEDOR NO LO TRAE, que es lo normal.
//
// `nb_frames` viene vacio en la mayoria de los mp4 —lo escribe el que codifico, si quiso— y este
// archivo devolvia 0. Con 0, el tramo por defecto quedaba en 999.999 cuadros y la herramienta informaba
// que mirar el video costaria 462 MILLONES de tokens y 92 GB. Un contador que no existe no es un cero:
// es un dato que hay que sacar de otro lado, y la duracion siempre esta.
let TOTAL = Number(campos.nb_frames) || 0
if (!TOTAL) { TOTAL = Math.round(Number(campos.duration || 0) * FPS) }
if (!TOTAL) {
  console.error('no se pudo saber cuantos cuadros tiene el video: pasale --hasta N a mano')
  process.exit(1)
}

const DESDE = num('--desde', 0)
const HASTA = num('--hasta', TOTAL || 999999)
const PASO = Math.max(1, num('--paso', 1))
const POR_HOJA = num('--por-hoja', 4)
const COLS = POR_HOJA === 9 ? 3 : 2
const FILAS = POR_HOJA === 9 ? 3 : 2
const ANCHO = num('--ancho', POR_HOJA === 9 ? 522 : 784)

const CUANTOS = Math.ceil((HASTA - DESDE) / PASO)
const HOJAS = Math.ceil(CUANTOS / POR_HOJA)

// EL COSTO SE DICE ANTES DE GASTARLO. Una imagen abierta cuesta ~1.850 tokens sea cual sea su
// contenido, porque se reescala a 1568 px de lado mayor y la cuenta es ancho*alto/750. Repartir mas
// cuadros por hoja no cambia el costo de la hoja: cambia cuanto se ve de cada uno.
const TOKENS_POR_HOJA = 1850
console.log(`\n  ${VIDEO}`)
console.log(`  ${campos.width}x${campos.height} · ${FPS.toFixed(2)} fps · ${TOTAL} cuadros`)
console.log(`\n  tramo ${DESDE}-${HASTA}, paso ${PASO}  ->  ${CUANTOS} cuadros`)
console.log(`  ${POR_HOJA} por hoja (${COLS}x${FILAS}, ${ANCHO} px por tira)  ->  ${HOJAS} hojas`)
console.log(`\n  COSTO EN CONTEXTO   ~${(HOJAS * TOKENS_POR_HOJA / 1000).toFixed(0)} K de tokens` +
            `   (${Math.round(TOKENS_POR_HOJA / POR_HOJA)} por cuadro)`)
console.log(`  COSTO EN DISCO      ~${Math.round(CUANTOS * 95 / 1024)} MB en PNG + ` +
            `${Math.round(HOJAS * 0.6)} MB de hojas`)
if (ANCHO < 700) {
  console.log(`\n  AVISO: a ${ANCHO} px por tira NO se lee texto de interfaz. Sirve para el MAPA (que` +
              ` pasa y\n  en que orden), no para la MECANICA. Para mecanica: --por-hoja 4.`)
}
if (SOLO_COSTO) { console.log(''); process.exit(0) }

const RAIZ = `C:/ae-probe/barridos/${CARPETA}`
console.log(`\n  destino ${RAIZ}  (borrable de una: rm -rf ${RAIZ})`)
if (existsSync(RAIZ)) rmSync(RAIZ, { recursive: true, force: true })
mkdirSync(`${RAIZ}/c`, { recursive: true })

// --- extraer
const filtro = `select='gte(n\\,${DESDE})*lt(n\\,${HASTA})*not(mod(n-${DESDE}\\,${PASO}))'`
const t0 = Date.now()
const ex = spawnSync('ffmpeg', ['-v', 'error', '-i', VIDEO, '-vf', filtro,
  '-vsync', '0', '-frame_pts', '1', `${RAIZ}/c/n%05d.png`], { encoding: 'utf8' })
if (ex.status !== 0) { console.error('ffmpeg fallo:\n' + ex.stderr); process.exit(1) }

const cuadros = readdirSync(`${RAIZ}/c`).filter(f => f.endsWith('.png')).sort()
const bytes = cuadros.reduce((a, f) => a + statSync(`${RAIZ}/c/${f}`).size, 0)
console.log(`\n  extraidos ${cuadros.length} cuadros en ${((Date.now() - t0) / 1000).toFixed(1)}s ` +
            `· ${(bytes / 1048576).toFixed(0)} MB · ${Math.round(bytes / cuadros.length / 1024)} KB cada uno`)

// --- armar las hojas
//
// Con `concat` y no con un patron: los cuadros llevan el NUMERO DE CUADRO en el nombre (`-frame_pts`)
// y por eso la numeracion tiene huecos. Un patron los tomaria en el orden que encuentre.
const hojas = []
for (let i = 0; i < cuadros.length; i += POR_HOJA) {
  const grupo = cuadros.slice(i, i + POR_HOJA)
  const lista = `${RAIZ}/lista.txt`
  writeFileSync(lista, grupo.map(f => `file 'c/${f}'`).join('\n') + '\n')
  const primero = grupo[0].replace(/\D/g, '')
  const ultimo = grupo[grupo.length - 1].replace(/\D/g, '')
  const salida = `${RAIZ}/hoja-${String(primero).padStart(5, '0')}-${ultimo}.png`
  const h = spawnSync('ffmpeg', ['-v', 'error', '-f', 'concat', '-safe', '0', '-i', lista,
    '-vf', `scale=${ANCHO}:-1,tile=${COLS}x${FILAS}`, '-frames:v', '1', '-y', salida], { encoding: 'utf8' })
  if (h.status === 0) hojas.push({ salida, primero: +primero, ultimo: +ultimo, n: grupo.length })
}
rmSync(`${RAIZ}/lista.txt`, { force: true })

console.log(`\n  ${hojas.length} hojas listas. Se leen EN ORDEN, de izquierda a derecha y de arriba`)
console.log(`  hacia abajo; cada tira es un cuadro y el nombre de la hoja dice cual es el primero.\n`)
for (const h of hojas.slice(0, 6)) {
  console.log(`    ${h.salida}   cuadros ${h.primero} a ${h.ultimo}`)
}
if (hojas.length > 6) console.log(`    ... y ${hojas.length - 6} mas`)
console.log(`\n  cuando ya no hagan falta:  rm -rf ${RAIZ}\n`)

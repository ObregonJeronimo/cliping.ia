// LLAMAR A AFTER EFFECTS SIN QUE UN CARTEL TRANQUE EL TRABAJO.
//
// Este es el UNICO camino por el que se le habla a AE. No es una comodidad: es la respuesta a un
// problema que se descubrio a los golpes durante todo el dia de hoy.
//
// EL PROBLEMA. `AfterFX.exe -r` dispara un script y vuelve enseguida sin traer nada — esta medido:
// asincrono, ~1015 ms de puro transporte. Cuando algo sale mal, AE no devuelve un error: ABRE UN
// CARTEL MODAL. Ese cartel bloquea la aplicacion entera hasta que una persona toca Aceptar, y el texto
// del error vive en la pantalla y en ningun archivo. Con nadie delante de la maquina, eso significa
// dos cosas a la vez: el trabajo se congela, y la unica copia de lo que salio mal se pierde.
//
// LAS TRES CAPAS, de la mas barata a la mas bruta.
//
//   1. ENVOLVER EL SCRIPT EN UN try/catch. Es la que mas cubre, porque la causa mas frecuente de
//      cartel es un error de script sin atrapar. Envuelto, el error deja de ser una ventana y pasa a
//      ser una linea en el buzon — con numero de linea y archivo, que es mas de lo que da la ventana.
//      Verificado: "TypeError: null no es un objeto / linea = 59".
//
//   2. app.beginSuppressDialogs(). Existe (verificado: typeof = function) y tapa los avisos que AE
//      genera por su cuenta, incluido el aviso DIFERIDO de saveFrameToPng, que aparece cuando el
//      script ya termino y por eso ningun try/catch lo alcanza.
//
//   3. EL GUARDIAN (tools/ae/guardian.ps1), como red. Mira las ventanas de AE, ANOTA EL TEXTO de
//      cualquier cartel que se escape y despues lo cierra. El orden importa: primero se guarda lo que
//      dice, despues se acepta. Un cartel aceptado sin leer es informacion perdida.
//      Verificado de punta a punta: creo un `alert` a proposito y quedo anotado como
//      "CARTEL 'Script Alert' :: PRUEBA DEL GUARDIAN..." y cerrado solo, con el script siguiendo.
//
// Y una cosa que el guardian NO hace: cerrar carteles de mas de un boton. Una pregunta con
// consecuencias —"¿guardar los cambios?"— se anota y se deja abierta. El trabajo se frena, que es lo
// correcto, y queda escrito por que. Elegir por el usuario no es tarea de un vigilante.
//
// USO
//   node tools/ae/llamar.mjs tools/ae/sondas/prueba3.jsx
//   import { llamarAE } from './llamar.mjs'

import { existsSync, readFileSync, rmSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { dirname, join, basename, resolve } from 'node:path'

const AE = 'C:/Program Files/Adobe/Adobe After Effects 2026/Support Files/AfterFX.exe'
const GUARDIAN = new URL('./guardian.ps1', import.meta.url).pathname.replace(/^\//, '')
const PARAR = 'C:/ae-probe/parar-guardian'
const LATIDO = 'C:/ae-probe/guardian-vivo'

const dormir = (ms) => new Promise(r => setTimeout(r, ms))

// LA ENVOLTURA QUE HAY QUE COPIAR EN CADA SONDA. Se deja escrita aca para que este en un solo lugar.
export const PLANTILLA_ENVOLTURA = `
var RUTA = "C:/ae-probe/<nombre>.txt";
function texto(x) {
  if (x === null) { return "null"; }
  if (x === undefined) { return "undefined"; }
  try { return x.toString(); } catch (noSePudo) { return "<inconvertible>"; }
}
function anotar(t) { var a = new File(RUTA); a.encoding = "UTF-8"; a.open("a"); a.write(t + "\\n"); a.close(); }
var previo = new File(RUTA); if (previo.exists) { previo.remove(); }
if (typeof app.beginSuppressDialogs === "function") { app.beginSuppressDialogs(); }
try {
  // ---- el trabajo va aca ----
} catch (exTodo) {
  anotar("ERROR: " + texto(exTodo) + "  (linea " + exTodo.line + ")");
} finally {
  if (typeof app.endSuppressDialogs === "function") { app.endSuppressDialogs(false); }
  anotar("--- fin ---");
}
`.trim()

/**
 * Corre un .jsx en el After Effects que ya esta abierto y espera su buzon.
 * Devuelve { ok, ms, lanzador, buzon, carteles, motivo }.
 */
export async function llamarAE(jsx, {
  buzon = null,              // por convencion, el .jsx escribe en C:/ae-probe/<nombre>.txt
  esperaMs = 300000,
  vigilar = true,
  limpiar = [],              // rutas a borrar ANTES de llamar: el buzon lo vacia el que llama
  registro = 'C:/ae-probe/carteles.txt',
  log = console.log,
} = {}) {
  // LA RUTA VA ABSOLUTA, SIEMPRE. `AfterFX.exe -r ruta\relativa.jsx` no resuelve la ruta contra el
  // directorio desde donde se lo llama: la reenvia a la instancia que ya esta abierta, que la resuelve
  // contra OTRO directorio y no encuentra nada. Y ahi termina la historia — AE no ejecuta el script, no
  // abre ningun cartel y no devuelve ningun codigo. El unico sintoma es que el buzon nunca aparece, o
  // sea cinco minutos de espera indistinguibles de un script colgado.
  //
  // Costo dos corridas de 300 s y un rato de sospechar del contenido del script. Se descarto asi: el
  // MISMO archivo copiado a C:/ae-probe/ y llamado por ruta absoluta corrio en 447 ms. Mismo contenido,
  // otra ruta, otro resultado — con eso el contenido queda descartado sin discusion.
  if (!existsSync(jsx)) {
    return { ok: false, motivo: `no existe el script: ${jsx}`, ms: 0, lanzador: 0, carteles: [] }
  }
  const jsxAbs = resolve(jsx).replace(/\//g, '\\')
  const nombre = basename(jsx).replace(/\.jsx$/i, '')
  const salida = buzon || `C:/ae-probe/${nombre}.txt`

  // EL BUZON LO VACIA EL QUE LLAMA, ANTES DE LLAMAR. No lo puede vaciar el que contesta: cuando hay
  // que vaciarlo, el que contesta todavia no existe. Sale de dos carreras que ya mordieron — leer el
  // centinela de la corrida anterior, y dar por bueno un archivo viejo pero entero.
  //
  // EL REGISTRO DE CARTELES NO SE BORRA, a diferencia del buzon: puede haber un vigilante largo
  // corriendo desde antes, y ese archivo es suyo. Se anota donde estaba y despues se leen las lineas
  // nuevas.
  for (const r of [salida, ...limpiar]) {
    try { if (existsSync(r)) rmSync(r, { recursive: true, force: true }) } catch { /* ya no estaba */ }
  }
  const dir = dirname(salida)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const desde = (() => {
    try { return existsSync(registro) ? readFileSync(registro, 'utf8').split('\n').length : 0 }
    catch { return 0 }
  })()

  // SI YA HAY UN VIGILANTE PUESTO, NO SE ARRANCA OTRO.
  // Y esto no es una optimizacion. El aviso diferido de saveFrameToPng puede llegar MINUTOS despues de
  // la llamada —medido: aparecio con el trabajo ya terminado y otra tarea en curso—, asi que un
  // vigilante que vive solo mientras dura la llamada no alcanza. En una sesion larga conviene dejar
  // uno corriendo aparte; este detecta su latido y se hace a un lado.
  let guardian = null
  const hayVigilante = (() => {
    try {
      if (!existsSync(LATIDO)) return false
      return Date.now() - statSync(LATIDO).mtimeMs < 5000
    } catch { return false }
  })()
  if (vigilar && !hayVigilante) {
    try { if (existsSync(PARAR)) rmSync(PARAR, { force: true }) } catch {}
    const segundos = Math.ceil(esperaMs / 1000) + 60
    guardian = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', GUARDIAN,
      '-Vigilar', String(segundos), '-Registro', registro, '-Parar', PARAR,
      '-Latido', 'C:/ae-probe/guardian-corto'],
      { windowsHide: true, stdio: 'ignore' })
    await dormir(700)   // que alcance a cargar el tipo de C# antes de que aparezca el primer cartel
  } else if (hayVigilante) {
    log('ya hay un vigilante de carteles corriendo: se usa ese')
  }

  const t0 = Date.now()
  const r = spawnSync(AE, ['-r', jsxAbs], { windowsHide: true })
  const lanzador = Date.now() - t0
  if (r.error) {
    return { ok: false, motivo: `no se pudo lanzar AE: ${r.error.message}`, ms: lanzador, lanzador, carteles: [] }
  }

  let listo = false
  while (Date.now() - t0 < esperaMs) {
    try {
      if (existsSync(salida) && readFileSync(salida, 'utf8').includes('--- fin ---')) { listo = true; break }
    } catch { /* AE lo tiene abierto en este instante */ }
    await dormir(120)
  }
  const ms = Date.now() - t0

  // parar SOLO el guardian propio (el largo, si existe, es de otro y sigue), y leer lo que se anoto
  // desde que arranco esta llamada
  if (guardian) {
    try { writeFileSync(PARAR, 'parar') } catch {}
    await dormir(700)
    try { guardian.kill() } catch {}
  }
  let carteles = []
  try {
    if (existsSync(registro)) carteles = readFileSync(registro, 'utf8').split('\n').slice(desde).filter(Boolean)
  } catch {}

  const trancado = carteles.some(l => /NO SE TOCA/.test(l))
  const texto = listo && existsSync(salida) ? readFileSync(salida, 'utf8') : ''
  const conError = /^ERROR/m.test(texto)

  if (carteles.some(l => /CARTEL/.test(l))) {
    log('AE abrio carteles durante la corrida (el guardian los anoto):')
    for (const l of carteles.filter(l => /CARTEL|botones|->/.test(l))) log(`  ${l}`)
  }

  return {
    ok: listo && !trancado && !conError,
    motivo: !listo ? `no llego el centinela en ${esperaMs} ms`
      : trancado ? 'AE quedo con un cartel de varios botones: hace falta una persona'
      : conError ? 'el script informo un ERROR en el buzon'
      : null,
    ms, lanzador, buzon: salida, texto, carteles,
  }
}

// ---------------------------------------------------------------- linea de comandos
if (process.argv[1]?.endsWith('llamar.mjs')) {
  const jsx = process.argv[2]
  if (!jsx) {
    console.log('uso: node tools/ae/llamar.mjs <script.jsx>')
    process.exit(2)
  }
  // UNA BANDERA QUE NO EXISTE SE RECHAZA, NO SE IGNORA. El buzon sale del nombre del script, asi que
  // un `--salida otra/cosa.txt` se tragaba sin efecto y la corrida parecia hacer lo que se le pidio.
  const sobra = process.argv.slice(3)
  if (sobra.length) {
    console.log(`no entiendo estos argumentos: ${sobra.join(' ')}`)
    console.log('el buzon sale del nombre del script: <script>.jsx escribe en C:/ae-probe/<script>.txt')
    process.exit(2)
  }
  const r = await llamarAE(jsx)
  console.log(`lanzador ${r.lanzador} ms · total ${r.ms} ms · ${r.ok ? 'OK' : 'FALLA: ' + r.motivo}`)
  if (r.texto) {
    console.log('--- buzon ---')
    console.log(r.texto.trimEnd())
  }
  process.exit(r.ok ? 0 : 1)
}

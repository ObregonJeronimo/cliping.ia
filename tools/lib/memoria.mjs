// EL VIGILANTE DE MEMORIA. Mira la RAM LIBRE DEL SISTEMA y mata el arbol de procesos antes de que la
// maquina se cuelgue.
//
// POR QUE SE REESCRIBIO ESTO
// El 4 de agosto de 2026 la maquina de desarrollo volvio a colgarse durante una corrida de
// `gates:guard`, con la misma sensacion que el 26 de julio: se pone lenta, deja de responder, boton de
// encendido. Pero esta vez el guard YA EXISTIA y no la salvo. El log dice por que, y son tres agujeros
// distintos, cada uno suficiente solo:
//
//   1) EL VIGILANTE SE QUEDO CIEGO. Muestreaba con
//      `powershell "Get-Process node | ConvertTo-Json"`, y bajo presion de memoria .NET no pudo cargar
//      el ensamblado de ConvertTo-Json: `System.IO.FileLoadException`, seis veces en el log. El
//      `catch {}` se lo tragaba, asi que el guard siguio corriendo SIN MEDIR NADA mientras las
//      compuertas seguian pidiendo memoria. Un vigilante que falla justo cuando hace falta es peor que
//      no tener ninguno: da confianza falsa.
//
//   2) MIRABA SOLO `node`. Las compuertas de storyboard, timeline, edit y patron levantan Chromium por
//      Playwright, y `motor.py` levanta otro. Chromium con SwiftShader es lo mas pesado de toda la
//      cadena y era INVISIBLE para el vigilante.
//
//   3) EL TOPE ERA POR PROCESO, NO TOTAL. 8192 MB por proceso en una maquina de 15 GB: dos procesos de
//      7 GB pasan los dos y suman 14. El numero que importa no es cuanto pide UNO, es cuanto queda
//      LIBRE.
//
// COMO MIDE AHORA, y por que asi:
//
//   `os.freemem()`. Es una llamada del propio Node al sistema operativo: no lanza un subproceso, no
//   parsea JSON, no carga un ensamblado .NET y no reserva memoria. O sea, no puede fallar por la misma
//   razon que estaba vigilando. Es exactamente el numero que decide si la maquina vive: cuando la RAM
//   libre llega a cero, Windows no tira un stack trace.
//
//   Y si aun asi el muestreo fallara, ESO ES LA EMERGENCIA, no un detalle a ignorar: a los 3 fallos
//   seguidos se aborta la corrida. Correr a ciegas es lo que se esta arreglando.
//
// QUE MIDE `os.freemem()` EN WINDOWS, medido y no supuesto, porque de esto depende todo lo demas:
//
//   Available MBytes (lo que Windows llama "Disponible")  2409
//   Free + Zero page list (la RAM realmente libre)          173
//   os.freemem() de Node                                   2387
//
//   O sea que Node devuelve el DISPONIBLE —libre mas la cache reclamable—, no la lista libre. Es el
//   numero correcto: la cache la suelta Windows sin drama, y lo que mata la sesion es que se acabe el
//   disponible. Anotado aca para que nadie lo "arregle" mas adelante creyendo que mide otra cosa.
//
// EL PISO SE CALCULA CONTRA LO QUE HAY AL ARRANCAR, no como fraccion fija de la RAM total, y esto lo
// impuso la medicion: esta maquina trabaja con Photoshop, OBS, Edge y SQL Server abiertos, y ahi el
// disponible ronda los 2.4 GB. Un piso fijo del 20% (3.1 GB) YA ESTA ROTO antes de empezar: cortaria
// toda corrida en el primer segundo. Un vigilante que siempre dispara es un vigilante que se termina
// desactivando, y ahi volvemos al problema original con una capa de falsa seguridad encima.
//
// Asi que: 35% de lo que haya disponible al arrancar, con techo en el 20% de la RAM total y piso duro
// en 800 MB. Con la maquina cargada (2.4 GB) da 840 MB, que deja trabajar a las compuertas y corta
// bastante antes de que Windows empiece a agonizar. Con la maquina despejada (10 GB) da 3.1 GB.
//
// SE EXIGEN VARIAS MUESTRAS SEGUIDAS por debajo del piso antes de matar. Un pico de un segundo al
// arrancar Chromium es normal; lo que mata la maquina es quedarse abajo.
//
// PERO NO SIEMPRE SE PUEDE ESPERAR, y esto lo enseño la prueba, no el razonamiento: con un hijo que
// pedia 80 MB cada 300 ms, las muestras de gracia le alcanzaron para llevarse **900 MB mas** por debajo
// del piso antes de que lo mataran. Por eso hay DOS umbrales: el piso normal con espera, y un piso
// CRITICO (la mitad) que mata en la PRIMERA muestra. Un pico transitorio nunca llega a la mitad del
// piso; algo que llega ahi ya no es un pico.
import { freemem, totalmem, hostname } from 'node:os'
import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ_OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'out')

export const disponibleMb = () => Math.round(freemem() / 1048576)
export const TECHO_MB = Math.max(2560, Math.round((totalmem() / 1048576) * 0.20))
export const pisoPara = (dispMb) => Math.max(800, Math.min(TECHO_MB, Math.round(dispMb * 0.35)))

// Debajo de esto no se arranca: las compuertas no entran, y empezar para morir a la mitad de una
// corrida de media hora es peor que decirlo de entrada.
export const MINIMO_ARRANQUE_MB = 1200
// SE MUESTREA CADA 250 ms, NO CADA SEGUNDO. `os.freemem()` no cuesta nada, y el sondeo es una
// carrera: entre dos muestras el proceso sigue pidiendo. Medido con un hijo que pedia 1.3 GB/s, un
// muestreo de 1 s lo deja pasarse 1.5 GB del piso; a 250 ms se pasa la cuarta parte.
const SEGUIDAS = 12                      // 12 muestras de 250 ms = 3 s: un pico corto no cuenta
const FALLOS_TOLERADOS = 3

// Matar el ARBOL, no el proceso. `npm run gates` es un shell que lanza node, que lanza Chromium: matar
// al padre deja vivos a los nietos, que son justamente los que tienen la memoria.
export function matarArbol(pid) {
  try {
    execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
    return true
  } catch { return false }
}

// Arranca la vigilancia. Devuelve un objeto con `parar()` y el informe.
//
// `alMatar(motivo)` se llama UNA vez cuando se cruza el limite; el que llama decide que matar (tiene el
// pid de su hijo, asi que no hace falta enumerar procesos — enumerar es lo que fallaba).
// `leer` EXISTE PARA PODER PROBAR ESTO SIN PONER EN RIESGO LA MAQUINA, y esa leccion tambien salio a
// los golpes: la primera version se probo con un proceso que pedia 200 MB cada 150 ms, o sea agotando
// la memoria DE VERDAD en la PC de trabajo de alguien. Funciono —el vigilante mato al glotón— pero
// dejo el disponible en 626 MB, a un pelo de colgar la maquina para comprobar que la maquina no se
// cuelga. Una prueba que puede causar el defecto que esta probando no es una prueba, es una ruleta.
// Ahora el lector se inyecta: la prueba simula la caida y no reserva un solo byte.
export function vigilar(alMatar, { pisoMb = pisoPara(disponibleMb()), intervalo = 250, leer = disponibleMb } = {}) {
  const totalMb = Math.round(totalmem() / 1048576)
  let libreMin = Infinity
  let bajos = 0
  let fallos = 0
  let disparado = false

  const reloj = setInterval(() => {
    let libreMb
    try {
      libreMb = leer()
      if (!Number.isFinite(libreMb) || libreMb <= 0) throw new Error('lectura invalida')
      fallos = 0
    } catch (e) {
      // NO SE IGNORA. Ver el agujero 1 de arriba.
      if (++fallos >= FALLOS_TOLERADOS) {
        clearInterval(reloj)
        disparado = true
        alMatar(`el vigilante no pudo leer la memoria ${fallos} veces seguidas (${e.message}) — `
          + `se aborta en vez de seguir a ciegas`)
      }
      return
    }
    if (libreMb < libreMin) libreMin = libreMb
    const critico = libreMb < pisoMb / 2
    if (libreMb < pisoMb) bajos++
    else bajos = 0
    if ((critico || bajos >= SEGUIDAS) && !disparado) {
      clearInterval(reloj)
      disparado = true
      alMatar(critico
        ? `quedan ${libreMb} MB libres de ${totalMb} — por debajo de la MITAD del piso (${pisoMb} MB), `
          + `se corta sin esperar antes de que se cuelgue la maquina`
        : `quedan ${libreMb} MB libres de ${totalMb} durante ${(bajos * intervalo / 1000).toFixed(1)} s seguidos `
          + `(piso ${pisoMb} MB) — se corta antes de que se cuelgue la maquina`)
    }
  }, intervalo)
  reloj.unref?.()
  // UNA MUESTRA YA MISMO, no dentro de un cuarto de segundo. Sin esto una tarea corta termina antes de
  // la primera muestra y el minimo queda en `null`, o sea que el historial de costos no aprende nada de
  // ella — y el aviso previo de la proxima vez se queda sin dato.
  try { const m = leer(); if (Number.isFinite(m)) libreMin = m } catch { /* ya lo maneja el reloj */ }

  return {
    parar: () => clearInterval(reloj),
    get libreMinMb() { return libreMin === Infinity ? null : libreMin },
    get disparado() { return disparado },
    pisoMb,
    totalMb,
  }
}

// BARRIDO DE HUERFANOS. Si el guard murio de mala manera antes de que existiera `llevarseLaCadena` —o
// si alguien mata el arbol a mano y falla— queda una cadena de compuertas corriendo sin cerrojo y sin
// vigilante. Es invisible: no hay ventana, no hay barra de progreso, y sigue pidiendo memoria.
//
// Se barre AL ARRANCAR y solo ahi. Enumerar procesos con PowerShell es justamente lo que fallaba bajo
// presion de memoria, pero al arrancar ya se comprobo que hay memoria de sobra, asi que el riesgo no
// existe en ese momento. Y si igual falla, no pasa nada: es una red extra, no la principal.
//
// Solo se llama con el cerrojo YA TOMADO. Con el cerrojo en la mano, cualquier cadena viva que aparezca
// es por definicion un huerfano: una corrida legitima habria tenido el cerrojo.
export function barrerHuerfanos() {
  let salida = ''
  try {
    salida = execFileSync('powershell', ['-NoProfile', '-Command',
      "Get-CimInstance Win32_Process -Filter \"Name='node.exe' OR Name='python.exe'\" | "
      + 'ForEach-Object { "$($_.ProcessId)`t$($_.CommandLine)" }'],
    { encoding: 'utf8', timeout: 15000 })
  } catch { return [] }
  const muertos = []
  for (const linea of salida.split('\n')) {
    const [pid, ...resto] = linea.split('\t')
    const cmd = resto.join('\t')
    if (!pid || !cmd) continue
    if (Number(pid) === process.pid) continue
    if (!/gates:crudo|tools[\/](director-|urvid1-|adn-check|eco-check|encuadre-check|patron-check)/.test(cmd)) continue
    if (matarArbol(Number(pid))) muertos.push({ pid: Number(pid), cmd: cmd.trim().slice(0, 80) })
  }
  return muertos
}

// EL COSTO REAL DE CADA TAREA, MEDIDO EN ESTA MAQUINA Y NO EN OTRA.
//
// La regla del proyecto pide avisar, ANTES de arrancar algo pesado, cuanta RAM va a quedar libre. Para
// que ese aviso sea un dato y no una corazonada, cada corrida anota lo que realmente consumio.
//
// SE GUARDA POR MAQUINA, y esto no es un detalle: el repo lo comparten dos PC distintas, con memoria y
// componentes distintos. Un numero medido en una no predice nada en la otra, y presentarlo como si lo
// hiciera es peor que no tener numero — es un dato falso con cara de medicion. Por eso cada renglon
// lleva el nombre del equipo y su RAM total, y `costoDe` solo devuelve lo medido AQUI.
//
// El archivo es local: no se comitea. Cada PC construye su propio historial la primera vez que corre.
export function anotarCosto(quien, { arrancoConMb, minimoMb, segundos, cortado }) {
  try {
    const fila = {
      equipo: hostname(),
      totalMb: Math.round(totalmem() / 1048576),
      quien, arrancoConMb, minimoMb, segundos, cortado: !!cortado,
      fecha: new Date().toISOString(),
    }
    appendFileSync(join(RAIZ_OUT, '.costos.jsonl'), JSON.stringify(fila) + '\n')
  } catch { /* anotar el costo nunca puede romper la corrida */ }
}

// Lo medido en ESTA maquina para una tarea. `null` si nunca se corrio aca: eso hay que DECIRLO, no
// rellenarlo con el numero de la otra PC.
export function costoDe(quien) {
  try {
    const filas = readFileSync(join(RAIZ_OUT, '.costos.jsonl'), 'utf8').trim().split('\n')
      .map(l => { try { return JSON.parse(l) } catch { return null } })
      // Ver la nota en tools/costo.mjs: sin `minimoMb`, `arranco - null` da `arranco` y la fila miente.
      .filter(f => f && f.equipo === hostname() && f.quien === quien && !f.cortado && Number.isFinite(f.minimoMb))
    if (!filas.length) return null
    const usos = filas.map(f => f.arrancoConMb - f.minimoMb).filter(n => Number.isFinite(n) && n > 0)
    if (!usos.length) return null
    return {
      corridas: filas.length,
      pidioMbTipico: Math.round(usos.reduce((a, b) => a + b, 0) / usos.length),
      pidioMbPeor: Math.max(...usos),
      segundosTipico: Math.round(filas.reduce((a, f) => a + (f.segundos || 0), 0) / filas.length),
    }
  } catch { return null }
}

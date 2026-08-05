// UN PROCESO QUE SE MIDE A SI MISMO Y SE MATA ANTES DE MOLESTAR A NADIE.
//
// POR QUE EXISTE, y es la tercera vez que la maquina se cuelga por lo mismo:
//
//   El 5 de agosto de 2026, `fondo-check` —una compuerta escrita el dia anterior y estrenada ese dia—
//   llego a **60 GB** en una maquina de 15. Windows lo dejo anotado (evento 2004, tres veces: 52, 58 y
//   60 GB). Y las dos protecciones que existian NO LO VIERON, cada una por una razon distinta y las dos
//   instructivas:
//
//   1) EL VIGILANTE MIRA `os.freemem()`, o sea RAM FISICA DISPONIBLE. Estos 60 GB eran memoria
//      COMPROMETIDA contra el archivo de paginacion. El informe de esa corrida dice "minimo 6423 MB
//      disponibles": el vigilante nunca vio peligro porque estaba mirando el eje equivocado. Windows,
//      en cambio, hablaba de "memoria virtual insuficiente" — que es justo el numero que no se miraba.
//
//   2) `--max-old-space-size` LIMITA EL MONTON DE JAVASCRIPT, y esto no es JavaScript: son buffers de
//      canvas, que viven FUERA del monton. Estaba documentado como limite de esa bandera... y lo pise
//      igual al dia siguiente. Un limite anotado no protege; protege un limite que se aplica.
//
// COMO MIDE ESTO, que es lo que faltaba: `process.memoryUsage()` devuelve `rss` (todo lo que el proceso
// tiene reservado, buffers externos incluidos) y `external`. Es una llamada directa del proceso sobre
// SI MISMO: no lanza subprocesos, no enumera nada, no puede fallar bajo presion. Al cruzar el techo el
// proceso se mata SOLO, con un mensaje que dice cuanto pidio y donde.
//
// El techo sale de la maquina, no de una constante: 45% de la RAM total. En la de 15 GB da ~7 GB, que
// es de sobra para cualquier compuerta honesta y muy poco para una que gotea.
//
// ESTO NO REEMPLAZA AL VIGILANTE DE AFUERA: una herramienta puede colgarse sin pedir memoria, y ahi el
// de afuera es el unico que puede matarla. Son capas distintas y hacen falta las dos.
import { totalmem } from 'node:os'

export const TECHO_RSS_MB = Math.max(1536, Math.round((totalmem() / 1048576) * 0.45))

// Arranca la autovigilancia. `etiqueta` es para el mensaje: el nombre de la herramienta.
export function autolimitar(etiqueta, { techoMb = TECHO_RSS_MB, intervalo = 500 } = {}) {
  let pico = 0
  const reloj = setInterval(() => {
    const m = process.memoryUsage()
    const rssMb = Math.round(m.rss / 1048576)
    const extMb = Math.round((m.external || 0) / 1048576)
    if (rssMb > pico) pico = rssMb
    if (rssMb > techoMb) {
      console.error(`\n!! ${etiqueta}: ME PASE DEL TECHO — ${rssMb} MB reservados (${extMb} MB fuera del `
        + `monton de JavaScript) contra un techo de ${techoMb} MB.`)
      console.error(`   Me mato solo antes de colgar la maquina. Casi siempre esto es una fuga: algo se `
        + `acumula sin soltarse (texturas, canvas, buffers de pixeles).`)
      process.exit(9)
    }
  }, intervalo)
  reloj.unref?.()
  return {
    parar: () => clearInterval(reloj),
    get picoMb() { return pico },
    techoMb,
  }
}

// Para medir sin matar: devuelve el estado actual en MB.
export const usoMb = () => {
  const m = process.memoryUsage()
  return { rss: Math.round(m.rss / 1048576), heap: Math.round(m.heapUsed / 1048576), externo: Math.round((m.external || 0) / 1048576) }
}

// NO SATURAR LA MAQUINA. Baja la prioridad y deja nucleos libres ANTES de lanzar nada pesado.
//
// POR QUE EXISTE, y esto salio de leer el registro de Windows y no de suponer:
//
//   La PC de desarrollo estuvo prendida SEIS DIAS seguidos sin un solo corte (29/07 22:59 -> 04/08
//   23:41). Esa misma noche se colgo TRES VECES en 50 minutos, mientras corrian las compuertas, los
//   renders y Chromium. Y los tres cortes fueron con `BugcheckCode = 0` y sin un solo evento WHEA: o
//   sea SIN pantalla azul y SIN error de hardware registrado. La maquina no fallo, se APAGO.
//
//   Eso no es falta de memoria. Un escritorio sin RAM se arrastra, pagina y se vuelve inusable —no se
//   corta—. Un corte seco bajo carga sostenida, en un equipo que venia estable, apunta a la
//   alimentacion o a la temperatura: un Ryzen 9600X con los seis nucleos al 100% durante media hora
//   pide mucha mas corriente que el mismo equipo navegando.
//
// LO QUE SE PUEDE HACER POR SOFTWARE es no pedirle a la maquina todo lo que tiene:
//
//   1) PRIORIDAD BAJA, para que la sesion siga respondiendo aunque la cadena este trabajando. Que el
//      usuario pueda mover el mouse y cerrar cosas es la diferencia entre "esta lento" y "se colgo".
//   2) DEJAR NUCLEOS LIBRES. La afinidad SE HEREDA: si se fija en ESTE proceso antes de lanzar al hijo,
//      la heredan el hijo, sus nietos y todos los Chromium que abra Playwright. Por eso se aplica aca y
//      no despues — despues es una carrera que se pierde.
//
// Cuesta tiempo de reloj y no cuesta nada mas. Con una maquina que se apaga sola, esa es una ganga.
import { execFileSync } from 'node:child_process'
import { cpus } from 'node:os'

// Cuantos hilos se dejan libres. Dos alcanza para que el escritorio respire y baja el pico de consumo.
const LIBRES = 2

export function moderarCarga() {
  const total = cpus().length
  const usar = Math.max(1, total - LIBRES)
  const mascara = (2n ** BigInt(usar)) - 1n          // los `usar` hilos de mas abajo
  try {
    execFileSync('powershell', ['-NoProfile', '-Command',
      `$p = Get-Process -Id ${process.pid}; $p.ProcessorAffinity = ${mascara}; `
      + '$p.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::BelowNormal'],
    { stdio: 'ignore', timeout: 15000 })
    return { total, usar, ok: true }
  } catch (e) {
    // No es fatal: es una mitigacion, no la red principal. Pero se DICE, no se traga en silencio —
    // tragarse un fallo en silencio es exactamente lo que dejo ciego al vigilante de memoria.
    return { total, usar, ok: false, error: e.message }
  }
}

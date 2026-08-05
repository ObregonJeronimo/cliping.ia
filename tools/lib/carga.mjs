// NO SATURAR LA MAQUINA. Baja la prioridad y deja nucleos libres ANTES de lanzar nada pesado.
//
// POR QUE EXISTE, y esto salio de leer el registro de Windows y no de suponer:
//
//   La PC de desarrollo se colgo TRES VECES en 50 minutos mientras corrian las compuertas, los renders
//   y Chromium, con Photoshop y OBS abiertos. Los tres con `BugcheckCode = 0` y sin un solo evento
//   WHEA: ni pantalla azul ni error de hardware registrado.
//
//   OJO CON UNA CONCLUSION QUE ESTUVO ACA Y ERA FALSA. Se leyeron los eventos de arranque y se dedujo
//   que el equipo venia de "seis dias prendido sin un corte", o sea que no era una falla cronica. Es
//   mentira: Windows tiene INICIO RAPIDO activado (`HiberbootEnabled = 1`), asi que "Apagar" no apaga
//   —hiberna el nucleo— y el reloj de arranque no se reinicia. Esas sesiones de dias eran reanudaciones
//   hibridas. Jero apaga la maquina todas las noches; el dato decia lo contrario porque estaba mal
//   leido. Anotado porque una conclusion falsa sobre hardware manda a gastar plata en la pieza que no es.
//
//   El sintoma real, dicho por quien lo vio: la imagen se CONGELA, despues la pantalla se va a negro y
//   no vuelve, y hay que forzar el apagado con el boton. Eso es un cuelgue, no un apagon.
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

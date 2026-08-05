// EL CERROJO DE TRABAJO PESADO. Dos corridas pesadas a la vez no caben en esta maquina, y hasta hoy lo
// unico que lo impedia era una linea en el CLAUDE.md: *"Nunca correr dos guards a la vez"*.
//
// Una regla escrita en un documento la cumple quien la leyo. El 4 de agosto de 2026 la maquina se
// colgo porque habia un `gates:guard` corriendo en segundo plano y encima se lanzaron renders de
// `motor.py`: las dos cosas levantan Chromium con SwiftShader, las dos son legitimas, y ninguna sabia
// de la otra. La regla estaba escrita y se rompio igual.
//
// Esto la vuelve mecanica: el que llega segundo NO ARRANCA, y dice quien tiene el cerrojo y desde
// cuando. Vale para Jero y para Thiago por igual, y no depende de que ninguno se acuerde.
//
// EL CERROJO SE SUELTA SOLO. Si el proceso dueño ya no existe —se corto la luz, se cerro la terminal,
// se colgo la maquina— el cerrojo queda huerfano, y un cerrojo huerfano que hay que borrar a mano es
// una molestia que se termina desactivando. Se comprueba el pid: si no vive, se toma.
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(HERE, '..', '..')
const ARCHIVO = join(RAIZ, 'tools', 'out', '.pesado.lock')

const vive = (pid) => {
  try { process.kill(pid, 0); return true } catch (e) { return e.code === 'EPERM' }
}

// Toma el cerrojo o devuelve `null` si lo tiene otro. `quien` es para el mensaje: "gates:guard",
// "motor.py linear.app", lo que sea que le sirva al que lo encuentre ocupado.
export function tomar(quien) {
  mkdirSync(dirname(ARCHIVO), { recursive: true })
  if (existsSync(ARCHIVO)) {
    try {
      const d = JSON.parse(readFileSync(ARCHIVO, 'utf8'))
      if (d.pid && vive(d.pid)) return { ocupado: d }
      // huerfano: el dueño ya no existe
    } catch { /* ilegible = huerfano */ }
  }
  writeFileSync(ARCHIVO, JSON.stringify({ pid: process.pid, quien, desde: new Date().toISOString() }))
  const soltar = () => { try { if (JSON.parse(readFileSync(ARCHIVO, 'utf8')).pid === process.pid) unlinkSync(ARCHIVO) } catch { /* ya no esta */ } }
  // Se suelta pase lo que pase: salida normal, Ctrl-C o excepcion sin atrapar.
  process.on('exit', soltar)
  for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { soltar(); process.exit(130) })
  return { soltar }
}

export const RUTA = ARCHIVO

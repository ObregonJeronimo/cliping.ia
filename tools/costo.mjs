// CUANTO CUESTA CADA TAREA PESADA EN ESTA MAQUINA — para avisar con un dato, no con una corazonada.
//
// La regla del proyecto (ver CLAUDE.md, "Avisar antes de trabajo pesado") obliga a decir, ANTES de
// arrancar, cuanta RAM va a quedar libre. Este comando da el numero.
//
// Y LO DA POR MAQUINA, que es el punto entero: el repo lo comparten dos PC distintas con memoria y
// componentes distintos. Un consumo medido en una NO predice nada en la otra. Si en esta maquina la
// tarea nunca se corrio, esto lo dice en vez de inventar — decir "no lo se todavia" es informacion; dar
// el numero de la otra PC como si fuera este es un dato falso.
//
// Uso:  npm run costo            (todo lo medido aca)
//       npm run costo -- gates   (una tarea)
import { readFileSync, existsSync } from 'node:fs'
import { hostname, totalmem } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { disponibleMb, MINIMO_ARRANQUE_MB } from './lib/memoria.mjs'

const ARCH = join(dirname(fileURLToPath(import.meta.url)), 'out', '.costos.jsonl')
const filtro = process.argv.slice(2).join(' ').trim().toLowerCase()
const disp = disponibleMb()
const total = Math.round(totalmem() / 1048576)

console.log(`\nEquipo: ${hostname()} · RAM total ${total} MB · disponible ahora ${disp} MB\n`)

if (!existsSync(ARCH)) {
  console.log('Todavia no hay ninguna medicion EN ESTA MAQUINA.')
  console.log('La primera corrida de cada tarea la mide sola; hasta entonces, avisar que se desconoce.')
  process.exit(0)
}
const filas = readFileSync(ARCH, 'utf8').trim().split('\n')
  .map(l => { try { return JSON.parse(l) } catch { return null } })
  .filter(f => f && f.equipo === hostname() && !f.cortado)
  // UNA FILA SIN `minimoMb` NO SE PUEDE USAR, y esto casi pasa inadvertido: en JS `7273 - null` da
  // 7273, o sea que una corrida demasiado corta para llegar a medirse aparecia como si hubiera pedido
  // TODA la memoria disponible. Un aviso construido sobre eso es una mentira con forma de medicion.
  .filter(f => Number.isFinite(f.minimoMb))
  .filter(f => !filtro || String(f.quien).toLowerCase().includes(filtro))

if (!filas.length) {
  console.log(filtro ? `"${filtro}" nunca se corrio en esta maquina: el consumo se desconoce.`
    : 'No hay mediciones de esta maquina todavia.')
  process.exit(0)
}
// SOLO LAS ULTIMAS CORRIDAS, IGUAL QUE `costoDe`. Esto estaba distinto de los dos lados y era un
// defecto real, no un detalle de estilo: `costoDe` —lo que USA el guard para decidir si arranca— mira
// las ultimas 5, y esta tabla —lo que LEE una persona para avisar— miraba TODO el historial. La misma
// pregunta contestada con datos distintos segun quien la haga.
//
// Y el sintoma ya habia aparecido: esta tabla informaba `urvid1-qa` con un peor caso de 6426 MB, que
// es la corrida ANTERIOR a que se le arreglara la fuga. La corrida de despues pidio 1015. Avisar con
// 6426 manda a cerrar aplicaciones por un problema que ya no existe — y es justo lo que la nota de
// `costoDe` explica que hay que evitar: "un historial que nunca olvida convierte cada fuga arreglada
// en una tarea prohibida para siempre".
//
// Se muestra ademas cuantas corridas hay en total, para que se vea que la ventana es una ventana.
const VENTANA = 5
const porTarea = new Map()
for (const f of filas) {
  const k = String(f.quien).split(' ').slice(0, 3).join(' ')
  const q = porTarea.get(k) || { total: 0, recientes: [] }
  q.total++
  q.recientes.push(f)
  if (q.recientes.length > VENTANA) q.recientes.shift()
  porTarea.set(k, q)
}
for (const q of porTarea.values()) {
  q.n = q.recientes.length
  q.usos = q.recientes.map(f => f.arrancoConMb - f.minimoMb).filter(u => Number.isFinite(u) && u > 0)
  q.segs = q.recientes.map(f => f.segundos).filter(Boolean)
}
console.log('tarea'.padEnd(40) + 'corridas   pidio tipico   pidio peor   dura')
console.log(`  "corridas" es ultimas/total: solo las ultimas ${VENTANA} cuentan, para que una fuga ya`)
console.log('  arreglada deje de prohibir la tarea para siempre (mismo criterio que usa el guard).\n')
for (const [k, q] of [...porTarea].sort((a, b) => Math.max(0, ...b[1].usos) - Math.max(0, ...a[1].usos))) {
  const tip = q.usos.length ? Math.round(q.usos.reduce((a, b) => a + b, 0) / q.usos.length) : null
  const peor = q.usos.length ? Math.max(...q.usos) : null
  const seg = q.segs.length ? Math.round(q.segs.reduce((a, b) => a + b, 0) / q.segs.length) : null
  console.log(k.slice(0, 39).padEnd(40)
    + `${q.n}/${q.total}`.padStart(5)
    + (tip === null ? '        (sin dato)' : `${String(tip).padStart(12)} MB`)
    + (peor === null ? '            ' : `${String(peor).padStart(11)} MB`)
    + (seg === null ? '' : `   ${seg} s`))
  if (peor !== null) {
    const queda = disp - peor
    console.log(''.padEnd(40) + `-> arrancando ahora quedarian ~${queda} MB libres`
      + (queda < MINIMO_ARRANQUE_MB ? '  ¡MUY POCO: conviene cerrar aplicaciones primero!' : ''))
  }
}
console.log('\nEl "pidio peor" es el que hay que usar para avisar: es el caso malo ya visto, no el promedio.\n')

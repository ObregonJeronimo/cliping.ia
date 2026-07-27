// GATE del GUION: que una misma página pueda dar VIDEOS DISTINTOS, y que ninguno mienta.
//
// El reclamo textual que originó esto: "en todos los ejemplos q me mandaste se vieron videos
// identicos". La paleta ya sale de cada marca (ver tools/adn-check.mjs), pero mientras la lista de
// escenas fue una constante, la ESTRUCTURA —que es lo que se percibe como "otro video"— era la misma
// para todos: seis escenas, mismo orden, 17.42 s.
//
// Cinco controles:
//   E-GUION-DURACION   la pieza cae dentro de ±1 beat del objetivo pedido
//   E-GUION-VARIEDAD   semillas distintas dan estructuras distintas
//   E-GUION-MATERIAL   ninguna escena entra sin el material mínimo que necesita
//   E-GUION-MARCO      la apertura abre y el cierre cierra, siempre
//   E-GUION-SEGUIDAS   nunca dos escenas de hero pegadas
//
// El de VARIEDAD se mide sobre semillas CONSECUTIVAS (1..12) a propósito: es el caso de uso real —el
// mismo cliente pidiendo otra versión— y es el que rompía. Un congruencial lineal sembrado con
// números chicos consecutivos devuelve primeros valores casi iguales, así que las doce caían en el
// mismo orden narrativo. Con semillas al azar el defecto no se veía.
import { guionDe, beatsDelGuion, ajusteDe, TOPE_AJUSTE } from '../render3d/demo/guion.js'

// El catalogo real, copiado de los meta.beats de cada escena. Se declara aca y no se importan los
// modulos porque importarlos arrastra three y un DOM: esta compuerta tiene que ser instantanea.
const CAT = new Map([
  ['apertura', { beats: 6 }], ['hero', { beats: 8 }], ['toro', { beats: 6 }],
  ['tipografia', { beats: 8 }], ['tarjetas', { beats: 6 }], ['destello', { beats: 4 }],
  ['cierre', { beats: 6 }],
])

const PAGINAS = {
  // Una landing completa: cuatro frases, cifras, golpe. Da para elegir.
  rica: { marca: 'STRIPE', frases: ['a', 'b', 'c', 'd'], datos: [{ etiqueta: 'X' }, { etiqueta: 'Y' }], golpe: 'G' },
  // Lo que da la mayoria de las paginas reales: algo de copy, ninguna cifra.
  media: { marca: 'LINEAR', frases: ['a', 'b', 'c', 'd'], datos: [], golpe: 'G' },
  // El caso que rompe: casi nada. Una pagina detras de login, una 404, un sitio que bloqueo al bot.
  pobre: { marca: 'Q', frases: ['a'], datos: [], golpe: null },
}
const BPM = { lujo: 60 / 85, tecnico: 60 / 124, deportivo: 60 / 142 }
const DURS = [15, 20, 30]
const SEMILLAS = Array.from({ length: 12 }, (_, i) => i + 1)

const fallos = []
const F = (cod, m) => fallos.push(`${cod}  ${m}`)
// Las piezas que quedan cortas porque no hay MAS ESCENAS que meter. No es un fallo, es una carencia
// del catalogo, y se imprime para que sea visible en vez de quedar escondida detras de un OK.
const cortas = []

const REQ = {
  tipografia: d => (d.frases || []).filter(Boolean).length >= 4,
  tarjetas: d => (d.datos || []).length >= 1,
  destello: d => !!d.golpe,
}

let combinaciones = 0
for (const [nomPag, datos] of Object.entries(PAGINAS)) {
  for (const [nomAire, beatSeg] of Object.entries(BPM)) {
    for (const dur of DURS) {
      const planes = []
      for (const seed of SEMILLAS) {
        combinaciones++
        const plan = guionDe({ escenas: CAT, datos, seed, beatSeg, dur })
        const etiq = `${nomPag}/${nomAire}/${dur}s/seed${seed}`
        planes.push(plan.join('>'))

        // La duracion que se mide es la FINAL: la del archivo, despues del ajuste de tempo. Medir la
        // suma cruda de beats era medir un numero intermedio que el espectador nunca ve.
        const seg = ajusteDe(plan, CAT, beatSeg, dur).dur
        // Un beat de margen para arriba y para abajo. Mas abajo se nota como pieza corta; mas arriba
        // se pasa del hueco del formato.
        if (Math.abs(seg - dur) > dur * TOPE_AJUSTE + 0.01) {
          // QUEDARSE CORTO NO SIEMPRE ES UN BUG. Puede ser que EL CATALOGO SE HAYA AGOTADO: siete
          // escenas no llenan 30 s a 142 bpm si la pagina ademas no dio cifras y la de datos no entra.
          // La distincion es exacta: se mira si ALGUNA escena mas hubiera ENTRADO EN LO QUE SOBRA.
          //
          // El primer intento comparaba contra un guion pedido a 120 s, y ahi obviamente entra mas
          // — la comparacion no decia nada sobre el presupuesto real y acusaba a todos por igual.
          const sobra = Math.round(dur / beatSeg) + 1 - beatsDelGuion(plan, CAT)
          const hayHueco = plan.some((_, i) => i > 0 && plan[i - 1] !== 'hero' && plan[i] !== 'hero')
          const cabe = [...CAT.keys()].filter(id => id !== 'apertura' && id !== 'cierre'
            && (!REQ[id] || REQ[id](datos))
            && (id === 'hero' ? hayHueco : !plan.includes(id)))
            .map(id => CAT.get(id).beats)
          const masBarato = cabe.length ? Math.min(...cabe) : Infinity
          if (masBarato <= sobra) {
            F('E-GUION-DURACION', `${etiq}: pidio ${dur}s y da ${seg.toFixed(1)}s, y sobraban ${sobra} beats donde entraba una escena de ${masBarato}`)
          } else {
            cortas.push(`${etiq}: ${seg.toFixed(1)}s de ${dur}s`)
          }
        }

        if (plan[0] !== 'apertura' || plan[plan.length - 1] !== 'cierre') {
          F('E-GUION-MARCO', `${etiq}: la pieza empieza con "${plan[0]}" y termina con "${plan[plan.length - 1]}"`)
        }

        for (const id of new Set(plan)) {
          if (REQ[id] && !REQ[id](datos)) {
            F('E-GUION-MATERIAL', `${etiq}: metio "${id}" y la pagina no tiene con que llenarla`)
          }
        }

        for (let i = 1; i < plan.length; i++) {
          if (plan[i] === 'hero' && plan[i - 1] === 'hero') {
            F('E-GUION-SEGUIDAS', `${etiq}: dos escenas de hero pegadas — el corte entre ellas no se lee`)
          }
        }
      }
      // VARIEDAD. Con una pagina rica y doce semillas tienen que salir al menos tres estructuras
      // distintas; si sale una sola, el guion es la constante que habia antes con otro nombre.
      // El minimo depende de CUANTO MATERIAL HAY, porque de eso depende cuantas estructuras existen.
      // Una pagina sin cifras no puede armar el orden que abre con la prueba dura: pedirle tres
      // estructuras es pedirle que invente una escena de datos sin datos.
      const distintos = new Set(planes).size
      const minimo = nomPag === 'pobre' ? 1 : nomPag === 'media' ? 2 : 3
      if (distintos < minimo) {
        F('E-GUION-VARIEDAD', `${nomPag}/${nomAire}/${dur}s: 12 semillas dan solo ${distintos} estructura(s) distinta(s), hacen falta ${minimo}`)
      }
    }
  }
}

if (fallos.length) {
  console.error(`GUION: ${fallos.length} FALLO(S) sobre ${combinaciones} guiones\n` + fallos.slice(0, 14).map(f => '  ' + f).join('\n'))
  process.exit(1)
}
// Cuantas estructuras distintas sabe producir el motor hoy. Es el numero que responde al reclamo.
const todos = new Set()
for (const datos of Object.values(PAGINAS)) {
  for (const beatSeg of Object.values(BPM)) {
    for (const dur of DURS) {
      for (const seed of SEMILLAS) todos.add(guionDe({ escenas: CAT, datos, seed, beatSeg, dur }).join('>'))
    }
  }
}
console.log(`GUION OK — ${combinaciones} guiones (3 paginas x 3 ritmos x ${DURS.length} duraciones x ${SEMILLAS.length} semillas): `
  + `duracion, variedad, material, marco y cortes.  ${todos.size} estructuras distintas.`)
if (cortas.length) {
  const casos = [...new Set(cortas.map(c => c.split('/seed')[0] + ' -> ' + c.split(': ')[1]))]
  console.log(`  ${cortas.length} guiones quedan cortos porque SE ACABO EL CATALOGO (7 escenas no llenan 30 s a tempo alto):`)
  for (const c of casos.slice(0, 6)) console.log(`    ${c}`)
  console.log('    El arreglo es mas escenas, no mas tolerancia de tempo.')
}

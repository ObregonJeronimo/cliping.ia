// urvid1-apca-check.mjs — GATE de color AISLADO (no importa scenes -> corre aunque se este editando otra lib).
// Verifica que TODA la lib color, via derive()->finalize(), de paletas DETERMINISTAS y LEGIBLES con el piso WCAG
// Y AHORA tambien buen contraste PERCEPTUAL APCA en onAccent (el texto sobre el chip de acento = la "banda muerta").
// Importa SOLO libs/color (que arrastra core/palette + core/util + core/prng + registry), no el engine completo.
import '../src/urvid/libs/color/index.js'
import { query } from '../src/urvid/core/registry.js'
import { contrast, apcaLc } from '../src/urvid/core/util.js'

// sanity de la formula APCA (signos + magnitudes razonables)
const sane = [
  ['#000000', '#ffffff', 'negro/blanco'], ['#ffffff', '#000000', 'blanco/negro'],
  ['#ffffff', '#22e06a', 'blanco/verde'], ['#14090e', '#22e06a', 'casi-negro/verde'],
]
console.log('APCA sanity:')
for (const [tx, bg, lbl] of sane) console.log('  Lc', apcaLc(tx, bg).toFixed(1).padStart(6), lbl)

const BRANDS = ['#22e06a', '#f5c518', '#5b8cff', '#ff4f8b', '#10b981', '#ffffff', '#0a0a0a', '#a855f7', '#ff6a00']
let combos = 0, fails = 0, lowApca = 0, apcaSum = 0
for (const tone of ['dark', 'light']) {
  const mods = query('color', { tone })
  for (const m of mods) {
    if (typeof m.derive !== 'function') continue
    for (const brand of BRANDS) {
      const p = m.derive(brand, { tone, rubro: 'default', seed: 7 })
      const p2 = m.derive(brand, { tone, rubro: 'default', seed: 7 })
      combos++
      const roles = ['accent', 'accent2', 'bg0', 'bg1', 'ink', 'dim', 'inkText', 'onAccent']
      const miss = roles.filter(r => typeof p[r] !== 'string')
      const det = JSON.stringify(p) === JSON.stringify(p2)
      const wInk = Math.min(contrast(p.ink, p.bg0), contrast(p.ink, p.bg1))
      const wOnAcc = contrast(p.onAccent, p.accent)
      const aOnAcc = Math.abs(apcaLc(p.onAccent, p.accent))
      apcaSum += aOnAcc
      if (aOnAcc < 30) lowApca++   // texto sobre el chip deberia tener APCA decente (texto grande/bold >=30)
      if (miss.length || !det || wInk < 4.5 || wOnAcc < 3) {
        fails++
        if (fails <= 8) console.log(`XX ${m.id} ${tone} ${brand}: miss=${miss} det=${det} wInk=${wInk.toFixed(1)} wOnAcc=${wOnAcc.toFixed(1)}`)
      }
    }
  }
}
console.log(`\ncombos=${combos} fails=${fails} onAccent APCA<30=${lowApca} (avg |Lc|=${(apcaSum / combos).toFixed(1)})`)
console.log(fails === 0 ? 'GATE APCA/COLOR OK (roles + determinismo + WCAG ink>=4.5 + onAccent>=3, con APCA reportado).' : `GATE FALLA: ${fails} combos.`)
process.exit(fails === 0 ? 0 : 1)

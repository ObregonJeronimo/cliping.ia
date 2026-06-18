// urvid1-color-check.mjs — GATE de la biblioteca COLOR de urvid 1.0. Verifica TODA la lib (no solo una ola):
// para cada modulo de color x cada tono que declara x un set de marcas (incluye los hues "dificiles" verde/ambar
// y los extremos blanco/negro), comprueba que derive() produzca una paleta DETERMINISTA y LEGIBLE (WCAG):
//   - tiene los 8 roles (accent/accent2/bg0/bg1/ink/dim/inkText/onAccent) como string valido
//   - determinismo: derive 2x con el mismo input -> objeto identico
//   - contrast(ink, bg0) >= 4.5  y  contrast(ink, bg1) >= 4.5   (texto principal sobre el fondo)
//   - contrast(inkText, bg0) >= 3.0                              (texto-acento legible)
//   - contrast(onAccent, accent) >= 3.0                          (texto sobre el chip de acento -> la "banda muerta")
// Sale con codigo !=0 si algo falla. Uso: node tools/urvid1-color-check.mjs
import '../src/urvid/libs/index.js'   // registra TODAS las libs (tambien chequea colisiones de id al cargar)
import { query, stats } from '../src/urvid/core/registry.js'
import { contrast } from '../src/urvid/core/util.js'

const BRANDS = ['#5b8cff', '#e0432a', '#22e06a', '#9b59b6', '#f5a623', '#111111', '#fafafa', '#888888']
const HEX = /^#?[0-9a-fA-F]{3,8}$|^rgba?\(/
const MINS = { inkBg: 4.5, inkText: 3.0, onAccent: 3.0 }

const mods = query('color')
console.log('COLOR: ' + mods.length + ' modulos registrados ·', stats().totalModules, 'modulos totales en el registro')

const fails = []
let checks = 0
for (const m of mods) {
  for (const tone of (m.tones || ['dark', 'light'])) {
    for (const brand of BRANDS) {
      let pal
      try { pal = m.derive(brand, { tone, rubro: 'default', seed: 12345 }) }
      catch (e) { fails.push(`${m.id} [${tone}/${brand}] THROW: ${e.message}`); continue }
      // 1) forma
      const roles = ['accent', 'accent2', 'bg0', 'bg1', 'ink', 'dim', 'inkText', 'onAccent']
      const missing = roles.filter(r => !pal || typeof pal[r] !== 'string' || !HEX.test(pal[r]))
      if (missing.length) { fails.push(`${m.id} [${tone}/${brand}] roles invalidos: ${missing.join(',')}`); continue }
      // 2) determinismo
      const pal2 = m.derive(brand, { tone, rubro: 'default', seed: 12345 })
      if (JSON.stringify(pal) !== JSON.stringify(pal2)) fails.push(`${m.id} [${tone}/${brand}] NO-DETERMINISTA`)
      // 3) WCAG (la regla dura de legibilidad)
      const cInkBg0 = contrast(pal.ink, pal.bg0), cInkBg1 = contrast(pal.ink, pal.bg1)
      const cInkText = contrast(pal.inkText, pal.bg0), cOnAcc = contrast(pal.onAccent, pal.accent)
      if (cInkBg0 < MINS.inkBg) fails.push(`${m.id} [${tone}/${brand}] ink/bg0 ${cInkBg0.toFixed(2)} < ${MINS.inkBg}`)
      if (cInkBg1 < MINS.inkBg) fails.push(`${m.id} [${tone}/${brand}] ink/bg1 ${cInkBg1.toFixed(2)} < ${MINS.inkBg}`)
      if (cInkText < MINS.inkText) fails.push(`${m.id} [${tone}/${brand}] inkText/bg0 ${cInkText.toFixed(2)} < ${MINS.inkText}`)
      if (cOnAcc < MINS.onAccent) fails.push(`${m.id} [${tone}/${brand}] onAccent/accent ${cOnAcc.toFixed(2)} < ${MINS.onAccent}`)
      checks++
    }
  }
}

// desglose por categoria (para ver el reparto)
const byCat = {}
for (const m of mods) byCat[m.category] = (byCat[m.category] || 0) + 1
console.log('por categoria:', JSON.stringify(byCat))
console.log(`combinaciones probadas: ${checks} (modulo x tono x ${BRANDS.length} marcas)`)

if (fails.length) {
  console.log('\nFALLOS (' + fails.length + '):')
  for (const f of fails.slice(0, 60)) console.log('  - ' + f)
  if (fails.length > 60) console.log('  ... y ' + (fails.length - 60) + ' mas')
  process.exit(1)
}
console.log('\nGATE COLOR OK: todos los modulos deterministas y legibles (WCAG) para todas las marcas/tonos.')

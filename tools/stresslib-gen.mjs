// scratch: BIBLIOTECA DE ESTRES — ejerce cada variante de cada escena con copy LARGO, en dark+light, varios estilos.
// Sirve para que bounds-check (y legibilidad) verifiquen TODA la biblioteca: si nada se sale aca, nada se sale nunca.
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const OUT = join(dirname(fileURLToPath(import.meta.url)), '_stresslib')
mkdirSync(OUT, { recursive: true })

const L = {
  stmt: 'El medio de tecnologia en espanol mas grande del mundo entero con analisis propios y profundos',
  item: 'Analisis propios y profundos, nunca copypaste de las gacetillas oficiales del sector tecnologico',
  label: 'paginas vistas al ano en todo el mundo hispanohablante sin ninguna excepcion posible',
  cta: 'Suscribite ahora mismo totalmente gratis y sin tarjeta de credito',
  brand: 'Mi Medio De Tecnologia En Espanol Rioplatense Avanzado',
  kicker: 'MIRA ESTO QUE TE VA A INTERESAR MUCHISIMO HOY MISMO',
  quote: 'El unico medio que leo todos los dias sin falta porque siempre aporta algo nuevo y bien explicado para todos',
  author: 'Un lector muy fiel desde hace ya muchisimos anos enteros sin parar',
  title: 'Por que elegir este medio de tecnologia tan completo y grande',
}
const items4 = [L.item, 'Sin ruido editorial constante todos los dias del ano entero', 'Todo el ecosistema tecnologico cubierto de punta a punta', 'Cobertura total garantizada sin excepcion siempre']

function base(tone, style, bg, scenes) {
  return {
    brand: L.brand, accent: '#22e06a', theme: 'saas-explainer', seed: 909, texture: 'none', rubro: 'tech',
    tone, style, bgStyle: bg, shadowMode: 'soft', fontDisplay: 'Plus Jakarta Sans', fontText: 'Inter',
    fontAccent: 'JetBrains Mono', heroResource: 'particles', motif: 'tech', substrate: 'scanlines',
    signatureForm: 'hexagon', images: [], scenes,
  }
}

const FIX = {}
// statements: 5 estilos con texto largo
FIX.statements = ['centered', 'left', 'quote', 'panel', 'editorial'].map(s => ({ type: 'statement', text: L.stmt, stmtStyle: s, durationInFrames: 100 }))
// checklist: rows x4 markers + grid + chips, items largos
FIX.checklist = [
  ['rows', 'check'], ['rows', 'dash'], ['rows', 'number'], ['rows', 'bar'], ['grid', 'check'], ['chips', 'check'],
].map(([lay, st]) => ({ type: 'checklist', title: L.title, items: items4, listLayout: lay, listStyle: st, listAnchor: 'center', durationInFrames: 100 }))
// stats: bigStat x3 + numberStack labels largos
FIX.stats = [
  { type: 'bigStat', value: 98, suffix: '%', label: L.label, statLayout: 'ring', kicker: L.kicker, durationInFrames: 100 },
  { type: 'bigStat', value: 14000, suffix: 'M', label: L.label, statLayout: 'bar', durationInFrames: 100 },
  { type: 'bigStat', value: 25, prefix: '+', label: L.label, statLayout: 'plain', durationInFrames: 100 },
  { type: 'numberStack', items: [{ value: 14000, suffix: 'M', label: L.label }, { value: 4.9, suffix: '★', label: L.label }, { value: 25, prefix: '+', label: L.label }], align: 'center', durationInFrames: 100 },
]
// outro: 6 comps con cta + brand largos
FIX.outro = ['center', 'left', 'bar', 'bigtype', 'diagonal', 'ctaOnly'].map(c => ({ type: 'outro', brand: L.brand, cta: L.cta, outroComp: c, durationInFrames: 100 }))
// misc: reveal (kicker largo), quote (texto+autor largos), split (titulo/sub/cta largos)
FIX.misc = [
  { type: 'reveal', text: L.stmt, kicker: L.kicker, align: 'center', durationInFrames: 100 },
  { type: 'quote', text: L.quote, author: L.author, stars: 5, align: 'center', durationInFrames: 100 },
  { type: 'split', title: L.brand, sub: L.stmt, cta: L.cta, side: 'left', durationInFrames: 100 },
]

const TONES = ['dark', 'light']
const STYLE_BG = [['corporate', 'corporate'], ['brutalist', 'brutalist'], ['editorial', 'editorial']]
let n = 0
for (const tone of TONES) {
  const [style, bg] = STYLE_BG[n % STYLE_BG.length]
  for (const [grp, scenes] of Object.entries(FIX)) {
    writeFileSync(join(OUT, `${tone}-${grp}.json`), JSON.stringify(base(tone, style, bg, scenes), null, 1))
    n++
  }
}
console.log(`biblioteca de estres -> ${OUT}/ (${n} fixtures, cada escena/variante con copy largo, dark+light)`)

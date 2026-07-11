// GATE templates: (1) resolucion de SLOTS correcta (cada tipo recibe lo suyo + anti-repeticion),
// (2) DETERMINISMO byte-identico (mismo template+brief+t -> mismo PNG), (3) contrato basico.
import { createCanvas } from '@napi-rs/canvas'
import { makeTemplateVideo, drawTemplateFrame, resolveContent, normalizeTemplate, EXAMPLE_TEMPLATES } from '../src/templates/index.js'

let fails = 0
const die = m => { console.error('FAIL  ' + m); fails++ }

const brief = { brand: 'Acme', rubro: 'tech', brandColor: '#5b8cff', tagline: 'Construido para escalar', claim: 'La plataforma que crece con vos', cta: 'Probalo gratis', bullets: ['Rapido', 'Seguro', 'Simple'], stats: [{ value: '99%', label: 'uptime' }] }

// 1) SLOTS
const rv = makeTemplateVideo(EXAMPLE_TEMPLATES[0], brief)
const slots = {}
for (const sc of rv.scenes) for (const l of sc.layers) if (l.slot) (slots[l.slot.kind] = slots[l.slot.kind] || []).push(l.resolved)
if (!slots.brand || slots.brand[0] !== 'Acme') die('slot brand != brand')
if (!Array.isArray(slots.list && slots.list[0])) die('slot list no es array')
if (JSON.stringify(slots.list[0]) !== JSON.stringify(['Rapido', 'Seguro', 'Simple'])) die('list != bullets: ' + JSON.stringify(slots.list[0]))
if (!slots.headline || slots.headline[0] !== brief.claim) die('headline != claim: ' + slots.headline[0])
if (slots.cta[0] !== 'Probalo gratis') die('cta mal')
// anti-repeticion: el claim (headline) NO debe estar entre los bullets de la lista, y viceversa
if (slots.list[0].includes(brief.claim)) die('claim repetido en la lista')

// slot vacio no rompe (brief sin bullets)
const rv2 = makeTemplateVideo(EXAMPLE_TEMPLATES[0], { brand: 'X', claim: 'Solo esto', cta: 'Ya' })
if (rv2.scenes.find(s => s.id === 's2').layers.find(l => l.slot && l.slot.kind === 'list').resolved.length !== 0) die('lista sin bullets deberia ser []')

// 2) DETERMINISMO
const png = (video, t) => { const ss = 2, cv = createCanvas(video.W * ss, video.H * ss), ctx = cv.getContext('2d'); ctx.setTransform(ss, 0, 0, ss, 0, 0); drawTemplateFrame(ctx, t, video); return cv.toBuffer('image/png') }
for (const t of [0.3, rv.duration * 0.4, rv.duration * 0.75, rv.duration * 0.95]) {
  if (!png(rv, t).equals(png(rv, t))) die(`t=${t.toFixed(2)}: frame difiere entre corridas`)
}

// 3) contrato
if (!(rv.duration > 3)) die('duracion invalida')
if (rv.scenes.some((s, i) => i > 0 && !(s.t0 > rv.scenes[i - 1].t0))) die('t0 de escenas no monotono')
const norm = normalizeTemplate({ scenes: [{ layers: [{}] }] })
if (!norm.scenes[0].id || !norm.scenes[0].layers[0].id) die('normalize no asigna ids')

if (fails) { console.error(`\nGATE TEMPLATES FALLO (${fails}).`); process.exit(1) }
console.log('GATE TEMPLATES OK (slots tipados + anti-repeticion + determinismo byte-identico + contrato).')

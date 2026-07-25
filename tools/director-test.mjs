// GATE director-test (F0) — contratos del nucleo del motor Director:
//   1. PRNG: determinismo + ortogonalidad de namespaces + muestreo sin reemplazo
//   2. EASE: propiedades matematicas de cada curva (0->0, 1->1, monotonia donde corresponde,
//      overshoot real donde se promete) + round-trip del parser del ease string
//   3. TEXT: el fitter ACHICA y JAMAS elide con contenido adversarial; wordTrim nunca corta palabras
//   4. SCHEMA: normalizePageModel produce SIEMPRE un modelo valido (5 casos adversariales),
//      el adapter de brief legacy funciona, y los validadores CAZAN cada clase de error tipado
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  mulberry32, seedFor, subSeed, stableSeed, weightedPick, weightedSample, shuffled,
  parseEase, isEase, spring, win, stagger,
  fitFont, wrapFit, wordTrim, drawText, telStart, telStop,
  validatePageModel, validateStoryboard, validateTimeline, normalizePageModel, briefToPageModel, formatErrors,
  PROPS, LAYER_KINDS, CANVAS,
  contrast, apcaLc, lighten, darken, chroma, ensureContrast, mixColor, hexToHsl, hslToHex, hueDist, legibleOn, hexToOklch, oklchToHex,
} from '../src/director/index.js'

const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch { /* fuentes del sistema */ }

let fails = 0
const die = m => { console.error('FAIL  ' + m); fails++ }
const ok = (cond, m) => { if (!cond) die(m) }
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps

// ---------------------------------------------------------------- 1. PRNG
{
  const a = seedFor(42, 'story'), b = seedFor(42, 'story')
  const va = [a(), a(), a()], vb = [b(), b(), b()]
  ok(va.every((x, i) => x === vb[i]), 'PRNG: mismo seed+ns debe dar la misma secuencia')
  const c = seedFor(42, 'look'), d = seedFor(42, 'story')
  ok(c() !== d(), 'PRNG: namespaces distintos deben divergir')
  // ortogonalidad: consumir 'story' no cambia 'look'
  const l1 = seedFor(7, 'look')(); const s = seedFor(7, 'story'); s(); s(); s()
  const l2 = seedFor(7, 'look')()
  ok(l1 === l2, 'PRNG: iterar un namespace NO puede afectar a otro')
  ok(stableSeed('Marca', 'tech') === stableSeed('Marca', 'tech'), 'PRNG: stableSeed determinista')
  ok(subSeed(1, 'x') === subSeed(1, 'x') && subSeed(1, 'x') !== subSeed(1, 'y'), 'PRNG: subSeed determinista y distinto por ns')
  const r = mulberry32(9)
  for (let i = 0; i < 500; i++) { const v = r(); if (!(v >= 0 && v < 1)) { die('PRNG: valor fuera de [0,1)'); break } }
  // weightedSample: sin reemplazo, respeta n, ignora peso 0
  const items = [['a', 1], ['b', 1], ['c', 0]]
  for (let k = 0; k < 50; k++) {
    const out = weightedSample(seedFor(k, 'w'), items, 2, x => x[1])
    if (new Set(out).size !== out.length) { die('PRNG: weightedSample repitio un item'); break }
    if (out.some(x => x[1] === 0) && out.length === 2 && items.filter(x => x[1] > 0).length >= 2) { die('PRNG: weightedSample eligio peso 0 habiendo alternativas'); break }
  }
  ok(shuffled(seedFor(1, 's'), [1, 2, 3, 4]).length === 4, 'PRNG: shuffled conserva largo')
}

// ---------------------------------------------------------------- 2. EASE
{
  const NAMES = ['lin', 'eo', 'ei', 'eio', 'co', 'ci', 'cio', 'qo', 'back', 'back:2', 'spring:0.6,13', 'step']
  for (const n of NAMES) {
    ok(isEase(n), `EASE: '${n}' deberia validar`)
    const f = parseEase(n)
    ok(near(f(0), 0, 1e-9), `EASE: ${n}(0) debe ser 0 (dio ${f(0)})`)
    ok(near(f(1), 1, 1e-9), `EASE: ${n}(1) debe ser 1 (dio ${f(1)})`)
    for (const t of [-1, 0.3, 1.7]) { const v = f(t); if (!Number.isFinite(v)) die(`EASE: ${n}(${t}) no finito`) }
  }
  ok(!isEase('nope') && !isEase('spring:9') && !isEase('spring:2,3'), 'EASE: strings invalidos deben rechazarse')
  // monotonia de las curvas que NO prometen overshoot
  for (const n of ['lin', 'eo', 'ei', 'eio', 'co', 'ci', 'cio', 'qo']) {
    const f = parseEase(n); let prev = -Infinity
    for (let i = 0; i <= 100; i++) { const v = f(i / 100); if (v < prev - 1e-9) { die(`EASE: ${n} no es monotona`); break } prev = v }
  }
  // back y spring SI deben pasarse de 1 (overshoot real, no decorativo)
  let maxBack = 0, maxSpring = 0
  for (let i = 0; i <= 200; i++) { maxBack = Math.max(maxBack, parseEase('back')(i / 200)); maxSpring = Math.max(maxSpring, parseEase('spring:0.5,14')(i / 200)) }
  ok(maxBack > 1.02, 'EASE: back debe hacer overshoot (>1.02)')
  ok(maxSpring > 1.02, 'EASE: spring subamortiguado debe rebotar (>1.02)')
  // spring mas amortiguado rebota MENOS (el parametro z tiene que significar algo)
  let m9 = 0; for (let i = 0; i <= 200; i++) m9 = Math.max(m9, spring(i / 200, 0.9, 14))
  ok(m9 < maxSpring, 'EASE: z alto debe rebotar menos que z bajo')
  ok(near(win(5, 0, 10), 0.5) && win(-1, 0, 10) === 0 && win(99, 0, 10) === 1, 'EASE: win clampea y mapea')
  ok(stagger(0, 0, 3) === 0 && stagger(1, 2, 3) === 1, 'EASE: stagger cubre [0,1] para primero y ultimo')
}

// ---------------------------------------------------------------- 3. TEXT
{
  const cv = createCanvas(600, 900), ctx = cv.getContext('2d')
  const LARGO = 'Resultados visibles para tu negocio en dos semanas sin contratos largos ni letra chica'
  // fitFont ACHICA hasta entrar
  const s = fitFont(ctx, LARGO, 60, 300, 10, 800, 'Inter')
  ctx.font = `800 ${s}px "Inter"`
  ok(ctx.measureText(LARGO).width <= 300 || s === 10, 'TEXT: fitFont debe achicar hasta entrar en maxW')
  // drawText ACHICA en vez de elidir SIEMPRE que el texto pueda entrar en algun tamano >= min.
  // (a) caso que SI entra achicando -> prohibido el "…"
  for (const [txt, maxW, min] of [['Menos tareas repetitivas', 320, 12], [LARGO, 520, 9], ['Probalo gratis', 140, 10]]) {
    telStart(); drawText(ctx, txt, 300, 100, { size: 40, maxW, min, weight: 700, family: 'Inter' })
    const r = telStop()
    ok(r.length === 1 && !r[0].ellip, `TEXT: drawText elidio pudiendo achicar (E-TXT-OVERFLOW): "${txt}" @${maxW}`)
    ok(r[0].w <= maxW + 0.5, `TEXT: ancho dibujado > maxW en "${txt}"`)
  }
  // (b) caso IMPOSIBLE (no entra ni al minimo): la elipsis es la red de ultimo recurso documentada,
  // pero el ancho SIGUE respetando maxW (nunca desborda el frame).
  telStart(); drawText(ctx, LARGO, 300, 100, { size: 40, maxW: 200, min: 20, weight: 700, family: 'Inter' })
  const imp = telStop()
  ok(imp[0].w <= 200 + 0.5, 'TEXT: ni en el caso imposible se puede desbordar maxW')
  // wrapFit: ninguna linea desborda y respeta maxLines
  const wr = wrapFit(ctx, LARGO, 40, 260, 10, 700, 'Inter', 2)
  ok(wr.lines.length <= 2, 'TEXT: wrapFit debe respetar maxLines')
  ctx.font = `700 ${wr.size}px "Inter"`
  ok(wr.lines.every(l => ctx.measureText(l).width <= 260 + 0.5), 'TEXT: ninguna linea envuelta puede desbordar')
  // wordTrim: nunca corta a mitad de palabra (E-TXT-MIDWORD) y saca conectores colgantes
  for (const maxW of [60, 120, 240]) {
    const t = wordTrim(ctx, LARGO, maxW, 20, 700, 'Inter')
    const words = LARGO.split(' ')
    ok(t.split(' ').every(w => words.indexOf(w) >= 0), `TEXT: wordTrim corto a mitad de palabra (maxW=${maxW}): "${t}"`)
    const last = t.split(' ').pop().toLowerCase()
    ok(['y', 'de', 'la', 'en', 'para', 'sin', 'ni', 'tu'].indexOf(last) < 0, `TEXT: wordTrim dejo conector colgando: "${t}"`)
  }
}

// ---------------------------------------------------------------- 4. SCHEMA
{
  // 4.1 normalizePageModel produce SIEMPRE algo valido (los 5 casos adversariales del plan)
  const ADV = [
    ['vacio', {}],
    ['null', null],
    ['botwall', { brand: '', semantica: { queHace: '' }, dna: { palette: { accent: 'no-es-hex' } } }],
    ['basura', { v: 99, dna: { mood: { calidez: 5 }, modernidad: 'bento', shape: { radius: 999 } }, semantica: { tipoNegocio: 'inventado', features: 'no-array' }, assets: { images: 'x' } }],
    ['no-latina', { brand: 'Яндекс', semantica: { queHace: '日本語のページ' }, assets: { images: [{ url: 'https://x/y.jpg', kind: 'raro' }] } }],
  ]
  for (const [name, raw] of ADV) {
    const pm = normalizePageModel(raw)
    const v = validatePageModel(pm)
    if (!v.ok) die(`SCHEMA: normalizePageModel('${name}') produjo invalido:\n${formatErrors(v.errors)}`)
    ok(/^#[0-9a-f]{6}$/.test(pm.dna.palette.accent), `SCHEMA: accent normalizado invalido en '${name}'`)
    ok(pm.semantica.queHace.length > 0, `SCHEMA: queHace vacio en '${name}'`)
  }
  // 4.2 adapter del brief legacy
  const pm = briefToPageModel({
    brand: 'Nodo', rubro: 'tech', tone: 'dark', brandColor: '#22e06a', seriousness: 0.5,
    claim: 'Menos tareas repetitivas', tagline: 'Automatiza lo aburrido', cta: 'Probalo gratis',
    bullets: ['Integraciones en 1 click', 'Reportes en vivo'], stats: [{ value: '99.9%', label: 'uptime' }],
    proof: 'Cambio como trabajamos', images: ['https://x/a.jpg'], audience: { register: 'casual', awareness: 'solution' },
  })
  const vpm = validatePageModel(pm)
  ok(vpm.ok, 'SCHEMA: briefToPageModel debe producir un pagemodel valido:\n' + formatErrors(vpm.errors))
  ok(pm.dna.palette.accent === '#22e06a', 'SCHEMA: el adapter debe conservar el brandColor')
  ok(pm.semantica.tipoNegocio === 'saas' && pm.semantica.modeloUso === 'suscripcion', 'SCHEMA: mapeo rubro->negocio/uso')
  ok(pm.semantica.features.length === 2 && pm.semantica.pruebas.stats.length === 1 && pm.semantica.pruebas.testimonios.length === 1, 'SCHEMA: el adapter debe mapear bullets/stats/proof')
  ok(pm.assets.images.length === 1 && pm.assets.images[0].url === 'https://x/a.jpg', 'SCHEMA: el adapter debe mapear imagenes')

  // 4.3 los validadores CAZAN cada clase de error (si no cazan, el gate no sirve)
  const bad = validatePageModel({ v: 1, dna: { palette: { accent: 'rojo' }, density: 'x', mood: { calidez: 3 } }, semantica: { queHace: '', tipoNegocio: 'nope' } })
  const codes = new Set(bad.errors.map(x => x.code))
  ok(!bad.ok && codes.has('E-SCHEMA-TYPE') && codes.has('E-SCHEMA-ENUM') && codes.has('E-SCHEMA-RANGE') && codes.has('E-SCHEMA-MISSING'),
    'SCHEMA: validatePageModel debe cazar TYPE/ENUM/RANGE/MISSING. Cazo: ' + [...codes].join(','))

  const sbOK = { v: 1, scenes: [{ id: 'sc1', dur: 3, layers: [{ id: 'l1', kind: 'text', role: 'title', text: 'Hola', box: [0.1, 0.4, 0.8, 0.2] }] }] }
  ok(validateStoryboard(sbOK).ok, 'SCHEMA: storyboard valido rechazado: ' + formatErrors(validateStoryboard(sbOK).errors))
  const sbBad = { v: 1, scenes: [{ id: 'sc1', dur: 99, layers: [{ id: 'l1', kind: 'nope', box: [0.5, 0.5, 0.9, 0.9] }, { id: 'l1', kind: 'heroObj', box: [0, 0, 1, 1] }] }] }
  const sbc = new Set(validateStoryboard(sbBad).errors.map(x => x.code))
  ok(sbc.has('E-SCHEMA-RANGE') && sbc.has('E-SCHEMA-ENUM') && sbc.has('E-LAYER-OOB') && sbc.has('E-SCHEMA-MISSING'),
    'SCHEMA: validateStoryboard debe cazar RANGE/ENUM/OOB/MISSING. Cazo: ' + [...sbc].join(','))

  const tlOK = {
    v: 1, fps: 30, dur: 5, W: CANVAS.W, H: CANVAS.H,
    markers: [{ t: 0, label: 'Apertura', sceneId: 'sc1' }],
    layers: [{ id: 'sc1.t1', sceneId: 'sc1', kind: 'text', name: 'Titulo', base: { text: 'Hola', box: [0.1, 0.4, 0.8, 0.2] }, life: [0, 5] }],
    tracks: [{ layer: 'sc1.t1', prop: 'reveal', keys: [{ t: 0.2, v: 0, ease: 'eo' }, { t: 1.0, v: 1, ease: 'spring:0.6,13' }] }],
  }
  ok(validateTimeline(tlOK).ok, 'SCHEMA: timeline valido rechazado: ' + formatErrors(validateTimeline(tlOK).errors))
  const tlBad = JSON.parse(JSON.stringify(tlOK))
  tlBad.tracks[0].keys = [{ t: 1.0, v: 0 }, { t: 0.2, v: 1, ease: 'noexiste' }]   // desordenadas + ease invalido
  tlBad.tracks.push({ layer: 'fantasma', prop: 'x', keys: [{ t: 0, v: 0 }] })      // huerfano
  tlBad.tracks.push({ layer: 'sc1.t1', prop: 'inventado', keys: [{ t: 0, v: 0 }] })// prop fuera del set
  tlBad.layers[0].life = [3, 1]                                                    // vida invertida
  const tlc = new Set(validateTimeline(tlBad).errors.map(x => x.code))
  ok(tlc.has('E-TL-ORDER') && tlc.has('E-TL-EASE') && tlc.has('E-TL-ORPHAN') && tlc.has('E-SCHEMA-ENUM') && tlc.has('E-TL-LIFE'),
    'SCHEMA: validateTimeline debe cazar ORDER/EASE/ORPHAN/ENUM/LIFE. Cazo: ' + [...tlc].join(','))

  ok(PROPS.length >= 9 && LAYER_KINDS.length >= 9, 'SCHEMA: los sets cerrados deben estar completos')
}

// ---------------------------------------------------------------- 5. UTIL (color/contraste propios)
{
  const byte0 = hex => parseInt(String(hex).replace('#', '').slice(0, 2), 16)
  // WCAG: maximo teorico 21, simetrico, y 1 consigo mismo
  ok(near(contrast('#ffffff', '#000000'), 21, 1e-6), 'UTIL: contraste blanco/negro debe ser 21')
  ok(near(contrast('#000000', '#ffffff'), contrast('#ffffff', '#000000'), 1e-9), 'UTIL: contraste debe ser simetrico')
  ok(contrast('#777777', '#777777') === 1, 'UTIL: contraste de un color consigo mismo es 1')
  // APCA: FIRMADO (claro sobre oscuro da negativo) y fuerte en los extremos
  ok(apcaLc('#ffffff', '#000000') < -100, 'UTIL: APCA blanco sobre negro debe ser ~-108')
  ok(apcaLc('#000000', '#ffffff') > 100, 'UTIL: APCA negro sobre blanco debe ser ~+106')
  ok(Math.abs(apcaLc('#808080', '#808080')) < 1, 'UTIL: APCA de iguales debe ser ~0')
  // OKLCH: round-trip estable + lighten/darken monotonos SIN lavar el color (la razon de usar OKLCH y no HSL)
  for (const hex of ['#22e06a', '#c56a8e', '#e0762a', '#3d6ef7', '#808080']) {
    const c = hexToOklch(hex)
    const back = oklchToHex(c.L, c.C, c.h)
    ok(contrast(back, hex) < 1.06, `UTIL: round-trip OKLCH se desvio en ${hex} -> ${back}`)
    const lt = lighten(hex, 0.3), dk = darken(hex, 0.3)
    ok(hexToOklch(lt).L > c.L && hexToOklch(dk).L < c.L, `UTIL: lighten/darken no monotonos en ${hex}`)
    if (chroma(hex) > 0.05) ok(chroma(lt) > chroma(hex) * 0.5, `UTIL: lighten LAVO el color en ${hex} (${chroma(hex).toFixed(3)} -> ${chroma(lt).toFixed(3)})`)
  }
  ok(chroma('#808080') < 0.02 && chroma('#22e06a') > 0.15, 'UTIL: chroma debe distinguir acromatico de saturado')
  // ensureContrast: alcanza el objetivo y es idempotente
  for (const [fg, bg] of [['#333333', '#000000'], ['#cccccc', '#ffffff'], ['#22e06a', '#0a0a0d']]) {
    const f = ensureContrast(fg, bg, 4.5)
    ok(contrast(f, bg) >= 4.5 - 1e-9, `UTIL: ensureContrast no alcanzo 4.5 (${fg}/${bg} -> ${contrast(f, bg).toFixed(2)})`)
    ok(ensureContrast(f, bg, 4.5) === f, 'UTIL: ensureContrast debe ser idempotente')
  }
  // mezcla en luz LINEAL: el medio blanco/negro NO puede ser el #808080 de sRGB (gris barroso)
  const mid = mixColor('#000000', '#ffffff', 0.5)
  ok(mid !== '#808080' && byte0(mid) > 150, `UTIL: mixColor debe interpolar en luz lineal (dio ${mid})`)
  ok(mixColor('#123456', '#abcdef', 0) === '#123456' && mixColor('#123456', '#abcdef', 1) === '#abcdef', 'UTIL: mixColor en los extremos devuelve los originales')
  // HSL / hue
  ok(near(hexToHsl('#ff0000').h, 0) && near(hexToHsl('#00ff00').h, 120) && near(hexToHsl('#0000ff').h, 240), 'UTIL: hue de los primarios')
  ok(hueDist(350, 10) === 20 && hueDist(0, 180) === 180, 'UTIL: hueDist debe ser circular')
  ok(hslToHex(0, 0, 0) === '#000000' && hslToHex(0, 0, 1) === '#ffffff', 'UTIL: hslToHex en los extremos')
  // legibleOn: siempre el candidato mas legible
  ok(contrast(legibleOn('#0a0a0d'), '#0a0a0d') > 4.5, 'UTIL: legibleOn sobre casi-negro -> tinta clara legible')
  ok(contrast(legibleOn('#f2efe8'), '#f2efe8') > 4.5, 'UTIL: legibleOn sobre casi-blanco -> tinta oscura legible')
}

if (fails) { console.error(`\nGATE DIRECTOR FALLO (${fails} casos).`); process.exit(1) }
console.log('GATE DIRECTOR OK (prng ortogonal · easings con overshoot real · fit nunca-desborda · schema normaliza 5 casos adversariales · color propio WCAG/APCA/OKLCH sin lavado + mezcla lineal).')

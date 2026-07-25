// GATE director-pagemodel (F1) — el CONTRATO de datos entre el backend y el motor Director.
// Carga TODOS los pagemodels de tools/fixtures/director/*.json (los 5 adversariales sinteticos +
// los que va dejando backend/e2e_probe.py con paginas reales) y verifica tres cosas:
//
//   1. VALIDEZ: validatePageModel(fixture).ok — ninguno puede llegar roto al motor.
//   2. ESPEJO Python<->JS: normalizePageModel(fixture) debe devolver el MISMO objeto. Si Python
//      escribe un default y JS rellena otro, el mismo pagemodel rinde distinto segun quien lo lea
//      y se pierde la reproducibilidad. Este es el assert que caza una divergencia de defaults.
//   3. MATRIZ DE ACEPTACION de docs/director/DNA-SPEC.md §5.7 para los 5 casos adversariales:
//      que estado, que confianza, que se descarta y que campos quedan vacios en cada uno.
//
// SIN RED y SIN BROWSER: los fixtures viven en el repo (invariante 2 de la DNA-SPEC §0 — el motor
// nunca vuelve a medir). Regenerarlos: python backend/test_pagemodel.py --write
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, basename } from 'node:path'
import { validatePageModel, normalizePageModel, formatErrors, ESTADO } from '../src/director/index.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIR = join(HERE, 'fixtures', 'director')

let fails = 0
const die = m => { console.error('FAIL  ' + m); fails++ }
const ok = (cond, m) => { if (!cond) die(m) }

if (!existsSync(DIR)) { console.error(`FAIL  no existe ${DIR} (corre: python backend/test_pagemodel.py --write)`); process.exit(1) }
const files = readdirSync(DIR).filter(f => f.endsWith('.json')).sort()
if (!files.length) { console.error('FAIL  tools/fixtures/director/ esta vacio'); process.exit(1) }

// deep-equal con RUTA del primer desacuerdo (un "no son iguales" pelado no sirve para depurar el espejo)
function diffs(a, b, path = '', out = []) {
  if (out.length > 6) return out
  const ta = a === null ? 'null' : Array.isArray(a) ? 'array' : typeof a
  const tb = b === null ? 'null' : Array.isArray(b) ? 'array' : typeof b
  if (ta !== tb) { out.push(`${path || '(raiz)'}: ${ta}(${JSON.stringify(a)}) != ${tb}(${JSON.stringify(b)})`); return out }
  if (ta === 'array') {
    if (a.length !== b.length) { out.push(`${path}: largo ${a.length} != ${b.length}`); return out }
    a.forEach((x, i) => diffs(x, b[i], `${path}[${i}]`, out))
    return out
  }
  if (ta === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diffs(a[k], b[k], path ? `${path}.${k}` : k, out)
    return out
  }
  if (ta === 'number' ? Math.abs(a - b) > 1e-9 : a !== b) out.push(`${path}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`)
  return out
}

const modelos = {}
for (const f of files) {
  const name = basename(f, '.json')
  let pm
  try { pm = JSON.parse(readFileSync(join(DIR, f), 'utf-8')) } catch (e) { die(`${f}: JSON ilegible (${e.message})`); continue }
  modelos[name] = pm

  // 1. validez — el validador NUNCA puede lanzar, ni con un fixture corrupto
  let v
  try { v = validatePageModel(pm) } catch (e) { die(`${f}: validatePageModel LANZO (${e.message})`); continue }
  if (!v.ok) die(`${f}: pagemodel invalido\n${formatErrors(v.errors)}`)
  ok(pm.captura && ESTADO.indexOf(pm.captura.estado) >= 0, `${f}: captura.estado ausente o fuera del enum`)

  // 2. espejo: lo que escribio Python == lo que JS considera ya normalizado. Se comparan los tres
  // bloques del contrato; `captura.errores` es diagnostico del ensamblador y no viaja al motor.
  let norm
  try { norm = normalizePageModel(pm) } catch (e) { die(`${f}: normalizePageModel LANZO (${e.message})`); continue }
  const esperado = { ...pm.captura }; delete esperado.errores
  for (const [bloque, x, y] of [['dna', pm.dna, norm.dna], ['semantica', pm.semantica, norm.semantica],
                                ['assets', pm.assets, norm.assets], ['captura', esperado, norm.captura]]) {
    const d = diffs(x, y, bloque)
    if (d.length) die(`${f}: ESPEJO roto Python<->JS en ${bloque}:\n    ` + d.join('\n    '))
  }
  // idempotencia: normalizar dos veces no puede cambiar nada (si cambia, hay un default que "camina")
  ok(diffs(norm, normalizePageModel(norm)).length === 0, `${f}: normalizePageModel no es idempotente`)
}

// ---------------------------------------------------------------- 3. matriz de aceptacion §5.7
const ADV = ['vacia', 'botwall', 'no-latina', 'spa-sin-html', '404']
for (const n of ADV) ok(modelos[n], `falta el fixture adversarial ${n}.json (python backend/test_pagemodel.py --write)`)

const DEF_DNA = { accent: '#5b8cff', bg: '#ffffff', inkOnBg: '#111114', radius: 12, borderStyle: 'none', shadowStyle: 'flat', score: 0.35, nivel: 'medio' }
const dnaEsDefault = (d, { salvoBg = false, salvoAccent = false } = {}) =>
  (salvoAccent || d.palette.accent === DEF_DNA.accent) && (salvoBg || d.palette.bg === DEF_DNA.bg) &&
  d.palette.inkOnBg !== undefined && d.shape.radius === DEF_DNA.radius && d.shape.borderStyle === DEF_DNA.borderStyle &&
  d.shape.shadowStyle === DEF_DNA.shadowStyle && d.modernidad.length === 0 &&
  d.typography.displayHint === 'grotesk' && d.typography.h1Ratio === 0

if (modelos.vacia) {
  const m = modelos.vacia
  ok(m.captura.estado === 'ok', 'vacia: estado debe ser "ok" (200 con body corto NO es un error)')
  ok(m.captura.confianza === 0.3, `vacia: confianza debe ser EXACTAMENTE 0.30 — unico termino no nulo de §1.5 (dio ${m.captura.confianza})`)
  ok(dnaEsDefault(m.dna, { salvoBg: true }), 'vacia: el dna debe ser el default puro salvo bg (§5.1)')
  ok(m.dna.palette.acromatica === false, 'vacia: acromatica FALSE — chromaMax 0 significa "no medi", no "no hay color"')
  ok(m.dna.palette.accentText !== m.dna.palette.accent, 'vacia: accentText debe ser el derivado legible (#1e61ff), no el accent crudo')
  ok(m.dna.modernidad.length === 0 && m.semantica.queHace === '', 'vacia: modernidad [] y queHace vacio (jamas inventar la frase)')
  ok(m.dna.signals.muestras.texto === 0, 'vacia: signals en cero (si se hubieran medido, confianza != 0.30)')
}
if (modelos.botwall) {
  const m = modelos.botwall
  ok(m.captura.estado === 'botwall', 'botwall: estado')
  ok(m.captura.confianza <= 0.15, `botwall: confianza <= 0.15 por el tope de §1.5 (dio ${m.captura.confianza})`)
  ok(dnaEsDefault(m.dna, { salvoAccent: true }), 'botwall: el dna del MURO debe descartarse entero (§5.2)')
  ok(m.dna.palette.bg === '#ffffff', 'botwall: el gris de Cloudflare no puede quedar como bg de la marca')
  ok(m.dna.modernidad.length === 0, 'botwall: modernidad del muro descartada')
  ok(m.assets.images.length === 0, 'botwall: las imagenes del muro no son de la marca')
  ok(m.semantica.features.length === 0 && m.semantica.pruebas.stats.length === 0, 'botwall: semantica vacia salvo el host')
  ok(m.captura.notas.some(x => /botwall/i.test(x)), 'botwall: la nota de diagnostico debe quedar registrada')
}
if (modelos['no-latina']) {
  const m = modelos['no-latina']
  ok(m.captura.estado === 'ok', 'no-latina: una pagina en japones es una pagina OK')
  ok(m.captura.confianza >= 0.35, `no-latina: confianza normal, no degradada (dio ${m.captura.confianza})`)
  ok(m.dna.typography.caseHint === 'sentence', 'no-latina: caseHint FORZADO a sentence (upper rompe CJK/arabe/hebreo)')
  ok(m.dna.typography.displayHint === 'grotesk', 'no-latina: la cascada serif/rounded esta calibrada para latinas -> grotesk')
  ok(['cjk', 'arabic', 'hebrew', 'cyrillic', 'greek', 'devanagari'].indexOf(m.dna.typography.script) >= 0, 'no-latina: script no latino')
  ok(m.dna.typography.textDir === (['arabic', 'hebrew'].indexOf(m.dna.typography.script) >= 0 ? 'rtl' : 'ltr'), 'no-latina: textDir segun el script')
  ok(m.dna.modernidad.length > 0 && m.dna.signals.muestras.texto > 0, 'no-latina: el dna debe estar COMPLETO (color/forma/densidad son agnosticos del idioma)')
  ok(m.semantica.idioma !== 'es' && m.semantica.idioma.length === 2, 'no-latina: idioma ISO real (perception escribe el copy en ese idioma)')
  ok(m.captura.notas.some(x => /glifos/i.test(x)), 'no-latina: debe quedar la senal para el chequeo de glifos (E-TXT-TOFU)')
}
if (modelos['spa-sin-html']) {
  const m = modelos['spa-sin-html']
  ok(m.captura.estado === 'spa-vacia', 'spa: estado')
  ok(m.captura.confianza <= 0.30, `spa: confianza <= 0.30 (dio ${m.captura.confianza})`)
  ok(m.dna.density.nivel === 'aireado', 'spa: densidad aireada — es literalmente lo que se ve (§5.4)')
  ok(m.dna.modernidad.length === 0, 'spa: modernidad vacia')
  ok(m.dna.palette.bg !== '#ffffff' || m.dna.palette.bgLum === 1, 'spa: el bg pintado si se conserva')
  ok(m.dna.signals.muestras.texto === 0, 'spa: no se midio texto')
}
if (modelos['404']) {
  const m = modelos['404']
  ok(m.captura.estado === '404', '404: estado')
  ok(m.captura.confianza <= 0.10, `404: confianza <= 0.10 (dio ${m.captura.confianza})`)
  ok(dnaEsDefault(m.dna), '404: el diseno de una pagina de error es el del hosting, no el de la marca -> dna a defaults')
  ok(m.semantica.features.length === 0 && m.semantica.pruebas.testimonios.length === 0 && m.semantica.oferta.precio === '',
    '404: semantica vacia (no fingir que hay marca detras de una URL rota)')
  ok(m.assets.images.length === 0, '404: sin imagenes')
}

// coherencia global de los que SI son paginas reales (las que deje e2e_probe): confianza y estado
// tienen que contar la misma historia que las senales.
for (const [n, m] of Object.entries(modelos)) {
  if (ADV.indexOf(n) >= 0) continue
  ok(m.captura.confianza >= 0 && m.captura.confianza <= 1, `${n}: confianza fuera de [0,1]`)
  if (m.captura.estado === 'ok') ok(m.dna.signals.muestras.texto > 0 || m.captura.confianza <= 0.35, `${n}: estado ok sin texto medido y con confianza alta`)
}

if (fails) { console.error(`\nGATE PAGEMODEL FALLO (${fails} casos).`); process.exit(1) }
console.log(`GATE PAGEMODEL OK (${files.length} fixtures validos · espejo Python<->JS byte a byte · matriz §5.7 de los 5 adversariales: vacia 0.30 · botwall/404 dna descartado · no-latina completo con case=sentence · spa aireada).`)

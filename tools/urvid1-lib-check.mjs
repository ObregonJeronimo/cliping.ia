// urvid1-lib-check.mjs — verifica UNA biblioteca EN AISLAMIENTO (importa SOLO esa lib, no el motor entero) -> varios
// agentes pueden llenar libs distintas en paralelo sin contaminarse la verificacion. Renderiza cada modulo (o los
// ultimos N) en dark+light a varios t, chequea DETERMINISMO + no-blank, y arma un contact-sheet para ojear.
// Uso: node tools/urvid1-lib-check.mjs <lib> [ultimosN]
//   libs pixel (render): backgrounds, substrates, atmosphere, markkit, scene-layouts
//   color: dibuja swatches de la paleta derivada. (typography no soportado aca: usa muestra de texto a mano.)
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { query, get } from '../src/urvid/core/registry.js'
import { derivePalette } from '../src/urvid/core/palette.js'
import { defaultMotion } from '../src/urvid/core/motion.js'
import { defaultTypekit } from '../src/urvid/core/typekit.js'
import { defaultLayout } from '../src/urvid/core/layout.js'
import { W, H, setFormat } from '../src/urvid/core/util.js'

const lib = process.argv[2], N = process.argv[3] ? Number(process.argv[3]) : 0
if (!lib) { console.error('uso: node tools/urvid1-lib-check.mjs <lib> [ultimosN]'); process.exit(2) }
const FOLDER = { 'scene-layouts': 'scenes' }   // el lib del registro -> carpeta
const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, 'out'); mkdirSync(OUT, { recursive: true })
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}
await import(pathToFileURL(resolve(HERE, '../src/urvid/libs', FOLDER[lib] || lib, 'index.js')).href)   // registra SOLO esta lib
setFormat('9:16')

const TS = [0.4, 1.4, 2.6]
const content = { brand: 'Marca', tagline: 'Busca por voz o imagen', claim: 'Resultados visibles en dos semanas', cta: 'Probalo gratis', bullets: ['Rapido y simple', 'Soporte real', 'Sin vueltas'], stats: [{ value: '92%', label: 'lo recomienda' }], proof: 'Cambio como trabajamos' }
function envFor(seed, tone, pal) {
  const fonts = { display: 'Space Grotesk', text: 'Inter', accent: 'JetBrains Mono' }   // fallback estatico (deriveFonts eliminado: era codigo muerto, typMod siempre gana en el motor)
  return { pal, content, fonts, seed, energy: 1, sceneDur: 4, motion: defaultMotion(), typekit: defaultTypekit(), layout: defaultLayout() }
}
function tile(mod, t, tone) {
  const pal = derivePalette('#4285F4', { tone, rubro: 'default', seed: 7 })
  const cv = createCanvas(W, H), c = cv.getContext('2d'); c.fillStyle = pal.bg0; c.fillRect(0, 0, W, H)
  if (lib === 'color') { // swatches de la paleta del modulo
    const p2 = mod.derive('#4285F4', { tone, rubro: 'default', seed: 7 }); const bands = [p2.bg0, p2.bg1, p2.accent, p2.accent2 || p2.accent, p2.ink, p2.inkText]
    bands.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, i * H / bands.length, W, H / bands.length) })
  } else { mod.render(c, t, envFor(7, tone, pal)) }
  return cv
}
function bgRGB(bg0) { const c = createCanvas(1, 1).getContext('2d'); c.fillStyle = bg0; c.fillRect(0, 0, 1, 1); const d = c.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]] }
// no-blank robusto: cuenta pixeles que DIFIEREN del fondo (capta gradientes sutiles de atmosphere/substrates, no solo lineas)
function nonblank(cv, bg) { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let diff = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 11) { n++; if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 5) diff++ }; return diff > n * 0.002 }

let ids = Array.from(new Set([...query(lib, { tone: 'dark' }), ...query(lib, { tone: 'light' })].map(m => m.id)))
if (N > 0) ids = ids.slice(-N)
const fails = []
for (const id of ids) { const m = get(id); for (const tone of ['dark', 'light']) { if (m.tones.indexOf(tone) < 0) continue; const bg = bgRGB(derivePalette('#4285F4', { tone, rubro: 'default', seed: 7 }).bg0); const ts = lib === 'color' ? [0] : TS; for (const t of ts) { try { const a = tile(m, t, tone), b = tile(m, t, tone); if (Buffer.compare(a.toBuffer('image/png'), b.toBuffer('image/png')) !== 0) fails.push(id + ' [' + tone + '] t=' + t + ': NO-DETERMINISTA'); if (!nonblank(a, bg)) fails.push(id + ' [' + tone + '] t=' + t + ': BLANCO') } catch (e) { fails.push(id + ' [' + tone + '] t=' + t + ': ERROR ' + e.message) } } } }

const tw = 120, th = Math.round(tw * H / W), pad = 6, lab = 180, cols = (lib === 'color' ? 1 : TS.length)
const sheet = createCanvas(lab + cols * tw + (cols + 1) * pad, ids.length * (th + pad) + pad), s = sheet.getContext('2d')
s.fillStyle = '#0a0a0f'; s.fillRect(0, 0, sheet.width, sheet.height)
ids.forEach((id, r) => { const y = pad + r * (th + pad); s.fillStyle = '#cfe'; s.font = '9px sans-serif'; s.fillText(id, 4, y + 14); const m = get(id), tone = m.tones.indexOf('dark') >= 0 ? 'dark' : 'light'; const tt = lib === 'color' ? [0] : TS; tt.forEach((t, i) => { const cv = tile(m, t, tone); s.drawImage(cv, lab + pad + i * (tw + pad), y, tw, th) }) })
writeFileSync(join(OUT, '_lib-' + lib + '.png'), sheet.toBuffer('image/png'))
console.log('lib:', lib, '· modulos chequeados:', ids.length, '· fails:', fails.length)
for (const f of fails.slice(0, 25)) console.log('  -', f)
console.log('contact-sheet: tools/out/_lib-' + lib + '.png  (abrilo con Read; descarta/arregla los feos/ilegibles)')
process.exit(fails.length ? 1 : 0)

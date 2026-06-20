// urvid1-anim-one.mjs — verifica UN archivo de la lib anim/ (lo importa, registra solo SUS anims) y arma un
// contact-sheet + chequeo de determinismo/no-blank. Para que un agente que llena un archivo de concepto se
// auto-verifique sin tocar index.js ni los demas. Uso: node tools/urvid1-anim-one.mjs <archivo-sin-.js>
//   ej: node tools/urvid1-anim-one.mjs commerce   -> renderiza src/urvid/libs/anim/commerce.js -> tools/out/_anim-commerce.png
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { query, get } from '../src/urvid/core/registry.js'
import { derivePalette } from '../src/urvid/core/palette.js'
import { W, H, setFormat } from '../src/urvid/core/util.js'

const file = process.argv[2]
if (!file) { console.error('uso: node tools/urvid1-anim-one.mjs <archivo-sin-.js>'); process.exit(2) }
const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, 'out'); mkdirSync(OUT, { recursive: true })
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}
await import(pathToFileURL(resolve(HERE, '../src/urvid/libs/anim', file + '.js')).href)   // registra los anims del archivo
setFormat('9:16')

const TS = [0.3, 1.0, 1.7, 2.4]
const ids = Array.from(new Set([...query('anim', { tone: 'dark' }), ...query('anim', { tone: 'light' })].map(m => m.id)))
function tile(mod, t, tone) { const pal = derivePalette('#4285F4', { tone, rubro: 'tech', seed: 7 }); const cv = createCanvas(W, H), c = cv.getContext('2d'); c.fillStyle = pal.bg0; c.fillRect(0, 0, W, H); mod.render(c, t, { pal, content: { brand: 'Marca', tagline: 'Mensaje', claim: 'Mensaje claro', cta: 'Probalo' }, energy: 1, seed: 7 }); return cv }
function nonblank(cv) { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; const s = new Set(); for (let i = 0; i < d.length; i += 4 * 97) s.add((d[i] >> 4) + '-' + (d[i + 1] >> 4) + '-' + (d[i + 2] >> 4)); return s.size > 3 }

const fails = []
for (const id of ids) { const m = get(id); for (const tone of ['dark', 'light']) { if (m.tones.indexOf(tone) < 0) continue; for (const t of TS) { try { const a = tile(m, t, tone), b = tile(m, t, tone); if (Buffer.compare(a.toBuffer('image/png'), b.toBuffer('image/png')) !== 0) fails.push(id + ' [' + tone + '] t=' + t + ': NO-DETERMINISTA'); if (!nonblank(a)) fails.push(id + ' [' + tone + '] t=' + t + ': BLANCO') } catch (e) { fails.push(id + ' [' + tone + '] t=' + t + ': ERROR ' + e.message) } } } }

const tw = 130, th = Math.round(tw * H / W), pad = 6, lab = 160, cols = TS.length
const sheet = createCanvas(lab + cols * tw + (cols + 1) * pad, ids.length * (th + pad) + pad), s = sheet.getContext('2d')
s.fillStyle = '#0a0a0f'; s.fillRect(0, 0, sheet.width, sheet.height)
ids.forEach((id, r) => { const y = pad + r * (th + pad); s.fillStyle = '#cfe'; s.font = '10px sans-serif'; s.fillText(id.replace('anim.', ''), 4, y + 14); const m = get(id), tone = m.tones.indexOf('dark') >= 0 ? 'dark' : 'light'; TS.forEach((t, i) => { const cv = tile(m, t, tone); s.drawImage(cv, lab + pad + i * (tw + pad), y, tw, th) }) })
writeFileSync(join(OUT, '_anim-' + file + '.png'), sheet.toBuffer('image/png'))
console.log('archivo:', file, '· anims:', ids.length, '· fails:', fails.length)
for (const f of fails) console.log('  -', f)
console.log('contact-sheet: tools/out/_anim-' + file + '.png  (abrilo con Read; descarta/arregla los feos/ilegibles)')
process.exit(fails.length ? 1 : 0)

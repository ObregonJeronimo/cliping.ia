// video-frames.mjs — extrae frames de un MP4 REAL a CONTACT SHEETS (grillas) con ffmpeg, para AUDITAR un video
// entero en POCAS imagenes (barato en tokens: 36 frames = 1 PNG en vez de 36 lecturas). Para juzgar composicion,
// sameness, legibilidad y FLUIDEZ (frames consecutivos en grilla muestran si el movimiento es suave o saltado).
//
// Uso:
//   node tools/video-frames.mjs <video.mp4> [fps=3] [cols=6] [rows=6] [t0] [t1]
//   - overview de todo el video a 3fps:      node tools/video-frames.mjs v.mp4
//   - ZOOM de fluidez (1.5s a 16fps):         node tools/video-frames.mjs v.mp4 16 6 4 3.0 4.5
// Escribe tools/out/sheet-<name>-NNN.png (cada grilla = cols*rows frames). Abrir con Read.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import { basename, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, 'out'); mkdirSync(OUT, { recursive: true })
const a = process.argv.slice(2)
const vid = a[0]
if (!vid) { console.error('uso: node tools/video-frames.mjs <video.mp4> [fps=3] [cols=6] [rows=6] [t0] [t1]'); process.exit(1) }
const fps = a[1] || '3', cols = +(a[2] || 6), rows = +(a[3] || 6), t0 = a[4], t1 = a[5]
const name = basename(vid).replace(/\.[^.]+$/, '').slice(0, 24)

// limpia hojas previas de este video
for (const f of readdirSync(OUT)) if (f.startsWith(`sheet-${name}-`)) rmSync(join(OUT, f), { force: true })

const pre = []                                   // -ss antes de -i = seek rapido
if (t0) pre.push('-ss', String(t0))
const post = []
if (t0 && t1) post.push('-t', String(Math.max(0.1, (+t1) - (+t0))))
// fps -> muestrea N por segundo; scale -> miniatura; tile -> empaqueta cols*rows frames por PNG (multiples si sobran)
const vf = `fps=${fps},scale=216:-1,tile=${cols}x${rows}:padding=4:color=0x101015`
const args = ['-y', ...pre, '-i', vid, ...post, '-vf', vf, '-an', join(OUT, `sheet-${name}-%03d.png`)]
execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] })

const sheets = readdirSync(OUT).filter(f => f.startsWith(`sheet-${name}-`)).sort()
console.log(`OK: ${sheets.length} hoja(s) (${cols}x${rows} = ${cols * rows} frames c/u a ${fps}fps) en tools/out/`)
for (const s of sheets) console.log('  ' + join('tools/out', s))

// urvid1-motionstrip.mjs — DIAGNOSTICO de movimiento fino. Renderiza TIRAS horizontales de frames a dt chico para
// VER (a) la ENTRADA de una escena (agrandamiento/asentamiento -> "tosco"?) y (b) la VENTANA DE TRANSICION entre
// escenas (se pisan los textos?). No reemplaza al MP4; es para inspeccionar cuadros consecutivos de un tramo corto.
// Uso: node tools/urvid1-motionstrip.mjs [seed]
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { makeVideo, drawFrame } from '../src/urvid/index.js'
import { setScratchFactory } from '../src/urvid/core/render.js'
import { W, H } from '../src/urvid/core/util.js'

const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, 'out'); mkdirSync(OUT, { recursive: true })
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch {}
// inyecta el buffer offscreen (napi) -> el crossfade de transicion se ejerce tambien en Node (para verlo aca)
setScratchFactory((w, h) => createCanvas(w, h))

const seed = process.argv[2] ? (Number(process.argv[2]) >>> 0) : 7
const brief = {
  brand: 'Nodo', rubro: 'tech', tone: 'dark', brandColor: '#22e06a', seed,
  content: { tagline: 'Automatiza lo aburrido y enfocate en lo que importa', claim: 'Menos tareas repetitivas, mas resultados reales', cta: 'Probalo gratis' },
}
const video = makeVideo(brief)
console.log('CARTA:', JSON.stringify(video.recipe))
console.log('ESCENAS:', video.scenes.map(s => `${s.sceneId}@${s.start.toFixed(2)}(+${s.dur})`).join('  '))

// tira: N frames de [t0, t0+span] en fila. ss = supersample. labela cada frame con su t.
function strip(name, t0, span, n, ss = 1.4) {
  const tileW = 150, tileH = Math.round(tileW * H / W), pad = 6, lab = 16
  const cw = n * tileW + (n + 1) * pad, ch = lab + tileH + pad * 2 + 16
  const sheet = createCanvas(cw, ch), sx = sheet.getContext('2d')
  sx.fillStyle = '#0a0a0f'; sx.fillRect(0, 0, cw, ch)
  sx.fillStyle = '#fff'; sx.font = 'bold 12px sans-serif'; sx.fillText(name, pad, 12)
  for (let i = 0; i < n; i++) {
    const t = t0 + (span * i) / (n - 1)
    const cv = createCanvas(W * ss, H * ss), c = cv.getContext('2d'); c.setTransform(ss, 0, 0, ss, 0, 0)
    drawFrame(c, t, video)
    const x = pad + i * (tileW + pad), y = lab + pad
    sx.drawImage(cv, x, y, tileW, tileH)
    sx.fillStyle = '#9fb'; sx.font = '10px sans-serif'; sx.fillText(t.toFixed(2) + 's', x + 2, y + tileH + 12)
  }
  writeFileSync(join(OUT, name + '.png'), sheet.toBuffer('image/png'))
  console.log('wrote tools/out/' + name + '.png')
}

// (a) ENTRADA de la 1ra escena: 14 frames sobre los primeros 0.9s (donde ocurre el pop/asentamiento)
strip('strip-entry', video.scenes[0].start, 0.9, 14)
// (b) TRANSICION 1->2: 14 frames centrados en el limite (B.start +/- 0.5s) -> aca se ve si se pisan los textos
if (video.scenes[1]) strip('strip-trans', video.scenes[1].start - 0.5, 1.0, 14)
console.log('done.')

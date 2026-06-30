// urvid 1.0 · API publica del motor. Importar esto registra todas las bibliotecas y expone el ensamblador + render.
//   import { makeVideo, drawFrame } from '@/urvid'
//   const video = makeVideo({ brand, rubro, tone, brandColor, content })
//   drawFrame(ctx, t, video)   // ctx en espacio logico 405x720
import './libs/index.js'

export { makeVideo } from './core/assemble.js'
// drawFrame envuelto para modular la INTENSIDAD del post por seriousness ANTES de delegar (se hace en index.js, NO en
// core/, para honrar 'core no importa libs'). Misma forma centrada-en-desvio que enter-by-seriousness: serio->post tenue.
import { drawFrame as _drawFrame, beatAt } from './core/render.js'
import { setPostIntensity } from './libs/post/index.js'
import { clamp as _clamp } from './core/util.js'
export { beatAt }
export function drawFrame(ctx, t, video) {
  const s = video && video.seriousness != null ? video.seriousness : 0.5
  // FIDELIDAD de la FOTO real (slot-media): con mediaImage el acabado se baja a 0.7x -> el grade no recolorea de mas la
  // foto del producto (true-color) y el video luce mas premium (foto real = menos sobre-procesado). Sin foto = 1 (gates inertes).
  const mediaK = (video && video.mediaImage) ? 0.7 : 1
  setPostIntensity(_clamp(1 + (0.5 - s) * 0.5, 0.78, 1.18) * mediaK)   // serio(1)->0.78 tenue; relajado(0)->1.18; s=0.5->1.0 (byte-identico sin foto)
  return _drawFrame(ctx, t, video)
}
export { stats, query, get } from './core/registry.js'
export { derivePalette } from './core/palette.js'
export { W, H, FPS, FORMATS, setFormat } from './core/util.js'

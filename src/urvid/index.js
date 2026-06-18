// urvid 1.0 · API publica del motor. Importar esto registra todas las bibliotecas y expone el ensamblador + render.
//   import { makeVideo, drawFrame } from '@/urvid'
//   const video = makeVideo({ brand, rubro, tone, brandColor, content })
//   drawFrame(ctx, t, video)   // ctx en espacio logico 405x720
import './libs/index.js'

export { makeVideo } from './core/assemble.js'
export { drawFrame, beatAt } from './core/render.js'
export { stats, query, get } from './core/registry.js'
export { derivePalette } from './core/palette.js'
export { W, H, FPS } from './core/util.js'

// MOTOR DIRECTOR — barrel publico. Storyboard-first: PageModel -> guion semantico -> escenas
// ESTATICAS -> linker (match-cuts) -> TIMELINE de keyframes -> render + edicion estilo After Effects.
// Plan y contratos: docs/MOTOR-DIRECTOR.md · docs destiladas: docs/director/*.md
//
// INDEPENDENCIA (regla dura, verificada por tools/director-independence-check.mjs):
// este motor NO importa de src/urvid, src/kinetic, ni de ninguna lib externa. Lo unico que comparte
// con el resto del repo es src/shared/objects.js (dibujantes puros con inyeccion de dependencias).
//
// ESTADO: F0-F3.2 (cimientos + guion + storyboard + linker/timeline/video + edicion). Lo que YA existe:
//   core/util.js    — matematica + color propios (OKLCH, WCAG, APCA, mezcla en luz lineal)
//   core/prng.js    — determinismo por namespaces
//   core/ease.js    — easings y springs en forma cerrada + parser del ease string del timeline
//   core/text.js    — fit nunca-desborda + reveals (mascara / por caracter) + telemetria para gates
//   core/schema.js  — contratos + validadores tipados + normalizador + adapter de brief legacy
//   core/scriptwriter — guion semantico (15 escenas, 8 gramaticas, anti-invencion)
//   core/composer     — storyboard: escenas ESTATICAS como arboles de capas con matchKey
//   kit/look          — DNA medido + seed -> direccion de arte (placa, tintas, tipografia, forma)
//   kit/grid          — grilla normalizada con safe areas de IG/TikTok
//   kit/layers        — constructores declarativos de capa (puros: sin canvas)
//   kit/objetos       — rubro detectado en el texto real -> objeto heroe del pool
//   render/*          — placa y capas a pixeles, con telemetria auditable por los gates
//   core/linker       — 12 recetas de corte + FLIP (match-cut) por matchKey
//   core/timeline     — compilador storyboard->timeline.v1 y evaluador seek-safe
//   render/video      — drawFrame(t): el video, dibujado desde los keyframes
//   core/edits        — overlay DECLARATIVO de edicion: el video se re-genera desde (pagemodel, seed, edits)
// Lo que llega despues: export MP4 y el estudio Director con el editor E1 montado sobre core/edits.

export {
  TAU, clamp, clamp01, lerp, inv, round,
  hexToRgb, rgbToHex, rgba, isHex, hexToHsl, hslToHex, hueDist,
  hexToOklch, oklchToHex, lighten, darken, chroma,
  luminance, contrast, apcaLc, legibleOn, ensureContrast, mixColor,
} from './core/util.js'
export { mulberry32, hashStr, stableSeed, seedFor, subSeed, pick, range, irange, weightedPick, weightedSample, shuffled } from './core/prng.js'
export { parseEase, isEase, easeName, spring, win, wobble, stagger, lin, expoOut, expoIn, expoInOut, cubicOut, cubicIn, cubicInOut, quintOut, backOut } from './core/ease.js'
export { fontStr, fitFont, fitUniform, wrapFit, fitBlock, wordTrim, clip, drawText, drawWrapped, drawMaskLine, drawKineticLine, telStart, telStop, telTag } from './core/text.js'

// --- F2: guion -> storyboard ---
export { buildGuion, ESCENAS, GRAMATICAS, sesgosActivos } from './core/scriptwriter.js'
export { composeStoryboard, matchesEntre } from './core/composer.js'
export { deriveLook, PLACAS, PAIRINGS } from './kit/look.js'
export { makeGrid, dentroDeSafe, px, SAFE_TOP, SAFE_BOT } from './kit/grid.js'
export { texto, forma, objeto, foto, badge, stepper, priceTag, logoRow, placa, escena, resetIds, SIZE, LH } from './kit/layers.js'
export { POOLS, NOMBRES, rubroDe, textoDe, elegirObjetos } from './kit/objetos.js'
export { drawScene, drawCapa, col } from './render/draw.js'

// --- F3: linker + timeline + video ---
export { link, RECETAS, gestoEntrada, gestoSalida } from './core/linker.js'
export { compile, propsAt, layersAt, evalKeys, boxDe, escenaEn } from './core/timeline.js'
export { drawFrame, frames, tDe } from './render/video.js'
export { drawPlaca, drawVidrio } from './render/plate.js'
// --- F3.2: edicion ---
export { EDITS_V, DUR_MIN, DUR_MAX, SIZE_MIN, SIZE_MAX, COLOR_TOKENS, emptyEdits, applyEdits, validateEdits, contarEdits } from './core/edits.js'

export {
  PM_V, SB_V, TL_V, CANVAS, PROPS, PROP_DEFAULT, LAYER_KINDS, TEXT_ROLES,
  TIPO_NEGOCIO, MODELO_USO, DISPLAY_HINT, CASE_HINT, SCRIPT, TEXT_DIR, DENSITY, BORDER_STYLE, SHADOW_STYLE,
  MODERNIDAD, IMG_KIND, ESTADO, VOZ_DEFAULT,
  validatePageModel, validateStoryboard, validateTimeline, normalizePageModel, briefToPageModel, formatErrors, err,
} from './core/schema.js'

// catalogo de objetos heroe compartido (inyeccion de dependencias: el Director pasa SU drawText y
// SUS utilidades de color -> cero acoplamiento con urvid aunque el archivo sea compartido).
export { createHeroObjects } from '../shared/objects.js'

export const DIRECTOR_VERSION = '0.5.0-f3.2'

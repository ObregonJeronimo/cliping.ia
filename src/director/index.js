// MOTOR DIRECTOR — barrel publico. Storyboard-first: PageModel -> guion semantico -> escenas
// ESTATICAS -> linker (match-cuts) -> TIMELINE de keyframes -> render + edicion estilo After Effects.
// Plan y contratos: docs/MOTOR-DIRECTOR.md · docs destiladas: docs/director/*.md
//
// INDEPENDENCIA (regla dura, verificada por tools/director-independence-check.mjs):
// este motor NO importa de src/urvid, src/kinetic, ni de ninguna lib externa. Lo unico que comparte
// con el resto del repo es src/shared/objects.js (dibujantes puros con inyeccion de dependencias).
//
// ESTADO: F0 (cimientos). Lo que YA existe y es usable/testeable:
//   core/prng.js    — determinismo por namespaces
//   core/ease.js    — easings y springs en forma cerrada + parser del ease string del timeline
//   core/text.js    — fit nunca-desborda + reveals (mascara / por caracter) + telemetria para gates
//   core/schema.js  — contratos + validadores tipados + normalizador + adapter de brief legacy
// Lo que llega en F1-F3: scriptwriter, composer, linker, timeline (compilador+evaluador), render.

export { mulberry32, hashStr, stableSeed, seedFor, subSeed, pick, range, irange, weightedPick, weightedSample, shuffled } from './core/prng.js'
export { parseEase, isEase, easeName, spring, win, wobble, stagger, lin, expoOut, expoIn, expoInOut, cubicOut, cubicIn, cubicInOut, quintOut, backOut } from './core/ease.js'
export { fontStr, fitFont, fitUniform, wrapFit, wordTrim, clip, drawText, drawWrapped, drawMaskLine, drawKineticLine, telStart, telStop, telTag } from './core/text.js'
export {
  PM_V, SB_V, TL_V, CANVAS, PROPS, PROP_DEFAULT, LAYER_KINDS, TEXT_ROLES,
  TIPO_NEGOCIO, MODELO_USO, DISPLAY_HINT, CASE_HINT, DENSITY, BORDER_STYLE, SHADOW_STYLE, MODERNIDAD, IMG_KIND,
  validatePageModel, validateStoryboard, validateTimeline, normalizePageModel, briefToPageModel, formatErrors, err,
} from './core/schema.js'

// catalogo de objetos heroe compartido (inyeccion de dependencias: el Director pasa SU drawText y
// SUS utilidades de color -> cero acoplamiento con urvid aunque el archivo sea compartido).
export { createHeroObjects } from '../shared/objects.js'

export const DIRECTOR_VERSION = '0.1.0-f0'

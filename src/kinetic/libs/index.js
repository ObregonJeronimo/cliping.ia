// kinetic 1.0 · LIBS — registra TODOS los modulos en el registry propio (side-effect al importar el barrel).
import { registerAll, get } from '../core/registry.js'
import typewriter from './scenes/typewriter.js'
import wordcascade from './scenes/wordcascade.js'
import statement from './scenes/statement.js'
import stat from './scenes/stat.js'
import cta from './scenes/cta.js'
import polaroidInline from './scenes/polaroid-inline.js'
import collage from './scenes/collage.js'
import transitions from './transitions/index.js'

// guard anti-doble-registro (HMR de vite re-importa el barrel; el registry tira con id duplicado)
if (!get('kin.scene.typewriter')) registerAll([typewriter, wordcascade, statement, stat, cta, polaroidInline, collage, ...transitions])

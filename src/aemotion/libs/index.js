// aemotion 0.1 · registro de modulos (idempotente: importar dos veces no duplica)
import { registerAll, get } from '../core/registry.js'
import cascade from './scenes/cascade.js'
import morphmark from './scenes/morphmark.js'
import orbit from './scenes/orbit.js'
import liquidstat from './scenes/liquidstat.js'
import pathline from './scenes/pathline.js'
import stripes from './scenes/stripes.js'
import ctapill from './scenes/ctapill.js'
import transitions from './transitions/index.js'

if (!get('am.scene.cascade')) {
  registerAll([cascade, morphmark, orbit, liquidstat, pathline, stripes, ctapill, ...transitions])
}

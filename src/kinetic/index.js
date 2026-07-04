// KINETIC IA · barrel publico del motor. Motor SEPARADO de urvid (cero imports cruzados): genera videos
// del genero "manifiesto tipografico cinetico" calibre After Effects. makeKinetic(brief,{seed}) -> video
// determinista; drawKineticFrame(ctx,t,video) dibuja cualquier t (seek gratis). $0.00/video, todo procedural.
import './libs/index.js'                                      // side-effect: registra escenas/transiciones

export { makeKinetic, KW, KH } from './core/assemble.js'
export { drawFrame as drawKineticFrame, setScratchFactory, setImageLoader, beatAt } from './core/render.js'
export { stats, query, get } from './core/registry.js'

// urvid 1.0 · biblioteca LAYOUTS — presets de COMPOSICION. El director elige UNO por video (-> env.layout) y las
// escenas piden slots via place(env, [...]); cada preset es solo parametros del arranger generico (core/layout.js):
// alineacion, anclaje vertical, margenes, gaps. DETERMINISTA. Asi dos videos pueden tener el mismo contenido pero
// distinta arquitectura espacial (centrado vs editorial-izquierda vs poster-arriba vs anclado-abajo...).
import { register } from '../../core/registry.js'
import { arrange } from '../../core/layout.js'

function L(id, preset, meta = {}) {
  register({
    id, lib: 'layouts', category: meta.category || 'composition',
    tones: ['dark', 'light'], rubros: meta.rubros || ['*'], weight: meta.weight || 1,
    register: meta.register || 'neutral', intensity: meta.intensity || 'medium', tags: meta.tags || [],
    make() { return { id, arrange: (req) => arrange(req, preset) } },
  })
}

// centrado clasico (universal, seguro)
L('layout.stack.center', { align: 'center', anchor: 'center', side: 0.1, gap: 0.035 },
  { register: 'neutral', intensity: 'medium', tags: ['centrado', 'simetrico', 'universal'], weight: 1.2 })

// editorial: alineado a la IZQUIERDA, bloque centrado vertical (revistas/moda/inmobiliaria)
L('layout.editorial.left', { align: 'left', anchor: 'center', side: 0.1, gap: 0.04 },
  { register: 'editorial', intensity: 'medium', tags: ['izquierda', 'editorial', 'asimetrico'], weight: 1.1, rubros: ['moda', 'belleza', 'inmobiliaria', 'default'] })

// poster: izquierda + anclado ARRIBA (tapa de revista, titular masivo dominando el tercio superior)
L('layout.poster.top', { align: 'left', anchor: 'top', side: 0.1, gap: 0.045 },
  { register: 'editorial', intensity: 'bold', tags: ['poster', 'arriba', 'masivo', 'tapa'], weight: 0.95 })

// anclado ABAJO: el texto vive en el tercio inferior, deja aire arriba (cinematografico / lugar para media futura)
L('layout.anchored.bottom', { align: 'center', anchor: 'bottom', side: 0.11, gap: 0.03 },
  { register: 'editorial', intensity: 'medium', tags: ['abajo', 'cinematografico', 'aire'], weight: 0.95 })

// compacto: margenes amplios, gaps chicos -> bloque denso y prolijo (corporativo/finanzas/salud)
L('layout.tight.center', { align: 'center', anchor: 'center', side: 0.14, gap: 0.026 },
  { register: 'corporate', intensity: 'calm', tags: ['compacto', 'sobrio', 'prolijo'], weight: 1, rubros: ['finanzas', 'salud', 'tech', 'default'] })

// aireado: anclado arriba con gaps grandes -> respira, separa los elementos (amigable/gastronomia/fitness)
L('layout.air.spread', { align: 'center', anchor: 'top', side: 0.1, gap: 0.06 },
  { register: 'friendly', intensity: 'soft', tags: ['aireado', 'espaciado', 'respira'], weight: 0.95 })

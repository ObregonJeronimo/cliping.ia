// Modelo de costo en TOKENS (APROXIMADO) por elemento del video urvid. El motor corre client-side (costo real de nube = 0);
// esto mide la COMPLEJIDAD/valor del video de forma transparente (reemplaza el viejo "creditos" opaco). PURO/determinista,
// derivado de la RECETA (presencia real de cada slot) + el contenido del brief. Reusable por el estudio y, a futuro, por el
// timeline (costo por bloque). Los numeros son redondos y faciles de tunear -> ajustar aca cambia todo el sistema.
export const TOKEN_COST = {
  base: 20,          // render base del video
  scene: 14,         // por escena
  bg: 16, motion: 12, transition: 9, post: 7, atm: 9, sub: 6,
  typekit: 8, mark: 5, editmark: 5, color: 4, type: 4, layout: 4,
  logo: 6, photo: 12,
  textField: 3,      // fijo por campo de texto no vacio
  wordsPer: 2,       // + 1 token cada 2 palabras de copy
}

const _w = (s) => { const t = String(s == null ? '' : s).trim(); return t ? t.split(/\s+/).length : 0 }
const _statW = (x) => (typeof x === 'string' ? _w(x) : (x ? _w(x.label) + _w(x.value != null ? x.value : (x.num != null ? x.num : '')) : 0))

// estimateTokens(video, brief) -> { items:[{key,label,tokens}], total }. Aproximado. Gatea por presencia REAL en la receta
// (un slot opcional ausente no cobra). El desglose es apto para mostrar tal cual en un resumen.
export function estimateTokens(video, brief) {
  const r = (video && video.recipe) || {}
  const b = brief || {}
  const C = TOKEN_COST
  const items = []
  const add = (key, label, tokens) => { const t = Math.round(tokens); if (t > 0) items.push({ key, label, tokens: t }) }
  add('base', 'Render base', C.base)
  const nsc = Array.isArray(r.scenes) ? r.scenes.length : 0
  if (nsc) add('scenes', `Escenas × ${nsc}`, nsc * C.scene)
  if (r.bg) add('bg', 'Fondo animado', C.bg)
  if (r.motion) add('motion', 'Movimiento', C.motion)
  if (r.transition) add('transition', 'Transiciones', C.transition)
  if (r.post) add('post', 'Post (color/grano)', C.post)
  if (r.atm) add('atm', 'Atmósfera', C.atm)
  if (r.sub) add('sub', 'Subcapa gráfica', C.sub)
  if (r.typekit) add('typekit', 'Tipografía cinética', C.typekit)
  if (r.mark) add('mark', 'Marca editorial', C.mark)
  if (r.editmark) add('editmark', 'Marco editorial', C.editmark)
  add('style', 'Estilo (color/tipo/layout)', C.color + C.type + (r.layout ? C.layout : 0))
  const bl = Array.isArray(b.bullets) ? b.bullets : []
  const st = Array.isArray(b.stats) ? b.stats : []
  const nFields = [b.tagline, b.claim, b.cta, b.proof].filter(x => _w(x) > 0).length + bl.filter(x => _w(x) > 0).length + st.length
  const nWords = _w(b.tagline) + _w(b.claim) + _w(b.cta) + _w(b.proof) + bl.reduce((s, x) => s + _w(x), 0) + st.reduce((s, x) => s + _statW(x), 0)
  if (nFields) add('text', `Textos × ${nFields}`, nFields * C.textField + Math.ceil(nWords / C.wordsPer))
  if (b.logo) add('logo', 'Logo', C.logo)
  if (b.mediaImage) add('photo', 'Foto de producto', C.photo)
  const total = items.reduce((s, it) => s + it.tokens, 0)
  return { items, total }
}

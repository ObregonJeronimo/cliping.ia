// urvid 1.0 · SCRIPT — el DIRECTOR/CRITICO del guion (lado motor). Garantiza que el TEXTO del brief se MUESTRA
// COMPLETO en cualquier escena: ata cada campo a un PRESUPUESTO de caracteres calibrado contra la capacidad REAL del
// peor slot del motor (medido por tools/urvid1-prefit-check.mjs sweep) y, si un texto llega largo, lo recorta SIEMPRE
// en LIMITE DE PALABRA (nunca a la mitad -> nunca "aburri…") y descarta items de lista imposibles. Puro/determinista
// (cero canvas/random) -> corre igual en el motor (assemble.js), en el estudio y en Node. El backend (perception.py)
// ya aplica caps parecidos en _normalize; esto es la RED DE SEGURIDAD del lado motor (ediciones manuales, briefs
// viejos, contenido inesperado) -> el critico de QUE se dice vive en el prompt; este asegura que SE VEA entero.

// PRESUPUESTOS (chars). Calibrados con el sweep: el peor caso de cada campo es el slot mas chico donde puede caer
// (p.ej. tagline/claim pueden ir a un slot 'title' a min 30px / 3 lineas ~324px). Se dejan POR DEBAJO del corte real
// para tener aire (multi-formato 4:5/1:1 achican un poco el alto -> margen). Si el sweep cambia, ajustar aca.
export const BUDGETS = {
  tagline: 42,    // gancho corto (~6 palabras; slot title/kicker o sub-label de outro)
  claim: 76,      // mensaje principal (~12 palabras; slot title/body, 2-3 lineas)
  cta: 22,        // llamado a la accion (~4 palabras; pildora / sub-label chico)
  bullet: 30,     // item de checklist (~5 palabras; lista, 1-2 lineas, fitUniform)
  statLabel: 28,  // etiqueta del numero (columnas angostas de data.multi, 2 lineas)
  proof: 90,      // prueba social (quote, hasta 3-4 lineas)
  brand: 32,
}

// PRESUPUESTOS AMPLIOS para 9:16 (formato dominante, mas ALTO). El sweep (prefit-check) mide en 9:16 que TODA escena
// aguanta claim<=160 / tagline<=90 / cta<=50 / bullet<=60 / statLabel<=70 sin ellipsis -> los BUDGETS conservadores estan
// calibrados al PEOR formato (4:5/1:1) y desperdician ese margen en 9:16. Estos caps (con margen bajo la capacidad medida)
// muestran MAS del mensaje real del usuario en 9:16; el prefit gate ahora asserta los 3 formatos con contenido crudo.
export const BUDGETS_WIDE = {
  // calibrados con el prefit gate extendido (3 formatos, contenido crudo): las escenas APRETADAS (checklist con 4 bullets,
  // outro.arrowcta) limitan bullet/claim igual que en 4:5/1:1 -> bullet queda = BUDGET; el margen de 9:16 se cobra en los
  // campos NO limitados por esas escenas (tagline/statLabel/proof) y un poco en claim/cta.
  tagline: 50, claim: 82, cta: 26, bullet: 30, statLabel: 38, proof: 100, brand: 32,
}

// recorta a <= n caracteres SIN cortar palabras: corta en el ultimo espacio que entra. Si la 1ra palabra ya pasa n
// (caso raro: token inquebrable; el contenido real tiene espacios), devuelve esa palabra ENTERA (el motor la achica)
// -> jamas un corte a la mitad de una palabra real (que es el bug "texto incompleto").
export function clipWords(s, n) {
  s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim()
  if (!n || s.length <= n) return s
  const cut = s.slice(0, n)
  const k = cut.lastIndexOf(' ')
  return (k > 0 ? cut.slice(0, k) : s.split(' ')[0]).trim()
}

// fitContent(content): copia del content con cada campo dentro de su presupuesto. NO inventa nada (solo recorta /
// descarta). Mantiene el orden. Devuelve el mismo shape { brand, tagline, claim, cta, bullets[], stats[], proof }.
export function fitContent(content = {}, caps = BUDGETS) {
  const c = content || {}
  const out = { ...c }
  if (c.brand != null) out.brand = clipWords(c.brand, caps.brand)
  if (c.tagline != null) out.tagline = clipWords(c.tagline, caps.tagline)
  if (c.claim != null) out.claim = clipWords(c.claim, caps.claim)
  if (c.cta != null) out.cta = clipWords(c.cta, caps.cta)
  if (c.proof != null) out.proof = clipWords(c.proof, caps.proof)
  if (Array.isArray(c.bullets)) {
    out.bullets = c.bullets
      .map(b => clipWords(b, caps.bullet))
      .filter(b => b && b.length > 0)
      .slice(0, 4)
  }
  if (Array.isArray(c.stats)) {
    out.stats = c.stats
      .filter(s => s && (s.value != null && s.value !== ''))
      .map(s => ({ ...s, value: clipWords(String(s.value), 12), label: clipWords(s.label || '', caps.statLabel) }))
      .slice(0, 3)
  }
  return out
}

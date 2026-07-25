// director · SCHEMA — contratos de datos del motor + validadores con ERRORES TIPADOS + normalizadores
// con DEFAULTS sanos + adapter de brief legacy. Es la puerta de entrada de TODO: nada entra al motor
// (ni del backend, ni del editor del usuario) sin pasar por aca. Los codigos de error son los de la
// taxonomia del plan (docs/MOTOR-DIRECTOR.md §8) y los consumen los gates y el Inspector de la UI.
//
//   validatePageModel(pm) / validateStoryboard(sb) / validateTimeline(tl) -> { ok, errors[] }
//   normalizePageModel(raw)  -> pagemodel VALIDO siempre (pagina pobre incluida)
//   briefToPageModel(brief)  -> adapter del brief legacy del backend actual (funciona desde el dia 1)
//   err(code, path, msg)     -> { code, path, msg }

// ---------------------------------------------------------------- constantes del contrato
export const PM_V = 1, SB_V = 1, TL_V = 1
export const CANVAS = { W: 405, H: 720, FPS: 30 }

export const TIPO_NEGOCIO = ['saas', 'ecommerce', 'servicio-local', 'educacion', 'media', 'portfolio', 'app', 'evento', 'otro']
export const MODELO_USO = ['suscripcion', 'compra', 'reserva', 'registro', 'descarga', 'contacto', 'otro']
export const DISPLAY_HINT = ['serif', 'grotesk', 'rounded', 'mono', 'condensed', 'display']
export const CASE_HINT = ['upper', 'title', 'sentence']
export const DENSITY = ['aireado', 'medio', 'denso']
export const BORDER_STYLE = ['none', 'hairline', 'bold']
export const SHADOW_STYLE = ['flat', 'soft', 'hard']
export const MODERNIDAD = ['bento', 'glass', 'bigtype', 'editorial-photo', 'gradient-mesh', 'brutalist']
export const IMG_KIND = ['producto', 'persona', 'ambiente', 'ui', 'logo', 'otro']
export const REGISTER = ['formal', 'casual', 'warm']
export const AWARENESS = ['unaware', 'problem', 'solution', 'product', 'most']

// capas: el set es CERRADO (el renderer y la UI conocen cada kind; sumar = bump de SB_V)
export const LAYER_KINDS = ['text', 'heroObj', 'photo', 'shape', 'badge', 'stepper', 'priceTag', 'logoRow', 'plate']
export const TEXT_ROLES = ['kicker', 'title', 'subtitle', 'body', 'stat', 'statLabel', 'cta', 'mark', 'quote', 'step']
// props animables: set CERRADO v1 (agregar = bump de TL_V; el evaluador y el Inspector los conocen)
export const PROPS = ['x', 'y', 'w', 'h', 'scale', 'rot', 'alpha', 'reveal', 'sweep']
export const PROP_DEFAULT = { x: 0.5, y: 0.5, w: 0.8, h: 0.2, scale: 1, rot: 0, alpha: 1, reveal: 1, sweep: 0 }

const err = (code, path, msg) => ({ code, path, msg })
export { err }
const isNum = v => typeof v === 'number' && Number.isFinite(v)
const isStr = v => typeof v === 'string'
const inEnum = (v, e) => e.indexOf(v) >= 0
const isBox = v => Array.isArray(v) && v.length === 4 && v.every(isNum)
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim()

// ---------------------------------------------------------------- PAGEMODEL
export function validatePageModel(pm) {
  const e = []
  if (!pm || typeof pm !== 'object') return { ok: false, errors: [err('E-SCHEMA-MISSING', '', 'pagemodel ausente')] }
  if (pm.v !== PM_V) e.push(err('E-SCHEMA-TYPE', 'v', `version ${pm.v} != ${PM_V}`))
  const d = pm.dna || {}
  if (!d.palette || !isStr(d.palette.accent)) e.push(err('E-SCHEMA-MISSING', 'dna.palette.accent', 'falta el acento'))
  else if (!/^#[0-9a-fA-F]{6}$/.test(d.palette.accent)) e.push(err('E-SCHEMA-TYPE', 'dna.palette.accent', 'hex #rrggbb invalido: ' + d.palette.accent))
  if (d.typography && d.typography.displayHint && !inEnum(d.typography.displayHint, DISPLAY_HINT)) e.push(err('E-SCHEMA-ENUM', 'dna.typography.displayHint', String(d.typography.displayHint)))
  if (d.typography && d.typography.caseHint && !inEnum(d.typography.caseHint, CASE_HINT)) e.push(err('E-SCHEMA-ENUM', 'dna.typography.caseHint', String(d.typography.caseHint)))
  if (d.shape && d.shape.radius != null && !(isNum(d.shape.radius) && d.shape.radius >= 0 && d.shape.radius <= 32)) e.push(err('E-SCHEMA-RANGE', 'dna.shape.radius', 'fuera de [0,32]'))
  if (d.shape && d.shape.borderStyle && !inEnum(d.shape.borderStyle, BORDER_STYLE)) e.push(err('E-SCHEMA-ENUM', 'dna.shape.borderStyle', String(d.shape.borderStyle)))
  if (d.shape && d.shape.shadowStyle && !inEnum(d.shape.shadowStyle, SHADOW_STYLE)) e.push(err('E-SCHEMA-ENUM', 'dna.shape.shadowStyle', String(d.shape.shadowStyle)))
  if (d.density && !inEnum(d.density, DENSITY)) e.push(err('E-SCHEMA-ENUM', 'dna.density', String(d.density)))
  for (const k of ['calidez', 'formalidad', 'energia']) {
    const v = d.mood ? d.mood[k] : null
    if (v != null && !(isNum(v) && v >= 0 && v <= 1)) e.push(err('E-SCHEMA-RANGE', 'dna.mood.' + k, 'fuera de [0,1]'))
  }
  if (d.modernidad != null) {
    if (!Array.isArray(d.modernidad)) e.push(err('E-SCHEMA-TYPE', 'dna.modernidad', 'debe ser array'))
    else d.modernidad.forEach((m, i) => { if (!inEnum(m, MODERNIDAD)) e.push(err('E-SCHEMA-ENUM', `dna.modernidad[${i}]`, String(m))) })
  }
  const s = pm.semantica || {}
  if (!isStr(s.queHace) || !clean(s.queHace)) e.push(err('E-SCHEMA-MISSING', 'semantica.queHace', 'la frase de que hace la pagina es obligatoria'))
  if (s.tipoNegocio && !inEnum(s.tipoNegocio, TIPO_NEGOCIO)) e.push(err('E-SCHEMA-ENUM', 'semantica.tipoNegocio', String(s.tipoNegocio)))
  if (s.modeloUso && !inEnum(s.modeloUso, MODELO_USO)) e.push(err('E-SCHEMA-ENUM', 'semantica.modeloUso', String(s.modeloUso)))
  if (s.comoFunciona != null && !Array.isArray(s.comoFunciona)) e.push(err('E-SCHEMA-TYPE', 'semantica.comoFunciona', 'debe ser array'))
  if (s.features != null && !Array.isArray(s.features)) e.push(err('E-SCHEMA-TYPE', 'semantica.features', 'debe ser array'))
  if (s.audiencia && s.audiencia.register && !inEnum(s.audiencia.register, REGISTER)) e.push(err('E-SCHEMA-ENUM', 'semantica.audiencia.register', String(s.audiencia.register)))
  if (s.audiencia && s.audiencia.awareness && !inEnum(s.audiencia.awareness, AWARENESS)) e.push(err('E-SCHEMA-ENUM', 'semantica.audiencia.awareness', String(s.audiencia.awareness)))
  const a = pm.assets || {}
  if (a.images != null) {
    if (!Array.isArray(a.images)) e.push(err('E-SCHEMA-TYPE', 'assets.images', 'debe ser array'))
    else a.images.forEach((im, i) => {
      if (!im || !isStr(im.url) || !im.url) e.push(err('E-SCHEMA-MISSING', `assets.images[${i}].url`, 'sin url'))
      if (im && im.kind && !inEnum(im.kind, IMG_KIND)) e.push(err('E-SCHEMA-ENUM', `assets.images[${i}].kind`, String(im.kind)))
    })
  }
  return { ok: e.length === 0, errors: e }
}

// pagemodel VALIDO siempre: rellena defaults sanos. Una pagina vacia/botwall produce un modelo usable.
export function normalizePageModel(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const d = r.dna || {}, s = r.semantica || {}, a = r.assets || {}
  const pal = d.palette || {}
  const hex = (v, def) => (isStr(v) && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : def)
  const num = (v, def, lo, hi) => (isNum(v) ? clamp(v, lo, hi) : def)
  const enumOr = (v, e, def) => (inEnum(v, e) ? v : def)
  const arr = (v, n) => (Array.isArray(v) ? v.filter(Boolean).slice(0, n) : [])
  return {
    v: PM_V,
    brand: clean(r.brand) || 'Marca',
    url: clean(r.url) || '',
    dna: {
      palette: {
        accent: hex(pal.accent, '#5b8cff'),
        accent2: hex(pal.accent2, null) || undefined,
        bg: hex(pal.bg, '#0a0a0d'),
        inkOnBg: hex(pal.inkOnBg, '#f2f0ea'),
      },
      typography: {
        displayHint: enumOr(d.typography && d.typography.displayHint, DISPLAY_HINT, 'grotesk'),
        caseHint: enumOr(d.typography && d.typography.caseHint, CASE_HINT, 'sentence'),
      },
      shape: {
        radius: num(d.shape && d.shape.radius, 12, 0, 32),
        borderStyle: enumOr(d.shape && d.shape.borderStyle, BORDER_STYLE, 'hairline'),
        shadowStyle: enumOr(d.shape && d.shape.shadowStyle, SHADOW_STYLE, 'soft'),
      },
      density: enumOr(d.density, DENSITY, 'medio'),
      mood: {
        calidez: num(d.mood && d.mood.calidez, 0.5, 0, 1),
        formalidad: num(d.mood && d.mood.formalidad, 0.5, 0, 1),
        energia: num(d.mood && d.mood.energia, 0.5, 0, 1),
      },
      modernidad: (Array.isArray(d.modernidad) ? d.modernidad : []).filter(m => inEnum(m, MODERNIDAD)),
    },
    semantica: {
      queHace: clean(s.queHace) || clean(r.claim) || clean(r.tagline) || `Conoce ${clean(r.brand) || 'la marca'}`,
      comoFunciona: arr(s.comoFunciona, 5).map(clean).filter(Boolean),
      tipoNegocio: enumOr(s.tipoNegocio, TIPO_NEGOCIO, 'otro'),
      modeloUso: enumOr(s.modeloUso, MODELO_USO, 'otro'),
      features: arr(s.features, 6).map(f => (isStr(f) ? { titulo: clean(f), detalle: '' } : { titulo: clean(f && f.titulo), detalle: clean(f && f.detalle) })).filter(f => f.titulo),
      pruebas: {
        stats: arr(s.pruebas && s.pruebas.stats, 4).map(x => ({ value: clean(x.value), label: clean(x.label) })).filter(x => x.value),
        testimonios: arr(s.pruebas && s.pruebas.testimonios, 3).map(x => (isStr(x) ? { texto: clean(x), autor: '' } : { texto: clean(x && x.texto), autor: clean(x && x.autor) })).filter(x => x.texto),
        logosClientes: !!(s.pruebas && s.pruebas.logosClientes),
      },
      oferta: {
        precio: clean(s.oferta && s.oferta.precio),
        promo: clean(s.oferta && s.oferta.promo),
        urgencia: clean(s.oferta && s.oferta.urgencia),
      },
      cta: clean(s.cta) || clean(r.cta) || 'Conocé más',
      audiencia: {
        who: clean(s.audiencia && s.audiencia.who),
        register: enumOr(s.audiencia && s.audiencia.register, REGISTER, 'casual'),
        awareness: enumOr(s.audiencia && s.audiencia.awareness, AWARENESS, 'solution'),
      },
      vozDeMarca: clean(s.vozDeMarca),
    },
    assets: {
      logo: isStr(a.logo) ? a.logo : '',
      ogImage: isStr(a.ogImage) ? a.ogImage : '',
      images: (Array.isArray(a.images) ? a.images : [])
        .map((im, i) => (isStr(im) ? { url: im, kind: 'otro', rank: i } : { url: isStr(im && im.url) ? im.url : '', kind: enumOr(im && im.kind, IMG_KIND, 'otro'), rank: isNum(im && im.rank) ? im.rank : i }))
        .filter(im => im.url).slice(0, 8),
    },
  }
}

// adapter del BRIEF legacy (lo que hoy emite backend/perception) -> pagemodel valido.
// Permite que el Director funcione con el backend ACTUAL desde el dia 1; cuando el backend emita
// pagemodel nativo, este adapter deja de usarse sin tocar el resto del motor.
export function briefToPageModel(brief = {}) {
  const b = brief || {}
  const c = { ...(b.content || {}), ...b }
  const bullets = Array.isArray(c.bullets) ? c.bullets : []
  const stats = Array.isArray(c.stats) ? c.stats : []
  const imgs = Array.isArray(b.images) ? b.images : (b.mediaImage ? [b.mediaImage] : [])
  const RUBRO_NEGOCIO = { tech: 'saas', educacion: 'educacion', gastronomia: 'servicio-local', salud: 'servicio-local', belleza: 'ecommerce', moda: 'ecommerce', fitness: 'servicio-local', inmobiliaria: 'servicio-local', eventos: 'evento', finanzas: 'app' }
  const RUBRO_USO = { tech: 'suscripcion', educacion: 'registro', gastronomia: 'reserva', salud: 'reserva', belleza: 'compra', moda: 'compra', fitness: 'suscripcion', inmobiliaria: 'contacto', eventos: 'compra', finanzas: 'registro' }
  const ser = isNum(b.seriousness) ? b.seriousness : 0.5
  const ener = ({ alto: 0.8, medio: 0.5, bajo: 0.25 })[b.energyHint] != null ? ({ alto: 0.8, medio: 0.5, bajo: 0.25 })[b.energyHint] : 0.5
  return normalizePageModel({
    brand: b.brand, url: b.url,
    dna: {
      palette: { accent: b.brandColor, bg: b.tone === 'light' ? '#f2efe8' : '#0a0a0d', inkOnBg: b.tone === 'light' ? '#161310' : '#f2f0ea' },
      mood: { calidez: clamp(1 - ser, 0, 1), formalidad: ser, energia: ener },
      density: bullets.length >= 4 ? 'denso' : bullets.length >= 2 ? 'medio' : 'aireado',
    },
    semantica: {
      queHace: c.claim || c.tagline,
      features: bullets.map(x => ({ titulo: x, detalle: '' })),
      tipoNegocio: RUBRO_NEGOCIO[b.rubro] || 'otro',
      modeloUso: RUBRO_USO[b.rubro] || 'otro',
      pruebas: { stats, testimonios: c.proof ? [{ texto: c.proof, autor: '' }] : [], logosClientes: false },
      cta: c.cta,
      audiencia: b.audience || {},
    },
    assets: { logo: b.logo, images: imgs, ogImage: b.mediaImage },
    // metadatos legacy que el motor sigue respetando
    _rubro: b.rubro, _tone: b.tone,
  })
}

// ---------------------------------------------------------------- STORYBOARD
export function validateStoryboard(sb) {
  const e = []
  if (!sb || typeof sb !== 'object') return { ok: false, errors: [err('E-SCHEMA-MISSING', '', 'storyboard ausente')] }
  if (sb.v !== SB_V) e.push(err('E-SCHEMA-TYPE', 'v', `version ${sb.v} != ${SB_V}`))
  if (!Array.isArray(sb.scenes) || !sb.scenes.length) return { ok: false, errors: e.concat([err('E-SCHEMA-MISSING', 'scenes', 'sin escenas')]) }
  const ids = new Set()
  sb.scenes.forEach((sc, i) => {
    const P = `scenes[${i}]`
    if (!isStr(sc.id) || !sc.id) e.push(err('E-SCHEMA-MISSING', P + '.id', 'sin id'))
    else if (ids.has(sc.id)) e.push(err('E-SCHEMA-TYPE', P + '.id', 'id duplicado: ' + sc.id))
    else ids.add(sc.id)
    if (!isNum(sc.dur) || sc.dur < 1 || sc.dur > 8) e.push(err('E-SCHEMA-RANGE', P + '.dur', 'duracion fuera de [1,8]s: ' + sc.dur))
    if (!Array.isArray(sc.layers) || !sc.layers.length) { e.push(err('E-SCHEMA-MISSING', P + '.layers', 'escena sin capas')); return }
    const lids = new Set()
    sc.layers.forEach((l, j) => {
      const LP = `${P}.layers[${j}]`
      if (!isStr(l.id) || !l.id) e.push(err('E-SCHEMA-MISSING', LP + '.id', 'sin id'))
      else if (lids.has(l.id)) e.push(err('E-SCHEMA-TYPE', LP + '.id', 'id duplicado en la escena: ' + l.id))
      else lids.add(l.id)
      if (!inEnum(l.kind, LAYER_KINDS)) e.push(err('E-SCHEMA-ENUM', LP + '.kind', String(l.kind)))
      if (!isBox(l.box)) e.push(err('E-SCHEMA-TYPE', LP + '.box', 'box debe ser [x,y,w,h] numerico'))
      else {
        const [x, y, w, h] = l.box
        if (w <= 0 || h <= 0) e.push(err('E-SCHEMA-RANGE', LP + '.box', 'ancho/alto <= 0'))
        // OOB: la caja normalizada debe caer dentro del lienzo con tolerancia (fullbleed usa -0.05..1.05)
        if (x < -0.06 || y < -0.06 || x + w > 1.06 || y + h > 1.06) e.push(err('E-LAYER-OOB', LP + '.box', `fuera del lienzo: [${l.box.join(',')}]`))
      }
      if (l.kind === 'text') {
        if (!isStr(l.text)) e.push(err('E-SCHEMA-MISSING', LP + '.text', 'capa de texto sin texto'))
        if (l.role && !inEnum(l.role, TEXT_ROLES)) e.push(err('E-SCHEMA-ENUM', LP + '.role', String(l.role)))
      }
      if (l.kind === 'heroObj' && !isStr(l.obj)) e.push(err('E-SCHEMA-MISSING', LP + '.obj', 'heroObj sin nombre de objeto'))
      if (l.matchKey != null && !isStr(l.matchKey)) e.push(err('E-SCHEMA-TYPE', LP + '.matchKey', 'debe ser string'))
    })
  })
  return { ok: e.length === 0, errors: e }
}

// ---------------------------------------------------------------- TIMELINE
export function validateTimeline(tl) {
  const e = []
  if (!tl || typeof tl !== 'object') return { ok: false, errors: [err('E-SCHEMA-MISSING', '', 'timeline ausente')] }
  if (tl.v !== TL_V) e.push(err('E-SCHEMA-TYPE', 'v', `version ${tl.v} != ${TL_V}`))
  if (!isNum(tl.dur) || tl.dur <= 0) e.push(err('E-SCHEMA-RANGE', 'dur', 'duracion invalida'))
  if (!isNum(tl.fps) || tl.fps <= 0) e.push(err('E-SCHEMA-RANGE', 'fps', 'fps invalido'))
  if (!Array.isArray(tl.layers) || !tl.layers.length) return { ok: false, errors: e.concat([err('E-SCHEMA-MISSING', 'layers', 'sin capas')]) }
  const byId = new Map()
  tl.layers.forEach((l, i) => {
    const P = `layers[${i}]`
    if (!isStr(l.id) || !l.id) { e.push(err('E-SCHEMA-MISSING', P + '.id', 'sin id')); return }
    if (byId.has(l.id)) e.push(err('E-SCHEMA-TYPE', P + '.id', 'id duplicado: ' + l.id))
    byId.set(l.id, l)
    if (!inEnum(l.kind, LAYER_KINDS)) e.push(err('E-SCHEMA-ENUM', P + '.kind', String(l.kind)))
    if (!Array.isArray(l.life) || l.life.length !== 2 || !l.life.every(isNum)) e.push(err('E-TL-LIFE', P + '.life', 'life debe ser [t0,t1]'))
    else {
      const [a, b] = l.life
      if (b <= a) e.push(err('E-TL-LIFE', P + '.life', `vida vacia o invertida [${a},${b}]`))
      if (a < -1e-6 || b > tl.dur + 1e-6) e.push(err('E-TL-LIFE', P + '.life', `vida fuera de [0,${tl.dur}]`))
    }
  })
  if (Array.isArray(tl.markers)) {
    tl.markers.forEach((m, i) => {
      if (!isNum(m.t) || m.t < 0 || m.t > tl.dur + 1e-6) e.push(err('E-SCHEMA-RANGE', `markers[${i}].t`, 'fuera del video'))
      if (!isStr(m.label)) e.push(err('E-SCHEMA-MISSING', `markers[${i}].label`, 'sin etiqueta'))
    })
  }
  if (!Array.isArray(tl.tracks)) return { ok: false, errors: e.concat([err('E-SCHEMA-MISSING', 'tracks', 'sin tracks')]) }
  tl.tracks.forEach((tr, i) => {
    const P = `tracks[${i}]`
    if (!byId.has(tr.layer)) e.push(err('E-TL-ORPHAN', P + '.layer', 'track sin capa: ' + tr.layer))
    if (!inEnum(tr.prop, PROPS)) e.push(err('E-SCHEMA-ENUM', P + '.prop', String(tr.prop)))
    if (!Array.isArray(tr.keys) || !tr.keys.length) { e.push(err('E-SCHEMA-MISSING', P + '.keys', 'track sin keys')); return }
    let prev = -Infinity
    tr.keys.forEach((k, j) => {
      const KP = `${P}.keys[${j}]`
      if (!isNum(k.t)) { e.push(err('E-SCHEMA-TYPE', KP + '.t', 'tiempo invalido')); return }
      if (!isNum(k.v)) e.push(err('E-SCHEMA-TYPE', KP + '.v', 'valor invalido'))
      if (k.t < prev - 1e-9) e.push(err('E-TL-ORDER', KP + '.t', `keys desordenadas (${k.t} < ${prev})`))
      prev = k.t
      if (k.ease != null && !isEaseStr(k.ease)) e.push(err('E-TL-EASE', KP + '.ease', 'ease no parseable: ' + k.ease))
      if (k.t < -1e-6 || k.t > tl.dur + 1e-6) e.push(err('E-SCHEMA-RANGE', KP + '.t', `fuera de [0,${tl.dur}]`))
    })
  })
  return { ok: e.length === 0, errors: e }
}
// validacion de ease sin importar ease.js (schema.js debe poder usarse suelto en tests/UI)
function isEaseStr(str) {
  const [name, argstr] = String(str).split(':')
  const KNOWN = ['lin', 'eo', 'ei', 'eio', 'co', 'ci', 'cio', 'qo', 'back', 'spring', 'step']
  if (KNOWN.indexOf(name) < 0) return false
  if (name === 'spring') { const a = (argstr || '').split(',').map(Number); return a.length === 2 && a.every(Number.isFinite) && a[0] > 0 && a[0] < 1 && a[1] > 0 }
  if (name === 'back') return argstr == null || Number.isFinite(Number(argstr))
  return argstr == null
}

// resumen legible de errores (para gates y para el Inspector de la UI)
export function formatErrors(errors, max = 12) {
  if (!errors || !errors.length) return 'sin errores'
  const head = errors.slice(0, max).map(x => `  [${x.code}] ${x.path}: ${x.msg}`).join('\n')
  return head + (errors.length > max ? `\n  ... +${errors.length - max} mas` : '')
}

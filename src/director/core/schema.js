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

// ENUMS CERRADOS del pagemodel.v1 — la tabla normativa es docs/director/DNA-SPEC.md §1 y estos
// arrays son su ESPEJO en JS; backend/pagemodel.py tiene el espejo en Python. Agregar un valor a
// cualquiera de los tres lados sin tocar los otros dos = el mismo pagemodel valida distinto segun
// quien lo lea. Agregar un valor de verdad = bump de PM_V.
export const TIPO_NEGOCIO = ['saas', 'ecommerce', 'servicio-local', 'educacion', 'media', 'portfolio', 'app', 'evento', 'otro']
export const MODELO_USO = ['suscripcion', 'compra', 'reserva', 'registro', 'descarga', 'contacto', 'desconocido']
export const DISPLAY_HINT = ['serif', 'grotesk', 'rounded', 'mono', 'condensed']
export const CASE_HINT = ['upper', 'title', 'sentence']
export const SCRIPT = ['latin', 'cyrillic', 'greek', 'cjk', 'arabic', 'hebrew', 'devanagari', 'otro']
export const TEXT_DIR = ['ltr', 'rtl']
export const DENSITY = ['aireado', 'medio', 'denso']
export const BORDER_STYLE = ['none', 'hairline', 'bold']
export const SHADOW_STYLE = ['flat', 'soft', 'hard']
export const MODERNIDAD = ['bento', 'glass', 'bigtype', 'editorial-photo', 'gradient-mesh', 'brutalist']
export const IMG_KIND = ['producto', 'persona', 'ambiente', 'ui', 'desconocido']
// Roles de los recortes de elementos REALES de la pagina. No describen QUE se ve (eso es IMG_KIND)
// sino QUE PAPEL juega el objeto, que es lo que decide como animarlo: un logo entra y se queda, un CTA
// cierra, una tarjeta desfila, una foto respalda. ESPEJO de backend/pagemodel.py::EL_ROL.
export const EL_ROL = ['logo', 'cta', 'tarjeta', 'hero', 'foto']
export const REGISTER = ['formal', 'casual', 'warm']
export const AWARENESS = ['unaware', 'problem', 'solution', 'product', 'most']
export const ESTADO = ['ok', 'botwall', 'spa-vacia', '404', 'timeout', 'bloqueada']
export const VOZ_DEFAULT = ['claro', 'directo', 'actual']

// capas: el set es CERRADO (el renderer y la UI conocen cada kind; sumar = bump de SB_V)
export const LAYER_KINDS = ['text', 'heroObj', 'photo', 'elemento', 'shape', 'badge', 'stepper', 'priceTag', 'logoRow', 'plate']
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
const isHex6 = v => isStr(v) && /^#[0-9a-fA-F]{6}$/.test(v)

// validate() es la SEGUNDA linea defensiva: el pagemodel ya viene normalizado desde Python
// (backend/pagemodel.py, que corre una sola vez al capturar). Aca NO se re-deriva nada — ni
// accentText, ni acromatica, ni mood: si ambos lados derivaran, derivarian distinto (DNA-SPEC §1.8).
export function validatePageModel(pm) {
  const e = []
  if (!pm || typeof pm !== 'object') return { ok: false, errors: [err('E-SCHEMA-MISSING', '', 'pagemodel ausente')] }
  if (pm.v !== PM_V) e.push(err('E-SCHEMA-VERSION', 'v', `version ${pm.v} != ${PM_V}`))
  const color = (v, path) => { if (v != null && !isHex6(v)) e.push(err('E-SCHEMA-COLOR', path, 'hex #rrggbb invalido: ' + v)) }
  const rango = (v, path, lo, hi) => { if (v != null && !(isNum(v) && v >= lo && v <= hi)) e.push(err('E-SCHEMA-RANGE', path, `fuera de [${lo},${hi}]: ${v}`)) }
  const enu = (v, set, path) => { if (v != null && !inEnum(v, set)) e.push(err('E-SCHEMA-ENUM', path, String(v))) }

  // captura: sin `estado` los 5 casos adversariales son indistinguibles entre si (DNA-SPEC §5)
  const c = pm.captura
  if (c != null) {
    if (typeof c !== 'object') e.push(err('E-SCHEMA-TYPE', 'captura', 'debe ser objeto'))
    else {
      enu(c.estado, ESTADO, 'captura.estado')
      rango(c.confianza, 'captura.confianza', 0, 1)
      rango(c.httpStatus, 'captura.httpStatus', 0, 599)
      if (c.viewport != null && !(Array.isArray(c.viewport) && c.viewport.length === 2 && c.viewport.every(isNum))) e.push(err('E-SCHEMA-TYPE', 'captura.viewport', 'debe ser [w,h] numerico'))
    }
  }

  const d = pm.dna || {}
  const p = d.palette
  if (!p || !isStr(p.accent)) e.push(err('E-SCHEMA-MISSING', 'dna.palette.accent', 'falta el acento'))
  else {
    color(p.accent, 'dna.palette.accent'); color(p.bg, 'dna.palette.bg')
    color(p.inkOnBg, 'dna.palette.inkOnBg'); color(p.accentText, 'dna.palette.accentText')
    if (p.accent2 != null) color(p.accent2, 'dna.palette.accent2')   // null es legitimo: "no hay 2.o color de marca"
    rango(p.bgLum, 'dna.palette.bgLum', 0, 1)
  }
  const t = d.typography || {}
  enu(t.displayHint, DISPLAY_HINT, 'dna.typography.displayHint')
  enu(t.bodyHint, DISPLAY_HINT, 'dna.typography.bodyHint')
  enu(t.caseHint, CASE_HINT, 'dna.typography.caseHint')
  enu(t.script, SCRIPT, 'dna.typography.script')
  enu(t.textDir, TEXT_DIR, 'dna.typography.textDir')
  rango(t.h1Ratio, 'dna.typography.h1Ratio', 0, 0.5)
  rango(t.widthRatio, 'dna.typography.widthRatio', 0.35, 0.95)
  const sh = d.shape || {}
  rango(sh.radius, 'dna.shape.radius', 0, 32)
  rango(sh.radiusRatio, 'dna.shape.radiusRatio', 0, 0.5)
  rango(sh.borderWidth, 'dna.shape.borderWidth', 0, 12)
  enu(sh.borderStyle, BORDER_STYLE, 'dna.shape.borderStyle')
  enu(sh.shadowStyle, SHADOW_STYLE, 'dna.shape.shadowStyle')
  // density es un OBJETO (DNA-SPEC §1.8): el motor necesita el continuo `score` para ritmo y carga;
  // el string del boceto del plan sobrevive como `density.nivel`.
  if (d.density != null) {
    if (typeof d.density !== 'object' || Array.isArray(d.density)) e.push(err('E-SCHEMA-TYPE', 'dna.density', 'debe ser objeto {nivel,score,fill,nodos}'))
    else {
      enu(d.density.nivel, DENSITY, 'dna.density.nivel')
      rango(d.density.score, 'dna.density.score', 0, 1)
      rango(d.density.fill, 'dna.density.fill', 0, 1)
      rango(d.density.nodos, 'dna.density.nodos', 0, 400)
    }
  }
  for (const k of ['calidez', 'formalidad', 'energia']) rango(d.mood ? d.mood[k] : null, 'dna.mood.' + k, 0, 1)
  if (d.modernidad != null) {
    if (!Array.isArray(d.modernidad)) e.push(err('E-SCHEMA-TYPE', 'dna.modernidad', 'debe ser array'))
    else {
      if (d.modernidad.length > 3) e.push(err('E-SCHEMA-RANGE', 'dna.modernidad', 'maximo 3 lenguajes: ' + d.modernidad.length))
      d.modernidad.forEach((m, i) => enu(m, MODERNIDAD, `dna.modernidad[${i}]`))
    }
  }

  const s = pm.semantica || {}
  // queHace VACIO es legitimo (DNA-SPEC §1.3): la pagina vacia/404 no tiene que decir nada y el
  // composer cae a title/host. Exigirlo obligaba a inventar una frase, que es lo unico prohibido.
  if (s.queHace != null && !isStr(s.queHace)) e.push(err('E-SCHEMA-TYPE', 'semantica.queHace', 'debe ser string'))
  enu(s.tipoNegocio, TIPO_NEGOCIO, 'semantica.tipoNegocio')
  enu(s.modeloUso, MODELO_USO, 'semantica.modeloUso')
  if (s.comoFunciona != null && !Array.isArray(s.comoFunciona)) e.push(err('E-SCHEMA-TYPE', 'semantica.comoFunciona', 'debe ser array'))
  if (s.features != null && !Array.isArray(s.features)) e.push(err('E-SCHEMA-TYPE', 'semantica.features', 'debe ser array'))
  if (s.vozDeMarca != null && !Array.isArray(s.vozDeMarca)) e.push(err('E-SCHEMA-TYPE', 'semantica.vozDeMarca', 'debe ser array de 3 adjetivos'))
  if (s.audiencia) { enu(s.audiencia.register, REGISTER, 'semantica.audiencia.register'); enu(s.audiencia.awareness, AWARENESS, 'semantica.audiencia.awareness') }

  const a = pm.assets || {}
  if (a.images != null) {
    if (!Array.isArray(a.images)) e.push(err('E-SCHEMA-TYPE', 'assets.images', 'debe ser array'))
    else a.images.forEach((im, i) => {
      if (!im || !isStr(im.url) || !im.url) e.push(err('E-SCHEMA-MISSING', `assets.images[${i}].url`, 'sin url'))
      if (im && im.kind != null) enu(im.kind, IMG_KIND, `assets.images[${i}].kind`)
    })
  }
  if (a.elementos != null) {
    if (!Array.isArray(a.elementos)) e.push(err('E-SCHEMA-TYPE', 'assets.elementos', 'debe ser array'))
    else a.elementos.forEach((el, i) => {
      if (!el || !isStr(el.url) || !el.url) e.push(err('E-SCHEMA-MISSING', `assets.elementos[${i}].url`, 'sin url'))
      // Un elemento es un archivo que generamos y hospedamos NOSOTROS, no una URL que ya estaba en la
      // pagina. Sin w/h el motor no puede reservarle caja sin deformarlo, y deformar el logo de una
      // marca es el unico defecto de esta feature que el usuario nota al instante.
      if (el && (!isNum(el.w) || !isNum(el.h) || el.w <= 0 || el.h <= 0)) e.push(err('E-SCHEMA-MISSING', `assets.elementos[${i}].w/h`, 'sin medidas'))
      if (el && el.rol != null) enu(el.rol, EL_ROL, `assets.elementos[${i}].rol`)
    })
  }
  return { ok: e.length === 0, errors: e }
}

// pagemodel VALIDO siempre: rellena defaults sanos. Una pagina vacia/botwall produce un modelo usable.
// ESPEJO de backend/pagemodel.py::build_pagemodel — mismos defaults, mismos enums, mismos clamps.
// La diferencia de rol: Python MIDE y DERIVA (una vez, al capturar); esto solo rellena y clampea lo
// que llega de Firestore/fixture/editor, para que el motor jamas reciba un campo fuera de rango.
export function normalizePageModel(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const d = r.dna || {}, s = r.semantica || {}, a = r.assets || {}, c = r.captura || {}
  const pal = d.palette || {}, typo = d.typography || {}, sh = d.shape || {}, den = d.density || {}
  const hex = (v, def) => (isHex6(v) ? v.toLowerCase() : def)
  const num = (v, def, lo, hi) => (isNum(v) ? clamp(v, lo, hi) : def)
  const enumOr = (v, e, def) => (inEnum(v, e) ? v : def)
  const arr = (v, n) => (Array.isArray(v) ? v.filter(Boolean).slice(0, n) : [])
  // ESPEJO EXACTO de backend/pagemodel.py::_s: al capar, retrocede al ultimo espacio si esta al menos
  // al 60% del tope. Antes era un hachazo seco y el camino degradado (cuando el backend no manda
  // pagemodel y se adapta el brief legacy) dejaba "Atencion personalizada siemp" en pantalla — y una
  // celda de bento que decia solo "siemp". Dos espejos del mismo dato no pueden cortar distinto.
  const txt = (v, n) => {
    const x = clean(v)
    if (!n || x.length <= n) return x
    const cut = x.slice(0, n), sp = cut.lastIndexOf(' ')
    return (sp >= n * 0.6 ? cut.slice(0, sp) : cut).trim()
  }
  const accent = hex(pal.accent, '#5b8cff')
  const bg = hex(pal.bg, '#ffffff')
  const modernidad = (Array.isArray(d.modernidad) ? d.modernidad : []).filter(m => inEnum(m, MODERNIDAD)).slice(0, 3)
  const voz = arr(s.vozDeMarca, 3).map(x => txt(x, 14)).filter(Boolean)
  const imgs = (Array.isArray(a.images) ? a.images : []).slice(0, 18)
  return {
    v: PM_V,
    brand: txt(r.brand, 32) || 'Marca',   // el UNICO campo que no tenia tope: un <title> que es el dominio entero daba 58 caracteres y se elidia en la apertura y en el cierre
    url: clean(r.url) || '',
    captura: {
      url: clean(c.url) || clean(r.url) || '',
      urlFinal: clean(c.urlFinal) || clean(c.url) || clean(r.url) || '',
      httpStatus: num(c.httpStatus, 0, 0, 599),
      estado: enumOr(c.estado, ESTADO, 'ok'),
      ts: clean(c.ts),
      confianza: num(c.confianza, 0, 0, 1),
      viewport: Array.isArray(c.viewport) && c.viewport.length === 2 && c.viewport.every(isNum) ? c.viewport.slice() : [1280, 900],
      notas: arr(c.notas, 8).map(x => txt(x, 120)).filter(Boolean),
    },
    dna: {
      palette: {
        accent,
        accent2: hex(pal.accent2, null),          // null explicito = "no hay segundo color de marca"
        bg,
        inkOnBg: hex(pal.inkOnBg, '#111114'),
        accentText: hex(pal.accentText, accent),  // default = accent (§1.2); NO se re-deriva el bucle de contraste
        acromatica: !!pal.acromatica,
        bgLum: num(pal.bgLum, 1, 0, 1),
      },
      typography: {
        displayHint: enumOr(typo.displayHint, DISPLAY_HINT, 'grotesk'),
        bodyHint: enumOr(typo.bodyHint, DISPLAY_HINT, 'grotesk'),
        caseHint: enumOr(typo.caseHint, CASE_HINT, 'sentence'),
        script: enumOr(typo.script, SCRIPT, 'latin'),
        textDir: enumOr(typo.textDir, TEXT_DIR, 'ltr'),
        h1Ratio: num(typo.h1Ratio, 0, 0, 0.5),
        widthRatio: num(typo.widthRatio, 0.66, 0.35, 0.95),
      },
      shape: {
        radius: num(sh.radius, 12, 0, 32),
        radiusRatio: num(sh.radiusRatio, 0.06, 0, 0.5),   // esto es lo que se hereda: px de 1280 no sirven en 405
        pill: !!sh.pill,
        borderStyle: enumOr(sh.borderStyle, BORDER_STYLE, 'none'),
        borderWidth: num(sh.borderWidth, 0, 0, 12),
        shadowStyle: enumOr(sh.shadowStyle, SHADOW_STYLE, 'flat'),
      },
      density: {
        nivel: enumOr(den.nivel, DENSITY, 'medio'),
        score: num(den.score, 0.35, 0, 1),
        fill: num(den.fill, 0, 0, 1),
        nodos: num(den.nodos, 0, 0, 400),
      },
      mood: {
        calidez: num(d.mood && d.mood.calidez, 0.5, 0, 1),
        formalidad: num(d.mood && d.mood.formalidad, 0.5, 0, 1),
        energia: num(d.mood && d.mood.energia, 0.45, 0, 1),
      },
      modernidad,
      modernidadScores: Object.fromEntries(Object.entries(d.modernidadScores || {}).filter(([k, v]) => inEnum(k, MODERNIDAD) && isNum(v)).map(([k, v]) => [k, clamp(v, 0, 1)])),
      signals: normSignals(d.signals),
    },
    semantica: {
      // JAMAS inventar: si la senal no esta en la pagina, el campo queda vacio (un array vacio
      // desactiva su escena). El fallback de copy es tarea del composer, no del schema.
      queHace: txt(s.queHace || r.claim || r.tagline, 140),
      comoFunciona: arr(s.comoFunciona, 5).map(x => txt(x, 48)).filter(Boolean),
      tipoNegocio: enumOr(s.tipoNegocio, TIPO_NEGOCIO, 'otro'),
      modeloUso: enumOr(s.modeloUso, MODELO_USO, 'desconocido'),
      // EL TITULO DE FEATURE SE CAPA A 48 Y NO A 28. Este era el CUARTO recorte ciego sobre el mismo
      // texto: semantica_gratis cortaba a 28, pagemodel.py volvia a cortar a 28, este esquema cortaba
      // otra vez a 28 y anthem-datos remataba en 22. El resultado en pantalla eran fragmentos —"MAKE
      // PRODUCT", "PICK A PACKAGE", "THE SAME CORE"— publicados como si fueran las frases de la marca.
      // Cada capa fue escrita por separado y cada una parecia razonable sola; encadenadas, ninguna
      // dejaba pasar una frase entera. 48 es el mismo techo que ya aplica el extractor, asi que esta
      // capa deja de recortar y sigue siendo la red de contencion de un campo que llegue sin pasar por
      // ahi. Ver `_titulo_util` en backend/semantica_gratis.py.
      features: arr(s.features, 6).map(f => (isStr(f) ? { titulo: txt(f, 48), detalle: '' } : { titulo: txt(f && f.titulo, 48), detalle: txt(f && f.detalle, 90) })).filter(f => f.titulo),
      pruebas: {
        stats: arr(s.pruebas && s.pruebas.stats, 4).map(x => ({ valor: txt(x.valor != null ? x.valor : x.value, 10), etiqueta: txt(x.etiqueta != null ? x.etiqueta : x.label, 26) })).filter(x => x.valor),
        testimonios: arr(s.pruebas && s.pruebas.testimonios, 3).map(x => (isStr(x) ? { texto: txt(x, 140), firma: '' } : { texto: txt(x && x.texto, 140), firma: txt(x && (x.firma != null ? x.firma : x.autor), 28) })).filter(x => x.texto),
        logosClientes: !!(s.pruebas && s.pruebas.logosClientes),
      },
      oferta: {
        precio: txt(s.oferta && s.oferta.precio, 16),
        promo: txt(s.oferta && s.oferta.promo, 40),
        urgencia: txt(s.oferta && s.oferta.urgencia, 40),
      },
      audiencia: {
        who: txt(s.audiencia && s.audiencia.who, 60),
        register: enumOr(s.audiencia && s.audiencia.register, REGISTER, 'casual'),
        awareness: enumOr(s.audiencia && s.audiencia.awareness, AWARENESS, 'problem'),
      },
      vozDeMarca: voz.length === 3 ? voz : VOZ_DEFAULT.slice(),
      idioma: (clean(s.idioma).toLowerCase().slice(0, 2) || 'es'),
      cta: txt(s.cta || r.cta, 22),
    },
    assets: {
      logo: isStr(a.logo) ? a.logo : '',
      ogImage: isStr(a.ogImage) ? a.ogImage : '',
      screenshot: isStr(a.screenshot) ? a.screenshot : '',   // auditoria humana; NUNCA entra al video
      images: imgs
        .map((im, i) => (isStr(im)
          ? { url: im, kind: 'desconocido', rank: imgs.length - i, ar: null }
          : { url: isStr(im && im.url) ? im.url : '', kind: enumOr(im && im.kind, IMG_KIND, 'desconocido'), rank: isNum(im && im.rank) ? im.rank : imgs.length - i, ar: isNum(im && im.ar) ? im.ar : null }))
        .filter(im => im.url),
      // ESPEJO de backend/pagemodel.py::_norm_assets. `ar` se RECALCULA de w/h en vez de confiar en el
      // que venga: es el numero con el que el motor decide la caja, y un ar mentido deforma el objeto.
      elementos: (Array.isArray(a.elementos) ? a.elementos : []).slice(0, 14)
        .map((el, i) => ({
          id: isStr(el && el.id) && el.id ? el.id : `el${i}`,
          rol: enumOr(el && el.rol, EL_ROL, 'foto'),
          url: isStr(el && el.url) ? el.url : '',
          w: isNum(el && el.w) ? Math.round(clamp(el.w, 0, 20000)) : 0,
          h: isNum(el && el.h) ? Math.round(clamp(el.h, 0, 20000)) : 0,
          alfa: !!(el && el.alfa),
          textura: num(el && el.textura, 0, 0, 1),
          // color/lum: color DOMINANTE de lo opaco del recorte. Decide si el objeto se ve sobre el
          // fondo que eligio el look — un logo negro sobre un fondo oscuro no esta.
          color: hex(el && el.color, '#808080'),
          lum: num(el && el.lum, 0.5, 0, 1),
          minPx: isNum(el && el.minPx) ? Math.round(clamp(el.minPx, 0, 400)) : 0,
          texto: isStr(el && el.texto) ? el.texto.slice(0, 80) : '',
        }))
        .filter(el => el.url && el.w >= 16 && el.h >= 12)
        .map(el => ({ ...el, ar: Math.round((el.w / el.h) * 1000) / 1000 })),
    },
  }
}

// bloque crudo de la medicion: el motor NO lo consume (existe para director-loop y los gates)
function normSignals(raw) {
  const g = raw || {}, m = g.muestras || {}
  const n = (v, def, lo, hi) => (isNum(v) ? clamp(v, lo, hi) : def)
  return {
    muestras: { botones: n(m.botones, 0, 0, 60), cards: n(m.cards, 0, 0, 80), texto: n(m.texto, 0, 0, 300), imagenes: n(m.imagenes, 0, 0, 40) },
    accentScore: n(g.accentScore, 0, 0, 1e6),
    chromaMax: n(g.chromaMax, 0, 0, 1),
    blurBackdrop: n(g.blurBackdrop, 0, 0, 200),
    gridCards: n(g.gridCards, 0, 0, 200),
    areaImgVsTexto: n(g.areaImgVsTexto, 0, 0, 1e4),
    gradStops: n(g.gradStops, 0, 0, 64),
    contrasteBgInk: n(g.contrasteBgInk, 21, 1, 21),
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
  // el brief legacy no MIDE nada: la densidad se estima por cantidad de bullets, unica senal de carga
  // que trae. `score` se elige en el centro del tramo de su nivel para que ambos queden coherentes.
  const score = bullets.length >= 4 ? 0.7 : bullets.length >= 2 ? 0.4 : 0.2
  return normalizePageModel({
    brand: b.brand, url: b.url,
    captura: { url: b.url, estado: 'ok', confianza: c.claim || c.tagline ? 0.5 : 0.3 },
    dna: {
      palette: { accent: b.brandColor, bg: b.tone === 'light' ? '#f2efe8' : '#0a0a0d', inkOnBg: b.tone === 'light' ? '#161310' : '#f2f0ea' },
      mood: { calidez: clamp(1 - ser, 0, 1), formalidad: ser, energia: ener },
      density: { score, fill: 0, nodos: bullets.length, nivel: score < 0.3 ? 'aireado' : score <= 0.52 ? 'medio' : 'denso' },
    },
    semantica: {
      queHace: c.claim || c.tagline,
      features: bullets.map(x => ({ titulo: x, detalle: '' })),
      tipoNegocio: RUBRO_NEGOCIO[b.rubro] || 'otro',
      modeloUso: RUBRO_USO[b.rubro] || 'desconocido',
      pruebas: { stats, testimonios: c.proof ? [{ texto: c.proof, firma: '' }] : [], logosClientes: false },
      cta: c.cta,
      audiencia: b.audience || {},
      idioma: b.lang,
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

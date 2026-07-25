// GATE director-guion — el GUIONISTA SEMANTICO es el corazon de "escenas con sentido". Este gate
// asserta sus 6 invariantes duros sobre una matriz de pagemodels (los 8 arquetipos de negocio x 40 seeds)
// y ademas mide VARIEDAD (que no salga siempre la misma estructura) y COBERTURA (que las escenas
// semanticas aparezcan cuando la pagina las habilita).
//   1. ANTI-INVENCION: cero escenas sin su señal en el pagemodel  -> E-DATO-FALSO
//   2. Siempre >=1 escena de hook y el video CIERRA con una escena de cierre
//   3. Nunca dos escenas de la misma FAMILIA seguidas             -> E-MONOTONIA
//   4. Nunca una escena repetida dentro del mismo video
//   5. Duracion total en rango y por escena en [1.6, 4.2]s
//   6. DETERMINISMO: mismo pagemodel+seed -> mismo guion
import { buildGuion, ESCENAS, GRAMATICAS } from '../src/director/core/scriptwriter.js'
import { normalizePageModel, validatePageModel, formatErrors } from '../src/director/core/schema.js'

let fails = 0
const die = m => { console.error('FAIL  ' + m); fails++ }
const ok = (c, m) => { if (!c) die(m) }

// ---------------------------------------------------------------- matriz de arquetipos
const PMS = {
  saas: { brand: 'Urvid', dna: { palette: { accent: '#6366f1' }, modernidad: ['bigtype', 'bento'], mood: { energia: 0.7 } }, semantica: { queHace: 'Convierte cualquier link en un reel de marketing', comoFunciona: ['Pegas el link', 'La IA analiza tu pagina', 'Descargas el video'], tipoNegocio: 'saas', modeloUso: 'suscripcion', features: [{ titulo: 'Analisis automatico' }, { titulo: 'Video en 30s' }, { titulo: 'Sin editar nada' }], pruebas: { stats: [{ value: '30s', label: 'por video' }], logosClientes: true }, cta: 'Probalo gratis' } },
  ecommerce: { brand: 'Atelier', dna: { palette: { accent: '#b45309' }, modernidad: ['editorial-photo'] }, semantica: { queHace: 'Prendas de confeccion local en series cortas', tipoNegocio: 'ecommerce', modeloUso: 'compra', features: [{ titulo: 'Algodon organico' }, { titulo: 'Series de 30' }], oferta: { promo: '20% en la primera compra', urgencia: 'Solo esta semana', precio: '$39.900' }, pruebas: { testimonios: [{ texto: 'La calidad se nota', autor: 'Ana' }] }, cta: 'Ver coleccion' }, assets: { images: [{ url: 'https://x/p.jpg', kind: 'producto' }] } },
  resto: { brand: 'La Parrilla', dna: { palette: { accent: '#e0762a' }, mood: { energia: 0.4 } }, semantica: { queHace: 'La parrilla que todo el barrio recomienda', tipoNegocio: 'servicio-local', modeloUso: 'reserva', features: [{ titulo: 'Cortes premium' }, { titulo: 'Vinos de autor' }, { titulo: 'Patio al aire libre' }], pruebas: { stats: [{ value: '4.9', label: 'en resenas' }] }, cta: 'Reserva tu mesa' } },
  educacion: { brand: 'Aula', dna: { palette: { accent: '#8b5cf6' } }, semantica: { queHace: 'Cursos cortos que si terminas', comoFunciona: ['Elegis el curso', 'Cursas en vivo', 'Entregas el proyecto'], tipoNegocio: 'educacion', modeloUso: 'registro', features: [{ titulo: 'Clases en vivo' }, { titulo: 'Proyectos reales' }, { titulo: 'Certificado' }], pruebas: { stats: [{ value: '+15k', label: 'egresados' }], testimonios: [{ texto: 'Cambio mi carrera', autor: 'Leo' }] }, cta: 'Empeza gratis' } },
  evento: { brand: 'Vertigo', dna: { palette: { accent: '#e11d74' }, modernidad: ['brutalist'], mood: { energia: 0.9 } }, semantica: { queHace: 'Line up internacional todos los sabados', tipoNegocio: 'evento', modeloUso: 'compra', features: [{ titulo: 'Barra premium' }, { titulo: 'Sonido Funktion-One' }], oferta: { urgencia: 'Ultimas entradas' }, pruebas: { stats: [{ value: '2500', label: 'personas' }] }, cta: 'Consegui tu entrada' } },
  salud: { brand: 'Vital', dna: { palette: { accent: '#1aa38a' }, mood: { energia: 0.25, formalidad: 0.85 } }, semantica: { queHace: 'Turnos en el dia con profesionales de verdad', tipoNegocio: 'servicio-local', modeloUso: 'reserva', features: [{ titulo: 'Sin esperas' }, { titulo: 'Cobertura total' }, { titulo: 'App propia' }], pruebas: { stats: [{ value: '98%', label: 'satisfaccion' }] }, cta: 'Pedi turno' } },
  portfolio: { brand: 'Estudio N', dna: { palette: { accent: '#111827' }, modernidad: ['glass'] }, semantica: { queHace: 'Diseño de marcas que se recuerdan', tipoNegocio: 'portfolio', modeloUso: 'contacto', features: [{ titulo: 'Identidad' }, { titulo: 'Packaging' }], pruebas: { logosClientes: true }, cta: 'Hablemos' } },
  pobre: { brand: 'Kiosco' },   // pagina sin nada: el guion igual tiene que cerrar
}
const SEEDS = 40

// ---------------------------------------------------------------- invariantes
const cobertura = {}
for (const [nombre, raw] of Object.entries(PMS)) {
  const pm = normalizePageModel(raw)
  const v = validatePageModel(pm)
  ok(v.ok, `${nombre}: el pagemodel de prueba es invalido:\n${formatErrors(v.errors)}`)
  const estructuras = new Set()
  for (let s = 1; s <= SEEDS; s++) {
    const seed = (s * 2654435761) >>> 0
    const g = buildGuion(pm, seed)
    const ids = g.escenas.map(e => e.id)
    estructuras.add(ids.join('>'))
    ids.forEach(id => { cobertura[id] = (cobertura[id] || 0) + 1 })

    // 1. ANTI-INVENCION (la regla mas importante del repo)
    if (ids.indexOf('proof.punch') >= 0 && !pm.semantica.pruebas.stats.length) die(`${nombre}#${s}: INVENTO un dato (proof.punch sin stats)`)
    if (ids.indexOf('proof.quote') >= 0 && !pm.semantica.pruebas.testimonios.length) die(`${nombre}#${s}: INVENTO un testimonio`)
    if (ids.indexOf('proof.logos') >= 0 && !pm.semantica.pruebas.logosClientes) die(`${nombre}#${s}: INVENTO logos de clientes`)
    if (ids.indexOf('offer.flash') >= 0 && !(pm.semantica.oferta.promo || pm.semantica.oferta.urgencia)) die(`${nombre}#${s}: INVENTO una oferta`)
    if (ids.indexOf('howto.steps') >= 0 && pm.semantica.comoFunciona.length < 2) die(`${nombre}#${s}: INVENTO pasos`)
    if (ids.indexOf('features.bento') >= 0 && pm.semantica.features.length < 3) die(`${nombre}#${s}: bento con menos de 3 features`)
    if (ids.indexOf('hero.product') >= 0 && !(pm.assets.images || []).length) die(`${nombre}#${s}: hero.product sin foto`)
    if (ids.indexOf('hero.appwindow') >= 0 && ['saas', 'app'].indexOf(pm.semantica.tipoNegocio) < 0) die(`${nombre}#${s}: appwindow en un negocio que no es saas/app`)

    // 2. hook + cierre
    ok(g.escenas.some(e => e.rol === 'hook'), `${nombre}#${s}: el guion no tiene hook`)
    ok(g.escenas[g.escenas.length - 1].rol === 'cierre', `${nombre}#${s}: el guion no cierra con una escena de cierre (${ids.join('>')})`)

    // 3. nunca dos de la misma familia seguidas · 4. sin repetidas
    for (let i = 1; i < g.escenas.length; i++) if (g.escenas[i].familia === g.escenas[i - 1].familia) die(`${nombre}#${s}: dos '${g.escenas[i].familia}' seguidas`)
    ok(new Set(ids).size === ids.length, `${nombre}#${s}: escena repetida (${ids.join('>')})`)

    // 5. duracion
    ok(g.escenas.length >= 3, `${nombre}#${s}: guion de menos de 3 escenas`)
    ok(g.duracion >= 7 && g.duracion <= 28, `${nombre}#${s}: duracion fuera de rango (${g.duracion}s)`)
    for (const e of g.escenas) ok(e.dur >= 1.6 - 1e-9 && e.dur <= 4.2 + 1e-9, `${nombre}#${s}: escena ${e.id} dura ${e.dur}s`)
    const suma = g.escenas.reduce((a, e) => a + e.dur, 0)
    ok(Math.abs(suma - g.duracion) < 0.05, `${nombre}#${s}: la duracion no es la suma de las escenas`)
    // t0 consecutivos
    let t = 0
    for (const e of g.escenas) { ok(Math.abs(e.t0 - t) < 0.05, `${nombre}#${s}: t0 desalineado en ${e.id}`); t += e.dur }

    // 6. DETERMINISMO
    const g2 = buildGuion(pm, seed)
    ok(JSON.stringify(g) === JSON.stringify(g2), `${nombre}#${s}: el guion NO es determinista`)
  }
  // VARIEDAD: con material real tiene que haber estructuras distintas (una pagina pobre puede repetir)
  const min = nombre === 'pobre' ? 2 : 4
  ok(estructuras.size >= min, `${nombre}: solo ${estructuras.size} estructuras en ${SEEDS} seeds (minimo ${min})`)
}

// ---------------------------------------------------------------- cobertura del catalogo
const nunca = ESCENAS.filter(e => !cobertura[e.id]).map(e => e.id)
ok(nunca.length === 0, `escenas del catalogo que NUNCA salen (codigo muerto): ${nunca.join(', ')}`)
// las gramaticas semanticas deben poder salir (si no, la semantica no sirve de nada)
ok(GRAMATICAS.length >= 8, 'faltan gramaticas')

if (fails) { console.error(`\nGATE GUION FALLO (${fails} casos).`); process.exit(1) }
const usadas = Object.keys(cobertura).length
console.log(`GATE GUION OK (${Object.keys(PMS).length} arquetipos x ${SEEDS} seeds: anti-invencion, hook+cierre, sin familias seguidas, ritmo y determinismo; ${usadas}/${ESCENAS.length} escenas del catalogo en uso).`)

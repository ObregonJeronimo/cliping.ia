// premium-hash.mjs — huella BYTE-EXACTA de la direccion de arte PREMIUM (escenas scene.prem.*).
// Se usa como red de seguridad al refactorizar (p.ej. extraer los objetos heroe a src/shared/objects.js):
// se corre ANTES y DESPUES; si un solo pixel cambia, el hash cambia. Los gates urvid1-* NO cubren premium
// (weight 0, solo via brief.style='premium'), asi que esta herramienta es la unica que lo protege.
// Uso: node tools/premium-hash.mjs            -> imprime hash global + por brief
import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { makeVideo, drawFrame } from '../src/urvid/index.js'
import { setScratchFactory } from '../src/urvid/core/render.js'

const HERE = dirname(fileURLToPath(import.meta.url))
try { GlobalFonts.loadFontsFromDir(join(HERE, 'fonts')) } catch { /* fuentes del sistema */ }
setScratchFactory((w, h) => createCanvas(w, h))

// briefs de control: cubren los 11 rubros -> los pools de objetos heroe, las 4 placas y las 5 gramaticas
const BRIEFS = [
  { brand: 'Nodo', rubro: 'tech', tone: 'dark', brandColor: '#22e06a', tagline: 'Automatiza lo aburrido', claim: 'Menos tareas repetitivas, mas resultados reales', cta: 'Probalo gratis', bullets: ['Integraciones en 1 click', 'Reportes en vivo', 'Soporte 24/7'], stats: [{ value: '99.9%', label: 'uptime' }] },
  { brand: 'Lumina', rubro: 'belleza', tone: 'light', brandColor: '#c56a8e', tagline: 'Tu piel primero', claim: 'Cosmetica que se nota desde la primera semana', cta: 'Descubri la linea', bullets: ['Formulas limpias', 'Testeado dermatologicamente', 'Envio 24h'], stats: [{ value: '+12k', label: 'clientas felices' }] },
  { brand: 'La Parrilla', rubro: 'gastronomia', tone: 'dark', brandColor: '#e0762a', tagline: 'Fuego lento, sabor de verdad', claim: 'La parrilla que todo el barrio recomienda', cta: 'Reserva tu mesa', bullets: ['Cortes premium', 'Vinos de autor', 'Patio al aire libre'], stats: [{ value: '4.9', label: 'en resenas' }] },
  { brand: 'FitClub', rubro: 'fitness', tone: 'dark', brandColor: '#ff5a3c', tagline: 'Entrena distinto', claim: 'El gimnasio que se adapta a tu ritmo', cta: 'Sumate hoy', bullets: ['Clases sin cupo', 'Coach 1 a 1', 'Abierto 24hs'], stats: [{ value: '+3000', label: 'socios activos' }] },
  { brand: 'Casa Norte', rubro: 'inmobiliaria', tone: 'light', brandColor: '#3d6ef7', tagline: 'Tu proximo hogar', claim: 'Propiedades seleccionadas una por una', cta: 'Agenda visita', bullets: ['Tasacion gratis', 'Escritura en 30 dias', 'Sin comision oculta'], stats: [{ value: '+800', label: 'familias' }] },
  { brand: 'Vital', rubro: 'salud', tone: 'light', brandColor: '#1aa38a', tagline: 'Cuidarte es simple', claim: 'Turnos en el dia con profesionales de verdad', cta: 'Pedi turno', bullets: ['Sin esperas', 'Cobertura total', 'App propia'], stats: [{ value: '98%', label: 'satisfaccion' }] },
  { brand: 'Aula', rubro: 'educacion', tone: 'dark', brandColor: '#8b5cf6', tagline: 'Aprende haciendo', claim: 'Cursos cortos que si terminas', cta: 'Empeza gratis', bullets: ['Clases en vivo', 'Proyectos reales', 'Certificado'], stats: [{ value: '+15k', label: 'egresados' }] },
  { brand: 'Vertigo', rubro: 'eventos', tone: 'dark', brandColor: '#e11d74', tagline: 'La noche empieza aca', claim: 'Line up internacional todos los sabados', cta: 'Consegui tu entrada', bullets: ['Barra premium', 'Sonido Funktion-One', 'After hasta las 7'], stats: [{ value: '2500', label: 'personas' }] },
  { brand: 'Atelier', rubro: 'moda', tone: 'light', brandColor: '#b45309', tagline: 'Prendas que duran', claim: 'Confeccion local en series cortas', cta: 'Ver coleccion', bullets: ['Algodon organico', 'Series de 30', 'Cambios sin vueltas'], stats: [{ value: '+40', label: 'disenos' }] },
  { brand: 'Capital', rubro: 'finanzas', tone: 'dark', brandColor: '#0ea5e9', tagline: 'Tu plata rinde', claim: 'Inversion automatica desde el primer peso', cta: 'Abri tu cuenta', bullets: ['Sin minimo', 'Rescate en 24h', 'Regulado'], stats: [{ value: '11%', label: 'anual' }] },
  { brand: 'Kiosco', rubro: 'default', tone: 'dark', brandColor: '#64748b', tagline: 'Todo cerca', claim: 'Lo que necesitas, a la vuelta', cta: 'Ver tienda', bullets: ['Envio rapido', 'Precios claros', 'Atencion real'], stats: [{ value: '+500', label: 'productos' }] },
]
const SEEDS = [3, 7, 41, 91, 1013904227]
const TS = 12   // 12 muestras por video (cubre todas las escenas y ventanas de transicion)

const SS = 1.25
const cv = createCanvas(Math.ceil(405 * SS), Math.ceil(720 * SS))
const ctx = cv.getContext('2d')

const perBrief = []
const all = createHash('sha256')
for (const b of BRIEFS) {
  const h = createHash('sha256')
  for (const seed of SEEDS) {
    const video = makeVideo({ ...b, style: 'premium', seed })
    h.update(JSON.stringify(video.recipe))
    for (let i = 0; i < TS; i++) {
      const t = (i + 0.5) * video.duration / TS
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(SS, 0, 0, SS, 0, 0)
      drawFrame(ctx, t, video)
      h.update(cv.toBuffer('image/png'))
    }
  }
  const d = h.digest('hex').slice(0, 16)
  perBrief.push(`${b.rubro.padEnd(14)} ${d}`)
  all.update(d)
}
console.log(perBrief.join('\n'))
console.log('\nHASH PREMIUM GLOBAL: ' + all.digest('hex'))

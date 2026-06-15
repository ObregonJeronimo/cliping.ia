// make-stock-photos.mjs — genera FOTOS de prueba (stand-in) en tools/_stock/ para verificar el motor
// fotografico (kind:'photo') en el visor SIN fotos reales. NO son arte: son escenas vectoriales que simulan
// fotos (distinto contenido y aspect-ratio) para chequear cover-fit, Ken Burns, scrim y legibilidad.
// Uso: node tools/make-stock-photos.mjs
import { createCanvas } from '@napi-rs/canvas'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '_stock')
mkdirSync(OUT, { recursive: true })

function save(name, w, h, draw) {
  const c = createCanvas(w, h), x = c.getContext('2d'); draw(x, w, h)
  writeFileSync(join(OUT, name), c.toBuffer('image/png'))
}

// place: edificios/propiedad (landscape)
save('place.png', 1280, 800, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#a9c8e2'); g.addColorStop(1, '#eef3f6'); x.fillStyle = g; x.fillRect(0, 0, w, h)
  for (let i = 0; i < 7; i++) { const bw = 120 + (i * 53 % 90), bh = 220 + (i * 137 % 360); x.fillStyle = i % 2 ? '#46586b' : '#566a7f'; x.fillRect(60 + i * 175, h - bh, bw, bh) }
  x.fillStyle = '#33424f'; x.fillRect(0, h - 90, w, 90)
})
// food: plato (square)
save('food.png', 1000, 1000, (x, w, h) => {
  const g = x.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, 640); g.addColorStop(0, '#e8a04a'); g.addColorStop(1, '#5e2c12'); x.fillStyle = g; x.fillRect(0, 0, w, h)
  x.fillStyle = '#f3ead9'; x.beginPath(); x.arc(w / 2, h / 2, 360, 0, 7); x.fill()
  x.fillStyle = '#c2622a'; x.beginPath(); x.arc(w / 2, h / 2, 250, 0, 7); x.fill()
  x.fillStyle = '#8a3f18'; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; x.beginPath(); x.arc(w / 2 + Math.cos(a) * 150, h / 2 + Math.sin(a) * 150, 36, 0, 7); x.fill() }
})
// product: objeto (portrait)
save('product.png', 820, 1180, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#d9c7b0'); g.addColorStop(1, '#9a8268'); x.fillStyle = g; x.fillRect(0, 0, w, h)
  x.fillStyle = '#2e2620'; x.beginPath(); x.roundRect(w * 0.3, h * 0.28, w * 0.4, h * 0.46, 40); x.fill()
  x.fillStyle = '#c9a05a'; x.beginPath(); x.roundRect(w * 0.36, h * 0.36, w * 0.28, h * 0.16, 16); x.fill()
})
// people: escena calida (landscape)
save('people.png', 1280, 860, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#caa6c9'); g.addColorStop(1, '#7a6a9c'); x.fillStyle = g; x.fillRect(0, 0, w, h)
  x.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(w * (0.3 + i * 0.2), h * 0.42, 120, 0, 7); x.fill(); x.fillStyle = 'rgba(40,30,55,0.4)'; x.fillRect(w * (0.3 + i * 0.2) - 90, h * 0.55, 180, h * 0.45); x.fillStyle = 'rgba(255,255,255,0.18)' }
})

console.log('stock photos en tools/_stock/: place, food, product, people')

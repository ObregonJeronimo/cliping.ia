// make-stock-photos.mjs — FOTOS de prueba (stand-in) en tools/_stock/ para verificar el motor fotografico
// (kind:'photo') en el visor SIN fotos reales. NO son arte: escenas vectoriales DETALLADAS que LEEN como foto
// (sujeto reconocible + iluminacion + vineta + sombra) para juzgar cover-fit / Ken Burns / scrim / legibilidad.
// Nombre = categoria (el mock las asigna por rubro). Uso: node tools/make-stock-photos.mjs
import { createCanvas } from '@napi-rs/canvas'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '_stock')
mkdirSync(OUT, { recursive: true })
const TAU = Math.PI * 2
function save(name, w, h, draw) { const c = createCanvas(w, h), x = c.getContext('2d'); draw(x, w, h); vignette(x, w, h); writeFileSync(join(OUT, name), c.toBuffer('image/png')) }
function vignette(x, w, h) { const g = x.createRadialGradient(w / 2, h * 0.42, h * 0.2, w / 2, h / 2, h * 0.85); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.28)'); x.fillStyle = g; x.fillRect(0, 0, w, h) }

// COMIDA: plato cenital con mound + toppings + cubierto + mesa de madera
save('food.png', 1080, 1080, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#6b4a32'); g.addColorStop(1, '#3a2417'); x.fillStyle = g; x.fillRect(0, 0, w, h)
  for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(0,0,0,${0.04 + (i % 5) * 0.01})`; x.fillRect(0, i * 18 + (i % 3) * 4, w, 6) }   // vetas madera
  x.save(); x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = 50; x.shadowOffsetY = 24
  x.fillStyle = '#f4ece0'; x.beginPath(); x.arc(w / 2, h / 2, 380, 0, TAU); x.fill(); x.restore()
  x.fillStyle = '#e7dccb'; x.beginPath(); x.arc(w / 2, h / 2, 320, 0, TAU); x.fill()
  const food = x.createRadialGradient(w / 2, h / 2 - 40, 30, w / 2, h / 2, 260); food.addColorStop(0, '#d98a3c'); food.addColorStop(1, '#9c4f1e'); x.fillStyle = food; x.beginPath(); x.arc(w / 2, h / 2, 250, 0, TAU); x.fill()
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; x.fillStyle = ['#7da64f', '#cf4b3a', '#f0c64a'][i % 3]; x.beginPath(); x.arc(w / 2 + Math.cos(a) * 150, h / 2 + Math.sin(a) * 150, 30, 0, TAU); x.fill() }
})
// INTERIOR: living con ventana, sofa, planta (inmobiliaria)
save('interior.png', 1280, 800, (x, w, h) => {
  x.fillStyle = '#cdb89c'; x.fillRect(0, 0, w, h)                                  // pared
  x.fillStyle = '#e9e2d4'; x.fillRect(0, h * 0.66, w, h * 0.34)                    // piso
  const win = x.createLinearGradient(0, 0, 0, h * 0.6); win.addColorStop(0, '#bfe0f0'); win.addColorStop(1, '#e8f4fb'); x.fillStyle = win; x.fillRect(w * 0.58, h * 0.1, w * 0.34, h * 0.5)
  x.strokeStyle = '#8a7e6a'; x.lineWidth = 8; x.strokeRect(w * 0.58, h * 0.1, w * 0.34, h * 0.5); x.beginPath(); x.moveTo(w * 0.75, h * 0.1); x.lineTo(w * 0.75, h * 0.6); x.stroke()
  x.save(); x.shadowColor = 'rgba(0,0,0,0.3)'; x.shadowBlur = 40; x.shadowOffsetY = 20
  x.fillStyle = '#7c5a48'; x.beginPath(); x.roundRect(w * 0.08, h * 0.5, w * 0.4, h * 0.3, 26); x.fill(); x.restore()      // sofa
  x.fillStyle = '#9a7361'; x.beginPath(); x.roundRect(w * 0.1, h * 0.42, w * 0.36, h * 0.16, 22); x.fill()                  // respaldo
  // lampara de pie GEOMETRICA (reemplaza la 'planta' de 5 elipses rotadas que leia como blob/gota organico ->
  // el usuario rechaza esas figuras; ademas aparecia junto al wordmark en split/scene). Lineas rectas, no morph.
  x.save(); x.translate(w * 0.52, 0)
  x.strokeStyle = '#6b5847'; x.lineWidth = 7; x.beginPath(); x.moveTo(0, h * 0.66); x.lineTo(0, h * 0.30); x.stroke()   // pie
  x.fillStyle = '#6b5847'; x.fillRect(-26, h * 0.652, 52, 12)                                                            // base
  x.fillStyle = '#d9c98f'; x.beginPath(); x.moveTo(-44, h * 0.30); x.lineTo(44, h * 0.30); x.lineTo(30, h * 0.16); x.lineTo(-30, h * 0.16); x.closePath(); x.fill()   // pantalla (trapecio)
  x.restore()
})
// PRODUCTO: frasco/botella con etiqueta + reflejo (belleza/retail)
save('product.png', 860, 1180, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#efe6da'); g.addColorStop(1, '#b7a690'); x.fillStyle = g; x.fillRect(0, 0, w, h)
  x.fillStyle = 'rgba(0,0,0,0.18)'; x.beginPath(); x.ellipse(w / 2, h * 0.82, 200, 44, 0, 0, TAU); x.fill()                   // sombra
  const bot = x.createLinearGradient(w * 0.34, 0, w * 0.66, 0); bot.addColorStop(0, '#2c3a3e'); bot.addColorStop(0.5, '#5a7177'); bot.addColorStop(1, '#243034'); x.fillStyle = bot
  x.beginPath(); x.roundRect(w * 0.34, h * 0.3, w * 0.32, h * 0.5, 30); x.fill()                                             // cuerpo
  x.fillStyle = '#1c2528'; x.beginPath(); x.roundRect(w * 0.43, h * 0.2, w * 0.14, h * 0.12, 10); x.fill()                   // tapa
  x.fillStyle = '#e7dcc8'; x.beginPath(); x.roundRect(w * 0.37, h * 0.46, w * 0.26, h * 0.16, 8); x.fill()                   // etiqueta
  x.fillStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); x.roundRect(w * 0.37, h * 0.32, w * 0.04, h * 0.42, 6); x.fill()    // reflejo
})
// SPA / belleza-salud: toallas, vela, piedras, luz calida
save('spa.png', 1280, 820, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#efe7df'); g.addColorStop(1, '#d8c9bd'); x.fillStyle = g; x.fillRect(0, 0, w, h)
  x.save(); x.shadowColor = 'rgba(0,0,0,0.2)'; x.shadowBlur = 30; x.shadowOffsetY = 14
  x.fillStyle = '#f6f1ea'; x.beginPath(); x.roundRect(w * 0.1, h * 0.5, w * 0.34, h * 0.16, 14); x.fill(); x.fillStyle = '#eadfd3'; x.beginPath(); x.roundRect(w * 0.1, h * 0.6, w * 0.34, h * 0.14, 14); x.fill(); x.restore()   // toallas
  for (let i = 0; i < 4; i++) { x.fillStyle = `rgb(${90 - i * 12},${82 - i * 10},${78 - i * 10})`; x.beginPath(); x.ellipse(w * 0.62 + i * 60, h * 0.66 - i * 10, 50 - i * 6, 22 - i * 3, 0, 0, TAU); x.fill() }   // piedras
  const fl = x.createRadialGradient(w * 0.84, h * 0.34, 4, w * 0.84, h * 0.34, 80); fl.addColorStop(0, '#ffdf9b'); fl.addColorStop(1, 'rgba(255,210,120,0)'); x.fillStyle = fl; x.beginPath(); x.arc(w * 0.84, h * 0.34, 80, 0, TAU); x.fill()   // vela glow
  x.fillStyle = '#e8ddcb'; x.fillRect(w * 0.8, h * 0.4, 60, h * 0.3)
})
// PERSONA: silueta con rim-light (servicios/moda/fitness)
save('people.png', 880, 1180, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#3a4256'); g.addColorStop(1, '#171b26'); x.fillStyle = g; x.fillRect(0, 0, w, h)
  const rim = x.createRadialGradient(w * 0.72, h * 0.3, 20, w * 0.72, h * 0.3, 420); rim.addColorStop(0, 'rgba(255,200,150,0.4)'); rim.addColorStop(1, 'rgba(255,200,150,0)'); x.fillStyle = rim; x.fillRect(0, 0, w, h)
  x.fillStyle = '#0f131c'; x.beginPath(); x.arc(w / 2, h * 0.34, 150, 0, TAU); x.fill()                                       // cabeza
  x.beginPath(); x.moveTo(w * 0.2, h); x.quadraticCurveTo(w * 0.5, h * 0.42, w * 0.8, h); x.closePath(); x.fill()             // hombros
  x.strokeStyle = 'rgba(255,190,140,0.5)'; x.lineWidth = 6; x.beginPath(); x.arc(w / 2, h * 0.34, 150, -1.2, 0.4); x.stroke()  // rim light borde
})
// STOREFRONT: local/fachada (negocios locales)
save('storefront.png', 1280, 820, (x, w, h) => {
  x.fillStyle = '#8fb0c4'; x.fillRect(0, 0, w, h * 0.4)                            // cielo
  x.fillStyle = '#caa274'; x.fillRect(0, h * 0.4, w, h * 0.6)                      // fachada
  x.fillStyle = '#2c3a44'; x.fillRect(w * 0.12, h * 0.5, w * 0.3, h * 0.42); x.fillRect(w * 0.58, h * 0.5, w * 0.3, h * 0.42)  // vidrieras
  const aw = x.createLinearGradient(0, h * 0.4, 0, h * 0.5); aw.addColorStop(0, '#b14b3c'); aw.addColorStop(1, '#8a3528'); x.fillStyle = aw; x.fillRect(w * 0.08, h * 0.4, w * 0.84, h * 0.1)   // toldo
  x.fillStyle = '#f0e6d4'; for (let i = 0; i < 5; i++) x.fillRect(w * 0.1 + i * w * 0.18, h * 0.42, w * 0.06, h * 0.06)         // letras cartel
})
// SCREENSHOT: dashboard/analitica -> barras y lineas RECTAS, KPI cards (tech/finanzas). Geometrico, determinista.
save('screenshot.png', 1280, 820, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0f1726'); g.addColorStop(1, '#0a0f1a'); x.fillStyle = g; x.fillRect(0, 0, w, h)
  x.fillStyle = '#16203a'; x.fillRect(0, 0, w, h * 0.12)                                                                       // barra superior
  x.fillStyle = '#2b6cf0'; x.fillRect(w * 0.04, h * 0.04, w * 0.05, h * 0.04)                                                  // logo cuadrado
  for (let i = 0; i < 3; i++) { x.fillStyle = '#22304e'; x.fillRect(w * 0.14 + i * w * 0.11, h * 0.05, w * 0.08, h * 0.025) }  // tabs
  // 3 KPI cards (rectangulos planos)
  for (let i = 0; i < 3; i++) { const cx = w * 0.05 + i * w * 0.225; x.fillStyle = '#172238'; x.fillRect(cx, h * 0.18, w * 0.2, h * 0.16); x.fillStyle = '#3b82f6'; x.fillRect(cx + w * 0.015, h * 0.21, w * 0.09, h * 0.03); x.fillStyle = '#2a3a5a'; x.fillRect(cx + w * 0.015, h * 0.27, w * 0.16, h * 0.018) }
  // panel de barras (columnas rectas, alturas deterministas)
  x.fillStyle = '#141d31'; x.fillRect(w * 0.05, h * 0.42, w * 0.42, h * 0.5)
  const bh = [0.22, 0.34, 0.28, 0.44, 0.38, 0.5, 0.46]
  for (let i = 0; i < bh.length; i++) { const bx = w * 0.08 + i * w * 0.055; x.fillStyle = '#2b6cf0'; x.fillRect(bx, h * 0.88 - h * bh[i], w * 0.038, h * bh[i]) }
  // panel de linea (poligonal recta, sin curvas)
  x.fillStyle = '#141d31'; x.fillRect(w * 0.52, h * 0.42, w * 0.43, h * 0.5)
  const lp = [0.78, 0.7, 0.74, 0.6, 0.64, 0.5, 0.46, 0.52, 0.4]
  x.strokeStyle = '#34d399'; x.lineWidth = 5; x.beginPath()
  for (let i = 0; i < lp.length; i++) { const px = w * 0.55 + i * (w * 0.37 / (lp.length - 1)), py = h * lp[i]; i ? x.lineTo(px, py) : x.moveTo(px, py) }
  x.stroke()
  x.strokeStyle = 'rgba(255,255,255,0.05)'; x.lineWidth = 1; for (let i = 1; i < 5; i++) { const gy = h * 0.42 + i * (h * 0.1); x.beginPath(); x.moveTo(w * 0.52, gy); x.lineTo(w * 0.95, gy); x.stroke() }   // grilla horizontal
})
// OFFICE: escritorio con monitor y ventana -> rectangulos rectos (tech/default workspace). Geometrico, determinista.
save('office.png', 1280, 800, (x, w, h) => {
  x.fillStyle = '#3a4150'; x.fillRect(0, 0, w, h * 0.62)                                                                       // pared
  x.fillStyle = '#272c38'; x.fillRect(0, h * 0.62, w, h * 0.38)                                                               // escritorio (superficie)
  const win = x.createLinearGradient(0, h * 0.08, 0, h * 0.5); win.addColorStop(0, '#9ec9e6'); win.addColorStop(1, '#cfe6f2'); x.fillStyle = win; x.fillRect(w * 0.6, h * 0.1, w * 0.32, h * 0.4)   // ventana
  x.strokeStyle = '#5b6273'; x.lineWidth = 8; x.strokeRect(w * 0.6, h * 0.1, w * 0.32, h * 0.4); x.beginPath(); x.moveTo(w * 0.76, h * 0.1); x.lineTo(w * 0.76, h * 0.5); x.moveTo(w * 0.6, h * 0.3); x.lineTo(w * 0.92, h * 0.3); x.stroke()   // cruz de la ventana
  // monitor
  x.save(); x.shadowColor = 'rgba(0,0,0,0.35)'; x.shadowBlur = 30; x.shadowOffsetY = 16
  x.fillStyle = '#11151f'; x.fillRect(w * 0.12, h * 0.2, w * 0.34, h * 0.26); x.restore()
  x.fillStyle = '#1c64d8'; x.fillRect(w * 0.135, h * 0.225, w * 0.31, h * 0.21)                                               // pantalla
  x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(w * 0.15, h * 0.25, w * 0.18, h * 0.02); x.fillRect(w * 0.15, h * 0.3, w * 0.26, h * 0.015); x.fillRect(w * 0.15, h * 0.34, w * 0.2, h * 0.015)   // filas de texto
  x.fillStyle = '#2a2f3b'; x.fillRect(w * 0.27, h * 0.46, w * 0.04, h * 0.1); x.fillRect(w * 0.24, h * 0.55, w * 0.1, h * 0.02)   // pie del monitor
  x.fillStyle = '#1a1e28'; x.fillRect(w * 0.5, h * 0.55, w * 0.22, h * 0.05)                                                  // teclado
  x.fillStyle = '#4a8f6a'; x.fillRect(w * 0.05, h * 0.42, w * 0.05, h * 0.2)                                                  // maceta rectangular (sin blob)
})
// TEAM: siluetas GEOMETRICAS simples (circulo cabeza + trapecio torso). Nada organico (servicios/equipo).
save('team.png', 1280, 800, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2e3647'); g.addColorStop(1, '#1a202c'); x.fillStyle = g; x.fillRect(0, 0, w, h)
  x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(0, h * 0.78, w, h * 0.22)                                                // piso tenue
  const cols = ['#6b7689', '#8a93a6', '#5a6478']                                                                              // tonos planos deterministas
  const xs = [0.2, 0.5, 0.8], scl = [1.0, 1.12, 0.94]
  for (let i = 0; i < xs.length; i++) {
    const cx = w * xs[i], s = scl[i], headR = 70 * s, hy = h * 0.4 - (s - 1) * 60
    x.fillStyle = cols[i]
    x.beginPath(); x.arc(cx, hy, headR, 0, TAU); x.fill()                                                                     // cabeza (circulo)
    x.beginPath(); x.moveTo(cx - headR * 1.5, h * 0.82); x.lineTo(cx - headR * 0.85, hy + headR * 1.1); x.lineTo(cx + headR * 0.85, hy + headR * 1.1); x.lineTo(cx + headR * 1.5, h * 0.82); x.closePath(); x.fill()   // torso (trapecio recto)
  }
  const rim = x.createRadialGradient(w * 0.5, h * 0.2, 20, w * 0.5, h * 0.2, 520); rim.addColorStop(0, 'rgba(120,170,230,0.18)'); rim.addColorStop(1, 'rgba(120,170,230,0)'); x.fillStyle = rim; x.fillRect(0, 0, w, h)   // luz fria de fondo
})

console.log('stock photos (categorias): food, interior, product, spa, people, storefront, screenshot, office, team -> tools/_stock/')

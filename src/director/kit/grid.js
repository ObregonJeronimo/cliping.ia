// director · GRILLA — el sistema de composicion en espacio NORMALIZADO (0..1 sobre el lienzo).
// El storyboard viaja con cajas normalizadas (schema §validateStoryboard) para que el mismo
// storyboard sirva a 405x720 (preview), 1080x1920 (export) y al editor, sin recomponer nada.
//
// Dos cosas que este archivo garantiza y que el gate audita:
//   1. SAFE AREAS (DIRECCION-DE-ARTE C2): arriba vive la UI de la plataforma, abajo el caption y los
//      botones de IG/TikTok. Nada legible entra ahi. Solo la placa y el sangrado pueden pisar.
//   2. MARGEN OPTICO: el margen del look es fraccion del ANCHO. Aplicarlo tal cual en Y daria un
//      margen vertical 1.78x mas grande (el lienzo es 9:16), asi que se convierte por aspect ratio.

import { CANVAS } from '../core/schema.js'
import { clamp } from '../core/util.js'

const AR = CANVAS.W / CANVAS.H                       // 0.5625

// zonas muertas de la plataforma (fraccion de ALTO). Medidas sobre IG Reels / TikTok / Shorts:
// el peor caso es TikTok, que come ~13% abajo entre caption y barra de acciones.
export const SAFE_TOP = 0.075
export const SAFE_BOT = 0.135

export function makeGrid(look) {
  const mx = clamp(look.margen, 0.045, 0.15)
  const my = mx * AR                                 // mismo margen OPTICO arriba/abajo que a los lados
  const x0 = mx, x1 = 1 - mx, w = 1 - mx * 2
  const y0 = SAFE_TOP + my, y1 = 1 - SAFE_BOT - my, h = y1 - y0
  const cols = 6, gut = mx * 0.5
  const colW = (w - gut * (cols - 1)) / cols

  const g = {
    mx, my, x0, x1, y0, y1, w, h, cols, gut, colW,
    cx: 0.5, cy: (y0 + y1) / 2,
    // columnas: col(i, n) -> [x, w] de n columnas desde la i
    col: (i, n = 1) => [x0 + i * (colW + gut), n * colW + (n - 1) * gut],
    // bandas: band(a, b) con a,b en 0..1 DENTRO del area de contenido -> [y, h]
    band: (a, b) => [y0 + h * a, h * (b - a)],
    // caja completa: box(a, b) ancho total; box(a, b, i, n) acotada a columnas
    box: (a, b, i, n) => {
      const [by, bh] = g.band(a, b)
      if (i == null) return [x0, by, w, bh]
      const [bx, bw] = g.col(i, n == null ? 1 : n)
      return [bx, by, bw, bh]
    },
    // grilla de celdas para bento: cells(2, 2, a, b) -> 4 cajas
    cells: (nx, ny, a, b, gapK = 1) => {
      const [by, bh] = g.band(a, b)
      const gx = gut * gapK, gy = gx * (CANVAS.W / CANVAS.H) * 1.6
      const cw = (w - gx * (nx - 1)) / nx, ch = (bh - gy * (ny - 1)) / ny
      const out = []
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) out.push([x0 + i * (cw + gx), by + j * (ch + gy), cw, ch])
      return out
    },
  }
  return g
}

// dentroDeSafe(box) — el chequeo que corre el gate (E-SAFE-AREA). `sangra` permite fullbleed.
export function dentroDeSafe(box, sangra = false) {
  const [x, y, w, h] = box
  if (sangra) return x >= -0.06 && y >= -0.06 && x + w <= 1.06 && y + h <= 1.06
  return x >= -1e-6 && y >= SAFE_TOP - 1e-6 && x + w <= 1 + 1e-6 && y + h <= 1 - SAFE_BOT + 1e-6
}

// px(box) — normalizado -> pixeles del lienzo que se este dibujando
export const px = (box, W, H) => [box[0] * W, box[1] * H, box[2] * W, box[3] * H]

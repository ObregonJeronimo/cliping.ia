// Helpers de formato/layout para soportar 9:16 (vertical), 1:1 (cuadrado) y 16:9 (horizontal)
// SIN romper el vertical: cuando W=1080 y H=1920, todo equivale a los valores fijos de antes.
//
// Uso en una escena:
//   import { useVideoConfig } from 'remotion'
//   import { fmt } from '../layout'
//   const F = fmt(useVideoConfig())
//   ... posicioná con F.W, F.H, F.cx, F.cy y los flags F.vertical/F.square/F.wide.

export const fmt = (cfg = {}) => {
  const W = cfg.width || 1080
  const H = cfg.height || 1920
  const aspect = W / H
  const vertical = aspect < 0.85
  const square = aspect >= 0.85 && aspect <= 1.2
  const wide = aspect > 1.2
  return {
    W, H, aspect, vertical, square, wide,
    cx: W / 2, cy: H / 2,
    // Escala tipográfica relativa: el vertical (1080) es la referencia (1.0). En horizontal,
    // hay menos alto, así que conviene achicar un poco; en cuadrado, casi igual.
    uiScale: vertical ? 1 : wide ? 0.82 : 0.92,
    // Margen vertical seguro según el alto disponible (zonas de UI de la plataforma).
    padY: vertical ? 0.05 : 0.07,
  }
}

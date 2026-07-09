// aemotion 0.1 · UTIL — helpers puros minimos. Sin estado, sin DOM.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
export const lerp = (a, b, t) => a + (b - a) * t
export const TAU = Math.PI * 2

export const fontStr = (weight, size, family) => `${weight} ${size}px "${family}", sans-serif`

export function hexToRgb(hex) {
  let h = String(hex || '#888').replace('#', '')
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const n = parseInt(h.slice(0, 6), 16) || 0x888888
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
export function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${clamp(a, 0, 1)})`
}

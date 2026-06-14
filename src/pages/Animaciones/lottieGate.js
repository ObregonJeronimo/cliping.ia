// lottieGate.js — gate de DETERMINISMO para Lotties (POC 4). Espejo JS de lottie_search.has_expressions.
// Remotion renderiza frame a frame en paralelo; una Lottie con EXPRESIONES o capas de EFECTO no es
// reproducible -> se descarta antes de usarla. Tambien extrae metadatos basicos.
export function hasExpressions(lottie) {
  if (!lottie || typeof lottie !== 'object') return false
  const blob = JSON.stringify(lottie)
  return blob.includes('"ef":') || /"x":\s*"/.test(blob)   // 'ef' = efectos; '"x":"..."' = expresion
}
export function isSafeLottie(l) {
  return !!l && typeof l === 'object' &&
    Number.isFinite(l.fr) && Number.isFinite(l.op) && Number.isFinite(l.ip) &&
    !hasExpressions(l)
}
export function lottieMeta(l) {
  if (!l || typeof l !== 'object') return null
  const fps = Number(l.fr) || 30
  const durationInFrames = Math.max(1, Math.round((Number(l.op) || 0) - (Number(l.ip) || 0)))
  return { w: l.w, h: l.h, fps, durationInFrames, safe: isSafeLottie(l) }
}

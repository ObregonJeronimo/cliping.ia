// urvid 1.0 · a11y — accesibilidad de movimiento. Fuente UNICA de prefers-reduced-motion (requisito a11y 2026 para
// kinetic typography y parallax/zoom). La consultan el typekit (entrada de TEXTO) y el motion (entrada/ambient/life de
// ESCENA) para degradar a cambios de estado sin movimiento espacial. Este modulo SI toca el entorno (window) a proposito;
// por eso vive aparte de util.js (que es puro/sin-DOM). El motor headless (Node/gates/Remotion) no tiene window -> _mql
// queda null -> false -> comportamiento IDENTICO (frames byte-identicos, determinismo intacto).
let _mql, _tried = false
// Cacheamos el MediaQueryList UNA vez (matchMedia es relativamente caro) y leemos .matches por llamada -> reactivo
// (respeta que el usuario cambie la preferencia en vivo) y barato. try/catch defensivo por si matchMedia tira.
export function reduceMotion() {
  try {
    if (!_tried) { _tried = true; _mql = (typeof window !== 'undefined' && window.matchMedia) ? window.matchMedia('(prefers-reduced-motion: reduce)') : null }
    return _mql ? _mql.matches : false
  } catch { return false }
}

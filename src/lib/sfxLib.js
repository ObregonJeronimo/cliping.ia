// SFX sintetizados por WebAudio (sin archivos externos -> cero problemas de licencia/CSP/peso; 100% libres). Cada uno
// se genera llenando un Float32Array de forma determinista (PRNG sembrado para el ruido) -> se envuelve en un AudioBuffer
// del contexto que lo pida (preview: AudioContext vivo; export: OfflineAudioContext). Cache por (id, sampleRate).

export const SFX = [
  { id: 'pop', name: 'Pop', dur: 0.16 },
  { id: 'click', name: 'Click', dur: 0.06 },
  { id: 'whoosh', name: 'Whoosh', dur: 0.45 },
  { id: 'ding', name: 'Ding', dur: 0.7 },
  { id: 'riser', name: 'Riser', dur: 0.9 },
  { id: 'thud', name: 'Thud', dur: 0.28 },
  { id: 'blip', name: 'Blip', dur: 0.12 },
  { id: 'sparkle', name: 'Sparkle', dur: 0.55 },
]

// PRNG sembrado (ruido reproducible, no usa Math.random -> mismo SFX siempre).
function mkRnd(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000 * 2 - 1 } }
const clamp1 = (v) => Math.max(-1, Math.min(1, v))

// genera las MUESTRAS mono [-1,1] de un SFX. PURO. sr = sample rate.
export function sfxSamples(id, sr = 48000) {
  const meta = SFX.find(s => s.id === id) || { dur: 0.3 }
  const n = Math.max(1, Math.ceil((meta.dur || 0.3) * sr))
  const out = new Float32Array(n)
  const rnd = mkRnd(0x9e37 ^ id.length ^ (id.charCodeAt(0) << 8))
  const TAU = Math.PI * 2
  let lp = 0   // estado de un filtro pasa-bajos de 1 polo (para whoosh)
  for (let i = 0; i < n; i++) {
    const t = i / sr, p = i / n   // t en seg, p en [0,1)
    let v = 0
    switch (id) {
      case 'pop': { const f = 440 * Math.exp(-t * 9); v = Math.sin(TAU * f * t) * Math.exp(-t * 26); break }
      case 'click': { v = rnd() * Math.exp(-t * 120); break }
      case 'blip': { v = Math.sin(TAU * 900 * t) * Math.exp(-t * 40); break }
      case 'ding': { const e = Math.exp(-t * 5); v = (Math.sin(TAU * 880 * t) * 0.7 + Math.sin(TAU * 1320 * t) * 0.3) * e; break }
      case 'thud': { const f = 120 * Math.exp(-t * 8); v = Math.sin(TAU * f * t) * Math.exp(-t * 14); break }
      case 'whoosh': { const cutoff = 0.02 + 0.35 * Math.sin(Math.PI * p); lp += cutoff * (rnd() - lp); const env = Math.sin(Math.PI * p); v = lp * env * 1.6; break }
      case 'riser': { const f = 200 + 1400 * p * p; const env = p * p; v = (Math.sin(TAU * f * t) * 0.6 + rnd() * 0.4) * env; break }
      case 'sparkle': { const f = 1200 + 600 * Math.sin(TAU * 7 * t); const env = Math.exp(-t * 4) * (0.6 + 0.4 * Math.abs(Math.sin(TAU * 11 * t))); v = Math.sin(TAU * f * t) * env * 0.7; break }
      default: v = Math.sin(TAU * 440 * t) * Math.exp(-t * 10)
    }
    // fade-in/out corto anti-click en los bordes
    const edge = Math.min(1, i / (sr * 0.004), (n - 1 - i) / (sr * 0.006))
    out[i] = clamp1(v) * edge * 0.85
  }
  return out
}

// devuelve un AudioBuffer del SFX en el contexto dado (AudioContext u OfflineAudioContext). Cache por (id|sr).
const _cache = new Map()
export function sfxBuffer(ctx, id) {
  const key = id + '|' + ctx.sampleRate
  let buf = _cache.get(key)
  if (buf) return buf
  const data = sfxSamples(id, ctx.sampleRate)
  buf = ctx.createBuffer(1, data.length, ctx.sampleRate)
  buf.getChannelData(0).set(data)
  _cache.set(key, buf)
  return buf
}

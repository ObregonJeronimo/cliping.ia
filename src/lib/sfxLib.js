// SFX sintetizados por WebAudio (sin archivos externos -> cero problemas de licencia/CSP/peso; 100% libres). Cada uno
// se genera llenando un Float32Array de forma determinista (PRNG sembrado para el ruido) -> se envuelve en un AudioBuffer
// del contexto que lo pida (preview: AudioContext vivo; export: OfflineAudioContext). Cache por (id, sampleRate).

export const SFX = [
  { id: 'pop', name: 'Pop', dur: 0.16 },
  { id: 'click', name: 'Click', dur: 0.06 },
  { id: 'tick', name: 'Tick', dur: 0.05 },
  { id: 'blip', name: 'Blip', dur: 0.12 },
  { id: 'whoosh', name: 'Whoosh', dur: 0.45 },
  { id: 'swoosh', name: 'Swoosh', dur: 0.4 },
  { id: 'whooshdn', name: 'Whoosh baja', dur: 0.4 },
  { id: 'ding', name: 'Ding', dur: 0.7 },
  { id: 'chime', name: 'Chime', dur: 0.9 },
  { id: 'bell', name: 'Bell', dur: 1.0 },
  { id: 'notify', name: 'Notify', dur: 0.35 },
  { id: 'coin', name: 'Coin', dur: 0.22 },
  { id: 'sparkle', name: 'Sparkle', dur: 0.55 },
  { id: 'riser', name: 'Riser', dur: 0.9 },
  { id: 'drop', name: 'Drop', dur: 0.4 },
  { id: 'laser', name: 'Laser', dur: 0.35 },
  { id: 'zap', name: 'Zap', dur: 0.25 },
  { id: 'thud', name: 'Thud', dur: 0.28 },
  { id: 'boom', name: 'Boom', dur: 0.6 },
  { id: 'punch', name: 'Punch', dur: 0.2 },
  { id: 'bubble', name: 'Bubble', dur: 0.3 },
  { id: 'glitch', name: 'Glitch', dur: 0.3 },
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
      case 'tick': { v = (rnd() * 0.5 + Math.sin(TAU * 3200 * t) * 0.5) * Math.exp(-t * 180); break }
      case 'swoosh': { const cutoff = 0.05 + 0.5 * Math.sin(Math.PI * p); lp += cutoff * (rnd() - lp); v = lp * Math.sin(Math.PI * p) * 1.9; break }
      case 'whooshdn': { const cutoff = Math.max(0.03, 0.45 - 0.4 * p); lp += cutoff * (rnd() - lp); v = lp * Math.sin(Math.PI * p) * 1.7; break }
      case 'chime': { const e = Math.exp(-t * 3); v = (Math.sin(TAU * 1046 * t) * 0.5 + Math.sin(TAU * 1568 * t) * 0.3 + Math.sin(TAU * 2093 * t) * 0.2) * e; break }
      case 'bell': { const e = Math.exp(-t * 2.3); v = (Math.sin(TAU * 660 * t) + Math.sin(TAU * 1320 * t) * 0.45 + Math.sin(TAU * 1980 * t) * 0.18) * e * 0.6; break }
      case 'notify': { const f = t < 0.16 ? 660 : 988; v = Math.sin(TAU * f * t) * Math.exp(-((t % 0.16)) * 9) * 0.85; break }
      case 'coin': { const f = t < 0.06 ? 988 : 1319; v = Math.sin(TAU * f * t) * Math.exp(-t * 7); break }
      case 'drop': { const f = 700 * Math.exp(-t * 8); v = Math.sin(TAU * f * t) * Math.exp(-t * 5); break }
      case 'laser': { const f = 200 + 1700 * Math.exp(-t * 9); v = Math.sin(TAU * f * t) * Math.exp(-t * 7); break }
      case 'zap': { const f = 400 + 2200 * p; v = (Math.sin(TAU * f * t) * 0.5 + rnd() * 0.5) * Math.exp(-t * 13); break }
      case 'boom': { const f = 85 * Math.exp(-t * 6); v = (Math.sin(TAU * f * t) * 0.85 + rnd() * 0.3 * Math.exp(-t * 26)) * Math.exp(-t * 4); break }
      case 'punch': { const f = 150 * Math.exp(-t * 22); v = Math.sin(TAU * f * t) * Math.exp(-t * 17) + rnd() * Math.exp(-t * 90) * 0.4; break }
      case 'bubble': { const f = 320 + 420 * Math.sin(TAU * 9 * t); v = Math.sin(TAU * f * t) * Math.exp(-t * 9); break }
      case 'glitch': { v = ((Math.floor(t * 44) % 2) ? rnd() : Math.sin(TAU * 1800 * t)) * Math.exp(-t * 5) * 0.8; break }
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

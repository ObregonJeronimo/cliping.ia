// templates · FONDOS con ID. Catalogo de fondos autorados (el usuario referencia "el fondo <id>";
// yo los uso al construir escenas). Cada uno dibuja con TOKENS de la paleta -> se adapta a la marca.
// La escena guarda background:{ ref:'bg.mesh', ... } o inline { kind, color1, ... }.
import { TAU, rgba, clamp } from '../aemotion/index.js'
import { resolveColor } from './palette.js'

const R = (ctx, W, H, c) => { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H) }

export const BACKGROUNDS = [
  { id: 'bg.plain', label: 'Liso', draw: (ctx, ts, { W, H, pal, p }) => R(ctx, W, H, resolveColor(p.color1 || 'bg', pal)) },
  { id: 'bg.gradient', label: 'Degradado', draw: (ctx, ts, { W, H, pal, p }) => { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, resolveColor(p.color1 || 'bg', pal)); g.addColorStop(1, resolveColor(p.color2 || 'surface', pal)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H) } },
  { id: 'bg.glow-corner', label: 'Glow esquina', draw: (ctx, ts, { W, H, pal, p }) => { R(ctx, W, H, resolveColor(p.color1 || 'bg', pal)); const acc = resolveColor(p.accent || 'accent', pal); const cx = W * 0.3, cy = H * 0.26; const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.82); g.addColorStop(0, rgba(acc, 0.2)); g.addColorStop(0.55, rgba(acc, 0.05)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); vignette(ctx, W, H, 0.28) } },
  { id: 'bg.spotlight', label: 'Reflector', draw: (ctx, ts, { W, H, pal, p }) => { R(ctx, W, H, resolveColor(p.color1 || 'bg', pal)); const acc = resolveColor(p.accent || 'accent', pal); const cx = W / 2, cy = H * 0.4; const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.55); g.addColorStop(0, rgba(acc, 0.22)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); vignette(ctx, W, H, 0.42) } },
  { id: 'bg.mesh', label: 'Mesh aurora', draw: (ctx, ts, { W, H, pal, p }) => { R(ctx, W, H, resolveColor(p.color1 || 'bg', pal)); const cols = [resolveColor('accent', pal), resolveColor('accent2', pal), resolveColor('accent', pal)]; for (let i = 0; i < 3; i++) { const cx = W * (0.25 + 0.5 * (i / 2)) + Math.sin(ts / (16 + i * 4) * TAU + i) * W * 0.08; const cy = H * (0.3 + 0.4 * ((i % 2))) + Math.cos(ts / (20 + i * 3) * TAU + i) * H * 0.06; const rad = Math.max(W, H) * 0.42; const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, rgba(cols[i], 0.14)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H) } } },
  { id: 'bg.duotone', label: 'Duotono diagonal', draw: (ctx, ts, { W, H, pal, p }) => { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, resolveColor('accent', pal)); g.addColorStop(0.5, resolveColor('accent', pal)); g.addColorStop(0.52, resolveColor(p.color1 || 'bg', pal)); g.addColorStop(1, resolveColor(p.color1 || 'bg', pal)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H) } },
  { id: 'bg.grid', label: 'Grilla', draw: (ctx, ts, { W, H, pal, p }) => { R(ctx, W, H, resolveColor(p.color1 || 'bg', pal)); ctx.save(); ctx.strokeStyle = rgba(resolveColor('ink', pal), 0.07); ctx.lineWidth = 1; const s = p.step || 30; ctx.beginPath(); for (let x = s; x < W; x += s) { ctx.moveTo(x, 0); ctx.lineTo(x, H) } for (let y = s; y < H; y += s) { ctx.moveTo(0, y); ctx.lineTo(W, y) } ctx.stroke(); ctx.restore() } },
  { id: 'bg.dots', label: 'Puntos', draw: (ctx, ts, { W, H, pal, p }) => { R(ctx, W, H, resolveColor(p.color1 || 'bg', pal)); ctx.fillStyle = rgba(resolveColor('ink', pal), 0.09); const s = p.step || 34; for (let x = s; x < W; x += s) for (let y = s; y < H; y += s) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill() } } },
  { id: 'bg.rays', label: 'Rayos', draw: (ctx, ts, { W, H, pal, p }) => { R(ctx, W, H, resolveColor(p.color1 || 'bg', pal)); const acc = resolveColor('accent', pal); ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.translate(W / 2, H * 0.2); ctx.rotate(ts * 0.03); for (let i = 0; i < 10; i++) { ctx.rotate(TAU / 10); const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rgba(acc, 0.06)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.lineTo(60, H); ctx.lineTo(-60, H); ctx.closePath(); ctx.fill() } ctx.restore(); vignette(ctx, W, H, 0.3) } },
  { id: 'bg.accent', label: 'Acento pleno', draw: (ctx, ts, { W, H, pal, p }) => R(ctx, W, H, resolveColor(p.accent || 'accent', pal)) },
]
export const BACKGROUND_IDS = BACKGROUNDS.map(b => b.id)
const BY_ID = new Map(BACKGROUNDS.map(b => [b.id, b]))

function vignette(ctx, W, H, k) { const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${k})`); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H) }

// paintTemplateBackground(ctx, bg, ts, pal, W, H): bg = { ref:'bg.mesh', ... } o { kind, color1,... }
export function paintTemplateBackground(ctx, bg, ts, pal, W, H) {
  bg = bg || { ref: 'bg.plain' }
  const info = { W, H, pal, p: bg }
  if (bg.ref && BY_ID.has(bg.ref)) { BY_ID.get(bg.ref).draw(ctx, ts, info); return }
  // compat con el schema viejo (kind)
  const kind = bg.kind || 'solid'
  const id = { solid: 'bg.plain', gradient: 'bg.gradient', glow: 'bg.glow-corner', grid: 'bg.grid', accent: 'bg.accent' }[kind] || 'bg.plain'
  BY_ID.get(id).draw(ctx, ts, info)
}

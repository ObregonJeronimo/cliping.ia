// urvid 1.0 · biblioteca TRANSITIONS — paso de escena A->B. Cada modulo: make() -> { render(ctx,p,drawA,drawB,dims) }.
// Compone DIRECTO al ctx (drawA/drawB = callbacks que pintan cada escena) con clip/transform -> nitido, sin buffers,
// anda igual en browser (OffscreenCanvas no necesario) y en Node. PURO + DETERMINISTA (todo por p). p in [0,1].
// FAMILIAS: cut, wipes (4 dir), slides/push (4 dir), iris, bars, wedge, blinds. A se OCULTA donde aparece B -> sin
// solapamiento de textos. El director elige una por video (sesgada: las llamativas pesan menos en rubros serios).
import { register } from '../../core/registry.js'
import { W, H, eOutCubic, eInOutCubic, clamp, TAU } from '../../core/util.js'

function T(id, render, meta = {}) {
  register({
    id, lib: 'transitions', category: meta.category || 'transitions',
    tones: meta.tones || ['dark', 'light'], rubros: meta.rubros || ['*'], weight: meta.weight || 1, tags: meta.tags || [],
    register: meta.register, intensity: meta.intensity,   // EJES EXPLICITOS: la GEOMETRIA del corte le habla al publico (sobrio vs vistoso) via seriedad+audiencia.
    make() { return { id, render } },
  })
}
const clipRect = (ctx, x, y, w, h, draw) => { ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); draw(ctx); ctx.restore() }

// --- cut + fade-cut ---
T('transitions.cut.hard', (ctx, p, drawA, drawB) => { if (p < 0.5) drawA(ctx); else drawB(ctx) }, { weight: 1.2, register: 'neutral', intensity: 'calm', tags: ['corte', 'seco'] })

// --- wipes (B se revela por una mascara que barre; A queda debajo, oculta donde entra B) ---
T('transitions.wipe.right', (ctx, p, drawA, drawB) => { const e = eOutCubic(p); drawA(ctx); clipRect(ctx, 0, 0, W * e, H, drawB) }, { weight: 1.1, register: 'neutral', intensity: 'soft', tags: ['wipe', 'barrido'] })
T('transitions.wipe.left', (ctx, p, drawA, drawB) => { const e = eOutCubic(p); drawA(ctx); clipRect(ctx, W * (1 - e), 0, W * e, H, drawB) }, { weight: 1, register: 'neutral', intensity: 'soft', tags: ['wipe', 'barrido'] })
T('transitions.wipe.up', (ctx, p, drawA, drawB) => { const e = eOutCubic(p); drawA(ctx); clipRect(ctx, 0, H * (1 - e), W, H * e, drawB) }, { weight: 1, register: 'neutral', intensity: 'soft', tags: ['wipe', 'barrido'] })
T('transitions.wipe.down', (ctx, p, drawA, drawB) => { const e = eOutCubic(p); drawA(ctx); clipRect(ctx, 0, 0, W, H * e, drawB) }, { weight: 1, register: 'neutral', intensity: 'soft', tags: ['wipe', 'barrido'] })

// --- push (A sale empujada por B; viajan pegadas, sin solapamiento) ---
T('transitions.push.left', (ctx, p, drawA, drawB) => { const e = eInOutCubic(p); ctx.save(); ctx.translate(-W * e, 0); drawA(ctx); ctx.restore(); ctx.save(); ctx.translate(W * (1 - e), 0); drawB(ctx); ctx.restore() }, { weight: 1, register: 'friendly', intensity: 'medium', tags: ['push', 'lateral'] })
T('transitions.push.right', (ctx, p, drawA, drawB) => { const e = eInOutCubic(p); ctx.save(); ctx.translate(W * e, 0); drawA(ctx); ctx.restore(); ctx.save(); ctx.translate(-W * (1 - e), 0); drawB(ctx); ctx.restore() }, { weight: 0.9, register: 'friendly', intensity: 'medium', tags: ['push', 'lateral'] })
T('transitions.push.up', (ctx, p, drawA, drawB) => { const e = eInOutCubic(p); ctx.save(); ctx.translate(0, -H * e); drawA(ctx); ctx.restore(); ctx.save(); ctx.translate(0, H * (1 - e)); drawB(ctx); ctx.restore() }, { weight: 0.9, register: 'friendly', intensity: 'medium', tags: ['push', 'vertical'] })

// --- slide-over (B entra deslizando ENCIMA de A desde un borde) ---
T('transitions.slide.over-right', (ctx, p, drawA, drawB) => { const e = eOutCubic(p); drawA(ctx); ctx.save(); ctx.translate(W * (1 - e), 0); drawB(ctx); ctx.restore() }, { weight: 0.95, register: 'editorial', intensity: 'soft', tags: ['slide', 'over'] })
T('transitions.slide.over-up', (ctx, p, drawA, drawB) => { const e = eOutCubic(p); drawA(ctx); ctx.save(); ctx.translate(0, H * (1 - e)); drawB(ctx); ctx.restore() }, { weight: 0.9, register: 'editorial', intensity: 'soft', tags: ['slide', 'over'] })

// --- iris (B se revela por un circulo que crece desde el centro) ---
T('transitions.iris.open', (ctx, p, drawA, drawB) => {
  const e = eOutCubic(p), r = e * Math.hypot(W, H) * 0.55
  drawA(ctx)
  ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.max(0.001, r), 0, TAU); ctx.clip(); drawB(ctx); ctx.restore()
}, { weight: 0.85, register: 'playful', intensity: 'bold', tags: ['iris', 'circulo'] })

// --- bars (B se revela por N franjas horizontales que crecen a la vez) ---
T('transitions.bars.h', (ctx, p, drawA, drawB) => {
  const e = eOutCubic(p), n = 6, bh = H / n
  drawA(ctx)
  ctx.save(); ctx.beginPath(); for (let i = 0; i < n; i++) ctx.rect(0, i * bh, W, bh * e); ctx.clip(); drawB(ctx); ctx.restore()
}, { weight: 0.8, register: 'friendly', intensity: 'bold', tags: ['bars', 'franjas'] })
T('transitions.bars.v', (ctx, p, drawA, drawB) => {
  const e = eOutCubic(p), n = 5, bw = W / n
  drawA(ctx)
  ctx.save(); ctx.beginPath(); for (let i = 0; i < n; i++) ctx.rect(i * bw, 0, bw * e, H); ctx.clip(); drawB(ctx); ctx.restore()
}, { weight: 0.8, register: 'friendly', intensity: 'bold', tags: ['bars', 'franjas'] })

// --- blinds (franjas alternadas: las pares crecen desde arriba, las impares desde abajo) ---
T('transitions.blinds.split', (ctx, p, drawA, drawB) => {
  const e = eOutCubic(p), n = 6, bw = W / n
  drawA(ctx)
  ctx.save(); ctx.beginPath()
  for (let i = 0; i < n; i++) { const h = H * e; ctx.rect(i * bw, i % 2 ? H - h : 0, bw, h) }
  ctx.clip(); drawB(ctx); ctx.restore()
}, { weight: 0.75, register: 'playful', intensity: 'loud', tags: ['blinds', 'persianas'] })

// --- wedge (cuna angular que barre desde el centro, tipo reloj) ---
T('transitions.wedge.clock', (ctx, p, drawA, drawB) => {
  const e = eOutCubic(p)
  drawA(ctx)
  ctx.save(); ctx.beginPath(); ctx.moveTo(W / 2, H / 2)
  ctx.arc(W / 2, H / 2, Math.hypot(W, H), -TAU / 4, -TAU / 4 + TAU * e); ctx.closePath(); ctx.clip(); drawB(ctx); ctx.restore()
}, { weight: 0.7, register: 'playful', intensity: 'loud', tags: ['wedge', 'reloj', 'radial'] })

// --- diagonal wipe ---
T('transitions.wipe.diagonal', (ctx, p, drawA, drawB) => {
  const e = eOutCubic(p), x = W * 2 * e
  drawA(ctx)
  ctx.save(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x, 0); ctx.lineTo(x - W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.clip(); drawB(ctx); ctx.restore()
}, { weight: 0.85, register: 'friendly', intensity: 'bold', tags: ['wipe', 'diagonal'] })

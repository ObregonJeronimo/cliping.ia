// shared · OBJETOS HEROE — biblioteca de dibujantes PROCEDURALES compartida por TODOS los motores
// (urvid premium, y el motor Director en construccion). Contrato de INDEPENDENCIA del proyecto:
//   · CERO imports (ni del motor, ni de libs externas) -> el archivo es portable y testeable solo.
//   · Las 4 funciones que necesita del entorno (drawText / lighten / darken / rgba) se INYECTAN via
//     createHeroObjects(api) -> cada motor pasa las suyas y el dibujo sale IDENTICO al de su motor.
// Los cuerpos de los 16 dibujantes se extrajeron VERBATIM de src/urvid/libs/scenes/premium.js
// (verificado byte-a-byte con tools/premium-hash.mjs antes/despues de la extraccion).
//
// contrato de cada dibujante: fn(ctx, t, sweep, accent, fonts, brand, hp[, env]) centrado en (0,0),
// ~240 de ancho logico. hp = [a,b,c] floats 0..1 del seed -> proporciones/detalles distintos por video.
// sweep = fase 0..1 del barrido especular. env (solo oPhoto) = { getImg, mediaImage }.

export function createHeroObjects(api) {
  const { drawText, lighten, darken, rgba } = api
  // helpers PRIVADOS (copias exactas de los de premium.js; triviales y puros a proposito: la
  // duplicacion de 8 lineas es el precio de no acoplar este archivo a ningun motor).
  const TAU = Math.PI * 2
  const lerp = (a, b, t) => a + (b - a) * t
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
  const eo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
  const win = (t, a, b) => clamp((t - a) / (b - a), 0, 1)
  const caseTxt = (s, mode) => mode === 'upper' ? String(s).toUpperCase() : String(s)
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
  }
  function specSweep(ctx, clipFn, sw, wBand, hSpan, alpha = 0.17) {
    ctx.save(); clipFn()
    ctx.clip()
    const sx = lerp(-hSpan, hSpan, sw)
    const g = ctx.createLinearGradient(sx - wBand, 0, sx + wBand, 0)
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${alpha})`); g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.save(); ctx.rotate(-0.32); ctx.fillStyle = g; ctx.fillRect(-hSpan * 2, -hSpan * 2, hSpan * 4, hSpan * 4); ctx.restore()
    ctx.restore()
  }
  const shadowUnder = (ctx, fn) => { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 15; fn(); ctx.restore() }

  // ---------- LOS 16 DIBUJANTES (verbatim) ----------
  function oCard(ctx, t, sw, ac, fonts, brand, hp) {
    const CW = 220 + hp[0] * 40, CH = CW * (0.6 + hp[1] * 0.06), R = 14 + hp[2] * 8, x = -CW / 2, y = -CH / 2
    shadowUnder(ctx, () => { rr(ctx, x, y, CW, CH, R); ctx.fillStyle = '#0c0d11'; ctx.fill() })
    const body = ctx.createLinearGradient(0, y, 0, y + CH)
    body.addColorStop(0, '#2a2d36'); body.addColorStop(0.45, '#181a20'); body.addColorStop(1, '#0e0f13')
    rr(ctx, x, y, CW, CH, R); ctx.fillStyle = body; ctx.fill()
    specSweep(ctx, () => rr(ctx, x, y, CW, CH, R), sw, 46, CW)
    rr(ctx, x + 0.5, y + 0.5, CW - 1, CH - 1, R)
    const rim = ctx.createLinearGradient(0, y, 0, y + CH)
    rim.addColorStop(0, 'rgba(255,255,255,0.35)'); rim.addColorStop(0.3, 'rgba(255,255,255,0.06)'); rim.addColorStop(1, 'rgba(255,255,255,0.02)')
    ctx.strokeStyle = rim; ctx.lineWidth = 1; ctx.stroke()
    const chx = x + 22, chy = y + CH * 0.34
    rr(ctx, chx, chy, 32, 24, 5)
    const chg = ctx.createLinearGradient(0, chy, 0, chy + 24)
    chg.addColorStop(0, lighten(ac, 0.18)); chg.addColorStop(1, darken(ac, 0.1))
    ctx.fillStyle = chg; ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round'
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(chx + 52, chy + 12, 4 + i * 4, -0.6, 0.6); ctx.stroke() }
    drawText(ctx, caseTxt(brand || 'MARCA', 'upper'), x + 22, y + 26, { size: 15, weight: 800, family: fonts.display, align: 'left', maxW: CW - 44, color: 'rgba(255,255,255,0.92)', tracking: 3 })
    drawText(ctx, '••••  ••••  4021', x + 22, y + CH - 26, { size: 10, weight: 400, family: fonts.num || fonts.accent, align: 'left', maxW: CW - 44, color: 'rgba(255,255,255,0.5)' })
  }
  function oWindow(ctx, t, sw, ac, fonts, brand, hp) {
    const CW = 230 + hp[0] * 30, CH = CW * 0.68, x = -CW / 2, y = -CH / 2
    shadowUnder(ctx, () => { rr(ctx, x, y, CW, CH, 13); ctx.fillStyle = '#101117'; ctx.fill() })
    rr(ctx, x, y, CW, CH, 13); ctx.fillStyle = '#14161d'; ctx.fill()
    rr(ctx, x + 0.5, y + 0.5, CW - 1, CH - 1, 12.5); ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1; ctx.stroke()
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 2 ? ac : 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(x + 16 + i * 13, y + 15, 3.2, 0, TAU); ctx.fill() }
    ctx.fillStyle = 'rgba(255,255,255,0.09)'
    rr(ctx, x + 16, y + 34, CW * 0.52, 9, 4.5); ctx.fill()
    rr(ctx, x + 16, y + 52, CW * 0.36, 9, 4.5); ctx.fill()
    const nB = 3 + Math.round(hp[1] * 2)
    for (let i = 0; i < nB; i++) {
      const bhv = (0.35 + ((i * 2654435761 >>> 8) % 100) / 160) * (CH * 0.4)
      const bh = bhv * eo(win(t, 0.4 + i * 0.1, 1.1 + i * 0.1))
      ctx.fillStyle = i === nB - 1 ? ac : 'rgba(255,255,255,0.2)'
      const bw = (CW - 44) / nB - 10
      rr(ctx, x + 20 + i * ((CW - 44) / nB), y + CH - 16 - bh, bw, bh, 3.5); ctx.fill()
    }
    specSweep(ctx, () => rr(ctx, x, y, CW, CH, 13), sw, 40, CW, 0.1)
  }
  function oPlate(ctx, t, sw, ac, fonts, brand, hp) {
    const RX = 108 + hp[0] * 22, RY = RX * 0.34
    shadowUnder(ctx, () => { ctx.fillStyle = '#14151a'; ctx.beginPath(); ctx.ellipse(0, 10, RX, RY, 0, 0, TAU); ctx.fill() })
    const g = ctx.createRadialGradient(0, -6, 10, 0, 0, RX)
    g.addColorStop(0, '#23252c'); g.addColorStop(0.72, '#181a20'); g.addColorStop(1, '#101116')
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, RX, RY, 0, 0, TAU); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.ellipse(0, -3, RX * 0.85, RY * 0.8, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke()
    ctx.fillStyle = ac; ctx.beginPath(); ctx.ellipse(0, -6, RX * 0.29, RY * 0.3, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(-8, -9, RX * 0.1, 4, -0.4, 0, TAU); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.lineCap = 'round'
    const nV = 2 + Math.round(hp[1])
    for (let i = 0; i < nV; i++) {
      const ph = t * 1.1 + i * 2.1, xx = -26 + i * (52 / Math.max(1, nV - 1))
      ctx.save(); ctx.globalAlpha = 0.35 + 0.15 * Math.sin(ph * 2)
      ctx.beginPath()
      for (let k = 0; k <= 8; k++) { const yy = -26 - k * 9, dx = Math.sin(ph + k * 0.7) * (5 + hp[2] * 5); k === 0 ? ctx.moveTo(xx + dx, yy) : ctx.lineTo(xx + dx, yy) }
      ctx.stroke(); ctx.restore()
    }
  }
  function oCup(ctx, t, sw, ac, fonts, brand, hp) {
    const CW = 92 + hp[0] * 22, CH = CW * 1.14, x = -CW / 2, y = -CH / 2
    shadowUnder(ctx, () => { rr(ctx, x, y, CW, CH, 12); ctx.fillStyle = '#12131a'; ctx.fill() })
    const g = ctx.createLinearGradient(x, 0, x + CW, 0)
    g.addColorStop(0, '#22242c'); g.addColorStop(0.5, '#181a21'); g.addColorStop(1, '#111318')
    rr(ctx, x, y, CW, CH, 12); ctx.fillStyle = g; ctx.fill()
    rr(ctx, x - 3, y + 10, CW + 6, 15, 7); ctx.fillStyle = darken(ac, 0.05); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 6; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.arc(x + CW + 12, 4, 20, -1.2, 1.2); ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2
    for (let i = 0; i < 2; i++) {
      const ph = t * 1.2 + i * 2.4
      ctx.save(); ctx.globalAlpha = 0.4
      ctx.beginPath()
      for (let k = 0; k <= 7; k++) { const yy = y - 8 - k * 8, dx = Math.sin(ph + k * 0.8) * 6; k === 0 ? ctx.moveTo(-10 + i * 22 + dx, yy) : ctx.lineTo(-10 + i * 22 + dx, yy) }
      ctx.stroke(); ctx.restore()
    }
    specSweep(ctx, () => rr(ctx, x, y, CW, CH, 12), sw, 26, CW, 0.14)
  }
  function oBottle(ctx, t, sw, ac, fonts, brand, hp) {
    const BW = 92 + hp[0] * 26, BH = BW * (1.35 + hp[1] * 0.25), x = -BW / 2, y = -BH / 2 + 12
    shadowUnder(ctx, () => { rr(ctx, x, y, BW, BH, 16 + hp[2] * 14); ctx.fillStyle = '#12131a'; ctx.fill() })
    const g = ctx.createLinearGradient(x, 0, x + BW, 0)
    g.addColorStop(0, '#20222b'); g.addColorStop(0.5, '#171922'); g.addColorStop(1, '#101218')
    rr(ctx, x, y, BW, BH, 16 + hp[2] * 14); ctx.fillStyle = g; ctx.fill()
    const capW = BW * 0.38
    rr(ctx, -capW / 2, y - 32, capW, 30, 6)
    const cap = ctx.createLinearGradient(0, y - 32, 0, y - 2)
    cap.addColorStop(0, lighten(ac, 0.15)); cap.addColorStop(1, darken(ac, 0.12))
    ctx.fillStyle = cap; ctx.fill()
    specSweep(ctx, () => rr(ctx, x, y, BW, BH, 16 + hp[2] * 14), sw, 24, BW, 0.2)
    rr(ctx, x + 0.5, y + 0.5, BW - 1, BH - 1, 15.5 + hp[2] * 14); ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1; ctx.stroke()
    ctx.fillStyle = rgba(ac, 0.9); ctx.fillRect(-BW * 0.25, y + BH * 0.42, BW * 0.5, 2.5)
    drawText(ctx, caseTxt(brand || 'MARCA', 'upper'), 0, y + BH * 0.56, { size: 11, weight: 700, family: fonts.display, maxW: BW * 0.8, color: 'rgba(255,255,255,0.7)', tracking: 2 })
  }
  function oTicket(ctx, t, sw, ac, fonts, brand, hp) {
    const TW = 220 + hp[0] * 30, TH = TW * 0.5, x = -TW / 2, y = -TH / 2
    ctx.save(); ctx.rotate(-0.06 + hp[1] * 0.05)
    shadowUnder(ctx, () => { rr(ctx, x, y, TW, TH, 13); ctx.fillStyle = '#12131a'; ctx.fill() })
    const g = ctx.createLinearGradient(0, y, 0, y + TH)
    g.addColorStop(0, '#1e2029'); g.addColorStop(1, '#12141b')
    rr(ctx, x, y, TW, TH, 13); ctx.fillStyle = g; ctx.fill()
    const div = x + TW * 0.68
    ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.4
    ctx.beginPath(); ctx.moveTo(div, y); ctx.lineTo(div, y + TH); ctx.stroke(); ctx.setLineDash([])
    drawText(ctx, caseTxt(brand || 'EVENTO', 'upper'), x + 18, y + TH * 0.32, { size: 17, weight: 800, family: fonts.display, align: 'left', maxW: TW * 0.56, color: '#f2f0ea', tracking: 2 })
    drawText(ctx, 'ADMIT ONE', x + 18, y + TH * 0.6, { size: 9, weight: 600, family: fonts.num || fonts.accent, align: 'left', maxW: TW * 0.5, color: 'rgba(242,240,234,0.5)', tracking: 3 })
    ctx.fillStyle = ac; ctx.fillRect(x + 18, y + TH * 0.74, TW * 0.3, 2.5)
    for (let i = 0; i < 8; i++) { ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fillRect(div + 10 + i * 6, y + TH * 0.24, i % 3 === 0 ? 3 : 1.5, TH * 0.52) }
    rr(ctx, x + 0.5, y + 0.5, TW - 1, TH - 1, 12.5); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke()
    ctx.restore()
  }
  function oDumbbell(ctx, t, sw, ac, fonts, brand, hp) {
    const L = 190 + hp[0] * 40, ph2 = 34 + hp[1] * 14
    ctx.save(); ctx.rotate(-0.16)
    shadowUnder(ctx, () => { rr(ctx, -L / 2, -7, L, 14, 7); ctx.fillStyle = '#101116'; ctx.fill() })
    const bar = ctx.createLinearGradient(0, -7, 0, 7)
    bar.addColorStop(0, '#3a3d47'); bar.addColorStop(0.5, '#20222a'); bar.addColorStop(1, '#14161c')
    rr(ctx, -L / 2, -7, L, 14, 7); ctx.fillStyle = bar; ctx.fill()
    for (const s of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const px = s * (L / 2 - 18 - i * 24)
        const g = ctx.createLinearGradient(0, -ph2, 0, ph2)
        g.addColorStop(0, i === 0 ? lighten(ac, 0.08) : '#262933'); g.addColorStop(1, i === 0 ? darken(ac, 0.14) : '#14161c')
        rr(ctx, px - 9, -ph2, 18, ph2 * 2, 8); ctx.fillStyle = g; ctx.fill()
        rr(ctx, px - 9 + 0.5, -ph2 + 0.5, 17, ph2 * 2 - 1, 7.5); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke()
      }
    }
    ctx.restore()
  }
  function oRing(ctx, t, sw, ac, fonts, brand, hp) {
    const R = 86 + hp[0] * 20
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 13 + hp[1] * 5
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke()
    const p = 0.62 + hp[2] * 0.3
    const prog = eo(win(t, 0.35, 1.6)) * p
    const g = ctx.createLinearGradient(-R, 0, R, 0)
    g.addColorStop(0, darken(ac, 0.08)); g.addColorStop(1, lighten(ac, 0.12))
    ctx.strokeStyle = g; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 + TAU * prog); ctx.stroke()
    drawText(ctx, Math.round(prog * 100) + '%', 0, 2, { size: R * 0.52, weight: 900, family: fonts.display, color: '#f2f0ea', maxW: R * 1.4 })
    ctx.restore()
  }
  function oHouse(ctx, t, sw, ac, fonts, brand, hp) {
    const S = 190 + hp[0] * 30
    ctx.save()
    shadowUnder(ctx, () => { rr(ctx, -S / 2, -S * 0.1, S, S * 0.52, 10); ctx.fillStyle = '#101116'; ctx.fill() })
    const body = ctx.createLinearGradient(0, -S * 0.1, 0, S * 0.42)
    body.addColorStop(0, '#22242d'); body.addColorStop(1, '#13151b')
    rr(ctx, -S / 2, -S * 0.1, S, S * 0.52, 10); ctx.fillStyle = body; ctx.fill()
    ctx.beginPath(); ctx.moveTo(-S * 0.58, -S * 0.08); ctx.lineTo(0, -S * 0.42); ctx.lineTo(S * 0.58, -S * 0.08); ctx.closePath()
    const roof = ctx.createLinearGradient(0, -S * 0.42, 0, -S * 0.08)
    roof.addColorStop(0, '#2c2f3a'); roof.addColorStop(1, '#191b23')
    ctx.fillStyle = roof; ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.4
    ctx.beginPath(); ctx.moveTo(-S * 0.58, -S * 0.08); ctx.lineTo(0, -S * 0.42); ctx.lineTo(S * 0.58, -S * 0.08); ctx.stroke()
    rr(ctx, -S * 0.09, S * 0.1, S * 0.18, S * 0.32, 5)
    const door = ctx.createLinearGradient(0, S * 0.1, 0, S * 0.42)
    door.addColorStop(0, lighten(ac, 0.1)); door.addColorStop(1, darken(ac, 0.12))
    ctx.fillStyle = door; ctx.fill()
    ctx.fillStyle = 'rgba(255,255,240,0.75)'
    const wg = eo(win(t, 0.6, 1.3))
    for (const s of [-1, 1]) { ctx.save(); ctx.globalAlpha = 0.15 + 0.6 * wg; rr(ctx, s * S * 0.3 - S * 0.07, S * 0.14, S * 0.14, S * 0.14, 4); ctx.fill(); ctx.restore() }
    ctx.restore()
  }
  function oBook(ctx, t, sw, ac, fonts, brand, hp) {
    const BW = 170 + hp[0] * 30, BH = BW * 1.32, x = -BW / 2, y = -BH / 2
    ctx.save(); ctx.rotate(-0.05)
    shadowUnder(ctx, () => { rr(ctx, x, y, BW, BH, 8); ctx.fillStyle = '#101116'; ctx.fill() })
    const g = ctx.createLinearGradient(x, 0, x + BW, 0)
    g.addColorStop(0, '#262932'); g.addColorStop(0.12, '#1b1d25'); g.addColorStop(1, '#12141b')
    rr(ctx, x, y, BW, BH, 8); ctx.fillStyle = g; ctx.fill()
    ctx.fillStyle = rgba(ac, 0.95); ctx.fillRect(x, y, 10, BH)
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x + BW - 7, y + 6, 3, BH - 12)
    drawText(ctx, caseTxt(brand || 'MARCA', 'upper'), x + BW * 0.55, y + BH * 0.3, { size: 17, weight: 800, family: fonts.display, maxW: BW * 0.68, color: '#f2f0ea', tracking: 2 })
    ctx.fillStyle = rgba(ac, 0.9); ctx.fillRect(x + BW * 0.3, y + BH * 0.42, BW * 0.5, 2.5)
    drawText(ctx, 'VOL. ' + (1 + Math.round(hp[1] * 8)), x + BW * 0.55, y + BH * 0.78, { size: 10, weight: 600, family: fonts.num || fonts.accent, maxW: BW * 0.6, color: 'rgba(242,240,234,0.5)', tracking: 3 })
    specSweep(ctx, () => rr(ctx, x, y, BW, BH, 8), sw, 30, BW, 0.12)
    ctx.restore()
  }
  function oCapsule(ctx, t, sw, ac, fonts, brand, hp) {
    const L = 150 + hp[0] * 30, R = 34 + hp[1] * 8
    ctx.save(); ctx.rotate(-0.5)
    shadowUnder(ctx, () => { rr(ctx, -L / 2, -R, L, R * 2, R); ctx.fillStyle = '#101116'; ctx.fill() })
    ctx.save(); rr(ctx, -L / 2, -R, L, R * 2, R); ctx.clip()
    const g1 = ctx.createLinearGradient(0, -R, 0, R)
    g1.addColorStop(0, '#262932'); g1.addColorStop(1, '#14161d')
    ctx.fillStyle = g1; ctx.fillRect(-L / 2, -R, L / 2, R * 2)
    const g2 = ctx.createLinearGradient(0, -R, 0, R)
    g2.addColorStop(0, lighten(ac, 0.14)); g2.addColorStop(1, darken(ac, 0.1))
    ctx.fillStyle = g2; ctx.fillRect(0, -R, L / 2, R * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.ellipse(-L * 0.26, -R * 0.45, L * 0.16, R * 0.22, 0.1, 0, TAU); ctx.fill()
    ctx.restore()
    rr(ctx, -L / 2 + 0.5, -R + 0.5, L - 1, R * 2 - 1, R - 0.5); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.stroke()
    ctx.restore()
  }
  function oBag(ctx, t, sw, ac, fonts, brand, hp) {
    const BW = 160 + hp[0] * 30, BH = BW * 1.2, x = -BW / 2, y = -BH / 2 + 14
    shadowUnder(ctx, () => { rr(ctx, x, y, BW, BH, 6); ctx.fillStyle = '#101116'; ctx.fill() })
    const g = ctx.createLinearGradient(x, 0, x + BW, 0)
    g.addColorStop(0, '#22242d'); g.addColorStop(0.5, '#17191f'); g.addColorStop(1, '#101218')
    rr(ctx, x, y, BW, BH, 6); ctx.fillStyle = g; ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 5; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.arc(0, y + 4, BW * 0.26, Math.PI, 0); ctx.stroke()
    ctx.fillStyle = rgba(ac, 0.95); ctx.fillRect(x, y + BH * 0.62, BW, 3)
    drawText(ctx, caseTxt(brand || 'MARCA', 'upper'), 0, y + BH * 0.4, { size: 16, weight: 800, family: fonts.display, maxW: BW * 0.8, color: '#f2f0ea', tracking: 4 })
    specSweep(ctx, () => rr(ctx, x, y, BW, BH, 6), sw, 30, BW, 0.13)
  }
  function oTag(ctx, t, sw, ac, fonts, brand, hp) {
    const TW = 190 + hp[0] * 30, TH = TW * 0.46, x = -TW / 2, y = -TH / 2
    ctx.save(); ctx.rotate(0.10 - hp[1] * 0.2)
    shadowUnder(ctx, () => {
      ctx.beginPath(); ctx.moveTo(x + 26, y); ctx.lineTo(x + TW, y); ctx.arcTo(x + TW + 10, y + TH / 2, x + TW, y + TH, 12); ctx.lineTo(x + 26, y + TH); ctx.lineTo(x, y + TH / 2); ctx.closePath(); ctx.fillStyle = '#101116'; ctx.fill()
    })
    ctx.beginPath(); ctx.moveTo(x + 26, y); ctx.lineTo(x + TW, y); ctx.arcTo(x + TW + 10, y + TH / 2, x + TW, y + TH, 12); ctx.lineTo(x + 26, y + TH); ctx.lineTo(x, y + TH / 2); ctx.closePath()
    const g = ctx.createLinearGradient(0, y, 0, y + TH)
    g.addColorStop(0, '#22242d'); g.addColorStop(1, '#14161d')
    ctx.fillStyle = g; ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1; ctx.stroke()
    ctx.fillStyle = rgba(ac, 0.95); ctx.beginPath(); ctx.arc(x + 15, y + TH / 2, 5, 0, TAU); ctx.fill()
    drawText(ctx, caseTxt(brand || 'MARCA', 'upper'), x + 34, y + TH * 0.38, { size: 15, weight: 800, family: fonts.display, align: 'left', maxW: TW - 60, color: '#f2f0ea', tracking: 3 })
    drawText(ctx, 'NUEVA TEMPORADA', x + 34, y + TH * 0.72, { size: 8.5, weight: 600, family: fonts.num || fonts.accent, align: 'left', maxW: TW - 60, color: 'rgba(242,240,234,0.5)', tracking: 2 })
    ctx.restore()
  }
  function oChart(ctx, t, sw, ac, fonts, brand, hp) {
    const S = 200 + hp[0] * 30
    ctx.save()
    shadowUnder(ctx, () => { rr(ctx, -S / 2, -S * 0.36, S, S * 0.72, 14); ctx.fillStyle = '#101117'; ctx.fill() })
    rr(ctx, -S / 2, -S * 0.36, S, S * 0.72, 14); ctx.fillStyle = '#14161d'; ctx.fill()
    rr(ctx, -S / 2 + 0.5, -S * 0.36 + 0.5, S - 1, S * 0.72 - 1, 13.5); ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1; ctx.stroke()
    const p = eo(win(t, 0.4, 1.5))
    const pts = [[-0.38, 0.2], [-0.18, 0.05], [0.0, 0.12], [0.16, -0.1], [0.38, -0.24]]
    ctx.strokeStyle = ac; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath()
    const nSeg = Math.max(1, Math.floor(p * (pts.length - 1) * 100) / 100)
    for (let i = 0; i <= Math.min(pts.length - 1, Math.ceil(nSeg)); i++) {
      let [px, py] = pts[i]
      if (i > nSeg) { const f = nSeg - Math.floor(nSeg); const [ax, ay] = pts[i - 1]; px = lerp(ax, px, f); py = lerp(ay, py, f) }
      i === 0 ? ctx.moveTo(px * S, py * S) : ctx.lineTo(px * S, py * S)
    }
    ctx.stroke()
    const last = pts[pts.length - 1]
    if (p >= 1) { ctx.fillStyle = ac; ctx.beginPath(); ctx.arc(last[0] * S, last[1] * S, 6 + Math.sin(t * 3) * 1.4, 0, TAU); ctx.fill() }
    drawText(ctx, '+ ' + (18 + Math.round(hp[1] * 60)) + '%', S * 0.24, -S * 0.26, { size: 22, weight: 900, family: fonts.display, color: '#f2f0ea', maxW: S * 0.5 })
    ctx.restore()
  }
  function oShield(ctx, t, sw, ac, fonts, brand, hp) {
    const S = 108 + hp[0] * 22
    ctx.save()
    shadowUnder(ctx, () => {
      ctx.beginPath(); ctx.moveTo(0, -S); ctx.lineTo(S * 0.82, -S * 0.6); ctx.lineTo(S * 0.7, S * 0.35); ctx.lineTo(0, S); ctx.lineTo(-S * 0.7, S * 0.35); ctx.lineTo(-S * 0.82, -S * 0.6); ctx.closePath(); ctx.fillStyle = '#101116'; ctx.fill()
    })
    ctx.beginPath(); ctx.moveTo(0, -S); ctx.lineTo(S * 0.82, -S * 0.6); ctx.lineTo(S * 0.7, S * 0.35); ctx.lineTo(0, S); ctx.lineTo(-S * 0.7, S * 0.35); ctx.lineTo(-S * 0.82, -S * 0.6); ctx.closePath()
    const g = ctx.createLinearGradient(0, -S, 0, S)
    g.addColorStop(0, '#262932'); g.addColorStop(1, '#13151b')
    ctx.fillStyle = g; ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.4; ctx.stroke()
    const tp = eo(win(t, 0.5, 1.2))
    ctx.strokeStyle = ac; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath()
    const seg = [[-S * 0.3, 0], [-S * 0.06, S * 0.26], [S * 0.36, -S * 0.3]]
    const tot = 2, cur = tp * tot
    ctx.moveTo(seg[0][0], seg[0][1])
    if (cur > 0) { const f = Math.min(1, cur); ctx.lineTo(lerp(seg[0][0], seg[1][0], f), lerp(seg[0][1], seg[1][1], f)) }
    if (cur > 1) { const f = Math.min(1, cur - 1); ctx.lineTo(lerp(seg[1][0], seg[2][0], f), lerp(seg[1][1], seg[2][1], f)) }
    ctx.stroke()
    ctx.restore()
  }
  function oPhoto(ctx, t, sw, ac, fonts, brand, hp, env) {
    const img = env && env.getImg && env.mediaImage ? env.getImg(env.mediaImage) : null
    if (!img) { oCard(ctx, t, sw, ac, fonts, brand, hp); return }
    const PW = 210 + hp[0] * 40, PH = PW * (1.1 + hp[1] * 0.25), x = -PW / 2, y = -PH / 2
    ctx.save(); ctx.rotate(-0.04 + hp[2] * 0.08)
    shadowUnder(ctx, () => { rr(ctx, x - 8, y - 8, PW + 16, PH + 16, 10); ctx.fillStyle = '#0e0f13'; ctx.fill() })
    rr(ctx, x - 8, y - 8, PW + 16, PH + 16, 10); ctx.fillStyle = '#14151b'; ctx.fill()
    ctx.save(); rr(ctx, x, y, PW, PH, 4); ctx.clip()
    const iw = img.width, ih = img.height, sc = Math.max(PW / iw, PH / ih)
    ctx.drawImage(img, (iw - PW / sc) / 2, (ih - PH / sc) / 2, PW / sc, PH / sc, x, y, PW, PH)
    const dk = ctx.createLinearGradient(0, y, 0, y + PH)
    dk.addColorStop(0, 'rgba(0,0,0,0)'); dk.addColorStop(1, 'rgba(0,0,0,0.35)')
    ctx.fillStyle = dk; ctx.fillRect(x, y, PW, PH)
    ctx.restore()
    specSweep(ctx, () => rr(ctx, x - 8, y - 8, PW + 16, PH + 16, 10), sw, 40, PW, 0.14)
    rr(ctx, x - 7.5, y - 7.5, PW + 15, PH + 15, 9.5); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.stroke()
    ctx.fillStyle = rgba(ac, 0.95); ctx.fillRect(x, y + PH + 12, PW * 0.34, 2.5)
    ctx.restore()
  }

  // pools POR RUBRO: 6 objetos con SILUETAS diversas por rubro (panel / redondo / diagonal / iconico)
  // -> el selector del motor elige adentro con un float del seed, y hp varia las proporciones.
  const POOLS = {
    finanzas: [oCard, oChart, oShield, oRing, oHouse, oCapsule],
    tech: [oWindow, oChart, oShield, oRing, oCard, oCapsule],
    default: [oShield, oRing, oChart, oWindow, oTicket, oBook],
    educacion: [oBook, oShield, oWindow, oRing, oTicket, oCup],
    gastronomia: [oPlate, oCup, oTicket, oTag, oBag, oRing],
    belleza: [oBottle, oTag, oCapsule, oRing, oBag, oCup],
    moda: [oBag, oTag, oBottle, oTicket, oRing, oShield],
    salud: [oCapsule, oShield, oRing, oBottle, oBook, oWindow],
    eventos: [oTicket, oCup, oBag, oRing, oTag, oShield],
    fitness: [oDumbbell, oRing, oShield, oWindow, oCapsule, oChart],
    inmobiliaria: [oHouse, oCard, oShield, oChart, oWindow, oRing],
  }

  // catalogo por NOMBRE (para el motor Director: las capas referencian el objeto por string)
  const byName = {
    card: oCard, window: oWindow, plate: oPlate, cup: oCup, bottle: oBottle, ticket: oTicket,
    dumbbell: oDumbbell, ring: oRing, house: oHouse, book: oBook, capsule: oCapsule, bag: oBag,
    tag: oTag, chart: oChart, shield: oShield, photo: oPhoto,
  }
  return { pools: POOLS, byName, names: Object.keys(byName) }
}

// Marca de agua "URVID PREVIEW" para el PREVIEW EN VIVO del estudio (anti screen-record). Se dibuja en el canvas
// visible DESPUES de drawFrame. NO se usa en el export/descarga (exportVideo.js dibuja un canvas OFFSCREEN sin esto)
// -> el video pago/descargado sale LIMPIO. Puro dibujo 2D (sin assets externos ni red) -> no toca el motor ni las gates.
// Es un DETERRENTE (una grabacion de pantalla queda estampada); no es proteccion criptografica.
export function drawWatermark(ctx, W, H) {
  const fs = Math.max(12, Math.round(W * 0.028))                 // "URVID"
  const fs2 = Math.round(fs * 0.72)                              // "PREVIEW"
  const icon = Math.round(fs * 1.15)
  const gap = Math.round(fs * 0.4)
  const padX = Math.round(fs * 0.62), padY = Math.round(fs * 0.5)
  const FA = `800 ${fs}px system-ui, -apple-system, Segoe UI, sans-serif`
  const FB = `600 ${fs2}px system-ui, -apple-system, Segoe UI, sans-serif`
  ctx.save()
  ctx.textBaseline = 'middle'
  ctx.font = FA; const wA = ctx.measureText('URVID').width
  ctx.font = FB; const wB = ctx.measureText('PREVIEW').width
  const pillW = icon + gap + wA + gap * 0.55 + wB + padX * 2
  const pillH = Math.max(icon, fs) + padY * 2
  const margin = Math.round(W * 0.045)
  const x = margin, y = H - margin - pillH
  // pill translucido (contrasta sobre fondos claros Y oscuros) + borde tenue
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x, y, pillW, pillH, pillH / 2)
  else ctx.rect(x, y, pillW, pillH)
  ctx.fillStyle = 'rgba(8,8,12,0.44)'; ctx.fill()
  ctx.lineWidth = Math.max(1, W * 0.0016); ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.stroke()
  // icono: cuadrado redondeado (acento urvid) + triangulo de play
  const ix = x + padX, iy = y + (pillH - icon) / 2
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(ix, iy, icon, icon, icon * 0.28)
  else ctx.rect(ix, iy, icon, icon)
  ctx.fillStyle = '#7c5cff'; ctx.fill()
  ctx.beginPath()
  const px = ix + icon * 0.42, py = iy + icon * 0.5, ps = icon * 0.24
  ctx.moveTo(px - ps * 0.5, py - ps); ctx.lineTo(px + ps, py); ctx.lineTo(px - ps * 0.5, py + ps); ctx.closePath()
  ctx.fillStyle = '#fff'; ctx.fill()
  // texto: "URVID" fuerte + "PREVIEW" atenuado
  const ty = y + pillH / 2 + fs * 0.02
  let tx = ix + icon + gap
  ctx.fillStyle = 'rgba(255,255,255,0.97)'; ctx.font = FA; ctx.fillText('URVID', tx, ty)
  tx += wA + gap * 0.55
  ctx.fillStyle = 'rgba(255,255,255,0.60)'; ctx.font = FB; ctx.fillText('PREVIEW', tx, ty)
  ctx.restore()
}

// DIBUJO de la timeline — separado del componente React a proposito: es todo canvas 2D puro, no
// necesita DOM, y asi se puede renderizar en Node (@napi-rs/canvas) para revisar el panel sin abrir
// el browser. Timeline.jsx solo aporta el marco, el scroll y los eventos.
//
// Convenciones de lectura (las de After Effects): regla de segundos arriba, una fila por capa ordenada
// por z, la barra = la VIDA de la capa (life[t0,t1]), un rombo por keyframe y banderitas para los
// markers (inicio de escena y receta del corte).

export const GUT = 96        // canal de etiquetas: se dibuja pegado al borde izquierdo aunque se scrollee
// la regla lleva TRES renglones (escena / receta del corte / segundos). Con menos alto se pisaban
// entre si: el nombre del corte quedaba encima de los numeros y no se leia ninguno de los dos.
export const RULER = 40
export const ROW = 18        // alto de fila
export const PADT = 6

// color por kind: leer la timeline de un vistazo (que es texto, que es objeto, que es foto)
export const COL_KIND = {
  text: '#6f8cff', heroObj: '#f0a23c', photo: '#3fbfa4', shape: '#8b6cf5',
  badge: '#e0533b', stepper: '#2b9bc9', priceTag: '#d0417a', logoRow: '#a06cf0', plate: '#4a4a60',
}

// etiqueta de fila. Los ids del compilador son `escena:capa` (o `flash:escena`) y en 96px no entran
// enteros. Se muestra "s3·brand": sin el numero de escena, las cinco filas 'brand' de un video eran
// indistinguibles entre si y no se sabia cual se estaba editando.
export const corto = (id) => {
  const s = String(id)
  if (s.indexOf('flash:') === 0) { const n = /^s(\d+)/.exec(s.slice(6)); return 'flash' + (n ? ' s' + n[1] : '') }
  const i = s.indexOf(':')
  if (i < 0) return s
  const n = /^s(\d+)_/.exec(s.slice(0, i))
  return (n ? 's' + n[1] + '·' : '') + s.slice(i + 1)
}
// mismo orden estable que usa el renderer (z y despues id)
export const capasDe = (tl) => (tl ? tl.layers.slice().sort((a, b) => a.z - b.z || a.id.localeCompare(b.id)) : [])
// union de los tiempos de key de TODOS los tracks de una capa: el rombo marca "aca pasa algo", sin
// importar si lo que cambia es x, alpha o scale.
export function keysPorCapa(tl) {
  const m = new Map()
  if (!tl) return m
  for (const tr of tl.tracks) {
    let s = m.get(tr.layer)
    if (!s) { s = new Set(); m.set(tr.layer, s) }
    for (const k of tr.keys) s.add(Math.round(k.t * 1000) / 1000)
  }
  return m
}
export const altoDe = (n) => RULER + PADT * 2 + n * ROW
export const anchoDe = (dur, zoom) => GUT + dur * zoom + 24
// fila que cae en una coordenada Y del CONTENIDO (la usa el click del componente)
export const filaEn = (capas, y) => { const i = Math.floor((y - RULER - PADT) / ROW); return i >= 0 && i < capas.length ? capas[i] : null }

// dibujarTimeline(ctx, o) — o: { tl, head, selected, zoom, cssW, cssH, sx, sy, capas, keys }
// sx/sy son el scroll del contenedor: la regla y el canal de etiquetas se dibujan AHI para quedar
// pegados (con 30 capas, perder la regla o los nombres al scrollear vuelve inutil el panel).
export function dibujarTimeline(ctx, o) {
  const { tl, head, selected, zoom, cssW, cssH } = o
  const capas = o.capas || capasDe(tl)
  const keys = o.keys || keysPorCapa(tl)
  const sx = Math.max(0, o.sx || 0), sy = Math.max(0, o.sy || 0)
  const dur = Math.max(0.1, tl.dur || 1)
  const X = t => GUT + t * zoom
  const y0 = RULER + PADT

  ctx.clearRect(0, 0, cssW, cssH)
  ctx.fillStyle = '#0d0d14'; ctx.fillRect(0, 0, cssW, cssH)

  // --- filas (cebrado tenue + resalte de la seleccionada)
  capas.forEach((l, i) => {
    const y = y0 + i * ROW
    if (l.id === selected) { ctx.fillStyle = 'rgba(124,92,255,0.16)'; ctx.fillRect(0, y, cssW, ROW) }
    else if (i % 2) { ctx.fillStyle = 'rgba(255,255,255,0.018)'; ctx.fillRect(0, y, cssW, ROW) }
  })

  // --- separadores de escena: la linea vertical que dice "aca hay un corte"
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1
  for (const e of tl.escenas) {
    const x = Math.round(X(e.t0)) + 0.5
    ctx.beginPath(); ctx.moveTo(x, RULER); ctx.lineTo(x, cssH); ctx.stroke()
  }

  // --- barras de vida + rombos de keyframe
  capas.forEach((l, i) => {
    const y = y0 + i * ROW
    const a = X(Math.max(0, l.life[0])), b = X(Math.min(dur, l.life[1]))
    const w = Math.max(3, b - a)
    const sel = l.id === selected
    ctx.globalAlpha = sel ? 1 : 0.78
    ctx.fillStyle = COL_KIND[l.kind] || '#6b7186'
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(a, y + 3, w, ROW - 7, 3)
    else ctx.rect(a, y + 3, w, ROW - 7)
    ctx.fill()
    ctx.globalAlpha = 1
    if (sel) { ctx.strokeStyle = '#e8e9f2'; ctx.lineWidth = 1; ctx.stroke() }
    const ks = keys.get(l.id)
    if (!ks) return
    const cy = y + ROW / 2
    for (const t of ks) {
      const x = X(t)
      if (x < a - 4 || x > b + 4) continue
      ctx.save(); ctx.translate(x, cy); ctx.rotate(Math.PI / 4)
      ctx.fillStyle = '#0d0d14'; ctx.fillRect(-3.4, -3.4, 6.8, 6.8)      // borde: separa rombos pegados
      ctx.fillStyle = sel ? '#ffffff' : 'rgba(240,240,250,0.88)'; ctx.fillRect(-2.4, -2.4, 4.8, 4.8)
      ctx.restore()
    }
  })

  // --- REGLA: marcas cada 0.5s y numeros en los segundos enteros (cada 2s si el zoom es chico).
  // Va DESPUES de las pistas y a la altura del scroll: tapa las filas de arriba y queda siempre visible.
  ctx.fillStyle = '#11111a'; ctx.fillRect(0, sy, cssW, RULER)
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.moveTo(0, sy + RULER - 0.5); ctx.lineTo(cssW, sy + RULER - 0.5); ctx.stroke()
  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.textBaseline = 'alphabetic'
  const paso = zoom >= 44 ? 1 : 2
  for (let t = 0; t <= dur + 1e-6; t += 0.5) {
    const x = Math.round(X(t)) + 0.5
    const entero = Math.abs(t - Math.round(t)) < 1e-6
    ctx.strokeStyle = entero ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)'
    ctx.beginPath(); ctx.moveTo(x, sy + RULER - (entero ? 6 : 3)); ctx.lineTo(x, sy + RULER); ctx.stroke()
    if (entero && Math.round(t) % paso === 0) { ctx.fillStyle = '#6b7186'; ctx.fillText(Math.round(t) + 's', x + 3, sy + RULER - 8) }
  }

  // --- MARKERS: escena en el 1er renglon (acento) y receta del corte en el 2do (atenuada). El
  // compilador emite los dos en el MISMO t: la banderita la dibuja solo el de escena (marcar el mismo
  // instante dos veces es ruido) y la etiqueta que pisaria a la anterior se saltea.
  let finEsc = -1e9, finLink = -1e9
  for (const m of tl.markers) {
    const x = X(m.t)
    const link = String(m.label).indexOf('↦') === 0
    if (!link) {
      ctx.fillStyle = '#c9b6ff'
      ctx.beginPath(); ctx.moveTo(x, sy + 2); ctx.lineTo(x + 5, sy + 5); ctx.lineTo(x, sy + 8); ctx.closePath(); ctx.fill()
    }
    const txt = link ? m.label.slice(1).trim() : m.label
    const w = ctx.measureText(txt).width
    if (link) { if (x + 7 < finLink) continue; finLink = x + 9 + w } else { if (x + 7 < finEsc) continue; finEsc = x + 9 + w }
    ctx.fillStyle = link ? '#6b7186' : '#a58cf5'
    ctx.fillText(txt, x + 7, sy + (link ? 21 : 9))
  }

  // --- CANAL DE ETIQUETAS (pegado a la izquierda)
  ctx.fillStyle = '#0d0d14'; ctx.fillRect(sx, 0, GUT, cssH)
  ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.beginPath(); ctx.moveTo(sx + GUT - 0.5, 0); ctx.lineTo(sx + GUT - 0.5, cssH); ctx.stroke()
  ctx.font = '10.5px system-ui, -apple-system, Segoe UI, sans-serif'
  capas.forEach((l, i) => {
    const y = y0 + i * ROW
    if (l.id === selected) { ctx.fillStyle = 'rgba(124,92,255,0.16)'; ctx.fillRect(sx, y, GUT, ROW) }
    ctx.fillStyle = COL_KIND[l.kind] || '#6b7186'
    ctx.fillRect(sx + 6, y + ROW / 2 - 3, 6, 6)
    ctx.fillStyle = l.id === selected ? '#e8e9f2' : '#8a8fa5'
    ctx.fillText(recorta(ctx, corto(l.id), GUT - 22), sx + 17, y + ROW / 2 + 3.5)
  })

  // --- PLAYHEAD (recortado al area de pistas: no invade el canal de etiquetas)
  ctx.save()
  ctx.beginPath(); ctx.rect(sx + GUT, 0, cssW - sx - GUT, cssH); ctx.clip()
  const hx = Math.round(X(Math.max(0, Math.min(dur, head)))) + 0.5
  ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(hx, 0); ctx.lineTo(hx, cssH); ctx.stroke()
  ctx.fillStyle = '#ff4d6d'
  ctx.beginPath(); ctx.moveTo(hx - 4, 0); ctx.lineTo(hx + 4, 0); ctx.lineTo(hx, 6); ctx.closePath(); ctx.fill()
  ctx.restore()
}

// recorta con puntos suspensivos midiendo en el canvas (aca no hay CSS que lo haga por nosotros)
function recorta(ctx, txt, max) {
  if (ctx.measureText(txt).width <= max) return txt
  let s = txt
  while (s.length > 1 && ctx.measureText(s + '…').width > max) s = s.slice(0, -1)
  return s + '…'
}

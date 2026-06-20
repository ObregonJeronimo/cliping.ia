// urvid 1.0 · ANIM · familia PRODUCTIVIDAD / TIEMPO — micro-animaciones VECTORIALES line-art (reloj, calendario, timer,
// reloj de arena, checklist, carpeta, sync, alarma, progreso, kanban). render(ctx, t, env). PURAS + DETERMINISTAS
// (SOLO `t`; cero Math.random/Date.now). Color SIEMPRE de env.pal (tinta = ink, highlight = accent, texto-sobre-acento
// = onAccent). LOOPEAN suave (periodo propio, sin costura) y son fluidas (eases suaves). Centradas en CX,CY a radio ~R.
import { register } from '../../core/registry.js'
import { W, H, TAU, rgba, clamp, inv, lerp, eOutCubic, eInOutCubic, eOutBack, spring } from '../../core/util.js'
import { CX, CY, R, LW, loop, pulse, ink, spark, rr, starShape, polyShape } from './_shared.js'

// =============================================================================
// CLOCK — reloj con aguja que barre
// =============================================================================
register({
  id: 'anim.time.clock', lib: 'anim', category: 'time', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1, tags: ['reloj', 'tiempo', 'hora', 'puntualidad', 'agenda'],
  register: 'corporate', intensity: 'calm', concept: 'clock', describe: 'Un reloj con la aguja larga que barre una vuelta completa.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per), rad = R * 1.05
    ctx.save(); ink(ctx, pal, LW * 1.15)
    // esfera
    ctx.strokeStyle = pal.ink; ctx.beginPath(); ctx.arc(CX, CY, rad, 0, TAU); ctx.stroke()
    // marcas horarias
    ctx.lineWidth = LW * 0.8
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU - Math.PI / 2, r0 = rad * (i % 3 === 0 ? 0.78 : 0.86)
      ctx.strokeStyle = rgba(pal.ink, i % 3 === 0 ? 0.85 : 0.4)
      ctx.beginPath(); ctx.moveTo(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0); ctx.lineTo(CX + Math.cos(a) * rad * 0.94, CY + Math.sin(a) * rad * 0.94); ctx.stroke()
    }
    // aguja de hora (lenta, mitad de vuelta) en tinta
    const ah = p * Math.PI - Math.PI / 2
    ctx.strokeStyle = pal.ink; ctx.lineWidth = LW * 1.3
    ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX + Math.cos(ah) * rad * 0.46, CY + Math.sin(ah) * rad * 0.46); ctx.stroke()
    // aguja larga (minutos, una vuelta) en acento
    const am = p * TAU - Math.PI / 2
    ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 1.1
    ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX + Math.cos(am) * rad * 0.72, CY + Math.sin(am) * rad * 0.72); ctx.stroke()
    // eje
    ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(CX, CY, R * 0.07, 0, TAU); ctx.fill()
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(CX, CY, R * 0.035, 0, TAU); ctx.fill()
    ctx.restore()
  },
})

// =============================================================================
// CALENDAR — un dia se marca con acento
// =============================================================================
register({
  id: 'anim.time.calendar', lib: 'anim', category: 'time', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1, tags: ['calendario', 'fecha', 'agenda', 'evento', 'dia'],
  register: 'friendly', intensity: 'soft', concept: 'calendar', describe: 'Un calendario donde un dia se marca de acento con un pop.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    const w = R * 1.9, h = R * 1.8, x = CX - w / 2, y = CY - h / 2 + R * 0.12
    ctx.save(); ink(ctx, pal, LW)
    // cuerpo
    ctx.strokeStyle = pal.ink; rr(ctx, x, y, w, h, R * 0.16); ctx.stroke()
    // barra superior (encabezado)
    ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.12 : 0.18); rr(ctx, x, y, w, h * 0.24, R * 0.16); ctx.fill()
    rr(ctx, x, y + h * 0.12, w, h * 0.12, 0); ctx.fill()
    // anillas
    ctx.strokeStyle = pal.ink; ctx.lineWidth = LW * 0.9
    for (const ax of [x + w * 0.3, x + w * 0.7]) { ctx.beginPath(); ctx.moveTo(ax, y - R * 0.18); ctx.lineTo(ax, y + h * 0.1); ctx.stroke() }
    // grilla de dias 4x3
    const gx = x + w * 0.12, gy = y + h * 0.36, cw = (w * 0.76) / 4, ch = (h * 0.5) / 3
    const markIdx = 6  // el dia destacado
    const pop = spring(clamp(inv(p, 0.2, 0.6), 0, 1), { zeta: 0.5, freq: 2 }) * (1 - clamp(inv(p, 0.86, 1), 0, 1) * 0.0)
    for (let i = 0; i < 12; i++) {
      const cxx = gx + (i % 4) * cw + cw / 2, cyy = gy + Math.floor(i / 4) * ch + ch / 2
      if (i === markIdx && pop > 0.02) {
        ctx.save(); ctx.translate(cxx, cyy); ctx.scale(pop, pop); ctx.fillStyle = pal.accent
        ctx.beginPath(); ctx.arc(0, 0, Math.min(cw, ch) * 0.42, 0, TAU); ctx.fill(); ctx.restore()
        ctx.fillStyle = pal.onAccent || pal.bg0; ctx.beginPath(); ctx.arc(cxx, cyy, Math.min(cw, ch) * 0.11, 0, TAU); ctx.fill()
      } else {
        ctx.fillStyle = rgba(pal.ink, 0.55); ctx.beginPath(); ctx.arc(cxx, cyy, Math.min(cw, ch) * 0.1, 0, TAU); ctx.fill()
      }
    }
    ctx.restore()
  },
})

// =============================================================================
// TIMER — anillo de cuenta regresiva que se vacia
// =============================================================================
register({
  id: 'anim.time.timer', lib: 'anim', category: 'time', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1, tags: ['timer', 'cuenta-regresiva', 'cronometro', 'tiempo', 'urgencia'],
  register: 'neutral', intensity: 'medium', concept: 'timer', describe: 'Un anillo de cuenta regresiva en acento que se vacia y reinicia.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per), rad = R * 1.0
    ctx.save()
    // pista de fondo
    ctx.lineCap = 'round'; ctx.lineWidth = LW * 1.6; ctx.strokeStyle = rgba(pal.ink, pal.tone === 'light' ? 0.16 : 0.22)
    ctx.beginPath(); ctx.arc(CX, CY, rad, 0, TAU); ctx.stroke()
    // arco de acento que se vacia (de lleno a 0)
    const left = 1 - eInOutCubic(p)
    if (left > 0.001) {
      ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 1.6
      ctx.beginPath(); ctx.arc(CX, CY, rad, -Math.PI / 2, -Math.PI / 2 + TAU * left); ctx.stroke()
    }
    // perilla / boton superior
    ink(ctx, pal, LW); ctx.strokeStyle = pal.ink
    ctx.beginPath(); ctx.moveTo(CX - R * 0.18, CY - rad - R * 0.18); ctx.lineTo(CX + R * 0.18, CY - rad - R * 0.18); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(CX, CY - rad - R * 0.18); ctx.lineTo(CX, CY - rad - R * 0.02); ctx.stroke()
    // punta del arco con brillo
    const ang = -Math.PI / 2 + TAU * left
    if (left > 0.001) spark(ctx, pal, CX + Math.cos(ang) * rad, CY + Math.sin(ang) * rad, R * 0.1, 0.9)
    ctx.restore()
  },
})

// =============================================================================
// HOURGLASS — la arena cae
// =============================================================================
register({
  id: 'anim.time.hourglass', lib: 'anim', category: 'time', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1, tags: ['reloj-de-arena', 'espera', 'tiempo', 'paciencia', 'proceso'],
  register: 'editorial', intensity: 'calm', concept: 'hourglass', describe: 'Un reloj de arena cuya arena de acento cae de arriba a abajo y se da vuelta.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.2, p = loop(t, per)
    const w = R * 1.3, h = R * 1.7, x = CX, top = CY - h / 2, bot = CY + h / 2, neck = R * 0.1
    // marcos (tapas)
    ctx.save(); ink(ctx, pal, LW * 1.1); ctx.strokeStyle = pal.ink
    ctx.beginPath(); ctx.moveTo(x - w / 2, top); ctx.lineTo(x + w / 2, top); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x - w / 2, bot); ctx.lineTo(x + w / 2, bot); ctx.stroke()
    // contorno del vidrio (dos triangulos que se tocan en el cuello)
    const drawGlass = () => {
      ctx.beginPath()
      ctx.moveTo(x - w / 2, top); ctx.lineTo(x - neck, CY); ctx.lineTo(x - w / 2, bot)
      ctx.moveTo(x + w / 2, top); ctx.lineTo(x + neck, CY); ctx.lineTo(x + w / 2, bot)
    }
    drawGlass(); ctx.lineWidth = LW; ctx.stroke()
    // fase de caida (la arena de arriba baja, la de abajo sube) con eOutCubic
    const f = eInOutCubic(clamp(inv(p, 0.05, 0.85), 0, 1))   // 0 lleno arriba -> 1 lleno abajo
    // ARENA SUPERIOR (triangulo apuntando abajo que se vacia desde arriba)
    const topFull = (1 - f)
    if (topFull > 0.01) {
      ctx.save()
      // clip al triangulo superior
      ctx.beginPath(); ctx.moveTo(x - w / 2, top); ctx.lineTo(x + w / 2, top); ctx.lineTo(x + neck, CY); ctx.lineTo(x - neck, CY); ctx.closePath(); ctx.clip()
      // nivel de arena: arranca lleno (en `top`) y baja hacia el cuello
      const lvl = lerp(top, CY, 1 - topFull)
      ctx.fillStyle = pal.accent
      ctx.beginPath(); ctx.moveTo(x - w / 2, top); ctx.lineTo(x + w / 2, top); ctx.lineTo(x + w / 2, lvl); ctx.lineTo(x - w / 2, lvl); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    // ARENA INFERIOR (monticulo que crece)
    const botFull = f
    if (botFull > 0.01) {
      ctx.save()
      ctx.beginPath(); ctx.moveTo(x - neck, CY); ctx.lineTo(x + neck, CY); ctx.lineTo(x + w / 2, bot); ctx.lineTo(x - w / 2, bot); ctx.closePath(); ctx.clip()
      const lvl = lerp(bot, CY, botFull)
      ctx.fillStyle = pal.accent
      ctx.beginPath(); ctx.moveTo(x - w / 2, bot); ctx.lineTo(x + w / 2, bot); ctx.lineTo(x + w / 2, lvl); ctx.lineTo(x - w / 2, lvl); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    // chorro de arena en el cuello mientras cae
    if (f > 0.02 && f < 0.98) {
      ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 0.5; ctx.globalAlpha = 0.9
      const dy = (loop(t, 0.4) - 0.5) * R * 0.2
      ctx.beginPath(); ctx.moveTo(x, CY + neck); ctx.lineTo(x, CY + R * 0.5 + dy * 0); ctx.stroke(); ctx.restore()
      // granito que cae (deterministico por loop corto)
      const gy = lerp(CY + neck, bot - R * 0.1, loop(t, 0.5))
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(x, gy, R * 0.05, 0, TAU); ctx.fill()
    }
    // giro sutil al final del loop (vuelta) para sugerir reinicio sin salto: el frame ya iguala porque f vuelve a 0
    ctx.restore()
  },
})

// =============================================================================
// CHECKLIST — items que se tildan en cascada
// =============================================================================
register({
  id: 'anim.time.checklist', lib: 'anim', category: 'time', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1.05, tags: ['checklist', 'tareas', 'pendientes', 'completar', 'productividad'],
  register: 'friendly', intensity: 'soft', concept: 'checklist', describe: 'Tres tareas que se tildan de acento una tras otra, en cascada.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per), n = 3
    const box = R * 0.5, x0 = CX - R * 1.25, lineW = R * 1.6
    const y0 = CY - R * 0.95, gap = R * 0.95
    // reset SUAVE: al final del loop las tres se destildan rapido (en orden inverso) -> t=per iguala t=0 (vacio, sin costura)
    const clearAll = clamp(inv(p, 0.86, 0.99), 0, 1)
    ctx.save(); ink(ctx, pal, LW)
    for (let i = 0; i < n; i++) {
      const y = y0 + i * gap
      // casilla
      ctx.strokeStyle = pal.ink; ctx.lineWidth = LW; rr(ctx, x0, y - box / 2, box, box, box * 0.24); ctx.stroke()
      // progreso de tildado por item (escalonado), con destildado inverso al cerrar el loop
      const a0 = 0.12 + i * 0.22, ckUp = clamp(inv(p, a0, a0 + 0.2), 0, 1)
      const ckDown = clamp(inv(clearAll, (n - 1 - i) * 0.28, (n - 1 - i) * 0.28 + 0.4), 0, 1)
      const ck = ckUp * (1 - ckDown), s = eOutBack(clamp(ck, 0, 1))
      if (ck > 0.02) {
        // relleno de casilla
        ctx.save(); ctx.globalAlpha = clamp(ck, 0, 1); ctx.fillStyle = pal.accent; rr(ctx, x0, y - box / 2, box, box, box * 0.24); ctx.fill(); ctx.restore()
        // tilde
        ctx.save(); ctx.translate(x0 + box / 2, y); ctx.scale(s, s)
        ctx.strokeStyle = pal.onAccent || pal.bg0; ctx.lineWidth = LW * 0.9; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
        ctx.beginPath(); ctx.moveTo(-box * 0.24, 0.02 * box); ctx.lineTo(-box * 0.04, box * 0.2); ctx.lineTo(box * 0.26, -box * 0.2); ctx.stroke(); ctx.restore()
      }
      // linea de texto (placeholder), tachada cuando el item esta hecho
      const tx = x0 + box + R * 0.3, tlen = lineW * (1 - i * 0.16)
      ctx.strokeStyle = rgba(pal.ink, ck > 0.9 ? 0.35 : 0.7); ctx.lineWidth = LW * 0.85
      ctx.beginPath(); ctx.moveTo(tx, y); ctx.lineTo(tx + tlen, y); ctx.stroke()
    }
    ctx.restore()
  },
})

// =============================================================================
// FOLDER — carpeta que se abre
// =============================================================================
register({
  id: 'anim.time.folder', lib: 'anim', category: 'time', tones: ['dark', 'light'],
  rubros: ['*'], weight: 0.95, tags: ['carpeta', 'archivos', 'organizar', 'documentos', 'guardar'],
  register: 'neutral', intensity: 'soft', concept: 'folder', describe: 'Una carpeta que abre su tapa y deja salir un papel en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    const w = R * 1.9, h = R * 1.25, x = CX - w / 2, y = CY - h / 2 + R * 0.2
    const open = eInOutCubic(clamp(inv(p, 0.12, 0.5), 0, 1)) * (1 - eInOutCubic(clamp(inv(p, 0.7, 0.96), 0, 1)))
    ctx.save(); ink(ctx, pal, LW)
    // parte trasera de la carpeta (con pestaña)
    ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.85 : 0.9)
    ctx.beginPath()
    ctx.moveTo(x, y + h * 0.18); ctx.lineTo(x + w * 0.36, y + h * 0.18); ctx.lineTo(x + w * 0.46, y); ctx.lineTo(x + w, y)
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill()
    // papel que asoma (acento) — sube con la apertura
    const py = lerp(y + h * 0.5, y - h * 0.42 * open, 1)
    if (open > 0.02) {
      ctx.save(); ctx.fillStyle = pal.accent
      const pw = w * 0.62, ph = h * 0.78, px = x + (w - pw) / 2
      rr(ctx, px, y + h * 0.42 - open * h * 0.62, pw, ph, R * 0.06); ctx.fill()
      // lineas del papel
      ctx.strokeStyle = rgba(pal.onAccent || pal.bg0, 0.7); ctx.lineWidth = LW * 0.5
      for (let i = 0; i < 3; i++) { const ly = y + h * 0.42 - open * h * 0.62 + ph * (0.28 + i * 0.22); ctx.beginPath(); ctx.moveTo(px + pw * 0.16, ly); ctx.lineTo(px + pw * (0.84 - i * 0.12), ly); ctx.stroke() }
      ctx.restore()
    }
    // tapa frontal que se inclina al abrir
    ctx.save()
    ctx.translate(x, y + h)
    ctx.transform(1, 0, -open * 0.5, 1 - open * 0.32, 0, 0)   // shear + recoge la tapa
    ctx.fillStyle = pal.tone === 'light' ? rgba(pal.ink, 0.7) : rgba(pal.ink, 0.78)
    ctx.beginPath(); ctx.moveTo(0, -h * 0.82); ctx.lineTo(w, -h * 0.82); ctx.lineTo(w, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = rgba(pal.bg0, 0.5); ctx.lineWidth = 1.5; ctx.stroke()
    ctx.restore()
    ctx.restore()
  },
})

// =============================================================================
// SYNC — dos flechas circulares que rotan
// =============================================================================
register({
  id: 'anim.time.sync', lib: 'anim', category: 'time', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1, tags: ['sincronizar', 'actualizar', 'refrescar', 'ciclo', 'automatico'],
  register: 'corporate', intensity: 'medium', concept: 'sync', describe: 'Dos flechas circulares que giran en ciclo, una en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.6, p = loop(t, per), rad = R * 1.0
    const spin = eInOutCubic(p) * TAU   // una vuelta suave por loop -> sin costura (TAU == 0)
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(spin)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = LW * 1.25
    // dos arcos opuestos, cada uno con punta de flecha
    const arcs = [{ a0: -Math.PI * 0.42, a1: Math.PI * 0.62, col: pal.ink }, { a0: Math.PI * 0.58, a1: Math.PI * 1.62, col: pal.accent }]
    for (const { a0, a1, col } of arcs) {
      ctx.strokeStyle = col
      ctx.beginPath(); ctx.arc(0, 0, rad, a0, a1); ctx.stroke()
      // punta de flecha al final del arco (tangente)
      const ex = Math.cos(a1) * rad, ey = Math.sin(a1) * rad, tang = a1 + Math.PI / 2
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(tang); ctx.fillStyle = col
      ctx.beginPath(); ctx.moveTo(0, R * 0.04); ctx.lineTo(-R * 0.26, -R * 0.16); ctx.lineTo(R * 0.26, -R * 0.16); ctx.closePath(); ctx.fill(); ctx.restore()
    }
    ctx.restore()
  },
})

// =============================================================================
// ALARM — despertador que vibra (campanitas)
// =============================================================================
register({
  id: 'anim.time.alarm', lib: 'anim', category: 'time', tones: ['dark', 'light'],
  rubros: ['*'], weight: 0.95, tags: ['alarma', 'despertador', 'recordatorio', 'aviso', 'hora'],
  register: 'friendly', intensity: 'bold', concept: 'alarm', describe: 'Un despertador que vibra y suena, con ondas de acento a los costados.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.4, p = loop(t, per)
    // ciclo de timbrar: una rafaga por loop con envolvente que abre y cierra (0 en los bordes -> sin costura).
    const ring = Math.sin(p * Math.PI) ** 2 // 0..1..0 dentro del loop (cero en p=0 y p=1)
    // buzz periodico: 12 ciclos enteros por loop -> sin(0)==sin(12*TAU) -> el frame en t=per iguala t=0
    const buzz = Math.sin(p * TAU * 12) * 0.05 * ring
    const rad = R * 0.95
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(buzz)
    ink(ctx, pal, LW * 1.1); ctx.strokeStyle = pal.ink
    // cuerpo (esfera del reloj)
    ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.stroke()
    // patitas
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * rad * 0.55, rad * 0.82); ctx.lineTo(sx * rad * 0.78, rad * 1.15); ctx.stroke() }
    // campanitas arriba (dos arcos)
    for (const sx of [-1, 1]) {
      ctx.save(); ctx.translate(sx * rad * 0.62, -rad * 0.62); ctx.rotate(sx * 0.7)
      ctx.beginPath(); ctx.arc(0, 0, rad * 0.32, Math.PI, TAU); ctx.stroke(); ctx.restore()
    }
    // martillito central
    ctx.beginPath(); ctx.moveTo(0, -rad); ctx.lineTo(0, -rad * 1.18); ctx.stroke()
    ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.arc(0, -rad * 1.2, R * 0.07, 0, TAU); ctx.fill()
    // agujas en acento
    ctx.strokeStyle = pal.accent; ctx.lineWidth = LW
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -rad * 0.5); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(rad * 0.4, rad * 0.18); ctx.stroke()
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(0, 0, R * 0.06, 0, TAU); ctx.fill()
    ctx.restore()
    // ondas de sonido a los costados (acento), aparecen con el timbre
    const wv = clamp(ring, 0, 1)
    if (wv > 0.05) {
      ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineCap = 'round'; ctx.globalAlpha = wv
      for (const sx of [-1, 1]) for (let i = 1; i <= 2; i++) {
        ctx.lineWidth = LW * 0.8; ctx.beginPath()
        ctx.arc(CX + sx * rad * 1.05, CY - rad * 0.2, rad * (0.28 + i * 0.26), sx > 0 ? -0.7 : Math.PI - 0.7, sx > 0 ? 0.7 : Math.PI + 0.7); ctx.stroke()
      }
      ctx.restore()
    }
    ctx.restore()
  },
})

// =============================================================================
// PROGRESS — barra que se llena y vuelve
// =============================================================================
register({
  id: 'anim.time.progress', lib: 'anim', category: 'time', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1, tags: ['progreso', 'avance', 'carga', 'completado', 'porcentaje'],
  register: 'neutral', intensity: 'soft', concept: 'progress', describe: 'Una barra de progreso que se llena de acento, con un brillo en la punta.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    const w = R * 2.3, h = R * 0.5, x = CX - w / 2, y = CY - h / 2
    // llena hasta 1 y se mantiene un toque, luego un fade para reiniciar sin salto
    const fillRaw = eInOutCubic(clamp(inv(p, 0.05, 0.7), 0, 1))
    const fade = 1 - clamp(inv(p, 0.88, 1), 0, 1)   // a 1->0 al final para que t=per iguale t=0 (vacio)
    const fill = fillRaw * fade
    ctx.save()
    // pista
    ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.14 : 0.2); rr(ctx, x, y, w, h, h / 2); ctx.fill()
    // relleno
    ctx.save(); rr(ctx, x, y, w, h, h / 2); ctx.clip(); ctx.fillStyle = pal.accent; ctx.fillRect(x, y, w * fill, h); ctx.restore()
    // borde sutil
    ink(ctx, pal, LW * 0.7); ctx.strokeStyle = rgba(pal.ink, 0.4); rr(ctx, x, y, w, h, h / 2); ctx.stroke()
    // brillo en la punta del relleno
    if (fill > 0.02 && fill < 0.99) spark(ctx, pal, x + w * fill, CY, R * 0.12, 0.9)
    // etiqueta de % como puntos (sin texto)
    ctx.restore()
  },
})

// =============================================================================
// TASK-MOVE — tarjeta que se mueve de columna (kanban)
// =============================================================================
register({
  id: 'anim.time.task-move', lib: 'anim', category: 'time', tones: ['dark', 'light'],
  rubros: ['*'], weight: 1, tags: ['kanban', 'tablero', 'tarea', 'flujo', 'organizar', 'mover'],
  register: 'corporate', intensity: 'medium', concept: 'kanban', describe: 'Una tarjeta que viaja de la columna pendiente a la columna hecho.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    const colW = R * 0.95, colH = R * 2.1, gap = R * 0.35
    const totW = colW * 2 + gap, x0 = CX - totW / 2, y0 = CY - colH / 2
    ctx.save()
    // dos columnas
    const cols = [x0, x0 + colW + gap]
    for (let ci = 0; ci < 2; ci++) {
      ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.08 : 0.12)
      rr(ctx, cols[ci], y0, colW, colH, R * 0.12); ctx.fill()
      // titulo de columna (banda)
      ctx.fillStyle = rgba(pal.ink, ci === 1 ? 0.0 : 0.18)
      // header dot
      ctx.fillStyle = ci === 1 ? pal.accent : rgba(pal.ink, 0.5)
      ctx.beginPath(); ctx.arc(cols[ci] + colW * 0.22, y0 + R * 0.28, R * 0.1, 0, TAU); ctx.fill()
      ctx.fillStyle = rgba(pal.ink, 0.4); rr(ctx, cols[ci] + colW * 0.36, y0 + R * 0.22, colW * 0.5, R * 0.12, 3); ctx.fill()
    }
    // tarjetas estaticas (decorativas) en cada columna
    const cardW = colW * 0.74, cardX0 = cols[0] + (colW - cardW) / 2, cardX1 = cols[1] + (colW - cardW) / 2
    ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.55 : 0.62)
    rr(ctx, cardX0, y0 + R * 0.95, cardW, R * 0.5, R * 0.08); ctx.fill()
    rr(ctx, cardX1, y0 + colH - R * 0.62, cardW, R * 0.5, R * 0.08); ctx.fill()
    // tarjeta que se mueve (acento) de col0 -> col1 con un arco
    const mv = eInOutCubic(clamp(inv(p, 0.15, 0.7), 0, 1)) * (1 - clamp(inv(p, 0.9, 1), 0, 1) * 0)
    const startX = cardX0, endX = cardX1
    const cx = lerp(startX, endX, mv)
    const baseY = y0 + R * 0.28
    const lift = Math.sin(mv * Math.PI) * R * 0.45
    const cy = baseY - lift
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.22)'; ctx.shadowBlur = lift > 1 ? 8 : 0; ctx.shadowOffsetY = lift > 1 ? 3 : 0
    ctx.fillStyle = pal.accent; rr(ctx, cx, cy, cardW, R * 0.5, R * 0.08); ctx.fill()
    ctx.restore()
    // lineas dentro de la tarjeta movil
    ctx.strokeStyle = rgba(pal.onAccent || pal.bg0, 0.8); ctx.lineWidth = LW * 0.5; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(cx + cardW * 0.16, cy + R * 0.17); ctx.lineTo(cx + cardW * 0.7, cy + R * 0.17); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx + cardW * 0.16, cy + R * 0.32); ctx.lineTo(cx + cardW * 0.5, cy + R * 0.32); ctx.stroke()
    ctx.restore()
  },
})

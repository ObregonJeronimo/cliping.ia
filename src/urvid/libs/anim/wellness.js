// urvid 1.0 · ANIM · concepto BIENESTAR / SALUD / EDUCACION — micro-animaciones line-art con ACCION (un latido que
// corre, una hoja que crece, un libro que se abre). render(ctx, t, env). PURAS + DETERMINISTAS (solo `t`; cero
// Math.random/Date.now). Color SIEMPRE de env.pal (linea en pal.ink, highlight en pal.accent). LOOPEAN suave.
// Archivo de concepto aislado: importa SOLO el registry, util y los helpers compartidos (_shared.js).
import { register } from '../../core/registry.js'
import { W, H, TAU, rgba, clamp, inv, lerp, eOutCubic, eInOutCubic, eOutBack, spring } from '../../core/util.js'
import { CX, CY, R, LW, loop, pulse, ink, spark, rr, starShape, polyShape } from './_shared.js'

// =============================================================================
// HEALTH-PULSE — latido / ECG que corre por la pantalla
// =============================================================================
register({
  id: 'anim.wellness.health-pulse', lib: 'anim', category: 'wellness', tones: ['dark', 'light'],
  rubros: ['salud', 'default', 'tech'], weight: 1, tags: ['salud', 'latido', 'pulso', 'ecg', 'vida'],
  register: 'corporate', intensity: 'medium', concept: 'pulse', describe: 'Una linea de ECG corre por una grilla y late en acento al pasar el pico.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.6, p = loop(t, per)
    const x0 = CX - R * 1.5, x1 = CX + R * 1.5, w = x1 - x0
    // linea base tenue
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.22); ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(x0, CY); ctx.lineTo(x1, CY); ctx.stroke(); ctx.restore()
    // forma de un latido (relativa a un ancho unitario), centrada
    const beat = (u) => {
      // u en 0..1 dentro de un ciclo de latido -> desplazamiento vertical
      const d = u - 0.5
      const spike = Math.exp(-Math.pow((d) / 0.045, 2)) * -R * 1.05      // pico alto
      const dip = Math.exp(-Math.pow((d - 0.07) / 0.04, 2)) * R * 0.55   // valle despues
      const bump = Math.exp(-Math.pow((d + 0.14) / 0.05, 2)) * -R * 0.2  // pequena onda P antes
      return spike + dip + bump
    }
    // dibuja la traza completa (estatica) + un cabezal de acento que recorre
    ink(ctx, pal, LW * 1.05); ctx.strokeStyle = rgba(pal.ink, pal.tone === 'light' ? 0.85 : 0.92)
    ctx.beginPath()
    for (let i = 0; i <= 120; i++) { const u = i / 120, xx = x0 + u * w; const yy = CY + beat(u); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy) }
    ctx.stroke()
    // cabezal que viaja (loopea: en p=0 y p=1 esta en el mismo borde)
    const hx = lerp(x0, x1, p), hu = p, hy = CY + beat(hu)
    // segmento brillante de acento detras del cabezal
    ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 1.25
    ctx.beginPath()
    const tail = 0.14
    for (let q = Math.max(0, p - tail); q <= p; q += 0.01) { const xx = lerp(x0, x1, q), yy = CY + beat(q); q === Math.max(0, p - tail) ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy) }
    ctx.stroke(); ctx.restore()
    // brillo en el cabezal, mas fuerte cuando pasa por el pico (~u=0.5)
    const near = Math.exp(-Math.pow((hu - 0.5) / 0.08, 2))
    spark(ctx, pal, hx, hy, R * (0.07 + 0.05 * near), 0.85 + 0.15 * near)
  },
})

// =============================================================================
// GROW — una hoja que crece desde un tallo
// =============================================================================
register({
  id: 'anim.wellness.grow', lib: 'anim', category: 'wellness', tones: ['dark', 'light'],
  rubros: ['salud', 'gastronomia', 'default', 'belleza'], weight: 1, tags: ['crecer', 'hoja', 'natural', 'organico', 'bienestar'],
  register: 'friendly', intensity: 'calm', concept: 'grow', describe: 'Un tallo se traza y una hoja se despliega con su nervadura en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    // fase: crecer (0..0.6), respirar (0.6..1) y volver al inicio sin salto
    const grow = eOutCubic(clamp(inv(p, 0.05, 0.6), 0, 1))
    const breathe = 1 + 0.04 * pulse(t, 2.2)
    const baseX = CX, baseY = CY + R * 1.4
    // el tallo arranca con una altura minima (siempre visible) y crece
    const stemH = (R * 0.4 + R * 1.7 * grow) * breathe
    const tipX = CX, tipY = baseY - stemH
    ctx.save()
    // suelo / linea de tierra (siempre visible -> frame inicial nunca queda en blanco)
    ctx.strokeStyle = rgba(pal.ink, 0.45); ctx.lineWidth = LW * 0.8; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(baseX - R * 1.0, baseY); ctx.lineTo(baseX + R * 1.0, baseY); ctx.stroke()
    // semilla / monticulo en la base
    ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.18 : 0.28)
    ctx.beginPath(); ctx.ellipse(baseX, baseY, R * 0.42, R * 0.16, 0, Math.PI, TAU); ctx.fill()
    // tallo
    ink(ctx, pal, LW * 1.0); ctx.strokeStyle = rgba(pal.ink, pal.tone === 'light' ? 0.85 : 0.9)
    ctx.beginPath(); ctx.moveTo(baseX, baseY)
    ctx.quadraticCurveTo(baseX - R * 0.18 * grow, lerp(baseY, tipY, 0.5), tipX, tipY); ctx.stroke()
    // hoja (al final del crecimiento) — forma de almendra
    const leafP = eOutBack(clamp(inv(p, 0.22, 0.7), 0, 1))
    if (leafP > 0.02) {
      const lx = tipX, ly = tipY, len = R * 1.0 * leafP, ang = -0.55
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(ang + 0.05 * Math.sin(loop(t, 2.2) * TAU))
      // contorno de la hoja en tinta
      ctx.strokeStyle = pal.ink; ctx.lineWidth = LW * 0.95
      ctx.beginPath(); ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(len * 0.5, -len * 0.45, len, 0)
      ctx.quadraticCurveTo(len * 0.5, len * 0.45, 0, 0); ctx.stroke()
      // relleno suave de acento dentro de la hoja
      ctx.save(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -len * 0.45, len, 0); ctx.quadraticCurveTo(len * 0.5, len * 0.45, 0, 0); ctx.clip()
      ctx.globalAlpha = 0.2; ctx.fillStyle = pal.accent; ctx.fillRect(0, -len, len, len * 2); ctx.restore()
      // nervadura central en acento
      ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 0.55
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len * 0.92, 0); ctx.stroke()
      ctx.restore()
    }
    // brote de luz en la punta cuando termina de crecer
    if (grow > 0.95) spark(ctx, pal, tipX, tipY, R * 0.07, 0.5 + 0.5 * pulse(t, 1.8))
    ctx.restore()
  },
})

// =============================================================================
// BOOK — libro que se abre con sus paginas
// =============================================================================
register({
  id: 'anim.wellness.book', lib: 'anim', category: 'wellness', tones: ['dark', 'light'],
  rubros: ['educacion', 'default', 'tech'], weight: 1, tags: ['libro', 'leer', 'aprender', 'educacion', 'paginas'],
  register: 'editorial', intensity: 'soft', concept: 'book', describe: 'Un libro se abre y una pagina pasa; el lomo brilla en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    // abre 0..0.45, pasa pagina 0.5..0.85, queda quieto y vuelve
    const open = eOutCubic(clamp(inv(p, 0.05, 0.45), 0, 1))
    const halfW = R * 1.25, h = R * 1.5
    ctx.save(); ctx.translate(CX, CY)
    ink(ctx, pal, LW * 0.95); ctx.strokeStyle = pal.ink
    // el lomo "se hunde" cuando esta cerrado (ambas tapas casi verticales) y se aplana al abrir
    const dip = (1 - open) * h * 0.22          // cuanto baja la junta central (V de libro)
    const lift = (1 - open) * h * 0.12         // leve perspectiva del borde exterior
    const drawPage = (sgn) => {
      ctx.beginPath()
      ctx.moveTo(0, -h * 0.5 + dip)                        // junto al lomo arriba (hundido)
      ctx.quadraticCurveTo(sgn * halfW * 0.5, -h * 0.5 - lift * 0.5, sgn * halfW, -h * 0.5 + lift)  // borde superior curvo
      ctx.lineTo(sgn * halfW, h * 0.5 - lift)              // esquina exterior abajo
      ctx.quadraticCurveTo(sgn * halfW * 0.5, h * 0.5 + lift * 0.5, 0, h * 0.5 - dip)               // borde inferior curvo hacia el lomo
      ctx.closePath()
      ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.06 : 0.12); ctx.fill(); ctx.stroke()
      // renglones de texto sugeridos (aparecen al abrir)
      if (open > 0.4) { ctx.save(); ctx.globalAlpha = clamp(inv(open, 0.4, 0.8), 0, 1); ctx.strokeStyle = rgba(pal.ink, 0.3); ctx.lineWidth = 1.5
        for (let i = 0; i < 4; i++) { const yy = -h * 0.26 + i * h * 0.17
          ctx.beginPath(); ctx.moveTo(sgn * halfW * 0.2, yy); ctx.lineTo(sgn * halfW * 0.82, yy); ctx.stroke() }
        ctx.restore() }
    }
    drawPage(-1); drawPage(1)
    // pagina que pasa (gira sobre el lomo)
    const flip = clamp(inv(p, 0.5, 0.85), 0, 1)
    if (open > 0.9 && flip > 0 && flip < 1) {
      const fa = lerp(0, Math.PI, eInOutCubic(flip))      // 0=derecha .. PI=izquierda
      const fw = halfW * Math.cos(fa)
      ctx.save(); ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.16 : 0.22)
      ctx.beginPath()
      ctx.moveTo(0, -h * 0.5 + dip)
      ctx.lineTo(fw, -h * 0.5 + lift)
      ctx.lineTo(fw, h * 0.5 - lift)
      ctx.lineTo(0, h * 0.5 - dip); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore()
    }
    // lomo (centro) en acento
    ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 1.2
    ctx.beginPath(); ctx.moveTo(0, -h * 0.5 + dip); ctx.lineTo(0, h * 0.5 - dip); ctx.stroke()
    if (open > 0.95) { ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * pulse(t, 2.0); spark(ctx, pal, 0, -h * 0.5 + dip, R * 0.06); ctx.restore() }
    ctx.restore()
  },
})

// =============================================================================
// IDEA — lampara que se enciende + rayitos
// =============================================================================
register({
  id: 'anim.wellness.idea', lib: 'anim', category: 'wellness', tones: ['dark', 'light'],
  rubros: ['educacion', 'tech', 'default', 'creativo'], weight: 1, tags: ['idea', 'lampara', 'aprender', 'eureka', 'creatividad'],
  register: 'friendly', intensity: 'medium', concept: 'idea', describe: 'Una lampara se enciende: el bulbo se llena de acento y salen rayitos.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    const bx = CX, by = CY - R * 0.25, br = R * 0.78
    // encendido 0.2..0.5, apagado suave 0.85..1 -> loopea
    const on = eOutCubic(clamp(inv(p, 0.2, 0.5), 0, 1)) * (1 - eInOutCubic(clamp(inv(p, 0.82, 1.0), 0, 1)))
    ctx.save()
    // bulbo
    ink(ctx, pal, LW * 1.05); ctx.strokeStyle = pal.ink
    // relleno de acento (la luz) dentro del bulbo
    ctx.save(); ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.clip()
    ctx.globalAlpha = 0.85 * on; ctx.fillStyle = pal.accent; ctx.fillRect(bx - br, by - br, br * 2, br * 2); ctx.restore()
    ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.stroke()
    // filamento
    ctx.strokeStyle = on > 0.5 ? (pal.onAccent || pal.bg0) : rgba(pal.ink, 0.6); ctx.lineWidth = LW * 0.6
    ctx.beginPath(); ctx.moveTo(bx - br * 0.32, by - br * 0.1); ctx.quadraticCurveTo(bx - br * 0.1, by + br * 0.3, bx, by - br * 0.05); ctx.quadraticCurveTo(bx + br * 0.1, by + br * 0.3, bx + br * 0.32, by - br * 0.1); ctx.stroke()
    // rosca / base
    ctx.strokeStyle = pal.ink; ctx.lineWidth = LW
    const baseY = by + br * 0.92
    rr(ctx, bx - br * 0.42, baseY, br * 0.84, R * 0.32, 4); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(bx - br * 0.32, baseY + R * 0.42); ctx.lineTo(bx + br * 0.32, baseY + R * 0.42); ctx.stroke()
    // rayitos que salen al encender
    if (on > 0.1) {
      ctx.save(); ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 0.7; ctx.globalAlpha = on
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + (i - 3.5) * 0.42
        const r0 = br * 1.22, r1 = br * (1.42 + 0.18 * on)
        ctx.beginPath(); ctx.moveTo(bx + Math.cos(a) * r0, by + Math.sin(a) * r0); ctx.lineTo(bx + Math.cos(a) * r1, by + Math.sin(a) * r1); ctx.stroke()
      }
      ctx.restore()
    }
    ctx.restore()
  },
})

// =============================================================================
// LEARN — birrete de graduacion con borla que se mueve
// =============================================================================
register({
  id: 'anim.wellness.learn', lib: 'anim', category: 'wellness', tones: ['dark', 'light'],
  rubros: ['educacion', 'default', 'tech'], weight: 1, tags: ['graduacion', 'birrete', 'estudiar', 'educacion', 'titulo'],
  register: 'editorial', intensity: 'soft', concept: 'learn', describe: 'Un birrete de graduacion; su borla se balancea y el boton brilla en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    const cx = CX, cy = CY - R * 0.2, w = R * 1.7
    ctx.save()
    ink(ctx, pal, LW * 1.0); ctx.strokeStyle = pal.ink
    // tapa (rombo) del birrete
    const top = cy - R * 0.5
    ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.85 : 0.9)
    ctx.beginPath()
    ctx.moveTo(cx, top - R * 0.45)
    ctx.lineTo(cx + w * 0.5, top)
    ctx.lineTo(cx, top + R * 0.45)
    ctx.lineTo(cx - w * 0.5, top); ctx.closePath(); ctx.fill()
    // cabeza / banda
    ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.7 : 0.8)
    ctx.beginPath()
    ctx.moveTo(cx - w * 0.32, top + R * 0.1)
    ctx.quadraticCurveTo(cx, top + R * 0.9, cx + w * 0.32, top + R * 0.1)
    ctx.lineTo(cx + w * 0.32, top + R * 0.02)
    ctx.lineTo(cx, top + R * 0.45)
    ctx.lineTo(cx - w * 0.32, top + R * 0.02); ctx.closePath(); ctx.fill()
    // boton central en acento
    spark(ctx, pal, cx, top, R * 0.1, 1)
    // borla que cuelga y se balancea (sin salto en el loop: oscilacion sinusoidal de periodo per)
    const sw = Math.sin(loop(t, per) * TAU) * 0.5
    const cordLen = R * 1.05
    const ex = cx + Math.sin(sw) * cordLen, ey = top + Math.cos(sw) * 0 + cordLen * 0.95
    // arranca del boton hacia la derecha y cae
    const sx = cx + w * 0.5 * 0.0
    ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 0.7
    ctx.beginPath(); ctx.moveTo(cx, top)
    const swx = cx + Math.sin(sw) * R * 0.95, swy = top + R * 1.1
    ctx.quadraticCurveTo(cx + Math.sin(sw) * R * 0.5, top + R * 0.6, swx, swy); ctx.stroke()
    // borla (flecos) en acento
    ctx.save(); ctx.fillStyle = pal.accent
    ctx.beginPath(); ctx.arc(swx, swy, R * 0.1, 0, TAU); ctx.fill()
    for (let i = 0; i < 5; i++) { const fa = (i - 2) * 0.16; ctx.beginPath(); ctx.moveTo(swx, swy); ctx.lineTo(swx + Math.sin(fa) * R * 0.18, swy + R * 0.32); ctx.lineWidth = 2; ctx.strokeStyle = pal.accent; ctx.stroke() }
    ctx.restore()
    ctx.restore()
  },
})

// =============================================================================
// DROPLET — gota que cae y hace onda
// =============================================================================
register({
  id: 'anim.wellness.droplet', lib: 'anim', category: 'wellness', tones: ['dark', 'light'],
  rubros: ['salud', 'belleza', 'default', 'gastronomia'], weight: 1, tags: ['gota', 'agua', 'hidratacion', 'frescura', 'onda'],
  register: 'neutral', intensity: 'calm', concept: 'droplet', describe: 'Una gota cae, toca el agua y abre ondas concentricas en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    const surfY = CY + R * 0.9, topY = CY - R * 1.3
    // linea de agua
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.3); ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(CX - R * 1.5, surfY); ctx.lineTo(CX + R * 1.5, surfY); ctx.stroke(); ctx.restore()
    // gota cayendo 0..0.45
    const fall = eOutCubic(clamp(inv(p, 0.0, 0.45), 0, 1))
    const dropY = lerp(topY, surfY, fall)
    if (fall < 1) {
      const stretch = 1 + 0.4 * (1 - fall)   // se estira al caer, se redondea cerca del agua
      ctx.save(); ctx.translate(CX, dropY)
      // gota: punta arriba, base redonda
      const dw = R * 0.42, dh = R * 0.55 * stretch
      ctx.fillStyle = pal.accent
      ctx.beginPath()
      ctx.moveTo(0, -dh)
      ctx.bezierCurveTo(dw, -dh * 0.1, dw, dh * 0.6, 0, dh * 0.6)
      ctx.bezierCurveTo(-dw, dh * 0.6, -dw, -dh * 0.1, 0, -dh); ctx.closePath(); ctx.fill()
      // brillo interior
      ctx.fillStyle = rgba(pal.tone === 'light' ? '#ffffff' : '#ffffff', 0.45)
      ctx.beginPath(); ctx.arc(-dw * 0.3, dh * 0.1, dw * 0.22, 0, TAU); ctx.fill()
      ctx.restore()
    }
    // ondas tras el impacto (0.45..1)
    const splash = clamp(inv(p, 0.45, 1.0), 0, 1)
    if (splash > 0) {
      ctx.save(); ctx.strokeStyle = pal.accent
      for (let i = 0; i < 3; i++) {
        const ph = clamp(splash - i * 0.16, 0, 1)
        if (ph <= 0) continue
        const rad = ph * R * (1.1 + i * 0.25)
        ctx.globalAlpha = (1 - ph) * 0.8; ctx.lineWidth = LW * 0.7 * (1 - ph * 0.5)
        ctx.beginPath(); ctx.ellipse(CX, surfY, rad, rad * 0.28, 0, 0, TAU); ctx.stroke()
      }
      ctx.restore()
    }
    // salpicadura puntual justo al impacto
    const hit = clamp(inv(p, 0.42, 0.55), 0, 1) * (1 - clamp(inv(p, 0.5, 0.65), 0, 1))
    if (hit > 0) spark(ctx, pal, CX, surfY, R * 0.1 * hit, hit)
  },
})

// =============================================================================
// BRAIN — cerebro estilizado con un pulso
// =============================================================================
register({
  id: 'anim.wellness.brain', lib: 'anim', category: 'wellness', tones: ['dark', 'light'],
  rubros: ['salud', 'educacion', 'tech', 'default'], weight: 1, tags: ['cerebro', 'mente', 'pensar', 'memoria', 'neuro'],
  register: 'corporate', intensity: 'soft', concept: 'brain', describe: 'Un cerebro estilizado; un pulso de acento recorre sus circunvoluciones.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.0, p = loop(t, per)
    ctx.save(); ctx.translate(CX, CY)
    const rad = R * 1.15
    ink(ctx, pal, LW * 1.0); ctx.strokeStyle = pal.ink
    // contorno general del cerebro (dos lobulos)
    ctx.beginPath()
    ctx.moveTo(-rad * 0.05, -rad * 0.9)
    ctx.bezierCurveTo(-rad * 0.9, -rad * 1.0, -rad * 1.05, rad * 0.3, -rad * 0.6, rad * 0.7)
    ctx.bezierCurveTo(-rad * 0.3, rad * 1.0, rad * 0.3, rad * 1.0, rad * 0.6, rad * 0.7)
    ctx.bezierCurveTo(rad * 1.05, rad * 0.3, rad * 0.9, -rad * 1.0, rad * 0.05, -rad * 0.9)
    ctx.bezierCurveTo(rad * 0.05, -rad * 0.6, -rad * 0.05, -rad * 0.6, -rad * 0.05, -rad * 0.9)
    ctx.closePath(); ctx.stroke()
    // surcos internos (circunvoluciones) — caminos fijos
    const folds = [
      [[-rad * 0.5, -rad * 0.5], [-rad * 0.2, -rad * 0.3], [-rad * 0.45, -rad * 0.05], [-rad * 0.15, rad * 0.2]],
      [[-rad * 0.7, rad * 0.1], [-rad * 0.4, rad * 0.25], [-rad * 0.55, rad * 0.5]],
      [[rad * 0.5, -rad * 0.5], [rad * 0.2, -rad * 0.3], [rad * 0.45, -rad * 0.05], [rad * 0.15, rad * 0.2]],
      [[rad * 0.7, rad * 0.1], [rad * 0.4, rad * 0.25], [rad * 0.55, rad * 0.5]],
    ]
    ctx.strokeStyle = rgba(pal.ink, 0.45); ctx.lineWidth = LW * 0.6
    for (const f of folds) { ctx.beginPath(); ctx.moveTo(f[0][0], f[0][1]); for (let i = 1; i < f.length; i++) { const m = f[i - 1], n = f[i]; ctx.quadraticCurveTo((m[0] + n[0]) / 2 + R * 0.1, (m[1] + n[1]) / 2, n[0], n[1]) } ctx.stroke() }
    // surco central
    ctx.strokeStyle = rgba(pal.ink, 0.6); ctx.lineWidth = LW * 0.7
    ctx.beginPath(); ctx.moveTo(0, -rad * 0.85); ctx.lineTo(0, rad * 0.75); ctx.stroke()
    // pulso de acento que recorre el primer surco (loopea por el ciclo)
    const path = folds[0].concat(folds[2].slice().reverse())
    const seg = p * (path.length - 1), si = Math.min(path.length - 2, Math.floor(seg)), st = seg - si
    const px = lerp(path[si][0], path[si + 1][0], st), py = lerp(path[si][1], path[si + 1][1], st)
    spark(ctx, pal, px, py, R * 0.09, 0.7 + 0.3 * pulse(t, 1.2))
    ctx.restore()
  },
})

// =============================================================================
// DUMBBELL — mancuerna que sube y baja
// =============================================================================
register({
  id: 'anim.wellness.dumbbell', lib: 'anim', category: 'wellness', tones: ['dark', 'light'],
  rubros: ['salud', 'default', 'moda'], weight: 1, tags: ['gimnasio', 'mancuerna', 'pesas', 'fitness', 'entrenar'],
  register: 'corporate', intensity: 'medium', concept: 'lift', describe: 'Una mancuerna sube y baja (rep) con un destello de esfuerzo en acento arriba.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.4
    // movimiento de rep suave (sube-baja) sin salto: coseno de periodo per
    const ph = loop(t, per)
    const up = (1 - Math.cos(ph * TAU)) / 2           // 0 abajo -> 1 arriba -> 0 abajo, continuo
    const lift = eInOutCubic(up)
    const cy = CY + R * 0.6 - lift * R * 1.0
    ctx.save(); ctx.translate(CX, cy)
    const barW = R * 1.5, plateW = R * 0.28, plateH = R * 0.95, innerH = R * 0.62
    ink(ctx, pal, LW * 1.0); ctx.strokeStyle = pal.ink
    // barra central
    ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.85 : 0.9)
    rr(ctx, -barW * 0.5, -R * 0.1, barW, R * 0.2, R * 0.1); ctx.fill()
    // discos (4: dos por lado), el par exterior en acento
    const drawPlate = (x, w, h, fill) => { rr(ctx, x - w / 2, -h / 2, w, h, w * 0.35); ctx.fillStyle = fill; ctx.fill() }
    drawPlate(-barW * 0.5 + plateW * 0.5, plateW, innerH, rgba(pal.ink, 0.85))
    drawPlate(barW * 0.5 - plateW * 0.5, plateW, innerH, rgba(pal.ink, 0.85))
    drawPlate(-barW * 0.5 - plateW * 0.2, plateW * 1.05, plateH, pal.accent)
    drawPlate(barW * 0.5 + plateW * 0.2, plateW * 1.05, plateH, pal.accent)
    ctx.restore()
    // destello de esfuerzo cuando llega arriba
    if (up > 0.85) { const a = clamp(inv(up, 0.85, 1), 0, 1); spark(ctx, pal, CX, cy - plateH * 0.6, R * 0.08, a) }
  },
})

// =============================================================================
// SPROUT — brote que sale de la tierra
// =============================================================================
register({
  id: 'anim.wellness.sprout', lib: 'anim', category: 'wellness', tones: ['dark', 'light'],
  rubros: ['salud', 'gastronomia', 'default', 'inmobiliaria'], weight: 1, tags: ['brote', 'semilla', 'crecer', 'inicio', 'germinar'],
  register: 'friendly', intensity: 'calm', concept: 'sprout', describe: 'Un brote de dos hojas emerge de la tierra y se abre; las hojas en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 3.2, p = loop(t, per)
    const groundY = CY + R * 1.1
    // tierra (montículo + linea)
    ctx.save(); ctx.strokeStyle = rgba(pal.ink, 0.55); ctx.lineWidth = LW * 0.8; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(CX - R * 1.4, groundY); ctx.lineTo(CX + R * 1.4, groundY); ctx.stroke()
    // punteado de tierra debajo
    ctx.strokeStyle = rgba(pal.ink, 0.3); ctx.setLineDash([3, 6])
    ctx.beginPath(); ctx.moveTo(CX - R * 1.1, groundY + R * 0.28); ctx.lineTo(CX + R * 1.1, groundY + R * 0.28); ctx.stroke(); ctx.setLineDash([])
    ctx.restore()
    // tallo que emerge 0.1..0.55
    const grow = eOutCubic(clamp(inv(p, 0.1, 0.55), 0, 1))
    const sway = 0.04 * Math.sin(loop(t, per) * TAU)
    const stemH = R * 1.0 * grow
    const topY = groundY - stemH
    ink(ctx, pal, LW * 0.95); ctx.strokeStyle = rgba(pal.ink, pal.tone === 'light' ? 0.85 : 0.9)
    ctx.beginPath(); ctx.moveTo(CX, groundY)
    ctx.quadraticCurveTo(CX + sway * R * 4, groundY - stemH * 0.5, CX + sway * R * 2, topY); ctx.stroke()
    const tipX = CX + sway * R * 2
    // dos hojas que se abren 0.4..0.85
    const openL = eOutBack(clamp(inv(p, 0.4, 0.85), 0, 1))
    if (openL > 0.02) {
      const len = R * 0.85 * openL
      for (const sgn of [-1, 1]) {
        ctx.save(); ctx.translate(tipX, topY); ctx.rotate(sgn * (0.7 + sway))
        // contorno hoja
        ctx.strokeStyle = pal.ink; ctx.lineWidth = LW * 0.85
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.45, -len * 0.4 * sgn, len, 0); ctx.quadraticCurveTo(len * 0.45, len * 0.25 * sgn, 0, 0); ctx.stroke()
        // relleno de acento
        ctx.save(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.45, -len * 0.4 * sgn, len, 0); ctx.quadraticCurveTo(len * 0.45, len * 0.25 * sgn, 0, 0); ctx.clip()
        ctx.globalAlpha = 0.28; ctx.fillStyle = pal.accent; ctx.fillRect(0, -len, len, len * 2); ctx.restore()
        ctx.restore()
      }
    }
    if (grow > 0.95) spark(ctx, pal, tipX, topY, R * 0.06, 0.4 + 0.4 * pulse(t, 1.8))
  },
})

// =============================================================================
// APPLE — manzana con un brillo (nutricion)
// =============================================================================
register({
  id: 'anim.wellness.apple', lib: 'anim', category: 'wellness', tones: ['dark', 'light'],
  rubros: ['salud', 'gastronomia', 'educacion', 'default'], weight: 1, tags: ['manzana', 'nutricion', 'sano', 'fruta', 'dieta'],
  register: 'friendly', intensity: 'soft', concept: 'apple', describe: 'Una manzana late suave; su hojita se mece y un brillo cruza en acento.',
  render(ctx, t, env) {
    const { pal } = env, per = 2.8, p = loop(t, per)
    const beat = 1 + 0.03 * pulse(t, per)
    ctx.save(); ctx.translate(CX, CY + R * 0.15); ctx.scale(beat, beat)
    const rad = R * 1.05
    ink(ctx, pal, LW * 1.0); ctx.strokeStyle = pal.ink
    // cuerpo de la manzana (dos lobulos, hendidura arriba)
    ctx.fillStyle = rgba(pal.ink, pal.tone === 'light' ? 0.08 : 0.14)
    ctx.beginPath()
    ctx.moveTo(0, -rad * 0.55)
    ctx.bezierCurveTo(-rad * 0.55, -rad * 1.1, -rad * 1.25, -rad * 0.35, -rad * 1.05, rad * 0.25)
    ctx.bezierCurveTo(-rad * 0.9, rad * 0.95, -rad * 0.35, rad * 1.15, 0, rad * 0.78)
    ctx.bezierCurveTo(rad * 0.35, rad * 1.15, rad * 0.9, rad * 0.95, rad * 1.05, rad * 0.25)
    ctx.bezierCurveTo(rad * 1.25, -rad * 0.35, rad * 0.55, -rad * 1.1, 0, -rad * 0.55)
    ctx.closePath(); ctx.fill(); ctx.stroke()
    // hendidura central arriba
    ctx.strokeStyle = rgba(pal.ink, 0.5); ctx.lineWidth = LW * 0.7
    ctx.beginPath(); ctx.moveTo(0, -rad * 0.55); ctx.lineTo(0, -rad * 0.78); ctx.stroke()
    // tallo
    ctx.strokeStyle = pal.ink; ctx.lineWidth = LW * 0.8
    ctx.beginPath(); ctx.moveTo(0, -rad * 0.78); ctx.quadraticCurveTo(rad * 0.08, -rad * 1.05, rad * 0.18, -rad * 1.1); ctx.stroke()
    // hojita que se mece (en acento)
    const lf = 0.18 * Math.sin(loop(t, per) * TAU)
    ctx.save(); ctx.translate(rad * 0.18, -rad * 1.02); ctx.rotate(-0.5 + lf)
    ctx.fillStyle = pal.accent
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(rad * 0.28, -rad * 0.22, rad * 0.52, 0); ctx.quadraticCurveTo(rad * 0.28, rad * 0.18, 0, 0); ctx.closePath(); ctx.fill()
    ctx.restore()
    // brillo que cruza la mejilla de la manzana
    const sh = loop(t, per)
    const sx = lerp(-rad * 0.7, rad * 0.1, sh), sy = lerp(-rad * 0.1, rad * 0.4, sh)
    ctx.save(); ctx.globalAlpha = Math.sin(sh * Math.PI) * 0.85; ctx.strokeStyle = pal.accent; ctx.lineWidth = LW * 0.9
    ctx.beginPath(); ctx.arc(sx, sy, rad * 0.32, -Math.PI * 0.75, -Math.PI * 0.25); ctx.stroke(); ctx.restore()
    ctx.restore()
  },
})

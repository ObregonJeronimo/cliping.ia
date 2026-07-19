// urvid 1.0 · RENDER — compositor. drawFrame(ctx, t, video): dibuja el FONDO (continuo) + la ESCENA activa, con
// TRANSICIONES entre escenas. En la ventana de transicion A y B se pintan cada una a un BUFFER offscreen y la lib
// transitions compone los buffers (clip/transform); ademas A se DISUELVE (alpha 1->0) para que su texto no quede
// pisando a B. Sin buffer disponible (Node pelado) cae al modo directo previo. ctx en espacio logico 405x720.
import { get } from './registry.js'
import { W, H, inv, clamp, eOutCubic, setFormat, rgba } from './util.js'
import { seedFor } from './prng.js'
import { resolveMotion } from './motion.js'
import { resolveTypekit } from './typekit.js'
import { resolveTransition } from './transitions.js'
import { drawOverlays } from './overlay.js'
import { resolvePost } from './post.js'
import { resolveLayout } from './layout.js'

const XF = 0.4   // ventana de transicion entre escenas (s) — corta = snappy, menos tiempo de solape

// SCRATCH (buffer offscreen) para componer escenas en la transicion. En browser/Remotion (Chromium) hay
// OffscreenCanvas; los tools Node (napi-canvas) inyectan su createCanvas con setScratchFactory. Sin ninguno
// (Node pelado) -> null -> la transicion cae al modo directo previo (sin crossfade, comportamiento intacto).
let _scratchFactory = null
export function setScratchFactory(fn) { _scratchFactory = fn }

// LOGO (brand-kit): se decodifica una vez por dataURL y se cachea. En browser/Remotion usa Image(); en Node pelado
// (sin Image) NO dibuja logo (los tools no lo necesitan). Mientras decodifica, se saltea (cuando esta listo, aparece).
const _logoCache = new Map()
function _getLogo(src) {
  if (!src || typeof Image === 'undefined') return null
  let e = _logoCache.get(src)
  if (!e) { const img = new Image(); e = { img, ready: false }; try { img.onload = () => { e.ready = true } } catch { /* noop */ } img.src = src; _logoCache.set(src, e) }
  return e.ready && e.img.width ? e.img : null
}
// FOTO real del producto (slot-media). Mismo patron que el logo (decode async + cache + skip-si-no-ready), generalizado.
// crossOrigin='anonymous' de entrada -> el canvas no queda tainted en el export (MediaRecorder/toBlob). setImageLoader
// es un hook OPCIONAL (paralelo a setScratchFactory) que el contact-sheet usa para inyectar una imagen YA decodificada
// (loadImage de napi) -> en gates/napi NO se setea y typeof Image es undefined -> _getImg devuelve null -> la escena
// degrada a hero tipografico -> determinismo INTACTO para todo brief sin mediaImage (los 9 gates).
let _imageLoader = null
export function setImageLoader(fn) { _imageLoader = fn }
const _imgCache = new Map()
function _getImg(src) {
  if (!src) return null
  let e = _imgCache.get(src)
  if (!e) {
    if (_imageLoader) { e = { img: _imageLoader(src) || null, ready: true } }   // imagen ya decodificada (verify): sincrona
    else if (typeof Image !== 'undefined') { const img = new Image(); try { img.crossOrigin = 'anonymous' } catch { /* noop */ } e = { img, ready: false }; try { img.onload = () => { e.ready = true } } catch { /* noop */ } img.src = src }
    else { e = { img: null, ready: false } }   // Node pelado sin loader -> null -> la escena degrada limpio
    _imgCache.set(src, e)
  }
  return e.ready && e.img && e.img.width ? e.img : null
}
function makeScratch(w, h) {
  if (_scratchFactory) return _scratchFactory(w, h)
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h)
  if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
  return null
}
// scratch portatil para hornear tiles/patrones (mismo canvas inyectado: napi en gates/shot, OffscreenCanvas en browser).
// Sin factory ni OffscreenCanvas (Node pelado) devuelve null -> el consumidor degrada a no-op.
export function getScratch(w, h) { return makeScratch(w, h) }
// BUFFERS DE TRANSICION REUSADOS: en la ventana de transicion se pintan A y B a sendos buffers offscreen, UNA VEZ POR
// FRAME. Alocar 2 canvas nuevos por frame es churn de GC que el export real-time (MediaRecorder) paga como dropped frames.
// Aca los cacheamos por slot (0=A, 1=B) y los reusamos mientras el tamano (bw,bh) coincida; si cambia (otro ss/scale) o
// si makeScratch devuelve null (Node pelado), se realoca/queda null. El consumidor SIEMPRE limpia con clearRect antes de
// pintar -> reuso byte-identico a buffer nuevo (determinismo intacto). null-safe igual que makeScratch.
const _xbuf = [null, null]
function transitionBuf(slot, w, h) {
  let cv = _xbuf[slot]
  if (!cv || cv.width !== w || cv.height !== h) cv = (_xbuf[slot] = makeScratch(w, h))
  return cv
}
// NITIDEZ de imagenes rasterizadas (logo de marca + foto showcase): el default del canvas es imageSmoothingQuality 'low'.
// Al downscalear el PNG/foto a su tamano en pantalla y exportar a 1080+ el ctx la remuestrea pobre -> se ve BLANDA. Forzamos
// 'high' en cada ctx que dibuja imagenes escaladas. Solo afecta drawImage con escala (logo + scene.showcase); los gradientes,
// el dither (fillRect) y los blits 1:1 de transicion NO cambian -> los gates (sin logo/mediaImage) quedan byte-identicos.
// Guard 'in' por si un backend no expone la propiedad. Idempotente y barato (solo asigna props).
function smooth(c) { c.imageSmoothingEnabled = true; if ('imageSmoothingQuality' in c) c.imageSmoothingQuality = 'high' }

// PUSH CINEMATOGRAFICO DE FONDO (no del texto): zoom+deriva LENTOS y MINIMOS sobre las capas bg/sub. Deriva de
// motion.life (0..1 fluidez) * motion.ambient(t,seed) (oscilacion PURA de t+seed -> DETERMINISTA). z>=1 SIEMPRE (zoom-in
// solo recorta hacia adentro, nunca revela borde sin pintar); la deriva se ACOTA al overscan (z-1)*W/2. El TEXTO no pasa
// por aca (paintScene es aparte) -> glifos pixel-estables, cero shimmer. Hace ctx.save(); el llamador hace ctx.restore().
// rate = multiplicador de la vida (PARALLAX, OLA VISUAL): el bg va a rate=1 (byte-identico) y el substrate a rate>1 ->
// la capa de textura (mas "adelante") deriva/zoomea MAS que el fondo -> separacion de profundidad al reproducir. Sigue
// acotado al overscan (nunca revela borde). rate=1 por defecto -> sin cambio.
function bgPush(ctx, t, motion, seed, rate = 1) {
  ctx.save()
  const life = clamp(motion && motion.life != null ? motion.life : 0, 0, 1)
  if (life <= 0 || !motion || typeof motion.ambient !== 'function') return   // sin vida -> sin transform (save ya hecho)
  const amb = motion.ambient(t, (seed >>> 0)) || {}
  const z = Math.max(1, 1 + life * rate * (0.006 + Math.abs(amb.scale || 0)))  // zoom-in MINIMO, SIEMPRE >=1
  const mx = (z - 1) * W / 2, my = (z - 1) * H / 2                            // overscan -> tope de la deriva
  const ox = clamp((amb.x || 0) * life * rate * 0.6, -mx, mx), oy = clamp((amb.y || 0) * life * rate * 0.6, -my, my)
  ctx.translate(W / 2 + ox, H / 2 + oy); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2)
}

// pinta UNA escena (contenido) con la ENTRADA de la personalidad (offset/zoom/rotacion de entrada). Coords logicas.
function paintScene(ctx, sc, t, video, motion, typekit, layout) {
  const mod = get(sc.sceneId); if (!mod) return
  smooth(ctx)   // foto showcase nitida en cualquier ctx (principal o buffer de transicion)
  const ts = t - sc.start
  // ENTRADA modulada por SERIEDAD: publico serio (salud/finanzas) -> entrada mas SUTIL y corta; relajado -> mas expresiva.
  // PURA (sin r()). Back-compat: sin seriousness -> dev=0 -> intK=1, factor-dur=1 -> BYTE-IDENTICO. El clamp superior de
  // eDur (0.9s) mantiene la entrada << 0.7*dur_min (=1.54s, piso 2.2s) -> toda escena ASENTADA (k=0) en el muestreo de prefit/qa.
  const s = video.seriousness != null ? video.seriousness : 0.5, dev = 0.5 - s
  const intK = clamp(1 + dev * 0.6, 0.7, 1.3)
  const eDur = clamp((motion.enterDur || 0.5) * clamp(1 + dev * 0.5, 0.75, 1.25), 0.2, 0.7)   // OLA VISUAL #8: techo 0.9->0.7 -> el mensaje ASIENTA (queda legible) ~0.2s antes tras el corte, sin beat vacío largo. Sigue << 0.7*dur_min (settle garantizado en el muestreo de prefit/qa)
  // OVERSHOOT (OLA VISUAL): la entrada usa settle (spring que se pasa y rebota) en vez de ease monotonico
  // -> pop con asentamiento fisico real. En ts>=eDur settle=1 -> k=0 exacto: asentado pixel-estable igual que hoy.
  const ep = motion.settle ? motion.settle(inv(ts, 0, eDur)) : motion.ease(inv(ts, 0, eDur)), k = 1 - ep
  const en = motion.enter || {}
  // FLUIDEZ vs LEGIBILIDAD: el CONTENIDO (texto incluido) NO se escala ni deriva de forma CONTINUA. El ken-burns
  // (zoom lento <=1.2% sobre toda la escena) re-rasterizaba el glifo a escala sub-pixel cuadro a cuadro -> shimmer/
  // crawl en los bordes = se veia TOSCO en TODOS los videos. Tampoco la deriva sinusoidal `ambient`. Ahora la unica
  // transformacion del frame es la ENTRADA (offset/zoom que DECAE en enterDur y se lee como "pop", no como shimmer):
  // una vez asentado, el texto queda 100% PIXEL-ESTABLE. La vida continua la ponen el fondo/sub/atm (sin texto) y la
  // DECO de cada modulo (barras/sheen/glow). `motion.life` sigue en el contrato de las personalidades pero ya NO
  // mueve el contenido, a proposito (si en el futuro se quiere un push cinematografico, va sobre el FONDO, no el texto).
  const z = 1 + (en.scale || 0) * k * intK
  const ox = (en.dx || 0) * k * intK, oy = (en.dy || 0) * k * intK, rot = (en.rotate || 0) * k * intK
  // MICRO-CAMARA (OLA MOVIMIENTO — finales congelados): drift MONOTONICO por progreso de escena
  // (zoom 1.2-2.5% + pan <=6px), amplitud x motion.life (reducedMotion -> 0 -> byte-identico) y atenuada
  // por seriedad. MONOTONICO = sin reversiones = sin el crawl que mato al ken-burns sinusoidal viejo.
  // Params frescos de sc.seed por llamada (seek-safe). CRITERIO DE REVERT: si Jero ve texto "vibrando"
  // en el preview, poner CAM_K = 0 y este bloque queda inerte.
  const CAM_K = 1
  const rc = seedFor((sc.seed >>> 0), 'cam')
  const camIn = rc() < 0.55, camZ = 0.012 + rc() * 0.013
  const camPX = (rc() - 0.5) * 10, camPY = (rc() - 0.5) * 8
  const _life = clamp(motion && motion.life != null ? motion.life : 0, 0, 1)
  const camK = CAM_K * _life * clamp(1 - (s - 0.5) * 0.8, 0.6, 1.2)
  const _prog = clamp(ts / (sc.dur || 3), 0, 1)
  const cz = 1 + camZ * camK * (camIn ? _prog : 1 - _prog)
  const cox = camPX * camK * _prog, coy = camPY * camK * _prog
  ctx.save()
  ctx.translate(W / 2 + ox + cox, H / 2 + oy + coy); ctx.rotate(rot); ctx.scale(z * cz, z * cz); ctx.translate(-W / 2, -H / 2)
  mod.render(ctx, ts, { pal: video.palette, content: sc.content || video.content, fonts: video.fonts, seed: sc.seed, energy: 1, sceneDur: sc.dur, motion, typekit, layout, mediaImage: video.mediaImage, getImg: _getImg, rubro: video.rubro, look: sc.look })   // sc.content = override de texto POR-ESCENA del timeline (item timeline Fase 2); ausente -> content global -> byte-identico (gates intactos)
  ctx.restore()
}

export function drawFrame(ctx, t, video, opts = {}) {
  setFormat(video.format)   // sincroniza W/H al formato del video (live binding que leen todos los modulos)
  ctx.clearRect(0, 0, W, H)
  smooth(ctx)   // logo de marca nitido al exportar a alta (default 'low' lo deja blando)
  const motion = resolveMotion(video)   // personalidad de movimiento del video (o default)
  const typekit = resolveTypekit(video) // efecto de texto cinetico del video (o plain)
  const transition = resolveTransition(video) // transicion entre escenas (o cut)
  const layout = resolveLayout(video)   // arquitectura de composicion (slots) del video (o default centrado)
  // CAPAS DE FONDO (viven todo el video): fondo -> textura/substrate -> atmosfera/luz -> (contenido encima)
  // PRESUPUESTO ADAPTATIVO de draws (item L717): quality (default 1) escala el conteo de particulas de los substrates/atm
  // pesados (grano/fibra/polvo: cientos-miles de fillRect por frame). 1 = full -> export/gates BYTE-IDENTICOS; el preview
  // en vivo lo baja (loop continuo) para ganar FPS sin tocar la calidad del export. Puro; no consume PRNG.
  const quality = opts.quality != null ? opts.quality : (video.quality != null ? video.quality : 1)
  const base = { pal: video.palette, content: video.content, energy: 1, quality }
  if (video.bgId) { const m = get(video.bgId); if (m) { const _sc = video.scenes && video.scenes.find(s => t >= s.start && t < s.start + s.dur); const _bs = (_sc && _sc.bgSeed != null) ? _sc.bgSeed : video.bgSeed; bgPush(ctx, t, motion, _bs); m.render(ctx, t, { ...base, seed: _bs }); ctx.restore() } }
  if (video.subId) { const m = get(video.subId); if (m) { bgPush(ctx, t, motion, video.subSeed, 1.8); m.render(ctx, t, { ...base, seed: video.subSeed }); ctx.restore() } }   // PARALLAX: sub a 1.8x del bg (profundidad)
  if (video.atmId) { const m = get(video.atmId); if (m) m.render(ctx, t, { ...base, seed: video.atmSeed }) }   // atm SIN push (rays/glints crawlean)
  // GARNISH markkit (persistente): un icono chico en una ESQUINA, tenue, detras del contenido. NUNCA centrado
  // (no compite con el titulo; la regla "nada de blobs/formas sobre el titulo"). Solo iconos (ver assemble.js).
  // MARK POR ESCENA (OLA VISUAL): antes garnish+marco salian IDENTICOS en TODOS los frames del video
  // (misma esquina, mismo alpha) = huella de "video generado". Ahora la presencia y la esquina se modulan
  // por la ESCENA activa (sc.seed, puro): ~2/3 de escenas con garnish, ~1/2 con marco, esquina rotada,
  // fade de 0.25s al entrar, y SIEMPRE ocultos en la primera escena (el hook abre limpio).
  const _mkSc = video.scenes && video.scenes.find(sc => t >= sc.start && t < sc.start + sc.dur)
  const _mkFirst = _mkSc && video.scenes[0] === _mkSc
  const _mkFade = _mkSc ? clamp((t - _mkSc.start) / 0.25, 0, 1) : 1
  if (video.markId && !(_mkFirst) && !(_mkSc && ((_mkSc.seed >>> 2) % 3) === 0)) {
    const m = get(video.markId)
    if (m) {
      const corners = [[W * 0.82, H * 0.14], [W * 0.82, H * 0.86], [W * 0.18, H * 0.86]]   // TR / BR / BL
      const _ci = _mkSc ? ((video.markSeed ^ _mkSc.seed) >>> 0) % corners.length : (video.markSeed >>> 0) % corners.length
      const [gx, gy] = corners[_ci], s = 0.2
      // GARNISH-BY-SERIOUSNESS: brief serio -> adorno mas tenue (menos competencia con la lectura); relajado -> mas presente.
      const _gs = video.seriousness != null ? video.seriousness : 0.5
      const _gK = clamp(1 - 0.5 * (_gs - 0.5), 0.7, 1.3)   // s=0.85->0.825 ; s=0.5->1.0 ; s=0.2->1.15
      // VIDA ambient (deco pura, sin glifos): deriva sutil + respiracion de alpha. Determinista (solo t+seed).
      const _ph = (video.markSeed % 7)
      const br = 1 + 0.08 * Math.sin(t * 0.5 + _ph)
      ctx.save(); ctx.globalAlpha = (video.tone === 'light' ? 0.5 : 0.62) * _gK * _mkFade * clamp(br, 0.9, 1.1)
      ctx.translate(gx + Math.sin(t * 0.35 + _ph) * 2.5, gy + Math.cos(t * 0.28 + _ph) * 2); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2)
      m.render(ctx, t, { ...base, seed: video.markSeed })
      ctx.restore()
    }
  }
  // MARCA EDITORIAL (item L154): un MARCO HUECO del rubro (corchetes/filigrana/ventana) a escala de BORDE, DETRAS del contenido,
  // tenue. NO escribe texto ni bloquea el centro -> no compite con el titulo ni desborda (no toca el layout). Escala 1.45:
  // el marco (bw~W*0.62) pasa a ~W*0.9 -> enmarca el LIENZO, no el titulo. Tenue-por-seriedad (igual que el garnish). Determinista.
  if (video.editMarkId && !_mkFirst && !(_mkSc && ((_mkSc.seed >>> 4) & 1) === 0)) {
    const m = get(video.editMarkId)
    if (m) {
      const _es = video.seriousness != null ? video.seriousness : 0.5
      const _eK = clamp(1 - 0.5 * (_es - 0.5), 0.7, 1.3)
      const _eph = (video.editMarkSeed % 5)
      ctx.save(); ctx.globalAlpha = (video.tone === 'light' ? 0.55 : 0.62) * _eK * _mkFade * clamp(1 + 0.07 * Math.sin(t * 0.42 + _eph), 0.92, 1.08)
      const _ez = 1.45 * (1 + 0.004 * Math.sin(t * 0.4 + _eph))   // respiracion sutil del marco (deco, sin glifos)
      ctx.translate(W / 2, H / 2); ctx.scale(_ez, _ez); ctx.translate(-W / 2, -H / 2)
      m.render(ctx, t, { ...base, fonts: video.fonts, seed: (video.editMarkSeed >>> 0) })
      ctx.restore()
    }
  }
  // (Lotties ELIMINADOS 2026-07-01: los acentos animados por-escena y a nivel-video ensuciaban la composicion sin aportar.)
  // OLA VISUAL · UNA LUZ POR VIDEO: una direccion de luz COHERENTE para todo el video (angulo fijo derivado del seed,
  // determinista) -> un gradiente lineal MUY sutil sobre las capas de fondo (DEBAJO del contenido) aclara un lado y apaga
  // el opuesto, dando volumen en vez de un cuadro plano. Alpha bajo -> no afecta la legibilidad del texto (va encima). Puro.
  {
    const la = ((video.seed >>> 0) % 628) / 100                      // angulo fijo por video en [0,2π)
    const dx = Math.cos(la) * W * 0.75, dy = Math.sin(la) * H * 0.75, lightTone = video.tone === 'light'
    const g = ctx.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy)
    g.addColorStop(0, lightTone ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.06)')
    g.addColorStop(0.5, 'rgba(0,0,0,0)')
    g.addColorStop(1, lightTone ? 'rgba(20,15,25,0.05)' : 'rgba(0,0,0,0.11)')
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore()
  }
  // OLA VISUAL · KEY-WASH POR ESCENA: cada corte "re-ilumina" el cuadro — un lavado tenue teñido al ACENTO cuya posición
  // varía por ESCENA (sc.seed) y entra con el fade del corte -> cada beat se siente iluminado distinto (no un video plano).
  // Debajo del contenido, alpha bajo (no afecta legibilidad). Oculto en la 1ra escena (hook limpio). Determinista.
  if (_mkSc && !_mkFirst) {
    const ws = (_mkSc.seed >>> 0)
    const wx = W * (0.25 + 0.5 * ((ws % 97) / 97)), wy = H * (0.18 + 0.34 * (((ws >> 5) % 89) / 89))
    const wa = (video.tone === 'light' ? 0.045 : 0.065) * _mkFade
    const wg = ctx.createRadialGradient(wx, wy, 0, wx, wy, W * 0.95)
    wg.addColorStop(0, rgba(video.palette.accent, wa)); wg.addColorStop(1, rgba(video.palette.accent, 0))
    ctx.save(); if (video.tone !== 'light') ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = wg; ctx.fillRect(0, 0, W, H); ctx.restore()
  }
  // GUARD de texto CENTRALIZADO: scrim radial SUAVE en la zona del titulo (~centro), alpha BAJO -> legibilidad
  // consistente sin que cada fondo lo reimplemente y sin enturbiar fondos ya limpios. Debajo del texto. Determinista.
  {
    const light = video.tone === 'light', a = light ? 0.08 : 0.14
    const g = ctx.createRadialGradient(W / 2, H * 0.47, W * 0.22, W / 2, H * 0.47, W * 0.68)
    g.addColorStop(0, light ? 'rgba(255,255,255,' + a + ')' : 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore()
  }
  // ESCENA + TRANSICIONES — el CONTENIDO va ENCIMA de las capas (texto siempre legible).
  // Ventana de transicion [B.start, B.start+XF): A (saliente, ya asentada) + B (entrante, recien arrancando su
  // entrada) -> la lib transitions compone (wipe/slide/iris/bars/cut). Asi B SI es visible durante la transicion
  // (con la ventana vieja [B.start-XF, B.start) B salia en scene-time negativo = invisible). Fuera de ventana: 1 escena.
  const scenes = video.scenes
  if (!scenes || !scenes.length) return
  const xf = (video && video.xf) || XF   // ventana de transicion por personalidad de movimiento
  let trans = null
  for (let i = 1; i < scenes.length; i++) {
    const b = scenes[i].start
    if (t >= b && t < b + xf) { trans = { A: scenes[i - 1], B: scenes[i], p: (t - b) / xf }; break }
  }
  if (trans) {
    const p = inv(trans.p, 0, 1)
    // TRANSICION SECUENCIADA (no simultanea): el CONTENIDO de A y B NUNCA se ve a la vez. El fondo/sub/atm son
    // continuos (ya dibujados), asi que el contenido "dipea" a traves del fondo, no a negro.
    //   fase 1 [0, .5]: A (saliente) se DISUELVE sobre el fondo. B todavia NO aparece.
    //   fase 2 [.5, 1]: A ya se fue; B ENTRA con la geometria de la transicion (wipe/slide/iris/bars) sobre el fondo.
    // Antes A y B se cruzaban medio-visibles -> "se pisaban por medio segundo" (texto Y efectos). Ahora cero solape.
    const ss = (ctx.getTransform && ctx.getTransform().a) || 1
    const bw = Math.ceil(W * ss), bh = Math.ceil(H * ss)
    const bufA = transitionBuf(0, bw, bh), bufB = bufA ? transitionBuf(1, bw, bh) : null
    const blit = (c, buf, a) => { c.save(); c.globalAlpha *= clamp(a, 0, 1); c.drawImage(buf, 0, 0, W, H); c.restore() }
    if (bufA && bufB) {
      // SOLAPE CONTROLADO (fix del FRAME VACIO cazado por urvid1-cuts en cada corte): A sale en [0, 0.62]
      // (fade rapido: alpha <=8% desde p~0.35) y B entra desde p=0.35 con su geometria -> NUNCA un frame sin
      // contenido. El "texto pisado" que motivo el dip secuenciado no vuelve: cuando B aparece, A es fantasma.
      if (p < 0.62) {
        const ca = bufA.getContext('2d'); ca.setTransform(1, 0, 0, 1, 0, 0); ca.clearRect(0, 0, bufA.width, bufA.height); ca.setTransform(ss, 0, 0, ss, 0, 0); paintScene(ca, trans.A, t, video, motion, typekit, layout)
        // WHIP de salida (OLA VISUAL): A no solo se apaga — se VA con un empuje de escala hacia el corte
        // (transformacion sobre el buffer ya pintado: costo cero, determinista).
        const _we = eOutCubic(p / 0.62)
        ctx.save(); ctx.globalAlpha *= clamp(1 - _we, 0, 1)
        ctx.translate(W / 2, H / 2); ctx.scale(1 + 0.06 * _we * _we, 1 + 0.06 * _we * _we); ctx.translate(-W / 2, -H / 2)
        ctx.drawImage(bufA, 0, 0, W, H); ctx.restore()
      }
      if (p >= 0.35) {
        const cb = bufB.getContext('2d'); cb.setTransform(1, 0, 0, 1, 0, 0); cb.clearRect(0, 0, bufB.width, bufB.height); cb.setTransform(ss, 0, 0, ss, 0, 0); paintScene(cb, trans.B, t, video, motion, typekit, layout)
        transition.render(ctx, eOutCubic((p - 0.35) / 0.65), () => {}, c => blit(c, bufB, 1), { W, H })   // B entra mientras A se desvanece
      }
    } else {
      // fallback sin buffers (Node pelado): corte seco a mitad de ventana (sin solape, determinismo intacto).
      paintScene(ctx, p < 0.5 ? trans.A : trans.B, t, video, motion, typekit, layout)
    }
  } else {
    let act = null
    for (const sc of scenes) if (t >= sc.start && t < sc.start + sc.dur) { act = sc; break }
    if (!act) act = t < scenes[0].start ? scenes[0] : scenes[scenes.length - 1]
    paintScene(ctx, act, t, video, motion, typekit, layout)
  }
  // OVERLAYS del timeline (objetos texto/imagen del usuario, animados) — SOBRE la escena, DEBAJO del post (el grano los
  // integra). Short-circuit si no hay video.timeline -> byte-identico (gates intactos). En Node sin loader, las imagenes
  // se saltean (getImg -> null). Preview Y export pasan por drawFrame -> los overlays salen en ambos.
  if (video.timeline) drawOverlays(ctx, t, video, _getImg)
  // POST: acabado (grano/vignette/leak/grade/scanlines) SOBRE todo el cuadro -> el "film look" que une el frame.
  if (video.postId) { const post = resolvePost(video); post.render(ctx, t, { pal: video.palette, content: video.content, energy: 1, seed: video.postSeed >>> 0 }) }
  // LOGO de marca (brand-kit) en una esquina, chico y nitido (despues del post). Un logo NO es "foto real" -> ok.
  if (video.logo) {
    const img = _getLogo(video.logo)
    if (img) {
      const hh = H * 0.06, ww = hh * (img.width / img.height), m = W * 0.05, ap = inv(t, 0.2, 0.7)
      ctx.save(); ctx.globalAlpha = 0.92 * ap; ctx.drawImage(img, m, m, ww, hh); ctx.restore()
    }
  }
}

export const beatAt = (t, video) => { const sc = video.scenes.find(s => t >= s.start && t < s.start + s.dur); return sc ? sc.sceneId : '' }

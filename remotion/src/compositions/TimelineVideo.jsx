import { useCurrentFrame, useVideoConfig, delayRender, continueRender } from 'remotion'
import { useLayoutEffect, useRef, useState } from 'react'
import { W as LOGICAL_W, drawFrame } from '../../../src/pages/Animaciones/engineCore'

// FUENTES del sistema de estilos (display/text/accent). El MP4 final se renderiza en un Chromium aparte
// (no usa index.html), asi que hay que cargar las familias aca o el video sale con fallback. MANTENER
// SINCRONIZADO con index.html y backend/style_catalog.py STYLE_FONTS.
const ENGINE_FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;600;900&family=Barlow:wght@400;600&family=Big+Shoulders+Display:wght@700;900&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Caprasimo&family=Caveat:wght@600;700&family=Chakra+Petch:wght@500;700&family=Darker+Grotesque:wght@700;900&family=Familjen+Grotesk:wght@500;700&family=Fraunces:opsz,wght@9..144,600;9..144,900&family=Hanken+Grotesk:wght@400;700&family=IBM+Plex+Mono:wght@400;600&family=Inter:wght@400;600;800&family=Inter+Tight:wght@500;700&family=JetBrains+Mono:wght@400;700&family=Newsreader:wght@400;600&family=Onest:wght@400;600&family=Outfit:wght@400;700;800&family=Playfair+Display:wght@700;900&family=Plus+Jakarta+Sans:wght@400;700;800&family=Quicksand:wght@500;700&family=Righteous&family=Sora:wght@600;700;800&family=Space+Grotesk:wght@500;700&family=Space+Mono:wght@400;700&family=Spectral:ital@0;1&family=Unbounded:wght@600;800&display=swap'

/**
 * TimelineVideo — renderiza el motor de animacion (engineCore) cuadro a cuadro para que Remotion
 * lo exporte a MP4. Es EL MISMO nucleo que el preview en vivo del sidebar, asi que lo que ves en la
 * app es lo que sale en el video.
 *
 * El dibujo es sincronico, asi que se pinta en useLayoutEffect (antes de que Remotion capture el frame).
 * Por ahora el timeline esta horneado en el nucleo (la demo); el prop `timeline` queda reservado para
 * cuando la IA lo escriba desde la URL.
 */
export const TimelineVideo = ({ timeline = null }) => {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const ref = useRef(null)
  // espera a que las fuentes del motor carguen ANTES de capturar frames -> el MP4 no sale con fallback.
  const [fontHandle] = useState(() => delayRender('cargando fuentes del motor'))
  useLayoutEffect(() => {
    if (typeof document === 'undefined') { continueRender(fontHandle); return }
    if (!document.getElementById('urvid-engine-fonts')) {
      const l = document.createElement('link')
      l.id = 'urvid-engine-fonts'; l.rel = 'stylesheet'; l.href = ENGINE_FONTS_HREF
      document.head.appendChild(l)
    }
    const ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve()
    ready.then(() => continueRender(fontHandle)).catch(() => continueRender(fontHandle))
  }, [fontHandle])

  useLayoutEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    // El nucleo dibuja en un espacio logico de 405x720 (9:16). Escalamos uniforme al tamano real
    // de la composicion (1080x1920): 1080/405 == 1920/720, asi que una sola escala alcanza.
    const scale = width / LOGICAL_W
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    drawFrame(ctx, frame / fps, timeline)   // timeline desde props; si viene vacio, el nucleo usa la demo
  }, [frame, width, fps, timeline])

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}

export default TimelineVideo

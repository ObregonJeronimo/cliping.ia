import { useRef, useEffect, useState } from 'react'
import lottie from 'lottie-web'
import sample from './sampleLottie.json'
import { lottieMeta, isSafeLottie } from './lottieGate'

/**
 * LottieLab — seccion AISLADA del sidebar para los ACENTOS Lottie (POC 4).
 * Reproduce una Lottie de ejemplo (bajada de LottieFiles via backend/lottie_search.py, ya pasada por
 * el gate) con el renderer canvas de lottie-web, para verla en la app. En el MP4 real la compone
 * @remotion/lottie (LottieOverlay) sincronizada a useCurrentFrame (determinista).
 *
 * NOTA HONESTA: esta capa NO la puedo rasterizar offline (necesita DOM/Player); por eso es la unica
 * pieza que se confirma a ojo aca, no con mi renderer de PNG.
 */
export default function LottieLab() {
  const ref = useRef(null)
  const [meta] = useState(() => lottieMeta(sample))

  useEffect(() => {
    if (!ref.current) return
    const anim = lottie.loadAnimation({
      container: ref.current, renderer: 'canvas', loop: true, autoplay: true, animationData: sample,
    })
    return () => anim.destroy()
  }, [])

  return (
    <div style={{ padding: '8px 4px 40px' }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#111', display: 'flex', alignItems: 'center', gap: 10 }}>
          Acentos Lottie <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6366f1', background: '#eef0ff', borderRadius: 6, padding: '3px 8px' }}>lab · POC 4</span>
        </h2>
        <p style={{ fontSize: 13, color: '#666', lineHeight: 1.55, margin: '8px 0 0', maxWidth: 640 }}>
          Animaciones Lottie profesionales como acento sobre el video. La IA las busca por concepto con
          <code style={{ fontSize: 12 }}> backend/lottie_search.py</code> (API publica de LottieFiles, sin
          auth), pasan un <strong>gate de determinismo</strong> (se rechazan las que tienen expresiones/
          efectos, comunes en el pool gratis) y se componen con <code style={{ fontSize: 12 }}>@remotion/lottie</code>
          sincronizadas al frame. Abajo, una Lottie de ejemplo ya gateada.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ width: 320, height: 320, borderRadius: 16, background: '#0e1017', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 14px 50px rgba(0,0,0,0.35)' }}>
          <div ref={ref} style={{ width: 260, height: 260 }} />
        </div>
        <div style={{ flex: 1, minWidth: 260, maxWidth: 420 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: meta?.safe ? '#e7f8ef' : '#fdeaea', color: meta?.safe ? '#0a7d44' : '#b42318', fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
            {meta?.safe ? '✓ pasa el gate (determinista)' : '✕ rechazada por el gate'}
          </div>
          <Row k="dimensiones" v={`${meta?.w} x ${meta?.h}`} />
          <Row k="fps" v={String(meta?.fps)} />
          <Row k="duracion" v={`${meta?.durationInFrames} frames`} />
          <p style={{ fontSize: 12, color: '#888', lineHeight: 1.5, margin: '16px 0 0', borderTop: '1px solid #eee', paddingTop: 14 }}>
            Validado: <strong>search en vivo</strong> (12 resultados reales), <strong>gate</strong> (acepta el
            sample, rechaza expresiones/efectos), <strong>bundle</strong> de la composicion contra
            remotion 4.0.469. El render real sobre el video lo confirma Jero en el Player/MP4.
          </p>
        </div>
      </div>
    </div>
  )
}
function Row({ k, v }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.7 }}>
      <span style={{ color: '#999', minWidth: 110 }}>{k}</span>
      <span style={{ color: '#222', fontFamily: 'ui-monospace, Menlo, monospace' }}>{v}</span>
    </div>
  )
}

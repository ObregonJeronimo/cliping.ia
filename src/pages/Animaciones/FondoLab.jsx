import { useRef, useState, useEffect } from 'react'
import { W, H, drawBackground, THEME_NAMES } from './engineCore'

/**
 * FondoLab — seccion AISLADA del sidebar para juzgar el fondo fluido (POC 1).
 *
 * Dibuja SOLO el fondo de engineCore (drawBackground), sin escenas, para poder afinar a ojo el
 * mesh-gradient + motes. Es el MISMO fondo que despues usa el video real (drawFrame -> drawBg), asi
 * que lo que se ve aca es lo que va a salir detras de cada escena.
 *
 * Clave del POC: el fondo es DETERMINISTA y SEMBRADO. Misma semilla => mismo fondo (render paralelo
 * reproducible en Remotion); marca distinta => semilla distinta => fondo distinto (ataca el "todos
 * los videos salen iguales"). Aca podes barrer semillas para ver la variedad.
 *
 * No toca el flujo de produccion: solo lee la API publica de engineCore.
 */

const LOOP = 14            // seg que dura el loop del preview
const GALLERY_SEEDS = [1, 7, 23, 42, 99, 256]
const NICE_ACCENTS = ['#ff5a8a', '#3aa0ff', '#19c37d', '#f5a524', '#a855f7', '#ff7847']

// avanza una semilla de forma determinista (LCG) — para "probar otra" sin Math.random
function nextSeed(s) { return (Math.imul(s >>> 0, 1664525) + 1013904223) >>> 0 }

function useDpr() {
  return Math.min(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1, 2.5)
}

export default function FondoLab() {
  const dpr = useDpr()
  const canvasRef = useRef(null)
  const tRef = useRef(0)
  const playRef = useRef(true)

  const [theme, setTheme] = useState(THEME_NAMES[0] || '')
  const [accent, setAccent] = useState('#3aa0ff')
  const [seed, setSeed] = useState(42)
  const [playing, setPlaying] = useState(true)
  const [t, setT] = useState(0)

  useEffect(() => { playRef.current = playing }, [playing])

  // preview principal: loop de render. Siempre redibuja (asi el slider refleja al pausar);
  // 'playing' solo decide si AVANZA el tiempo.
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    cv.width = W * dpr
    cv.height = H * dpr
    const ctx = cv.getContext('2d')
    let raf = 0
    let last = performance.now()
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (playRef.current) {
        tRef.current += dt
        if (tRef.current > LOOP) tRef.current -= LOOP
        setT(tRef.current)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawBackground(ctx, tRef.current, { theme, accent, seed })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [theme, accent, seed, dpr])

  function onSeek(v) {
    tRef.current = v
    setT(v)
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Fondo fluido <span style={S.badge}>lab · POC 1</span></h2>
          <p style={S.sub}>
            El mismo fondo que va detras de cada escena del video. Es determinista y sembrado:
            <strong> misma semilla = mismo fondo</strong>, marca distinta = semilla distinta = fondo
            distinto. Barre semillas abajo para ver la variedad.
          </p>
        </div>
      </div>

      <div style={S.body}>
        {/* Stage: preview 9:16 */}
        <div style={S.stage}>
          <canvas
            ref={canvasRef}
            style={{ height: '64vh', maxHeight: 760, aspectRatio: `${W} / ${H}`, width: 'auto',
                     borderRadius: 16, display: 'block', boxShadow: '0 14px 50px rgba(0,0,0,0.35)' }}
          />
          <div style={S.transport}>
            <button style={S.btn} onClick={() => setPlaying(p => !p)}>{playing ? '⏸ Pausar' : '▶ Reproducir'}</button>
            <input type="range" min={0} max={LOOP} step={0.01} value={t}
              onChange={e => onSeek(parseFloat(e.target.value))} style={{ flex: 1 }} />
            <span style={S.time}>{t.toFixed(1)}s</span>
          </div>
        </div>

        {/* Controles */}
        <div style={S.panel}>
          <div style={S.group}>
            <label style={S.label}>Tema (paleta del rubro)</label>
            <select value={theme} onChange={e => setTheme(e.target.value)} style={S.select}>
              {THEME_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div style={S.group}>
            <label style={S.label}>Acento de marca</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="color" value={accent} onChange={e => setAccent(e.target.value)}
                style={{ width: 44, height: 32, border: 'none', background: 'none', cursor: 'pointer' }} />
              <code style={S.code}>{accent}</code>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {NICE_ACCENTS.map(c => (
                <button key={c} onClick={() => setAccent(c)} title={c}
                  style={{ ...S.swatch, background: c, outline: accent === c ? '2px solid #111' : 'none' }} />
              ))}
            </div>
          </div>

          <div style={S.group}>
            <label style={S.label}>Semilla <span style={{ color: '#999', fontWeight: 500 }}>(define el fondo)</span></label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" value={seed}
                onChange={e => setSeed((parseInt(e.target.value, 10) || 0) >>> 0)} style={S.num} />
              <button style={S.btn} onClick={() => setSeed(s => nextSeed(s))}>🎲 Otra</button>
            </div>
          </div>

          <div style={S.group}>
            <label style={S.label}>Galeria de semillas <span style={{ color: '#999', fontWeight: 500 }}>(click para usar)</span></label>
            <div style={S.gallery}>
              {GALLERY_SEEDS.map(s => (
                <Thumb key={s} seed={s} theme={theme} accent={accent} dpr={dpr}
                  active={s === seed} onPick={() => setSeed(s)} />
              ))}
            </div>
          </div>

          <p style={S.note}>
            Validado aca: <strong>bundlea + es determinista</strong> (misma semilla/t = mismas ops de
            dibujo). El "se ve lindo" y la paridad con el MP4 los juzgas vos al renderizar.
          </p>
        </div>
      </div>
    </div>
  )
}

// Thumbnail: dibuja el fondo de UNA semilla a un instante fijo (no animado, barato).
function Thumb({ seed, theme, accent, dpr, active, onPick }) {
  const ref = useRef(null)
  const tw = Math.round(W / 4), th = Math.round(H / 4)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    cv.width = tw * dpr
    cv.height = th * dpr
    const ctx = cv.getContext('2d')
    // dibujamos en el espacio logico tw x th: escalamos el fondo (que piensa en W x H) a la miniatura
    ctx.setTransform((tw / W) * dpr, 0, 0, (th / H) * dpr, 0, 0)
    drawBackground(ctx, 3.0, { theme, accent, seed })
  }, [seed, theme, accent, dpr, tw, th])
  return (
    <button onClick={onPick} title={`semilla ${seed}`} style={{ ...S.thumbBtn, outline: active ? '2px solid #111' : '1px solid #e2e2e2' }}>
      <canvas ref={ref} style={{ width: tw, height: th, display: 'block', borderRadius: 7 }} />
      <span style={S.thumbLabel}>{seed}</span>
    </button>
  )
}

const S = {
  page: { padding: '8px 4px 40px' },
  header: { marginBottom: 18 },
  title: { fontSize: 22, fontWeight: 800, margin: 0, color: '#111', display: 'flex', alignItems: 'center', gap: 10 },
  badge: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6366f1', background: '#eef0ff', borderRadius: 6, padding: '3px 8px' },
  sub: { fontSize: 13, color: '#666', lineHeight: 1.55, margin: '8px 0 0', maxWidth: 620 },
  body: { display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' },
  stage: { display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' },
  transport: { display: 'flex', gap: 10, alignItems: 'center', width: '100%', maxWidth: 430 },
  time: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: '#888', width: 44, textAlign: 'right' },
  panel: { flex: 1, minWidth: 280, maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 18 },
  group: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#444' },
  select: { padding: '9px 10px', borderRadius: 9, border: '1px solid #ddd', fontSize: 13, background: '#fff', color: '#222' },
  num: { width: 130, padding: '9px 10px', borderRadius: 9, border: '1px solid #ddd', fontSize: 13, fontFamily: 'ui-monospace, Menlo, monospace' },
  code: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: '#666' },
  swatch: { width: 26, height: 26, borderRadius: 7, border: 'none', cursor: 'pointer' },
  btn: { padding: '9px 14px', borderRadius: 9, border: '1px solid #ddd', background: '#fff', color: '#222', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  gallery: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  thumbBtn: { position: 'relative', padding: 0, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 8, overflow: 'hidden', lineHeight: 0 },
  thumbLabel: { position: 'absolute', bottom: 4, right: 6, fontSize: 10, fontWeight: 700, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.7)' },
  note: { fontSize: 12, color: '#888', lineHeight: 1.5, margin: '4px 0 0', borderTop: '1px solid #eee', paddingTop: 14 },
}

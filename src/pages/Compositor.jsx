import { useState, useEffect, useCallback, useRef } from 'react'
import styles from './Compositor.module.css'

// ─── Constantes ───────────────────────────────────────────────────────────────
const SCENE_TYPES = {
  hook:     { label: 'Gancho',     color: '#ef4444', desc: 'Captura la atención en los primeros segundos' },
  problem:  { label: 'Problema',   color: '#f97316', desc: 'El dolor que resuelve el negocio' },
  brand:    { label: 'Marca',      color: '#3b82f6', desc: 'Nombre y propuesta central del negocio' },
  stats:    { label: 'Datos',      color: '#06b6d4', desc: 'Números y estadísticas clave' },
  benefit:  { label: 'Beneficio',  color: '#22c55e', desc: 'Por qué elegirnos' },
  process:  { label: 'Proceso',    color: '#8b5cf6', desc: 'Cómo funciona, pasos simples' },
  cta:      { label: 'CTA',        color: '#eab308', desc: 'Llamada a la acción' },
  outro:    { label: 'Cierre',     color: '#6b7280', desc: 'Sello de marca final' },
}

const ANIMATIONS_BY_CATEGORY = {
  'Texto': [
    { key: 'AnimeScrambleReveal',   label: 'Scramble',       desc: 'Texto que emerge del ruido de caracteres' },
    { key: 'AnimeBlurWords',        label: 'Blur Words',     desc: 'Palabras que aparecen desde blur' },
    { key: 'AnimeStaggerCenter',    label: 'Stagger',        desc: 'Palabras desde el centro hacia afuera' },
    { key: 'AnimeKineticTimeline',  label: 'Kinetic',        desc: 'Secuencia cinemática encadenada' },
    { key: 'AnimeLetterByLetter',   label: 'Letras',         desc: 'Letra por letra con rotación' },
    { key: 'AnimeTrueFocus',        label: 'True Focus',     desc: 'Una palabra en foco, resto en blur' },
    { key: 'AnimeRotatingWords',    label: 'Palabras',       desc: 'Palabras que rotan entre opciones' },
    { key: 'AnimeKeyframeBounce',   label: 'Bounce',         desc: 'Texto que rebota al aterrizar' },
    { key: 'GsapMaskReveal',        label: 'Mask Reveal',    desc: 'Líneas emergen de detrás de máscara' },
    { key: 'GsapCharsRotate',       label: 'Chars 3D',       desc: 'Caracteres con rotación en 3D' },
    { key: 'GsapWordsScramble',     label: 'Scatter',        desc: 'Palabras que vuelan y se asientan' },
    { key: 'GsapLinesWave',         label: 'Wave',           desc: 'Ola de caracteres' },
  ],
  'SVG': [
    { key: 'AnimeSvgDraw',      label: 'Draw Path',    desc: 'Path SVG que se dibuja en tiempo real' },
    { key: 'AnimeMorphBlob',    label: 'Morph Blob',   desc: 'Blob orgánico que morphea entre formas' },
    { key: 'GsapDrawSvg',       label: 'Draw SVG',     desc: 'DrawSVG con control de porcentaje' },
    { key: 'GsapMorphShapes',   label: 'Morph Shapes', desc: 'Morphing entre círculo, cuadrado, triángulo' },
    { key: 'GsapMotionPath',    label: 'Motion Path',  desc: 'Elemento viaja por path SVG' },
  ],
  'Física': [
    { key: 'GsapPhysicsShatter', label: 'Shatter',    desc: 'Letras caen con gravedad real (GSAP Physics2D)' },
    { key: 'GsapPhysicsRain',    label: 'Rain',       desc: 'Beneficios llueven desde arriba' },
    { key: 'GsapElasticCards',   label: 'Elastic',    desc: 'Cards con resorte físico real' },
    { key: 'GsapFlipReveal',     label: 'Flip 3D',    desc: 'Cards con flip en el eje Y' },
    { key: 'GsapPhysicsBurst',   label: 'Burst',      desc: 'Partículas explotan del CTA' },
    { key: 'AnimeKeyframeBounce',label: 'Bounce',     desc: 'Texto que rebota físicamente' },
  ],
  'Datos': [
    { key: 'AnimeCounterCascade', label: 'Counters',    desc: 'Números caen en cascada con rebote' },
    { key: 'AnimeGlassCards',     label: 'Glass Cards', desc: 'Cards glassmorphism con spotlight' },
    { key: 'AnimeTickerTape',     label: 'Ticker',      desc: 'Ticker horizontal continuo' },
    { key: 'AnimeStaggerGrid2D',  label: 'Grid 2D',     desc: 'Grid stagger desde el centro' },
    { key: 'AnimeCinematicTimeline', label: 'Cinematic', desc: 'Timeline con números y labels' },
    { key: 'AnimeAlternateComparison', label: 'Antes/Después', desc: 'Comparación pulsante' },
    { key: 'AnimeStaggerIrregular', label: 'Irregular', desc: 'Stagger con orden caótico orgánico' },
  ],
  'CTA': [
    { key: 'AnimeShinyButton',        label: 'Shiny',      desc: 'Botón con destello en loop' },
    { key: 'AnimeMagneticCTA',        label: 'Magnético',  desc: 'Anillos concéntricos pulsantes' },
    { key: 'AnimeContextualCountdown', label: 'Countdown', desc: 'Tiempo real de entrega con barra' },
    { key: 'AnimeMorphBlob',          label: 'Blob CTA',   desc: 'Blob orgánico con texto del CTA' },
  ],
  'Cierre': [
    { key: 'AnimeSpectrumOutro',  label: 'Spectrum',   desc: 'Barras de espectro + logo Spotify-style' },
    { key: 'AnimeTypefaceFade',   label: 'Typeface',   desc: 'Nombre que se disuelve como niebla' },
    { key: 'AnimeParticleForm',   label: 'Partículas', desc: 'Partículas que forman el logo' },
  ],
}

// Animaciones compatibles por tipo de escena
const COMPATIBLE = {
  hook:    ['Texto', 'SVG', 'Física'],
  problem: ['Texto'],
  brand:   ['Texto', 'SVG'],
  stats:   ['Datos'],
  benefit: ['Datos', 'Física'],
  process: ['SVG', 'Datos'],
  cta:     ['CTA'],
  outro:   ['Cierre'],
}

// Tipos sugeridos según posición
const PURPOSE_BY_POSITION = (idx, total) => {
  if (idx === 0) return 'hook'
  if (idx === 1) return 'problem'
  if (idx === total - 1) return 'outro'
  if (idx === total - 2) return 'cta'
  const mid = Math.floor(total / 2)
  if (idx < mid) return idx === 2 ? 'brand' : 'stats'
  return 'benefit'
}

const ALL_ANIMS_FLAT = Object.values(ANIMATIONS_BY_CATEGORY).flat()

export default function Compositor({ pageData, composition, duration, onConfirm, onBack }) {
  const [scenes, setScenes] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [effectTab, setEffectTab] = useState('Texto')
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [dirty, setDirty] = useState(false)
  const totalDur = duration || 30

  // Inicializar escenas desde la composición generada
  useEffect(() => {
    if (!composition?.scenes?.length) return
    const built = composition.scenes.map((s, i) => ({
      id: `scene_${i}_${Date.now()}`,
      key: s.key,
      purpose: keyToPurpose(s.key),
      animation: s.animation || 'AnimeStaggerCenter',
      duration: Math.round((s.duration / 30) * 10) / 10, // frames → segundos
      from: Math.round((s.from / 30) * 10) / 10,
      params: s.params || {},
      label: SCENE_TYPES[keyToPurpose(s.key)]?.label || s.key,
    }))
    setScenes(built)
  }, [composition])

  function keyToPurpose(key) {
    if (key?.includes('hook')) return 'hook'
    if (key?.includes('problem')) return 'problem'
    if (key?.includes('product') || key?.includes('brand')) return 'brand'
    if (key?.includes('benefit')) return 'benefit'
    if (key?.includes('stats') || key?.includes('counter')) return 'stats'
    if (key?.includes('cta')) return 'cta'
    if (key?.includes('outro') || key?.includes('close')) return 'outro'
    return 'benefit'
  }

  const totalSec = scenes.reduce((a, s) => a + (s.duration || 0), 0)
  const selected = selectedIdx !== null ? scenes[selectedIdx] : null

  function updateScene(idx, patch) {
    setScenes(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
    setDirty(true)
  }

  function changeAnimation(idx, animKey) {
    updateScene(idx, { animation: animKey })
    setSelectedIdx(idx)
  }

  // Drag & drop
  function onDragStart(e, idx) {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDragOver(e, idx) {
    e.preventDefault()
    setDragOver(idx)
  }
  function onDrop(e, idx) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOver(null); return }
    setScenes(prev => {
      const arr = [...prev]
      const [moved] = arr.splice(dragIdx, 1)
      arr.splice(idx, 0, moved)
      return arr
    })
    setDirty(true)
    setDragIdx(null)
    setDragOver(null)
    setSelectedIdx(idx)
  }

  function addScene(afterIdx) {
    const purpose = PURPOSE_BY_POSITION(afterIdx + 1, scenes.length + 1)
    const newScene = {
      id: `scene_new_${Date.now()}`,
      key: `extra_${afterIdx}`,
      purpose,
      animation: 'AnimeStaggerCenter',
      duration: 3,
      from: 0,
      params: {},
      label: SCENE_TYPES[purpose]?.label || 'Escena',
    }
    setScenes(prev => {
      const arr = [...prev]
      arr.splice(afterIdx + 1, 0, newScene)
      return arr
    })
    setDirty(true)
    setSelectedIdx(afterIdx + 1)
  }

  function removeScene(idx) {
    if (scenes.length <= 3) return
    setScenes(prev => prev.filter((_, i) => i !== idx))
    setDirty(true)
    setSelectedIdx(null)
  }

  function handleConfirm() {
    // Convertir de vuelta a frames para el backend
    const userComposition = {
      bg: composition?.bg || '#07070f',
      accent: composition?.accent || pageData?.primaryColor || '#6366f1',
      scenes: scenes.map((s, i) => ({
        key: s.key,
        from: Math.round(s.from * 30),
        duration: Math.round(s.duration * 30),
        animation: s.animation,
        params: {
          ...s.params,
          primaryColor: composition?.accent || pageData?.primaryColor,
          bg: composition?.bg || '#07070f',
        },
      })),
      transitions: scenes.slice(0, -1).map((s, i) => ({
        at_frame: Math.round((scenes.slice(0, i+1).reduce((a,b) => a+b.duration, 0)) * 30),
        type: 'flash',
        intensity: 0.3,
      })),
      creative_reasoning: 'Composición editada por el usuario',
    }
    onConfirm(userComposition)
  }

  const deltaOff = Math.round((totalSec - totalDur) * 10) / 10
  const isValid = Math.abs(deltaOff) < 2

  return (
    <div className={styles.compositor}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.stepBadge}>Paso 3 de 3 — Compositor</div>
          <h2 className={styles.title}>Armá tu video</h2>
          <p className={styles.sub}>Reordenar, cambiar efectos o confirmar como está.</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.durBadge} style={{ color: isValid ? '#22c55e' : '#ef4444' }}>
            {totalSec.toFixed(1)}s / {totalDur}s
            {!isValid && <span className={styles.durWarn}>{deltaOff > 0 ? `+${deltaOff}s de más` : `${Math.abs(deltaOff)}s de menos`}</span>}
          </div>
          {dirty && (
            <button className={styles.resetBtn} onClick={() => {
              if (!composition?.scenes?.length) return
              const built = composition.scenes.map((s, i) => ({
                id: `scene_${i}_${Date.now()}`,
                key: s.key,
                purpose: keyToPurpose(s.key),
                animation: s.animation || 'AnimeStaggerCenter',
                duration: Math.round((s.duration / 30) * 10) / 10,
                from: Math.round((s.from / 30) * 10) / 10,
                params: s.params || {},
                label: SCENE_TYPES[keyToPurpose(s.key)]?.label || s.key,
              }))
              setScenes(built)
              setDirty(false)
              setSelectedIdx(null)
            }}>↺ IA sugiere</button>
          )}
        </div>
      </div>

      <div className={styles.body}>
        {/* Timeline */}
        <div className={styles.timelineWrap}>
          <div className={styles.timelineLabel}>TIMELINE</div>
          <div className={styles.timeline}>
            {scenes.map((scene, idx) => {
              const type = SCENE_TYPES[scene.purpose] || SCENE_TYPES.benefit
              const widthPct = (scene.duration / totalDur) * 100
              const isSelected = selectedIdx === idx
              const isDragTarget = dragOver === idx
              return (
                <div
                  key={scene.id}
                  className={`${styles.block} ${isSelected ? styles.blockSelected : ''} ${isDragTarget ? styles.blockDragOver : ''}`}
                  style={{ width: `${widthPct}%`, borderColor: isSelected ? type.color : 'transparent', '--block-color': type.color }}
                  draggable
                  onDragStart={e => onDragStart(e, idx)}
                  onDragOver={e => onDragOver(e, idx)}
                  onDrop={e => onDrop(e, idx)}
                  onDragEnd={() => { setDragIdx(null); setDragOver(null) }}
                  onClick={() => setSelectedIdx(isSelected ? null : idx)}
                >
                  <div className={styles.blockHeader} style={{ background: type.color }}>
                    <span className={styles.blockType}>{type.label}</span>
                    <button className={styles.blockDel} onClick={e => { e.stopPropagation(); removeScene(idx) }}>×</button>
                  </div>
                  <div className={styles.blockBody}>
                    <div className={styles.blockAnim}>{ALL_ANIMS_FLAT.find(a => a.key === scene.animation)?.label || scene.animation.replace('Anime','').replace('Gsap','')}</div>
                    <div className={styles.blockDur}>{scene.duration}s</div>
                  </div>
                  {/* Add button after */}
                  <button className={styles.addBetween} onClick={e => { e.stopPropagation(); addScene(idx) }} title="Agregar escena">+</button>
                </div>
              )
            })}
          </div>
          {/* Regla de tiempo */}
          <div className={styles.ruler}>
            {Array.from({ length: totalDur + 1 }, (_, i) => (
              <div key={i} className={styles.rulerMark} style={{ left: `${(i / totalDur) * 100}%` }}>
                <div className={styles.rulerTick} />
                {i % 5 === 0 && <span className={styles.rulerLabel}>{i}s</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Panel de edición */}
        {selected ? (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle}>
                <div className={styles.panelDot} style={{ background: SCENE_TYPES[selected.purpose]?.color }} />
                {SCENE_TYPES[selected.purpose]?.label}
              </div>
              <div className={styles.panelDesc}>{SCENE_TYPES[selected.purpose]?.desc}</div>
            </div>

            {/* Duración */}
            <div className={styles.panelSection}>
              <label className={styles.panelLabel}>Duración</label>
              <div className={styles.durRow}>
                <input type="range" min={1} max={15} step={0.5}
                  value={selected.duration}
                  onChange={e => updateScene(selectedIdx, { duration: parseFloat(e.target.value) })}
                  className={styles.slider} />
                <span className={styles.durVal}>{selected.duration}s</span>
              </div>
            </div>

            {/* Biblioteca de efectos */}
            <div className={styles.panelSection}>
              <label className={styles.panelLabel}>Efecto</label>
              <div className={styles.tabs}>
                {Object.keys(ANIMATIONS_BY_CATEGORY).map(cat => (
                  <button key={cat}
                    className={`${styles.tab} ${effectTab === cat ? styles.tabActive : ''} ${COMPATIBLE[selected.purpose]?.includes(cat) ? '' : styles.tabDim}`}
                    onClick={() => setEffectTab(cat)}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className={styles.effectGrid}>
                {ANIMATIONS_BY_CATEGORY[effectTab]?.map(anim => {
                  const isActive = selected.animation === anim.key
                  const compatible = COMPATIBLE[selected.purpose]?.includes(effectTab)
                  return (
                    <button key={anim.key}
                      className={`${styles.effectCard} ${isActive ? styles.effectActive : ''} ${!compatible ? styles.effectDim : ''}`}
                      onClick={() => changeAnimation(selectedIdx, anim.key)}
                      title={anim.desc}>
                      <div className={styles.effectPreview}>
                        <EffectMiniPreview animKey={anim.key} color={SCENE_TYPES[selected.purpose]?.color || '#6366f1'} />
                      </div>
                      <div className={styles.effectName}>{anim.label}</div>
                      {!compatible && <div className={styles.effectTag}>No recomendado</div>}
                      {isActive && <div className={styles.effectCheck}>✓</div>}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.panelEmpty}>
            <div className={styles.panelEmptyIcon}>↑</div>
            <div className={styles.panelEmptyText}>Click en una escena para editarla</div>
            <div className={styles.panelEmptySub}>Podés reordenarlas arrastrando</div>
          </div>
        )}
      </div>

      {/* Leyenda de tipos */}
      <div className={styles.legend}>
        {Object.entries(SCENE_TYPES).map(([key, val]) => (
          <div key={key} className={styles.legendItem}>
            <div className={styles.legendDot} style={{ background: val.color }} />
            <span>{val.label}</span>
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div className={styles.actions}>
        <button className={styles.backBtn} onClick={onBack}>← Volver</button>
        <button className={styles.confirmBtn} onClick={handleConfirm} disabled={!isValid}>
          {isValid ? 'Confirmar y generar →' : `Ajustar duración (${deltaOff > 0 ? '+' : ''}${deltaOff}s)`}
        </button>
      </div>
    </div>
  )
}

// ─── Mini preview de efecto ───────────────────────────────────────────────────
function EffectMiniPreview({ animKey, color }) {
  const frameRef = useRef(0)
  const rafRef = useRef(null)
  const canvasRef = useRef(null)

  // Preview simple — dibuja el nombre del efecto animado en canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frame = 0
    let active = true

    function draw() {
      if (!active) return
      frame++
      ctx.clearRect(0, 0, 80, 50)
      const t = (frame % 60) / 60
      const ease = Math.sin(t * Math.PI)

      // Fondo
      ctx.fillStyle = '#111'
      ctx.fillRect(0, 0, 80, 50)

      // Animación simple representativa
      if (animKey.includes('Blur') || animKey.includes('Scramble')) {
        // Blur effect visual
        ctx.globalAlpha = ease
        ctx.fillStyle = color
        ctx.font = 'bold 10px monospace'
        ctx.fillText('━━━', 10, 30)
        ctx.fillText('━━━━━', 10, 20)
      } else if (animKey.includes('Counter') || animKey.includes('Stats')) {
        // Números
        ctx.fillStyle = color
        ctx.font = 'bold 18px monospace'
        ctx.fillText(Math.floor(ease * 600) + '+', 10, 32)
      } else if (animKey.includes('Ticker')) {
        // Ticker
        ctx.fillStyle = color
        ctx.font = '9px system-ui'
        const offset = (frame * 0.5) % 100
        ctx.fillText('● Beneficio 1 ● Beneficio 2 ●', -offset + 5, 28)
      } else if (animKey.includes('Morph') || animKey.includes('Blob')) {
        // Blob morphing
        ctx.fillStyle = color
        ctx.globalAlpha = 0.8
        ctx.beginPath()
        const r = 14 + Math.sin(t * Math.PI * 2) * 5
        ctx.arc(40, 25, r, 0, Math.PI * 2)
        ctx.fill()
      } else if (animKey.includes('Draw') || animKey.includes('Svg')) {
        // Path draw
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(5, 40)
        const endX = 5 + ease * 70
        ctx.lineTo(endX, 15)
        ctx.stroke()
        // Dot
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(endX, 15, 3, 0, Math.PI * 2)
        ctx.fill()
      } else if (animKey.includes('Shatter') || animKey.includes('Physics')) {
        // Física
        const chars = ['A','B','C']
        chars.forEach((c, i) => {
          ctx.fillStyle = color
          ctx.font = 'bold 12px system-ui'
          ctx.fillText(c, 15 + i*20, 25 - ease * 15 + i * 5)
        })
      } else if (animKey.includes('Button') || animKey.includes('Magnetic') || animKey.includes('CTA')) {
        // CTA
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(10, 15, 60, 20, 10)
        ctx.fill()
        ctx.fillStyle = '#000'
        ctx.font = 'bold 8px system-ui'
        ctx.fillText('VER MÁS', 18, 29)
        // Shine
        ctx.fillStyle = `rgba(255,255,255,${ease * 0.4})`
        ctx.fillRect(10 + ease * 70, 15, 8, 20)
      } else {
        // Default: stagger
        const words = ['Tu', 'marca', 'aquí']
        words.forEach((w, i) => {
          const wordT = Math.max(0, Math.min(1, (t * 3) - i * 0.6))
          ctx.globalAlpha = wordT
          ctx.fillStyle = '#fff'
          ctx.font = `bold ${8 + i}px system-ui`
          ctx.fillText(w, 5 + i * 22, 30 - (1 - wordT) * 15)
        })
      }
      ctx.globalAlpha = 1
      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { active = false; cancelAnimationFrame(rafRef.current) }
  }, [animKey, color])

  return <canvas ref={canvasRef} width={80} height={50} className={styles.miniCanvas} />
}

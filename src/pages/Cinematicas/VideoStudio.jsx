import { useRef } from 'react'
import { useVideoJob } from '../../contexts/VideoJobContext'
import styles from './Cinematicas.module.css'

const THEMES = [
  { key: '',                 label: '✨ Que elija la IA' },
  { key: 'saas-explainer',   label: 'SaaS / Tech' },
  { key: 'ocean-deep',       label: 'Ocean' },
  { key: 'clinical-formal',  label: 'Clínico / Formal' },
  { key: 'organic-natural',  label: 'Natural / Orgánico' },
  { key: 'sunset-warm',      label: 'Sunset' },
  { key: 'crimson-bold',     label: 'Crimson' },
  { key: 'berry-glow',       label: 'Berry' },
  { key: 'gold-lux',         label: 'Gold / Lux' },
  { key: 'cyber-neon',       label: 'Cyber Neón' },
  { key: 'mono-ink',         label: 'Mono Ink' },
]
const PROPOSITOS = [
  { key: 'marketing',   label: '📣 Marketing' },
  { key: 'informativo', label: '📋 Informativo' },
  { key: 'producto',    label: '📦 Producto' },
  { key: 'branding',    label: '✨ Branding' },
]
const TONOS = ['enérgico y rápido', 'calmo y premium', 'confiable y claro', 'moderno y audaz']
const SEGUNDOS = [10, 15, 20]
const STEP_LABELS = {
  queued: 'En cola...', script: 'Escribiendo el guion...', capture: 'Capturando el sitio...',
  build: 'Armando la composición...', render: 'Renderizando (esto tarda)...',
  upload: 'Subiendo a la nube...', export: 'Listo',
}

export default function VideoStudio() {
  const {
    mode, setMode, url, setUrl, desarrollo, setDesarrollo, theme, setTheme,
    proposito, setProposito, tono, setTono, seconds, setSeconds,
    generating, status, spec, videoUrl, error, generate, reset,
  } = useVideoJob()
  const videoRef = useRef(null)

  const canGenerate = (url.trim() || desarrollo.trim()) && !generating
  const pct = Math.max(4, status?.progress || 0)
  const showResult = generating || spec || videoUrl || error

  return (
    <div className={styles.body}>
      <div className={styles.left}>
        <div className={styles.modeToggle}>
          <button className={`${styles.modeBtn} ${mode === 'simple' ? styles.modeBtnActive : ''}`} onClick={() => setMode('simple')}>Simple</button>
          <button className={`${styles.modeBtn} ${mode === 'avanzado' ? styles.modeBtnActive : ''}`} onClick={() => setMode('avanzado')}>Avanzado</button>
        </div>

        <div className={styles.cineSection}>
          <div className={styles.cineSectionLabel}>URL del sitio</div>
          <input className={styles.nameInput} placeholder="https://tusitio.com" value={url} onChange={e => setUrl(e.target.value)} />
        </div>

        <div className={styles.cineSection}>
          <div className={styles.cineSectionLabel}>
            {mode === 'simple' ? 'Qué querés contar' : 'Desarrollo'} <span className={styles.desarrolloOpcional}>(opcional)</span>
          </div>
          <textarea className={styles.textarea} rows={3}
            placeholder={mode === 'simple' ? 'Dejalo vacío y la IA decide todo, o tirá una idea...' : 'Ángulo, qué destacar, tono...'}
            value={desarrollo} onChange={e => setDesarrollo(e.target.value)} />
        </div>

        <div className={styles.cineSection}>
          <div className={styles.cineSectionLabel}>Duración</div>
          <div className={styles.propGrid}>
            {SEGUNDOS.map(s => (
              <button key={s} className={`${styles.propBtn} ${seconds === s ? styles.propBtnActive : ''}`} onClick={() => setSeconds(s)}>{s}s</button>
            ))}
          </div>
        </div>

        {mode === 'avanzado' && <>
          <div className={styles.cineSection}>
            <div className={styles.cineSectionLabel}>Estilo (theme)</div>
            <div className={styles.propGrid}>
              {THEMES.map(t => (
                <button key={t.key} className={`${styles.propBtn} ${theme === t.key ? styles.propBtnActive : ''}`} onClick={() => setTheme(t.key)}>{t.label}</button>
              ))}
            </div>
          </div>
          <div className={styles.cineSection}>
            <div className={styles.cineSectionLabel}>Propósito</div>
            <div className={styles.propGrid}>
              {PROPOSITOS.map(p => (
                <button key={p.key} className={`${styles.propBtn} ${proposito === p.key ? styles.propBtnActive : ''}`} onClick={() => setProposito(p.key)}>{p.label}</button>
              ))}
            </div>
          </div>
          <div className={styles.cineSection}>
            <div className={styles.cineSectionLabel}>Tono</div>
            <div className={styles.propGrid}>
              {TONOS.map(t => (
                <button key={t} className={`${styles.propBtn} ${tono === t ? styles.propBtnActive : ''}`} onClick={() => setTono(tono === t ? '' : t)}>{t}</button>
              ))}
            </div>
          </div>
        </>}

        <button className={`${styles.forgeBtn} ${generating ? styles.forgeBtnRunning : ''} ${!canGenerate ? styles.forgeBtnDisabled : ''}`}
          onClick={generate} disabled={!canGenerate}>
          {generating ? <><span className={styles.spinner} />Generando video...</>
            : !url.trim() && !desarrollo.trim() ? 'Ingresá una URL'
            : '🎬 Generar video'}
        </button>
      </div>

      <div className={styles.right}>
        {showResult ? (
          <div className={styles.cineResult}>
            <div className={styles.cineResultHeader}>
              <div className={styles.previewName}>
                {videoUrl ? 'Video listo' : error ? 'No se pudo generar' : 'Generando tu video...'}
              </div>
              <div className={styles.previewMeta}>{url || 'sin URL'} · {seconds}s · {mode}</div>
            </div>

            {generating && (
              <div className={styles.log}>
                <div className={`${styles.logLine} ${styles.logActive}`}>
                  <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${pct}%` }} /></div>
                  <span className={styles.logMsg}>{STEP_LABELS[status?.step] || 'Procesando...'}</span>
                </div>
              </div>
            )}

            {error && <div className={styles.cineNote}>⚠️ {error}</div>}

            {videoUrl && (
              <div className={styles.playerWrap}>
                <video ref={videoRef} src={videoUrl} controls autoPlay loop playsInline className={styles.video} />
              </div>
            )}

            {spec && (
              <div className={styles.cinePlan}>
                <div className={styles.cinePlanItem}>
                  <div className={styles.cinePlanOrder}>🎨</div>
                  <div className={styles.cinePlanInfo}>
                    <div className={styles.cinePlanName}>{spec.brand}</div>
                    <div className={styles.cinePlanProp}>theme: {spec.theme}</div>
                  </div>
                </div>
                {(spec.scenes || []).map((s, i) => (
                  <div key={i} className={styles.cinePlanItem}>
                    <div className={styles.cinePlanOrder}>{i + 1}</div>
                    <div className={styles.cinePlanInfo}>
                      <div className={styles.cinePlanName}>{s.type}</div>
                      <div className={styles.cinePlanProp}>
                        {s.type === 'IconTransform'
                          ? `${s.iconFrom || '✦'} → ${s.iconTo || '✦'}${s.label ? '  ·  ' + s.label.map(x => x.t).join('') : ''}`
                          : s.subtitle || s.cta
                            || (s.title && s.title.map(x => x.t).join(''))
                            || (s.lines && s.lines.map(line => line.map(x => x.t).join('')).join(' '))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(videoUrl || error) && (
              <button className={styles.forgeBtn} style={{ marginTop: 14 }} onClick={reset}>← Generar otro</button>
            )}
          </div>
        ) : (
          <div className={styles.cineLibrary}>
            <div className={styles.empty}>
              <div style={{ fontSize: 36 }}>🎬</div>
              <div className={styles.emptyTitle}>Tu video aparece acá</div>
              <div className={styles.emptySub}>
                {mode === 'simple'
                  ? 'Pegá la URL de tu sitio y dale generar — la IA hace todo.'
                  : 'Configurá los parámetros y la IA arma el mejor video con ellos.'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

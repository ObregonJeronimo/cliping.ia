import styles from './MarqueeShowcase.module.css'

// Cards placeholder que representan las etapas del pipeline de cliping.ia.
// Cuando tengan assets reales (imagenes/videos), se reemplaza el contenido
// de <div className={styles.cardVisual}> por la imagen o el <video>.
const CARDS = [
  { tag: 'Paso 01', title: 'Analisis de Landing Page', kind: 'browser' },
  { tag: 'Paso 02', title: 'Estructura de Guion',      kind: 'lines'   },
  { tag: 'Paso 03', title: 'Generacion de B-Roll',     kind: 'grid'    },
  { tag: 'Paso 04', title: 'Voz en Off con IA',        kind: 'wave'    },
  { tag: 'Paso 05', title: 'Edicion y Transiciones',   kind: 'timeline'},
  { tag: 'Paso 06', title: 'Renderizado Final',        kind: 'player'  },
  { tag: 'Paso 07', title: 'Subtitulos Automaticos',   kind: 'lines'   },
  { tag: 'Paso 08', title: 'Listo para Publicar',      kind: 'player'  },
  { tag: 'Paso 09', title: 'Hook de Apertura',         kind: 'browser' },
]

// Visual placeholder segun el tipo de card
function CardVisual({ kind }) {
  if (kind === 'browser') {
    return (
      <div className={styles.vBrowser}>
        <div className={styles.vBrowserBar}>
          <span /><span /><span />
        </div>
        <div className={styles.vBrowserBody}>
          <div className={styles.vBlock} style={{ width: '60%' }} />
          <div className={styles.vBlock} style={{ width: '85%' }} />
          <div className={styles.vBlock} style={{ width: '40%' }} />
          <div className={styles.vBtn} />
        </div>
      </div>
    )
  }
  if (kind === 'lines') {
    return (
      <div className={styles.vLines}>
        {[90, 70, 80, 55, 75].map((w, i) => (
          <div key={i} className={styles.vLine} style={{ width: `${w}%` }} />
        ))}
      </div>
    )
  }
  if (kind === 'grid') {
    return (
      <div className={styles.vGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.vGridCell} />
        ))}
      </div>
    )
  }
  if (kind === 'wave') {
    return (
      <div className={styles.vWave}>
        {Array.from({ length: 28 }).map((_, i) => (
          <span key={i} style={{ height: `${20 + Math.abs(Math.sin(i * 0.7)) * 70}%` }} />
        ))}
      </div>
    )
  }
  if (kind === 'timeline') {
    return (
      <div className={styles.vTimeline}>
        <div className={styles.vTrack}><div className={styles.vClip} style={{ left: '4%',  width: '30%' }} /><div className={styles.vClip} style={{ left: '38%', width: '24%' }} /><div className={styles.vClip} style={{ left: '66%', width: '30%' }} /></div>
        <div className={styles.vTrack}><div className={styles.vClip} style={{ left: '12%', width: '46%' }} /><div className={styles.vClip} style={{ left: '62%', width: '28%' }} /></div>
        <div className={styles.vPlayhead} />
      </div>
    )
  }
  // player
  return (
    <div className={styles.vPlayer}>
      <div className={styles.vPlayBtn}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M6 4l10 6-10 6V4z" fill="currentColor" />
        </svg>
      </div>
      <div className={styles.vProgress}><span /></div>
    </div>
  )
}

function Card({ tag, title, kind }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardVisual}>
        <CardVisual kind={kind} />
      </div>
      <div className={styles.cardMeta}>
        <span className={styles.cardTag}>{tag}</span>
        <span className={styles.cardTitle}>{title}</span>
      </div>
    </div>
  )
}

// Una columna que repite sus cards dos veces para el loop infinito sin salto
function MarqueeColumn({ cards, direction = 'up', duration = 40 }) {
  const cls = `${styles.colInner} ${direction === 'down' ? styles.scrollDown : styles.scrollUp}`
  return (
    <div className={styles.col}>
      <div className={cls} style={{ animationDuration: `${duration}s` }}>
        {cards.map((c, i) => <Card key={`a-${i}`} {...c} />)}
        {cards.map((c, i) => <Card key={`b-${i}`} {...c} aria-hidden="true" />)}
      </div>
    </div>
  )
}

export default function MarqueeShowcase() {
  // Repartir las cards en 3 columnas
  const col1 = [CARDS[0], CARDS[3], CARDS[6]]
  const col2 = [CARDS[1], CARDS[4], CARDS[7]]
  const col3 = [CARDS[2], CARDS[5], CARDS[8]]

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <h2 className={styles.heading}>
            Transformamos tu URL<br />
            en un video que <span className={styles.accent}>vende.</span><br />
            Cero friccion.
          </h2>
          <p className={styles.sub}>
            Nuestra IA analiza tu landing page, extrae los puntos clave y genera
            un video de marketing dinamico, con gancho, guion y edicion
            <em> profesional</em> en segundos. Tu contenido, tu marca, cero edicion manual.
          </p>
          <button className={styles.cta}>
            Generar mi primer video gratis
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className={styles.marquee} aria-hidden="true">
          <MarqueeColumn cards={col1} direction="up"   duration={38} />
          <MarqueeColumn cards={col2} direction="down" duration={46} />
          <MarqueeColumn cards={col3} direction="up"   duration={42} />
          <div className={styles.fadeTop} />
          <div className={styles.fadeBottom} />
        </div>
      </div>
    </section>
  )
}

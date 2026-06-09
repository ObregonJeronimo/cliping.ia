import styles from './Features.module.css'

// Mini-visuales por feature, hechos con CSS (sin assets externos)
function VisualFlow() {
  return (
    <div className={styles.vFlow}>
      <span className={styles.vFlowChip}>URL</span>
      <svg width="34" height="14" viewBox="0 0 34 14" fill="none" className={styles.vFlowArrow}>
        <path d="M1 7h30M26 2l6 5-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`${styles.vFlowChip} ${styles.vFlowChipVideo}`}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M6 4l7 4-7 4V4z" fill="currentColor" />
        </svg>
        Video
      </span>
    </div>
  )
}

function VisualFormats() {
  return (
    <div className={styles.vFormats}>
      <div className={styles.vFmt} style={{ width: 34, height: 60 }}><span>9:16</span></div>
      <div className={styles.vFmt} style={{ width: 54, height: 54 }}><span>1:1</span></div>
      <div className={styles.vFmt} style={{ width: 86, height: 50 }}><span>16:9</span></div>
    </div>
  )
}

function VisualScript() {
  return (
    <div className={styles.vScript}>
      {['Hook', 'Problema', 'Solucion', 'CTA'].map((s, i) => (
        <div key={s} className={styles.vScriptRow} style={{ animationDelay: `${i * 0.15}s` }}>
          <span className={styles.vScriptDot} />
          <span className={styles.vScriptBar} style={{ width: `${60 + i * 10}%` }} />
        </div>
      ))}
    </div>
  )
}

function VisualBroll() {
  return (
    <div className={styles.vBroll}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={styles.vBrollCell} />
      ))}
    </div>
  )
}

function VisualVoice() {
  return (
    <div className={styles.vVoice}>
      {Array.from({ length: 18 }).map((_, i) => (
        <span key={i} style={{ height: `${20 + Math.abs(Math.sin(i * 0.8)) * 70}%` }} />
      ))}
    </div>
  )
}

function VisualBrand() {
  return (
    <div className={styles.vBrand}>
      <span className={styles.vBrandSwatch} style={{ background: '#6c5ce7' }} />
      <span className={styles.vBrandSwatch} style={{ background: '#c8a8f0' }} />
      <span className={styles.vBrandSwatch} style={{ background: '#9ad7b0' }} />
      <span className={styles.vBrandLogo}>logo</span>
    </div>
  )
}

function VisualAdvanced() {
  return (
    <div className={styles.vAdvanced}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={styles.vAdvNode} style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  )
}

export default function Features() {
  return (
    <section id="features" className={styles.section}>
      <div className={styles.head}>
        <span className={styles.eyebrow}>Features</span>
        <h2 className={styles.title}>
          Todo un equipo de video,<br />
          <span className={styles.accent}>en una sola herramienta.</span>
        </h2>
        <p className={styles.subtitle}>
          Cada paso de la produccion de un video de marketing, automatizado.
          Vos solo pones la URL.
        </p>
      </div>

      <div className={styles.bento}>
        {/* Caja grande: diferenciador */}
        <div className={`${styles.cell} ${styles.cellLarge}`}>
          <div className={styles.cellVisual}><VisualFlow /></div>
          <div className={styles.cellBody}>
            <h3 className={styles.cellTitle}>De tu URL a un video, sin tocar un editor</h3>
            <p className={styles.cellDesc}>
              Pega el link de tu sitio y la IA hace el resto: analiza tu negocio,
              entiende tu propuesta y arma un video completo. Sin software de
              edicion, sin curva de aprendizaje, sin perder horas.
            </p>
          </div>
        </div>

        {/* Caja ancha: formatos */}
        <div className={`${styles.cell} ${styles.cellWide}`}>
          <div className={styles.cellVisual}><VisualFormats /></div>
          <div className={styles.cellBody}>
            <h3 className={styles.cellTitle}>Un video, todos los formatos</h3>
            <p className={styles.cellDesc}>
              Vertical para TikTok y Reels, cuadrado para el feed, horizontal
              para YouTube. Listo para cada plataforma.
            </p>
          </div>
        </div>

        {/* Medianas */}
        <div className={styles.cell}>
          <div className={styles.cellVisual}><VisualScript /></div>
          <div className={styles.cellBody}>
            <h3 className={styles.cellTitle}>Guion con IA</h3>
            <p className={styles.cellDesc}>Hook, problema, beneficios y CTA estructurados para vender.</p>
          </div>
        </div>

        <div className={styles.cell}>
          <div className={styles.cellVisual}><VisualBroll /></div>
          <div className={styles.cellBody}>
            <h3 className={styles.cellTitle}>Visuales y B-Roll</h3>
            <p className={styles.cellDesc}>Imagenes y clips que acompañan cada escena, generados solos.</p>
          </div>
        </div>

        <div className={styles.cell}>
          <div className={styles.cellVisual}><VisualVoice /></div>
          <div className={styles.cellBody}>
            <h3 className={styles.cellTitle}>Voz en off y subtitulos</h3>
            <p className={styles.cellDesc}>Narracion natural y subtitulos sincronizados automaticamente.</p>
          </div>
        </div>

        <div className={styles.cell}>
          <div className={styles.cellVisual}><VisualBrand /></div>
          <div className={styles.cellBody}>
            <h3 className={styles.cellTitle}>Tu marca, siempre</h3>
            <p className={styles.cellDesc}>Tus colores, tu logo y tu tipografia aplicados en cada video.</p>
          </div>
        </div>

        {/* Caja destacada: modo avanzado (conecta con Studio) */}
        <div className={`${styles.cell} ${styles.cellWide} ${styles.cellAdvanced}`}>
          <div className={styles.advBadge}>Studio</div>
          <div className={styles.cellVisual}><VisualAdvanced /></div>
          <div className={styles.cellBody}>
            <h3 className={styles.cellTitle}>Modo avanzado de IA</h3>
            <p className={styles.cellDesc}>
              Control fino sobre el guion, el ritmo y el estilo visual. Maxima
              calidad de render y resultados de nivel agencia.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

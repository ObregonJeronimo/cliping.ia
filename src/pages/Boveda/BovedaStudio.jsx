import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from '../Motor3D/Motor3DStudio.module.css'

// BOVEDA · estudio — el catalogo de PLANTILLAS COMPLETAS.
//
// EN QUE SE DIFERENCIA DE MOTOR 3D, que es la pregunta que un usuario se va a hacer al ver dos
// estudios que piden una URL y devuelven un reel vertical:
//
//   Motor 3D  elegis un HERO —el objeto protagonico— y el motor SORTEA un guion a su alrededor. Dos
//             renders de la misma pagina con el mismo hero dan dos videos parecidos pero distintos.
//   Boveda    elegis una PLANTILLA y recibis una pieza ENTERA, compuesta de punta a punta. La misma
//             pagina con otra plantilla da otro video completamente distinto, con los mismos datos.
//
// Por eso esta pantalla no tiene selector de duracion y la otra si: cada plantilla dura lo que dura su
// composicion. Pedirle 15 segundos a una pieza de 40 beats seria cortarla, no adaptarla — y un usuario
// que ve un control de duracion espera que eso funcione.
//
// SE REUSA EL CSS DE MOTOR 3D A PROPOSITO. Son dos entradas al mismo motor de render y tienen que
// verse hermanas; una hoja propia terminaria divergiendo en los margenes y las dos pantallas se verian
// de dos productos distintos. Lo unico que cambia es el contenido.

const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000')
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
const SEED_MAX = 999999

// Los seis tiempos, en el orden del contrato. La pantalla los muestra porque son lo que hace que doce
// piezas distintas sirvan para la misma marca: el espectador ve doce videos, el cliente ve la misma
// historia contada de doce maneras.
const TIEMPOS = [
  ['espacio', 'el lugar'],
  ['marca', 'tu nombre'],
  ['promesa', 'tu claim'],
  ['prueba', 'tu pagina'],
  ['razones', 'cifras y frases'],
  ['pedido', 'el CTA'],
]

const MATERIAL = {
  tira: { corto: 'captura de la pagina', largo: 'la captura larga de la pagina (para poder scrollearla)' },
  elementos: { corto: 'recortes de la pagina', largo: 'los recortes reales de la pagina (logo, tarjetas, fotos)' },
  cifras: { corto: 'cifras', largo: 'al menos una cifra con su etiqueta' },
}
const material = (n) => MATERIAL[n] || { corto: n, largo: n }
const pide = (p) => (Array.isArray(p && p.necesita) ? p.necesita : []).filter(n => n && n !== 'nada')

// El job devuelve la ruta RELATIVA del mp4. En dev el front vive en otro puerto que el backend, asi
// que pegarla tal cual la resolveria contra Vite y el video no existiria.
const absoluta = (u) => (!u ? '' : (/^(https?:)?\/\//i.test(u) ? u : `${API_URL}${u.startsWith('/') ? '' : '/'}${u}`))

// QUE PLANTILLA SE USO DE VERDAD. `plantilla` a secas NO sirve: el job repite ahi lo que se PIDIO.
// Confundir el pedido con el resultado es exactamente la mentira que esta pantalla tiene que evitar, y
// cuando el job no lo informa esto devuelve vacio y la pantalla lo dice asi.
const leerReporte = (j) => ({ usada: j.plantillaUsada || j.plantilla_usada || '' })

export default function BovedaStudio() {
  const { user } = useAuth()
  const [url, setUrl] = useState('')
  const [plantillas, setPlantillas] = useState([])
  const [aires, setAires] = useState([])
  const [catalogo, setCatalogo] = useState('cargando')
  const [pid, setPid] = useState('')
  const [aire, setAire] = useState('')
  const [seed, setSeed] = useState(7)
  const [familia, setFamilia] = useState('')             // filtro del catalogo, no del render
  const [rendering, setRendering] = useState(false)
  const [estado, setEstado] = useState(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [error, setError] = useState('')
  const [pedido, setPedido] = useState(null)
  const [reporte, setReporte] = useState(null)
  const pollRef = useRef(null)

  // EL CATALOGO SE PIDE, NO SE ESCRIBE ACA. Duplicar la lista en el front la desincroniza el dia que
  // alguien agrega una plantilla — y con un motor pensado para llegar a cientas, eso pasa cada semana.
  useEffect(() => {
    let alive = true
    fetch(`${API_URL}/api/boveda/plantillas`, { headers: HEADERS })
      .then(r => r.json())
      .then(j => {
        if (!alive) return
        const lista = (j && Array.isArray(j.plantillas) ? j.plantillas : []).filter(p => p && p.id)
        if (!lista.length) { setCatalogo((j && j.error) || 'El backend no devolvio ninguna plantilla.'); return }
        setPlantillas(lista)
        setAires(Array.isArray(j.aires) ? j.aires.filter(Boolean) : [])
        setCatalogo('')
        const segura = lista.find(p => !pide(p).length) || lista[0]
        setPid(id => id || segura.id)
      })
      .catch(() => { if (alive) setCatalogo('No se pudo pedir el catalogo — abri "start.bat" (corre en localhost:8000)') })
    return () => { alive = false }
  }, [])

  useEffect(() => () => clearInterval(pollRef.current), [])

  const familias = useMemo(() => {
    const m = new Map()
    for (const p of plantillas) m.set(p.familia || 'otras', (m.get(p.familia || 'otras') || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [plantillas])

  const visibles = familia ? plantillas.filter(p => (p.familia || 'otras') === familia) : plantillas
  const sel = plantillas.find(p => p.id === pid) || null
  const nombreDe = (id) => (plantillas.find(p => p.id === id) || {}).nombre || id
  const reemplazo = (pedido && reporte && reporte.usada && reporte.usada !== pedido.plantilla) ? reporte.usada : ''
  const confirmado = !!(pedido && reporte && reporte.usada && reporte.usada === pedido.plantilla)

  // Segundos aproximados. EL BPM LO PONE EL AIRE, asi que esto es una estimacion y se dice como tal:
  // prometer "22 s" y entregar 26 seria un dato falso por redondear a la baja.
  const segundos = (p) => (p && p.beats ? Math.round((p.beats * 60) / 112) : 0)

  const poll = (jobId) => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API_URL}/api/jobs/${jobId}`, { headers: HEADERS })
        const j = await r.json()
        setEstado({ step: j.step || j.status || '', progress: j.progress || 0 })
        if (j.status === 'done') {
          clearInterval(pollRef.current)
          setVideoUrl(absoluta(j.cloudinaryUrl || j.videoUrl || (j.videoFilename ? `/api/video/${j.videoFilename}` : '')))
          setReporte(leerReporte(j))
          setRendering(false)
        } else if (j.status === 'error') {
          clearInterval(pollRef.current)
          setError(j.error || 'Error en el render')
          setReporte(leerReporte(j))
          setRendering(false)
        }
      } catch { /* reintenta en el proximo tick */ }
    }, 2000)
  }

  const render = async () => {
    if (!url.trim() || rendering) return
    setRendering(true); setError(''); setVideoUrl(''); setReporte(null)
    setEstado({ step: 'en cola', progress: 0 })
    // Snapshot de lo que se mando: el resultado compara contra ESTO y no contra el formulario en vivo.
    const body = { url: url.trim(), plantilla: pid, seed, ...(aire ? { aire } : {}) }
    setPedido(body)
    try {
      const r = await fetch(`${API_URL}/api/boveda/render`, {
        method: 'POST', headers: HEADERS, body: JSON.stringify({ ...body, userId: user?.uid || '' }),
      })
      const j = await r.json()
      const jobId = j && (j.job_id || j.jobId)
      if (!j || j.error || !jobId) { setError((j && j.error) || 'No se pudo iniciar el render'); setRendering(false); return }
      poll(jobId)
    } catch {
      setError('Backend no disponible — abri "start.bat" (corre en localhost:8000)')
      setRendering(false)
    }
  }

  const reroll = () => setSeed(s => ((((s || 1) + 0x9e3779b1) >>> 0) % SEED_MAX) || 1)

  return (
    <div className={styles.wrap}>
      <div className={styles.left}>
        <h1 className={styles.title}>Bóveda <span className={styles.ia}>IA</span></h1>
        <p className={styles.sub}>
          Plantillas completas: cada una es una pieza entera con su espacio 3D, su vuelo de cámara y su ritmo.
          Elegís una y es un video; elegís otra y es un video <strong>completamente distinto</strong> con los mismos datos de tu página.
        </p>

        <div className={styles.row}>
          <input className={styles.input} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://tusitio.com" onKeyDown={e => e.key === 'Enter' && render()} />
        </div>

        <h2 className={styles.h2}>Plantilla {plantillas.length ? `(${plantillas.length})` : ''}</h2>
        <p className={styles.nota}>
          Las {plantillas.length || 'doce'} cuentan lo mismo y en el mismo orden —el lugar, tu nombre, tu claim, tu página, tus razones y el pedido—
          porque eso es lo que hace que sirvan todas para la misma marca. Lo que cambia es <strong>dónde pasa</strong> y <strong>cómo se mueve</strong>.
        </p>

        {catalogo === 'cargando' && <div className={styles.nota}>Pidiendo el catálogo de plantillas…</div>}
        {catalogo && catalogo !== 'cargando' && <div className={styles.err}>{catalogo}</div>}

        {familias.length > 1 && (
          <div className={styles.row}>
            <span className={styles.lbl}>Familia</span>
            <div className={styles.seg}>
              <button className={!familia ? styles.on : ''} onClick={() => setFamilia('')}>todas</button>
              {familias.map(([f, n]) => (
                <button key={f} className={familia === f ? styles.on : ''} onClick={() => setFamilia(f)}>{f} ({n})</button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.heroes}>
          {visibles.map(p => {
            const req = pide(p)
            return (
              <button
                key={p.id}
                className={`${styles.hero} ${p.id === pid ? styles.heroOn : ''}`}
                onClick={() => setPid(p.id)}
                title={p.pitch || ''}
              >
                <span className={styles.heroNombre}>{p.nombre || p.id}</span>
                <span className={styles.heroMeta}>
                  {req.length
                    ? req.map(n => <span key={n} className={styles.chip}>necesita {material(n).corto}</span>)
                    : <span className={`${styles.chip} ${styles.chipLibre}`}>siempre se puede armar</span>}
                  {p.beats ? <span className={styles.chip}>{p.beats} beats · ~{segundos(p)} s</span> : null}
                  {p.familia ? <span className={styles.chip}>{p.familia}</span> : null}
                </span>
                {p.pitch && <span className={styles.heroFalta} style={{ opacity: 0.75 }}>{p.pitch}</span>}
                {reemplazo === p.id && <span className={styles.heroUsado}>Con esta se armó el último video.</span>}
              </button>
            )
          })}
        </div>

        {/* LOS SEIS TIEMPOS DE LA PLANTILLA ELEGIDA, con el beat en que arranca cada uno. No es
            decoracion: es lo que le permite al usuario entender por que dos plantillas con la misma
            duracion se sienten distintas — una le da ocho beats a la pagina y otra cuatro. */}
        {sel && sel.tiempos && (
          <div className={styles.ficha}>
            {TIEMPOS.map(([k, cast]) => (
              typeof sel.tiempos[k] === 'number'
                ? <span key={k} className={styles.chip} title={`arranca en el beat ${sel.tiempos[k]} de ${sel.beats}`}>{cast} · b{sel.tiempos[k]}</span>
                : null
            ))}
          </div>
        )}

        {aires.length > 0 && (
          <div className={styles.row}>
            <span className={styles.lbl}>Aire</span>
            <select className={styles.input} value={aire} onChange={e => setAire(e.target.value)} title="El clima visual: paleta, tipografía, grano y bloom. Automático = el que sale del rubro y del DNA medidos de tu página.">
              <option value="">Automático (según la página)</option>
              {aires.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}

        <div className={styles.row}>
          <span className={styles.lbl}>Semilla</span>
          <input
            className={`${styles.input} ${styles.seedInput}`}
            value={seed}
            inputMode="numeric"
            onChange={e => { const n = parseInt(e.target.value, 10); setSeed(Number.isFinite(n) ? Math.max(0, Math.min(n, SEED_MAX)) : 0) }}
            title="Misma URL + misma plantilla + misma semilla = el mismo video"
          />
          <button className={styles.btn} onClick={reroll} title="Otra semilla: misma plantilla, otro reparto de frases y cifras">Otra versión</button>
          <button className={`${styles.btn} ${styles.primary}`} onClick={render} disabled={rendering || !url.trim()}>
            {rendering ? 'Renderizando…' : 'Generar video'}
          </button>
        </div>
        <p className={styles.nota}>
          La semilla cambia <em>qué</em> frases y cifras entran, no la composición: dentro de una plantilla, dos semillas dan la misma pieza con otro contenido.
          Para otro video, cambiá de plantilla.
        </p>

        {error && <div className={styles.err}>{error}</div>}

        {rendering && (
          <>
            <div className={styles.prog}><div className={styles.progFill} style={{ width: `${Math.max(3, Math.min(100, estado?.progress || 0))}%` }} /></div>
            <div className={styles.progLbl}>{estado?.step || 'trabajando'} · {Math.round(estado?.progress || 0)}% · una pieza tarda entre uno y tres minutos</div>
          </>
        )}

        {reemplazo && (
          <div className={styles.aviso}>
            Pediste <strong>{nombreDe(pedido.plantilla)}</strong> y esta página no dio {pide(plantillas.find(p => p.id === pedido.plantilla)).map(n => material(n).corto).join(' ni ') || 'el material que necesita'}.
            El video se armó con <strong>{nombreDe(reemplazo)}</strong>.
          </div>
        )}
        {confirmado && videoUrl && (
          <div className={`${styles.aviso} ${styles.avisoOk}`}>Se armó con <strong>{nombreDe(pedido.plantilla)}</strong>, la plantilla que pediste.</div>
        )}

        {pedido && videoUrl && (
          <div className={styles.ficha}>
            <span className={styles.chip}>{nombreDe(pedido.plantilla) || 'automática'}</span>
            <span className={styles.chip}>semilla {pedido.seed}</span>
            {pedido.aire && <span className={styles.chip}>aire {pedido.aire}</span>}
            <span className={styles.chip}>{pedido.url}</span>
          </div>
        )}
      </div>

      <div className={styles.stage}>
        <div className={styles.frame}>
          {videoUrl
            ? <video key={videoUrl} className={styles.video} src={videoUrl} controls loop autoPlay muted playsInline />
            : <div className={styles.vacio}>{rendering
              ? 'Componiendo la pieza…'
              : `Pegá el link de tu página, elegí una plantilla y tocá "Generar video".${sel ? ` Ahora está elegida: ${sel.nombre || sel.id}.` : ''}`}</div>}
        </div>
        {videoUrl && (
          <div className={styles.row}>
            <a className={styles.btn} href={videoUrl} download target="_blank" rel="noreferrer">Descargar MP4</a>
          </div>
        )}
      </div>
    </div>
  )
}

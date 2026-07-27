import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Motor3DStudio.module.css'

// Backend: mismo patron que el resto de los estudios. En dev pega a localhost:8000 (start.bat).
const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000')
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

const DURACIONES = [15, 20, 30]
const SEED_MAX = 999999   // el backend recorta la semilla a este tope: pasarse la aplasta contra el techo
                          // y varias "otras versiones" seguidas darian EL MISMO video.

// COMO SE LEE "necesita". El hero declara que material de la pagina hace falta para armarlo; aca solo
// se traduce a castellano. Un valor que no conozcamos se muestra crudo en vez de desaparecer: si el
// backend suma un material nuevo, el selector sigue diciendo la verdad sin tocar el front.
const MATERIAL = {
  tira: { corto: 'captura de la pagina', largo: 'la captura larga de la pagina (para poder scrollearla)' },
  elementos: { corto: 'recortes de la pagina', largo: 'los recortes reales de la pagina (logo, tarjetas, botones)' },
}
const material = (n) => MATERIAL[n] || { corto: n, largo: n }

// Lo que un hero necesita DE LA PAGINA. 'nada' no es un requisito: es la ausencia de requisitos, asi
// que se filtra y un hero con la lista vacia es el que siempre se puede armar.
const pide = (h) => (Array.isArray(h && h.necesita) ? h.necesita : []).filter(n => n && n !== 'nada')

// El job devuelve la ruta del mp4 RELATIVA ("/api/video/x.mp4"). En dev el front vive en otro puerto
// que el backend, asi que pegarla tal cual en el <video> la resuelve contra el server de Vite y el
// video no existe. Todo lo que no venga absoluto se cuelga de API_URL.
const absoluta = (u) => (!u ? '' : (/^(https?:)?\/\//i.test(u) ? u : `${API_URL}${u.startsWith('/') ? '' : '/'}${u}`))

// QUE HERO SE USO DE VERDAD. Solo cuentan los campos que significan "el que se armo": `hero` a secas
// NO sirve, porque el job repite ahi lo que se PIDIO, y confundir el pedido con el resultado es
// exactamente la mentira que esta pantalla tiene que evitar. Si el job no lo informa, esto devuelve
// vacio y la pantalla lo dice asi, sin inventar una confirmacion.
const leerReporte = (j) => {
  const usado = j.heroUsado || j.hero_usado || j.heroFinal || ''
  const mat = Array.isArray(j.material) ? j.material : (Array.isArray(j.materialDisponible) ? j.materialDisponible : null)
  return { usado, material: mat }
}

// MOTOR 3D · estudio — Three.js + GSAP en Chrome headless (render3d). El usuario elige EL HERO: el
// objeto protagonista es el eje de variedad mas visible que tiene la pieza (cambia de que trata el
// video, no solo como se ve).
//
// EL ORDEN IMPORTA Y ES INCOMODO: se elige el hero ANTES de que el backend lea la pagina, asi que en
// el momento de elegir todavia no se sabe si esta pagina va a dar la captura o los recortes. Por eso
// cada tarjeta dice QUE NECESITA en vez de prometer que va a salir, y el resultado avisa cuando el
// elegido no se pudo armar. La alternativa —ofrecer solo los heroes "seguros"— dejaria al usuario sin
// los buenos por miedo a fallar.
export default function Motor3DStudio() {
  const { user } = useAuth()
  const [url, setUrl] = useState('')
  const [heroes, setHeroes] = useState([])
  const [aires, setAires] = useState([])
  const [catalogo, setCatalogo] = useState('cargando')   // 'cargando' | '' | mensaje de error
  const [heroId, setHeroId] = useState('')
  const [aire, setAire] = useState('')                   // '' = el que salga del rubro y el DNA medidos
  const [dur, setDur] = useState(20)
  const [seed, setSeed] = useState(7)
  const [rendering, setRendering] = useState(false)
  const [estado, setEstado] = useState(null)             // { step, progress } del job
  const [videoUrl, setVideoUrl] = useState('')
  const [error, setError] = useState('')
  const [pedido, setPedido] = useState(null)             // snapshot de lo que se mando a rendir
  const [reporte, setReporte] = useState(null)           // lo que el job dijo que hizo
  const pollRef = useRef(null)

  // --- CATALOGO: se PIDE al backend. Escribir la lista aca la duplicaria, y una lista duplicada
  // ofrece heroes que el motor no tiene (o esconde los que agregaron ayer). Si no se puede pedir, la
  // pantalla lo dice y no deja rendir: mejor eso que un selector inventado.
  useEffect(() => {
    let alive = true
    fetch(`${API_URL}/api/motor3d/heroes`, { headers: HEADERS })
      .then(r => r.json())
      .then(j => {
        if (!alive) return
        const lista = (Array.isArray(j) ? j : (j && Array.isArray(j.heroes) ? j.heroes : [])).filter(h => h && h.id)
        if (!lista.length) { setCatalogo((j && j.error) || 'El backend no devolvio ningun hero.'); return }
        setHeroes(lista)
        setAires(Array.isArray(j.aires) ? j.aires.filter(Boolean) : [])
        setCatalogo('')
        // Preseleccion: el primero que no necesita nada de la pagina. Es el unico que se puede
        // prometer sin haber leido el sitio todavia; el resto queda a un click.
        const seguro = lista.find(h => !pide(h).length) || lista[0]
        setHeroId(id => id || seguro.id)
      })
      .catch(() => { if (alive) setCatalogo('No se pudo pedir el catalogo de heroes — abri "start.bat" (corre en localhost:8000)') })
    return () => { alive = false }
  }, [])

  useEffect(() => () => clearInterval(pollRef.current), [])

  // Lo que la pagina DIO, medido en el ultimo render. Solo vale si es la misma URL que hay ahora en el
  // campo: cambiar de sitio invalida la medicion (y por eso las tarjetas vuelven a no prometer nada).
  const medido = useMemo(() => {
    if (!reporte || !reporte.material || !pedido || pedido.url !== url.trim()) return null
    return new Set(reporte.material)
  }, [reporte, pedido, url])
  const falta = (h) => (medido ? pide(h).filter(n => !medido.has(n)) : [])

  const heroSel = heroes.find(h => h.id === heroId) || null
  const heroPedido = pedido ? heroes.find(h => h.id === pedido.hero) : null
  const nombreDe = (id) => (heroes.find(h => h.id === id) || {}).nombre || id
  // El reemplazo solo se anuncia si el job nombro OTRO hero distinto del que se pidio.
  const reemplazo = (pedido && reporte && reporte.usado && reporte.usado !== pedido.hero) ? reporte.usado : ''
  const confirmado = !!(pedido && reporte && reporte.usado && reporte.usado === pedido.hero)
  // Video listo, el hero pedido dependia del material de la pagina y el job no dijo con que lo armo:
  // no alcanza para confirmar ni para desmentir, y eso es lo que corresponde decir.
  const sinConfirmar = !!(videoUrl && pedido && !reporte?.usado && pide(heroPedido).length > 0)

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
    if (!url.trim() || !heroId || rendering) return
    setRendering(true); setError(''); setVideoUrl(''); setReporte(null)
    setEstado({ step: 'en cola', progress: 0 })
    // Snapshot de lo que se mando: el resultado muestra ESTO, no el formulario en vivo. Si el usuario
    // cambia de hero mientras renderiza, el aviso de reemplazo tiene que seguir comparando contra el
    // hero que realmente se pidio.
    const body = { url: url.trim(), hero: heroId, dur, seed, ...(aire ? { aire } : {}) }
    setPedido(body)
    try {
      const r = await fetch(`${API_URL}/api/motor3d/render`, {
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

  // OTRA VERSION: salto aureo de semilla, igual que el resto de los estudios, pero DENTRO del rango
  // que acepta el backend (ver SEED_MAX). Misma URL, mismo hero, misma duracion: cambia el montaje.
  const reroll = () => setSeed(s => ((((s || 1) + 0x9e3779b1) >>> 0) % SEED_MAX) || 1)

  return (
    <div className={styles.wrap}>
      <div className={styles.left}>
        <h1 className={styles.title}>Motor 3D <span className={styles.ia}>IA</span></h1>
        <p className={styles.sub}>Three.js + GSAP renderizado en Chrome headless: camara real, profundidad, bloom y desenfoque de movimiento. Elegis el objeto protagonista y el motor arma el video con lo que la pagina te dio.</p>

        <div className={styles.row}>
          <input className={styles.input} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://tusitio.com" onKeyDown={e => e.key === 'Enter' && render()} />
        </div>

        <h2 className={styles.h2}>Hero</h2>
        <p className={styles.nota}>La pagina se lee DESPUES de que elegis. Cada tarjeta dice que material necesita: si esta pagina no lo da, el motor arma el video con un hero que si se pueda y te avisa aca abajo.</p>

        {catalogo === 'cargando' && <div className={styles.nota}>Pidiendo el catalogo de heroes…</div>}
        {catalogo && catalogo !== 'cargando' && <div className={styles.err}>{catalogo}</div>}

        <div className={styles.heroes}>
          {heroes.map(h => {
            const req = pide(h)
            const sinMaterial = falta(h)
            return (
              <button
                key={h.id}
                className={`${styles.hero} ${h.id === heroId ? styles.heroOn : ''}`}
                onClick={() => setHeroId(h.id)}
                title={req.length ? `Necesita ${req.map(n => material(n).largo).join(' y ')}` : 'Se arma con geometria y la paleta de la marca: no necesita nada de la pagina'}
              >
                <span className={styles.heroNombre}>{h.nombre || h.id}</span>
                <span className={styles.heroMeta}>
                  {req.length
                    ? req.map(n => <span key={n} className={`${styles.chip} ${sinMaterial.includes(n) ? styles.chipFalta : ''}`}>necesita {material(n).corto}</span>)
                    : <span className={`${styles.chip} ${styles.chipLibre}`}>siempre se puede armar</span>}
                  {h.beats ? <span className={styles.chip}>{h.beats} beats</span> : null}
                </span>
                {sinMaterial.length > 0 && <span className={styles.heroFalta}>Esta pagina no dio {sinMaterial.map(n => material(n).corto).join(' ni ')}.</span>}
                {reemplazo === h.id && <span className={styles.heroUsado}>Con este se armo el ultimo video.</span>}
              </button>
            )
          })}
        </div>

        {/* Lo que ya sabemos de ESTA pagina (medido en el render anterior) se avisa ANTES de gastar
            otro render: el usuario elige con el dato, en vez de enterarse cuando el video ya salio. */}
        {heroSel && falta(heroSel).length > 0 && (
          <div className={styles.aviso}>
            En el ultimo video de esta pagina no aparecio {falta(heroSel).map(n => material(n).corto).join(' ni ')}, asi que <strong>{heroSel.nombre || heroSel.id}</strong> probablemente no se pueda armar. Podes generar igual —el motor cae al hero de respaldo— o elegir otro.
          </div>
        )}

        <div className={styles.row}>
          <span className={styles.lbl}>Duracion</span>
          <div className={styles.seg}>
            {DURACIONES.map(d => (
              <button key={d} className={d === dur ? styles.on : ''} onClick={() => setDur(d)}>{d}s</button>
            ))}
          </div>
        </div>

        {/* El aire tambien es vocabulario CERRADO del motor y viene en la misma respuesta que los
            heroes, asi que se ofrece leido, nunca escrito aca. Vacio = lo decide el motor. */}
        {aires.length > 0 && (
          <div className={styles.row}>
            <span className={styles.lbl}>Aire</span>
            <select className={styles.input} value={aire} onChange={e => setAire(e.target.value)} title="El clima visual de la pieza. Automatico = el que sale del rubro y del DNA medidos.">
              <option value="">Automatico (segun la pagina)</option>
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
            title="Misma URL + mismo hero + misma semilla = el mismo video"
          />
          <button className={styles.btn} onClick={reroll} title="Otra semilla: mismo hero y misma duracion, otro montaje">Otra version</button>
          <button className={`${styles.btn} ${styles.primary}`} onClick={render} disabled={rendering || !url.trim() || !heroId}>
            {rendering ? 'Renderizando…' : 'Generar video'}
          </button>
        </div>

        {error && <div className={styles.err}>{error}</div>}

        {rendering && (
          <>
            <div className={styles.prog}><div className={styles.progFill} style={{ width: `${Math.max(3, Math.min(100, estado?.progress || 0))}%` }} /></div>
            <div className={styles.progLbl}>{estado?.step || 'trabajando'} · {Math.round(estado?.progress || 0)}% · un render 3D tarda entre uno y tres minutos</div>
          </>
        )}

        {/* QUE SALIO, en los tres estados posibles: el motor cambio de hero / salio el pedido / no se
            puede saber. El tercero existe porque callarlo seria dar por buena una promesa sin datos. */}
        {reemplazo && (
          <div className={styles.aviso}>
            Pediste <strong>{nombreDe(pedido.hero)}</strong> y esta pagina no dio {pide(heroPedido).map(n => material(n).corto).join(' ni ') || 'el material que necesita'}.
            El video se armo con <strong>{nombreDe(reemplazo)}</strong>.
          </div>
        )}
        {confirmado && videoUrl && (
          <div className={`${styles.aviso} ${styles.avisoOk}`}>Se armo con <strong>{nombreDe(pedido.hero)}</strong>, el hero que pediste.</div>
        )}
        {sinConfirmar && (
          <div className={styles.aviso}>
            El render no informo con que hero termino. <strong>{nombreDe(pedido.hero)}</strong> necesita {pide(heroPedido).map(n => material(n).corto).join(' y ')}: si esta pagina no lo dio, lo que estas viendo es el hero de respaldo.
          </div>
        )}

        {pedido && videoUrl && (
          <div className={styles.ficha}>
            <span className={styles.chip}>{pedido.dur}s</span>
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
              ? 'Renderizando en el motor 3D…'
              : `Pega el link de tu pagina, elegi el hero y toca "Generar video".${heroSel ? ` Ahora esta elegido: ${heroSel.nombre || heroSel.id}.` : ''}`}</div>}
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

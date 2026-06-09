import { createContext, useContext, useRef, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

/**
 * Mantiene el estado de generación (y los campos del formulario) VIVO mientras el
 * usuario navega entre Home y Mis cinemáticas. Vive en AppLayout, que no se desmonta
 * al cambiar de página -> el polling y el progreso no se cortan ni se pierden.
 */

const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000')
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

const Ctx = createContext(null)
export const useVideoJob = () => useContext(Ctx)

export function VideoJobProvider({ children }) {
  const { user } = useAuth()

  // Formulario (persiste entre páginas)
  const [mode, setMode] = useState('simple')
  const [url, setUrl] = useState('')
  const [desarrollo, setDesarrollo] = useState('')
  const [theme, setTheme] = useState('')
  const [proposito, setProposito] = useState('marketing')
  const [tono, setTono] = useState('')
  const [seconds, setSeconds] = useState(15)
  const [idioma, setIdioma] = useState('')      // idioma del video elegido por el usuario ('' = auto/según la página)
  const [formato, setFormato] = useState('vertical')  // vertical (9:16) | square (1:1) | wide (16:9)
  const [useCache, setUseCache] = useState(true)    // testing: usar el análisis de marca guardado vs reanalizar
  const [cacheMsg, setCacheMsg] = useState('')      // feedback del borrado de caché (testing)
  const [submitted, setSubmitted] = useState(null)  // snapshot de lo usado en el último video

  // Estado de generación (persiste entre páginas)
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState(null)
  const [spec, setSpec] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  // Solo limpia el intervalo cuando se desmonta TODO el layout (logout), no al navegar.
  useEffect(() => () => clearInterval(pollRef.current), [])

  const reset = () => { setStatus(null); setSpec(null); setVideoUrl(null); setError(null) }

  function pollJob(jobId) {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API_URL}/api/jobs/${jobId}`, { headers: HEADERS })
        const j = await r.json()
        setStatus({ step: j.step || j.status, progress: j.progress || 0 })
        if (j.spec) setSpec(j.spec)
        if (j.status === 'done') {
          clearInterval(pollRef.current)
          setVideoUrl(j.cloudinaryUrl || (j.videoFilename ? `${API_URL}/api/video/${j.videoFilename}` : null))
          setGenerating(false)
        } else if (j.status === 'error') {
          clearInterval(pollRef.current)
          setError(j.error || 'Error en el render')
          setGenerating(false)
        }
      } catch { /* reintenta en el próximo tick */ }
    }, 2000)
  }

  async function generate() {
    if (!(url.trim() || desarrollo.trim()) || generating) return
    setGenerating(true); reset(); setStatus({ step: 'queued', progress: 0 })
    // Snapshot de lo que se usó para ESTE video: el resultado muestra esto, no el form en vivo
    // (si el usuario edita la URL para el próximo, el "Video listo" no debe cambiar).
    setSubmitted({ url: url.trim(), seconds, mode, idioma, formato })
    const body = mode === 'simple'
      ? { url: url.trim(), desarrollo: desarrollo.trim(), proposito: 'marketing', seconds, idioma, formato, refreshBrand: !useCache, userId: user?.uid || '' }
      : { url: url.trim(), desarrollo: desarrollo.trim(), proposito, theme, tone: tono, seconds, idioma, formato, refreshBrand: !useCache, userId: user?.uid || '' }
    try {
      const r = await fetch(`${API_URL}/api/video/generate`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) })
      const d = await r.json()
      if (d.error || !d.job_id) { setError(d.error || 'No se pudo iniciar'); setGenerating(false); return }
      pollJob(d.job_id)
    } catch (e) { setError(e.message); setGenerating(false) }
  }

  // TESTING: borra el análisis de marca guardado (todas las URLs) para iterar el look sin caché viejo.
  async function clearBrandCache() {
    setCacheMsg('Borrando…')
    try {
      const r = await fetch(`${API_URL}/api/brand-cache/clear`, {
        method: 'POST', headers: HEADERS, body: JSON.stringify({ userId: user?.uid || '' }),
      })
      const d = await r.json()
      setCacheMsg(d.error ? `No se pudo borrar: ${d.error}` : `Caché borrado (${d.deleted ?? 0})`)
    } catch (e) { setCacheMsg(`No se pudo borrar: ${e.message}`) }
  }

  const value = {
    mode, setMode, url, setUrl, desarrollo, setDesarrollo, theme, setTheme,
    proposito, setProposito, tono, setTono, seconds, setSeconds,
    idioma, setIdioma, formato, setFormato, submitted,
    useCache, setUseCache, cacheMsg, clearBrandCache,
    generating, status, spec, videoUrl, error, generate, reset,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

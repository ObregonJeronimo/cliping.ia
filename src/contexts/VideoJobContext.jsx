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
    const body = mode === 'simple'
      ? { url: url.trim(), desarrollo: desarrollo.trim(), proposito: 'marketing', seconds, userId: user?.uid || '' }
      : { url: url.trim(), desarrollo: desarrollo.trim(), proposito, theme, tone: tono, seconds, userId: user?.uid || '' }
    try {
      const r = await fetch(`${API_URL}/api/video/generate`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) })
      const d = await r.json()
      if (d.error || !d.job_id) { setError(d.error || 'No se pudo iniciar'); setGenerating(false); return }
      pollJob(d.job_id)
    } catch (e) { setError(e.message); setGenerating(false) }
  }

  const value = {
    mode, setMode, url, setUrl, desarrollo, setDesarrollo, theme, setTheme,
    proposito, setProposito, tono, setTono, seconds, setSeconds,
    generating, status, spec, videoUrl, error, generate, reset,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

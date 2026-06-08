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
      ? { url: url.trim(), desarrollo: desarrollo.trim(), proposito: 'marketing', seconds, idioma, formato, userId: user?.uid || '' }
      : { url: url.trim(), desarrollo: desarrollo.trim(), proposito, theme, tone: tono, seconds, idioma, formato, userId: user?.uid || '' }
    try {
      const r = await fetch(`${API_URL}/api/video/generate`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) })
      const d = await r.json()
      if (d.error || !d.job_id) { setError(d.error || 'No se pudo iniciar'); setGenerating(false); return }
      pollJob(d.job_id)
    } catch (e) { setError(e.message); setGenerating(false) }
  }

  // ⚠️ TEMPORAL (botón de prueba): genera yerco.ar en los 3 formatos con el MISMO contenido
  // (un spec base -> render vertical/cuadrado/horizontal). Los 3 quedan en "Mis cinemáticas".
  async function generateTest() {
    if (generating) return
    setGenerating(true); reset(); setStatus({ step: 'queued', progress: 0 })
    setSubmitted({ url: 'https://yerco.ar', seconds, mode: 'PRUEBA · 3 formatos', idioma, formato: 'vertical+square+wide' })
    try {
      let baseSpec = null
      try {
        const vr = await fetch(`${API_URL}/api/video/variants`, { method: 'POST', headers: HEADERS,
          body: JSON.stringify({ url: 'https://yerco.ar', desarrollo: '', proposito: 'marketing', seconds, idioma, userId: user?.uid || '', count: 1 }) })
        const vd = await vr.json()
        baseSpec = vd?.variants?.[0]?.spec || null
      } catch { /* si falla, cada formato genera su propio spec */ }
      let lastJob = null
      for (const f of ['vertical', 'square', 'wide']) {
        const body = { url: 'https://yerco.ar', userId: user?.uid || '', formato: f, idioma, seconds, ...(baseSpec ? { spec: baseSpec } : {}) }
        const r = await fetch(`${API_URL}/api/video/generate`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) })
        const d = await r.json()
        if (d.job_id) lastJob = d.job_id
      }
      if (lastJob) pollJob(lastJob)   // seguimos el último; los 3 se guardan en la galería
      else { setError('No se pudo iniciar la prueba'); setGenerating(false) }
    } catch (e) { setError(e.message); setGenerating(false) }
  }

  const value = {
    mode, setMode, url, setUrl, desarrollo, setDesarrollo, theme, setTheme,
    proposito, setProposito, tono, setTono, seconds, setSeconds,
    idioma, setIdioma, formato, setFormato, submitted,
    generating, status, spec, videoUrl, error, generate, generateTest, reset,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

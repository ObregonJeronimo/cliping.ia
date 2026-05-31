import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ─── Config ──────────────────────────────────────────────────────────────────
const FONT_SIZE    = 72      // tamaño canvas px
const SCALE        = 0.032   // canvas px → unidades 3D  (más chico = texto más pequeño)
const SAMPLE_STEP  = 3       // densidad de puntos
const MAX          = 4000
const ITEMS        = ['Hook', 'Problema', 'Features', 'Diferenciador', 'Beneficios', 'CTA']

// ─── Canvas sampling (canal alpha, técnica correcta) ─────────────────────────
function sampleString(string, fontSize, scale, step) {
  const lines       = string.split('\n')
  const longest     = [...lines].sort((a, b) => b.length - a.length)[0]
  const cW          = Math.ceil(fontSize * 0.62 * longest.length + 32)
  const cH          = Math.ceil(lines.length * fontSize * 1.2 + 16)

  const canvas = document.createElement('canvas')
  canvas.width  = cW
  canvas.height = cH
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, cW, cH)
  ctx.fillStyle    = '#fff'
  ctx.font         = `bold ${fontSize}px system-ui, -apple-system, sans-serif`
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'top'

  lines.forEach((line, i) => ctx.fillText(line, 8, i * fontSize * 1.2 + 8))

  const img = ctx.getImageData(0, 0, cW, cH)
  const pts = []

  for (let y = 0; y < cH; y += step)
    for (let x = 0; x < cW; x += step)
      if (img.data[(y * cW + x) * 4 + 3] > 128)   // canal alpha
        pts.push({
          x: (x - cW / 2) * scale,
          y: -(y - cH / 2) * scale,
          z: 0,
        })

  return pts
}

function sampleTimeline(items) {
  const fs   = 52
  const sc   = 0.028
  const step = 2
  const cW   = 380
  const rowH = fs * 1.3
  const cH   = Math.ceil(items.length * rowH + 16)

  const canvas = document.createElement('canvas')
  canvas.width  = cW
  canvas.height = cH
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, cW, cH)
  ctx.font         = `bold ${fs}px monospace`
  ctx.textBaseline = 'top'
  ctx.textAlign    = 'left'

  items.forEach((it, i) => {
    ctx.fillStyle = it.done ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.45)'
    ctx.fillText((it.done ? '✓  ' : '○  ') + it.label, 6, i * rowH + 8)
  })

  const img = ctx.getImageData(0, 0, cW, cH)
  const pts = []

  for (let y = 0; y < cH; y += step)
    for (let x = 0; x < cW; x += step)
      if (img.data[(y * cW + x) * 4 + 3] > 100)
        pts.push({
          x: (x - cW / 2) * sc,
          y: -(y - cH / 2) * sc,
          z: 0,
        })

  return pts
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function ParticleHero({ onStateChange }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    // Pre-calcular ANTES del renderer para evitar conflicto de contextos WebGL
    const urlPts    = sampleString('misitio.com', FONT_SIZE, SCALE, SAMPLE_STEP)
    const promptPts = sampleString('Video profesional\ncon todas las herramientas', FONT_SIZE * 0.72, SCALE, SAMPLE_STEP)

    // ── Three.js setup ────────────────────────────────────────────────────
    const W = el.offsetWidth  || 700
    const H = el.offsetHeight || 650

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const cam   = new THREE.PerspectiveCamera(50, W / H, 0.1, 200)
    cam.position.z = 16

    // ── InstancedMesh ─────────────────────────────────────────────────────
    // CRÍTICO: material blanco — los colores de instancia son multiplicativos
    const geo = new THREE.BoxGeometry(1, 1, 1)
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const mesh = new THREE.InstancedMesh(geo, mat, MAX)
    mesh.frustumCulled = false

    // Inicializar TODOS los colores antes del primer frame
    const initCol = new THREE.Color(0x111830)
    for (let i = 0; i < MAX; i++) mesh.setColorAt(i, initCol)
    mesh.instanceColor.needsUpdate = true
    scene.add(mesh)

    const dummy  = new THREE.Object3D()
    const colTmp = new THREE.Color()

    // Posiciones scatter base — esfera aplanada
    const base = Array.from({ length: MAX }, () => {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 5 + Math.random() * 7
      return new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta) * 0.55,
        r * Math.cos(phi) * 0.35,
      )
    })

    const cur = base.map(v => v.clone())
    const tgt = base.map(v => v.clone())
    const state = { activeN: 0, forming: false }

    function setTargets(pts) {
      state.activeN = Math.min(pts.length, MAX)
      state.forming = pts.length > 0
      for (let i = 0; i < MAX; i++)
        tgt[i].set(
          i < pts.length ? pts[i].x : base[i].x,
          i < pts.length ? pts[i].y : base[i].y,
          i < pts.length ? pts[i].z ?? 0 : base[i].z,
        )
    }

    // ── Ciclo ─────────────────────────────────────────────────────────────
    const timers = []
    const wait   = (ms, fn) => timers.push(setTimeout(fn, ms))

    function runCycle() {
      setTargets(urlPts)
      onStateChange?.('url')

      wait(3800, () => {
        setTargets([])
        wait(1400, () => {
          setTargets(promptPts)
          onStateChange?.('prompt')
          wait(4200, () => {
            setTargets([])
            wait(1300, () => {
              onStateChange?.('timeline')
              const items = ITEMS.map(l => ({ label: l, done: false }))
              setTargets(sampleTimeline(items))
              let idx = 0
              function tick() {
                if (idx > 0) items[idx - 1].done = true
                idx++
                setTargets(sampleTimeline(items))
                if (idx <= ITEMS.length) wait(1000, tick)
                else wait(2600, () => { setTargets([]); wait(1400, runCycle) })
              }
              wait(600, tick)
            })
          })
        })
      })
    }

    // ── Paleta ────────────────────────────────────────────────────────────
    const C_TOP  = new THREE.Color(0xffffff)   // blanco puro arriba
    const C_MID  = new THREE.Color(0xa0b8ff)   // azul claro centro
    const C_BOT  = new THREE.Color(0x5060c8)   // azul-violeta abajo
    const C_IDLE = new THREE.Color(0x1a2550)   // azul oscuro partículas fondo

    // ── Render loop ───────────────────────────────────────────────────────
    let t = 0, alive = true, rafId

    function animate() {
      if (!alive) return
      rafId = requestAnimationFrame(animate)
      t += 0.016

      const spd = state.forming ? 0.085 : 0.028

      for (let i = 0; i < MAX; i++) {
        const c = cur[i], g = tgt[i]
        c.lerp(g, spd)

        if (!state.forming) {
          c.x += Math.sin(t * 0.42 + i * 0.28) * 0.0015
          c.y += Math.cos(t * 0.35 + i * 0.22) * 0.0015
          c.z += Math.sin(t * 0.23 + i * 0.16) * 0.0007
        }

        dummy.position.copy(c)

        const isActive  = i < state.activeN && state.forming
        const dist      = c.distanceTo(g)
        const proximity = Math.max(0, 1 - dist * 0.5)   // 0→1 cuando llega

        const sc = isActive
          ? 0.078 + proximity * 0.055    // cubos activos grandes al llegar
          : 0.009 + Math.random() * 0.003 // fondo muy pequeño

        dummy.scale.setScalar(sc)
        dummy.rotation.x = t * 0.14 + i * 0.018
        dummy.rotation.y = t * 0.10 + i * 0.012
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)

        // ── Color por instancia ──────────────────────────────────────────
        if (isActive) {
          // Gradiente vertical: blanco arriba → azul-violeta abajo
          // Rango Y activo aprox -2 a +2 unidades
          const normY = Math.max(0, Math.min(1, (c.y + 2.2) / 4.4))
          if (normY > 0.5) {
            colTmp.lerpColors(C_MID, C_TOP, (normY - 0.5) * 2)
          } else {
            colTmp.lerpColors(C_BOT, C_MID, normY * 2)
          }
          // Brillo: opaco cuando llega a destino, tenue cuando viaja
          const brightness = 0.35 + proximity * 0.65
          colTmp.multiplyScalar(brightness)
        } else {
          // Partículas de fondo: pulso suave, muy oscuras
          const pulse = 0.25 + Math.sin(t * 0.6 + i * 0.38) * 0.12
          colTmp.copy(C_IDLE).multiplyScalar(pulse)
        }

        mesh.setColorAt(i, colTmp)
      }

      mesh.instanceMatrix.needsUpdate = true
      mesh.instanceColor.needsUpdate  = true
      renderer.render(scene, cam)
    }

    // ── Resize ────────────────────────────────────────────────────────────
    const onResize = () => {
      const W2 = el.offsetWidth, H2 = el.offsetHeight
      if (!W2 || !H2) return
      cam.aspect = W2 / H2; cam.updateProjectionMatrix()
      renderer.setSize(W2, H2)
    }
    window.addEventListener('resize', onResize)

    animate()
    const startId = setTimeout(runCycle, 300)

    return () => {
      alive = false
      cancelAnimationFrame(rafId)
      clearTimeout(startId)
      timers.forEach(clearTimeout)
      window.removeEventListener('resize', onResize)
      renderer.dispose(); geo.dispose(); mat.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [onStateChange])

  return <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight: '650px' }} />
}

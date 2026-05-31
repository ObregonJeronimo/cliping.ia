import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const FONT_SIZE   = 72
const SCALE       = 0.030
const SAMPLE_STEP = 3
const MAX         = 4000
const ITEMS       = ['Hook', 'Problema', 'Features', 'Diferenciador', 'Beneficios', 'CTA']

function sampleCanvas(canvas) {
  const cW = canvas.width, cH = canvas.height
  const img = canvas.getContext('2d').getImageData(0, 0, cW, cH)
  const pts = []
  for (let y = 0; y < cH; y += SAMPLE_STEP)
    for (let x = 0; x < cW; x += SAMPLE_STEP)
      if (img.data[(y * cW + x) * 4 + 3] > 128)
        pts.push({ x: (x - cW / 2) * SCALE, y: -(y - cH / 2) * SCALE })
  return pts
}

function makeTextCanvas(string, fontSize) {
  const lines   = string.split('\n')
  const longest = [...lines].sort((a, b) => b.length - a.length)[0]
  const cW = Math.ceil(fontSize * 0.62 * longest.length + 32)
  const cH = Math.ceil(lines.length * fontSize * 1.25 + 16)
  const c  = document.createElement('canvas')
  c.width = cW; c.height = cH
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, cW, cH)
  ctx.fillStyle = '#fff'
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  lines.forEach((l, i) => ctx.fillText(l, 8, i * fontSize * 1.25 + 8))
  return c
}

function makeTimelineCanvas(items) {
  const fs = 48, rowH = fs * 1.35, cW = 360
  const cH = Math.ceil(items.length * rowH + 16)
  const c  = document.createElement('canvas')
  c.width = cW; c.height = cH
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, cW, cH)
  ctx.font = `bold ${fs}px monospace`
  ctx.textBaseline = 'top'; ctx.textAlign = 'left'
  items.forEach((it, i) => {
    ctx.fillStyle = it.done ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.4)'
    ctx.fillText((it.done ? '✓  ' : '○  ') + it.label, 6, i * rowH + 8)
  })
  return c
}

function precomputeAll() {
  const urlPts    = sampleCanvas(makeTextCanvas('URL', FONT_SIZE * 1.4))
  const promptPts = sampleCanvas(makeTextCanvas('Video profesional\ncon todas las\nherramientas del sitio', FONT_SIZE * 0.68))
  const tlStates  = []
  for (let step = 0; step <= ITEMS.length; step++) {
    const snapshot = ITEMS.map((l, i) => ({ label: l, done: i < step }))
    tlStates.push(sampleCanvas(makeTimelineCanvas(snapshot)))
  }
  return { urlPts, promptPts, tlStates }
}

export default function ParticleHero({ onStateChange }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const { urlPts, promptPts, tlStates } = precomputeAll()

    const W = el.offsetWidth || 700
    const H = el.offsetHeight || 650

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const cam   = new THREE.PerspectiveCamera(50, W / H, 0.1, 200)
    cam.position.z = 16

    const geo  = new THREE.BoxGeometry(1, 1, 1)
    const mat  = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const mesh = new THREE.InstancedMesh(geo, mat, MAX)
    mesh.frustumCulled = false
    const initCol = new THREE.Color(0x111830)
    for (let i = 0; i < MAX; i++) mesh.setColorAt(i, initCol)
    mesh.instanceColor.needsUpdate = true
    scene.add(mesh)

    const dummy  = new THREE.Object3D()
    const colTmp = new THREE.Color()

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
    const cur   = base.map(v => v.clone())
    const tgt   = base.map(v => v.clone())
    const state = { activeN: 0, forming: false }

    function setTargets(pts) {
      state.activeN = Math.min(pts.length, MAX)
      state.forming = pts.length > 0
      for (let i = 0; i < MAX; i++)
        tgt[i].set(
          i < pts.length ? pts[i].x : base[i].x,
          i < pts.length ? pts[i].y : base[i].y,
          0,
        )
    }

    // ── Secuenciador: lista plana de pasos, un único setTimeout activo ────
    let alive = true
    let currentTimer = null

    function cancelCurrent() {
      if (currentTimer !== null) {
        clearTimeout(currentTimer)
        currentTimer = null
      }
    }

    function runAfter(ms, fn) {
      cancelCurrent()
      if (!alive) return
      currentTimer = setTimeout(() => {
        currentTimer = null
        if (alive) fn()
      }, ms)
    }

    // Secuencia de pasos: cada paso recibe cuánto esperar antes de ejecutar
    // y llama a next() para encadenar el siguiente
    function startSequence() {
      // Paso 1 — URL (visible 3.8s)
      setTargets(urlPts)
      onStateChange?.('url')

      runAfter(3800, () => {
        // Scatter (1.4s)
        setTargets([])

        runAfter(1400, () => {
          // Paso 2 — Prompt (visible 4.2s)
          setTargets(promptPts)
          onStateChange?.('prompt')

          runAfter(4200, () => {
            // Scatter (1.3s)
            setTargets([])

            runAfter(1300, () => {
              // Paso 3 — Timeline: mostrar base
              onStateChange?.('timeline')
              setTargets(tlStates[0])

              // Completar ítems uno a uno con una cadena simple
              function completeItem(step) {
                runAfter(step === 0 ? 800 : 1000, () => {
                  setTargets(tlStates[step + 1])
                  if (step + 1 < ITEMS.length) {
                    completeItem(step + 1)
                  } else {
                    // Todos completos — esperar y reiniciar
                    runAfter(2800, () => {
                      setTargets([])
                      runAfter(1400, () => startSequence())
                    })
                  }
                })
              }
              completeItem(0)
            })
          })
        })
      })
    }

    // ── Paleta ────────────────────────────────────────────────────────────
    const C_TOP  = new THREE.Color(0xffffff)
    const C_MID  = new THREE.Color(0x9db8ff)
    const C_BOT  = new THREE.Color(0x4a5cc8)
    const C_IDLE = new THREE.Color(0x1a2550)

    // ── Render loop ───────────────────────────────────────────────────────
    let t = 0, rafId

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
        const proximity = Math.max(0, 1 - c.distanceTo(g) * 0.5)
        dummy.scale.setScalar(isActive ? 0.078 + proximity * 0.055 : 0.009 + Math.random() * 0.003)
        dummy.rotation.x = t * 0.14 + i * 0.018
        dummy.rotation.y = t * 0.10 + i * 0.012
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)

        if (isActive) {
          const n = Math.max(0, Math.min(1, (c.y + 2.2) / 4.4))
          colTmp.lerpColors(n > 0.5 ? C_MID : C_BOT, n > 0.5 ? C_TOP : C_MID, n > 0.5 ? (n - 0.5) * 2 : n * 2)
          colTmp.multiplyScalar(0.35 + proximity * 0.65)
        } else {
          colTmp.copy(C_IDLE).multiplyScalar(0.25 + Math.sin(t * 0.6 + i * 0.38) * 0.12)
        }
        mesh.setColorAt(i, colTmp)
      }
      mesh.instanceMatrix.needsUpdate = true
      mesh.instanceColor.needsUpdate  = true
      renderer.render(scene, cam)
    }

    const onResize = () => {
      const W2 = el.offsetWidth, H2 = el.offsetHeight
      if (!W2 || !H2) return
      cam.aspect = W2 / H2; cam.updateProjectionMatrix()
      renderer.setSize(W2, H2)
    }
    window.addEventListener('resize', onResize)

    animate()
    runAfter(400, () => startSequence())

    return () => {
      alive = false
      cancelCurrent()
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      renderer.dispose(); geo.dispose(); mat.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [onStateChange])

  return <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight: '650px' }} />
}

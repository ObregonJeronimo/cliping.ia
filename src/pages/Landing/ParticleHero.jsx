import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ─── Samplear texto via canvas 2D ──────────────────────────────────────────
// IMPORTANTE: crear el canvas ANTES del WebGLRenderer para evitar conflicto de contextos
function sampleText(text, options = {}) {
  const {
    fontSize = 48,
    fontFamily = 'monospace',
    canvasW = 512,
    canvasH = 128,
    step = 3,        // tomar 1 px de cada N — controla la densidad
  } = options

  const c = document.createElement('canvas')
  c.width  = canvasW
  c.height = canvasH
  const ctx = c.getContext('2d')
  if (!ctx) return []

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvasW, canvasH)
  ctx.fillStyle = '#fff'
  ctx.font = `bold ${fontSize}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const lines = text.split('\n')
  const lineH = canvasH / lines.length
  lines.forEach((line, i) =>
    ctx.fillText(line, canvasW / 2, lineH * i + lineH / 2, canvasW - 16)
  )

  const data = ctx.getImageData(0, 0, canvasW, canvasH).data
  const pts  = []
  for (let y = 0; y < canvasH; y += step)
    for (let x = 0; x < canvasW; x += step)
      if (data[(y * canvasW + x) * 4] > 120)
        pts.push([
          (x - canvasW / 2) * 0.028,
          -(y - canvasH / 2) * 0.028,
          0,
        ])
  return pts
}

function sampleTimeline(items) {
  const pts   = []
  const lh    = 3.6  // separación vertical entre ítems
  const startY = ((items.length - 1) / 2) * lh
  const cW    = 300
  const cH    = 22

  items.forEach((it, i) => {
    const label = (it.done ? '✓ ' : '○ ') + it.label
    const c = document.createElement('canvas')
    c.width  = cW
    c.height = cH
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, cW, cH)
    ctx.fillStyle = '#fff'
    ctx.font = `bold 14px monospace`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, 4, cH / 2, cW - 8)

    const data = ctx.getImageData(0, 0, cW, cH).data
    const y0   = startY - i * lh
    for (let py = 0; py < cH; py += 2)
      for (let px = 0; px < cW; px += 2)
        if (data[(py * cW + px) * 4] > 120)
          pts.push([
            (px - cW / 2) * 0.032,
            y0 - (py - cH / 2) * 0.032,
            0,
          ])
  })
  return pts
}

// Pre-calcular todos los voxels ANTES de crear el renderer
function precomputeVoxels() {
  return {
    url: sampleText('misitio.com', {
      fontSize: 52, canvasW: 480, canvasH: 80, step: 2,
    }),
    prompt: sampleText('Video profesional\ncon todas las herramientas', {
      fontSize: 36, canvasW: 480, canvasH: 120, step: 2,
    }),
  }
}

// ─── Constantes ─────────────────────────────────────────────────────────────
const MAX   = 4000
const ITEMS = ['Hook', 'Problema', 'Features', 'Diferenciador', 'Beneficios', 'CTA']

// Paleta de colores
const COL_ACTIVE_TOP    = new THREE.Color(0xd0e0ff)  // blanco-azul brillante
const COL_ACTIVE_BOTTOM = new THREE.Color(0x7080d0)  // azul-violeta
const COL_IDLE          = new THREE.Color(0x1e2240)  // casi invisible, azul oscuro

export default function ParticleHero({ onStateChange }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    // ── 1. Pre-calcular voxels ANTES del renderer ──────────────────────────
    const voxels = precomputeVoxels()

    // ── 2. Setup Three.js ──────────────────────────────────────────────────
    const W = el.offsetWidth  || 700
    const H = el.offsetHeight || 650

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const cam   = new THREE.PerspectiveCamera(50, W / H, 0.1, 100)
    cam.position.z = 16

    // ── 3. InstancedMesh con colores por instancia ─────────────────────────
    const geo = new THREE.BoxGeometry(1, 1, 1)
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true })

    const mesh = new THREE.InstancedMesh(geo, mat, MAX)
    mesh.frustumCulled = false

    // Buffer de colores (RGB por instancia)
    const colorBuf = new Float32Array(MAX * 3)
    const colorAttr = new THREE.InstancedBufferAttribute(colorBuf, 3)
    mesh.geometry.setAttribute('color', colorAttr)

    // Inicializar color idle
    for (let i = 0; i < MAX; i++) {
      colorBuf[i * 3]     = COL_IDLE.r
      colorBuf[i * 3 + 1] = COL_IDLE.g
      colorBuf[i * 3 + 2] = COL_IDLE.b
    }

    scene.add(mesh)

    const dummy = new THREE.Object3D()

    // Posiciones scatter base — distribución más densa al centro
    const base = Array.from({ length: MAX }, (_, i) => {
      const r = 0.4 + Math.random() * 0.6
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      return new THREE.Vector3(
        r * 14 * Math.sin(phi) * Math.cos(theta),
        r * 9  * Math.sin(phi) * Math.sin(theta),
        r * 6  * Math.cos(phi),
      )
    })

    const cur = base.map(v => v.clone())
    const tgt = base.map(v => v.clone())

    const state = { activeN: 0, forming: false }
    const tmpC  = new THREE.Color()

    function setTargets(pts) {
      state.activeN = Math.min(pts.length, MAX)
      state.forming = pts.length > 0
      for (let i = 0; i < MAX; i++) {
        if (i < pts.length) {
          tgt[i].set(pts[i][0], pts[i][1], pts[i][2])
        } else {
          tgt[i].copy(base[i])
        }
      }
    }

    // ── 4. Secuencia de estados ────────────────────────────────────────────
    const timers = []
    function wait(ms, fn) {
      const id = setTimeout(fn, ms)
      timers.push(id)
    }

    function runCycle() {
      // Estado 1 — URL
      setTargets(voxels.url)
      onStateChange?.('url')

      wait(3600, () => {
        // Scatter
        setTargets([])

        wait(1500, () => {
          // Estado 2 — Prompt
          setTargets(voxels.prompt)
          onStateChange?.('prompt')

          wait(4000, () => {
            // Scatter
            setTargets([])

            wait(1300, () => {
              // Estado 3 — Timeline
              onStateChange?.('timeline')
              const items = ITEMS.map(l => ({ label: l, done: false }))

              // Calcular timeline voxels aquí para tener los items frescos
              setTargets(sampleTimeline(items))

              let idx = 0
              function nextItem() {
                if (idx > 0) items[idx - 1].done = true
                idx++
                setTargets(sampleTimeline(items))
                if (idx <= ITEMS.length) {
                  wait(1100, nextItem)
                } else {
                  // Todos completos
                  wait(2500, () => {
                    setTargets([])
                    wait(1400, runCycle)
                  })
                }
              }
              wait(500, nextItem)
            })
          })
        })
      })
    }

    // ── 5. Render loop ─────────────────────────────────────────────────────
    let t = 0, alive = true, rafId

    function animate() {
      if (!alive) return
      rafId = requestAnimationFrame(animate)
      t += 0.016

      const spd = state.forming ? 0.075 : 0.032

      for (let i = 0; i < MAX; i++) {
        const c = cur[i], g = tgt[i]

        // Lerp posición
        c.lerp(g, spd)

        // Wiggle cuando disperso
        if (!state.forming) {
          c.x += Math.sin(t * 0.5 + i * 0.31) * 0.002
          c.y += Math.cos(t * 0.4 + i * 0.27) * 0.002
          c.z += Math.sin(t * 0.3 + i * 0.19) * 0.001
        }

        dummy.position.copy(c)

        const isActive  = i < state.activeN && state.forming
        const dist      = c.distanceTo(g)
        const proximity = Math.max(0, 1 - dist * 0.8)

        // Escala: activos más grandes, inactivos casi invisibles
        const sc = isActive
          ? 0.072 + proximity * 0.05
          : 0.012 + Math.random() * 0.004

        dummy.scale.setScalar(sc)

        // Rotación más lenta y orgánica
        dummy.rotation.x = t * 0.18 + i * 0.021
        dummy.rotation.y = t * 0.13 + i * 0.017
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)

        // Color por instancia
        // Activos: gradiente vertical top=blanco-azul / bottom=azul-violeta
        // Inactivos: azul muy oscuro
        if (isActive) {
          const normY  = Math.max(0, Math.min(1, (c.y + 3) / 6))
          tmpC.lerpColors(COL_ACTIVE_BOTTOM, COL_ACTIVE_TOP, normY)
          // Ajustar brillo por proximidad
          colorBuf[i * 3]     = tmpC.r * (0.4 + proximity * 0.6)
          colorBuf[i * 3 + 1] = tmpC.g * (0.4 + proximity * 0.6)
          colorBuf[i * 3 + 2] = tmpC.b * (0.4 + proximity * 0.6)
        } else {
          // Partículas de fondo: pulsan suavemente
          const pulse = 0.08 + Math.sin(t * 0.8 + i * 0.5) * 0.04
          colorBuf[i * 3]     = COL_IDLE.r * pulse * 6
          colorBuf[i * 3 + 1] = COL_IDLE.g * pulse * 6
          colorBuf[i * 3 + 2] = COL_IDLE.b * pulse * 6
        }
      }

      mesh.instanceMatrix.needsUpdate = true
      colorAttr.needsUpdate           = true
      renderer.render(scene, cam)
    }

    // ── 6. Resize ──────────────────────────────────────────────────────────
    const onResize = () => {
      const W2 = el.offsetWidth, H2 = el.offsetHeight
      if (!W2 || !H2) return
      cam.aspect = W2 / H2
      cam.updateProjectionMatrix()
      renderer.setSize(W2, H2)
    }
    window.addEventListener('resize', onResize)

    // ── Arrancar ───────────────────────────────────────────────────────────
    animate()
    const startId = setTimeout(runCycle, 300)

    return () => {
      alive = false
      cancelAnimationFrame(rafId)
      clearTimeout(startId)
      timers.forEach(clearTimeout)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      geo.dispose()
      mat.dispose()
      if (el.contains(renderer.domElement))
        el.removeChild(renderer.domElement)
    }
  }, [onStateChange])

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', minHeight: '650px' }}
    />
  )
}

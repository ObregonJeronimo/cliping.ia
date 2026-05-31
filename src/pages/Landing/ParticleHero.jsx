import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ─── Configuración ──────────────────────────────────────────────────────────
const FONT_NAME        = 'system-ui, -apple-system, sans-serif'
const TEXTURE_FONT_SIZE = 80   // tamaño en canvas — alto para buena calidad
const FONT_SCALE       = 0.045 // factor canvas px → unidades 3D
const SAMPLING_STEP    = 3     // 1 punto cada N píxeles
const MAX_INSTANCES    = 4000
const ITEMS = ['Hook', 'Problema', 'Features', 'Diferenciador', 'Beneficios', 'CTA']

// ─── Samplear texto en canvas → coordenadas 2D (técnica Codrops) ─────────
function sampleText(string) {
  const lines          = string.split('\n')
  const longestLine    = [...lines].sort((a, b) => b.length - a.length)[0]
  const wTexture       = Math.ceil(TEXTURE_FONT_SIZE * 0.6 * longestLine.length + 40)
  const hTexture       = Math.ceil(lines.length * TEXTURE_FONT_SIZE * 1.15 + 20)

  const canvas = document.createElement('canvas')
  canvas.width  = wTexture
  canvas.height = hTexture
  const ctx = canvas.getContext('2d')
  if (!ctx) return { coords: [], wScene: 0, hScene: 0 }

  ctx.clearRect(0, 0, wTexture, hTexture)
  ctx.fillStyle  = '#fff'
  ctx.font       = `bold ${TEXTURE_FONT_SIZE}px ${FONT_NAME}`
  ctx.textAlign  = 'left'
  ctx.textBaseline = 'top'

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 10, i * TEXTURE_FONT_SIZE * 1.15 + 10)
  }

  const imageData = ctx.getImageData(0, 0, wTexture, hTexture)
  const coords    = []

  for (let i = 0; i < hTexture; i += SAMPLING_STEP) {
    for (let j = 0; j < wTexture; j += SAMPLING_STEP) {
      // Canal alpha > 0 significa que hay texto ahí
      if (imageData.data[(j + i * wTexture) * 4 + 3] > 128) {
        coords.push({ x: j * FONT_SCALE, y: i * FONT_SCALE })
      }
    }
  }

  return {
    coords,
    wScene: wTexture * FONT_SCALE,
    hScene: hTexture * FONT_SCALE,
  }
}

// Convertir coordenadas canvas (top-left) a coordenadas 3D (centradas)
function toVoxels(sampleResult) {
  const { coords, wScene, hScene } = sampleResult
  return coords.map(c => ({
    x:  c.x - wScene / 2,
    y: -(c.y - hScene / 2),  // invertir Y (canvas Y↓, Three.js Y↑)
    z:  0,
  }))
}

// ─── Samplear timeline ───────────────────────────────────────────────────────
function sampleTimeline(items) {
  const allCoords = []
  const itemH     = TEXTURE_FONT_SIZE * 0.7   // altura por fila
  const fontSz    = Math.round(TEXTURE_FONT_SIZE * 0.55)
  const cW        = 420
  const cH        = Math.ceil(items.length * itemH + 20)
  const scaleFactor = FONT_SCALE * 0.85

  const canvas = document.createElement('canvas')
  canvas.width  = cW
  canvas.height = cH
  const ctx = canvas.getContext('2d')
  if (!ctx) return []

  ctx.clearRect(0, 0, cW, cH)
  ctx.fillStyle    = '#fff'
  ctx.font         = `bold ${fontSz}px monospace`
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'top'

  items.forEach((it, i) => {
    const label = (it.done ? '✓  ' : '○  ') + it.label
    ctx.fillStyle = it.done ? '#fff' : 'rgba(255,255,255,0.6)'
    ctx.fillText(label, 8, i * itemH + 10)
  })

  const imageData = ctx.getImageData(0, 0, cW, cH)
  const step = 2

  for (let i = 0; i < cH; i += step) {
    for (let j = 0; j < cW; j += step) {
      if (imageData.data[(j + i * cW) * 4 + 3] > 100) {
        allCoords.push({
          x: (j - cW / 2) * scaleFactor,
          y:-(i - cH / 2) * scaleFactor,
          z: 0,
        })
      }
    }
  }

  return allCoords
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function ParticleHero({ onStateChange }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    // Pre-calcular voxels ANTES del renderer (evita conflicto de contextos WebGL)
    const urlSample    = sampleText('misitio.com')
    const promptSample = sampleText('Video profesional\ncon todas las herramientas')
    const urlVoxels    = toVoxels(urlSample)
    const promptVoxels = toVoxels(promptSample)

    // ── Setup Three.js ─────────────────────────────────────────────────────
    const W = el.offsetWidth  || 700
    const H = el.offsetHeight || 650

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const cam   = new THREE.PerspectiveCamera(50, W / H, 0.1, 200)
    cam.position.z = 18

    // ── InstancedMesh ─────────────────────────────────────────────────────
    const geo = new THREE.BoxGeometry(1, 1, 1)
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true })
    const mesh = new THREE.InstancedMesh(geo, mat, MAX_INSTANCES)
    mesh.frustumCulled = false

    // Colores por instancia via setColorAt
    for (let i = 0; i < MAX_INSTANCES; i++) {
      mesh.setColorAt(i, new THREE.Color(0x0a0f2a))
    }
    mesh.instanceColor.needsUpdate = true
    scene.add(mesh)

    const dummy  = new THREE.Object3D()
    const colTmp = new THREE.Color()

    // Posiciones base (scatter) distribuidas en esfera
    const base = Array.from({ length: MAX_INSTANCES }, () => {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 6 + Math.random() * 8
      return new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta) * 0.65,
        r * Math.cos(phi) * 0.4,
      )
    })

    const cur = base.map(v => v.clone())
    const tgt = base.map(v => v.clone())

    const state = { activeN: 0, forming: false }

    function setTargets(voxels) {
      state.activeN = Math.min(voxels.length, MAX_INSTANCES)
      state.forming = voxels.length > 0
      for (let i = 0; i < MAX_INSTANCES; i++) {
        if (i < voxels.length) {
          tgt[i].set(voxels[i].x, voxels[i].y, voxels[i].z ?? 0)
        } else {
          tgt[i].copy(base[i])
        }
      }
    }

    // ── Ciclo de animación ─────────────────────────────────────────────────
    const timers = []
    function wait(ms, fn) { timers.push(setTimeout(fn, ms)) }

    function runCycle() {
      setTargets(urlVoxels)
      onStateChange?.('url')

      wait(3800, () => {
        setTargets([])
        wait(1400, () => {
          setTargets(promptVoxels)
          onStateChange?.('prompt')

          wait(4200, () => {
            setTargets([])
            wait(1300, () => {
              onStateChange?.('timeline')
              const items = ITEMS.map(l => ({ label: l, done: false }))
              setTargets(sampleTimeline(items))

              let idx = 0
              function nextItem() {
                if (idx > 0) items[idx - 1].done = true
                idx++
                setTargets(sampleTimeline(items))
                if (idx <= ITEMS.length) {
                  wait(1000, nextItem)
                } else {
                  wait(2600, () => { setTargets([]); wait(1400, runCycle) })
                }
              }
              wait(500, nextItem)
            })
          })
        })
      })
    }

    // ── Paleta de colores ──────────────────────────────────────────────────
    const COL_TOP    = new THREE.Color(0xe8f0ff)  // blanco-azul
    const COL_BOTTOM = new THREE.Color(0x6070c8)  // azul-violeta
    const COL_IDLE   = new THREE.Color(0x0d1540)  // casi negro, azul muy oscuro

    // ── Render loop ────────────────────────────────────────────────────────
    let t = 0, alive = true, rafId

    function animate() {
      if (!alive) return
      rafId = requestAnimationFrame(animate)
      t += 0.016

      const spd = state.forming ? 0.08 : 0.028

      for (let i = 0; i < MAX_INSTANCES; i++) {
        const c = cur[i], g = tgt[i]
        c.lerp(g, spd)

        if (!state.forming) {
          c.x += Math.sin(t * 0.45 + i * 0.29) * 0.0018
          c.y += Math.cos(t * 0.38 + i * 0.23) * 0.0018
          c.z += Math.sin(t * 0.25 + i * 0.17) * 0.0008
        }

        dummy.position.copy(c)

        const isActive  = i < state.activeN && state.forming
        const dist      = c.distanceTo(g)
        const proximity = Math.max(0, 1 - dist * 0.6)

        // Escala — activos más grandes, inactivos mínimos
        const sc = isActive
          ? 0.082 + proximity * 0.06
          : 0.010 + Math.random() * 0.003

        dummy.scale.setScalar(sc)
        dummy.rotation.x = t * 0.15 + i * 0.019
        dummy.rotation.y = t * 0.11 + i * 0.013
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)

        // Color
        if (isActive) {
          const normY  = Math.max(0, Math.min(1, (c.y + 2.5) / 5))
          colTmp.lerpColors(COL_BOTTOM, COL_TOP, normY)
          const brightness = 0.5 + proximity * 0.5
          colTmp.multiplyScalar(brightness)
        } else {
          const pulse = 0.3 + Math.sin(t * 0.7 + i * 0.4) * 0.15
          colTmp.copy(COL_IDLE).multiplyScalar(pulse)
        }
        mesh.setColorAt(i, colTmp)
      }

      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      renderer.render(scene, cam)
    }

    // ── Resize ─────────────────────────────────────────────────────────────
    const onResize = () => {
      const W2 = el.offsetWidth, H2 = el.offsetHeight
      if (!W2 || !H2) return
      cam.aspect = W2 / H2
      cam.updateProjectionMatrix()
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
      renderer.dispose()
      geo.dispose()
      mat.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [onStateChange])

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight: '650px' }} />
  )
}

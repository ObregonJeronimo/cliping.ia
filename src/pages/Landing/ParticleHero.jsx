import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Font-to-voxel: dibuja texto en canvas y extrae coordenadas ────────────
function textToVoxels(text, gridW = 80, gridH = 28, fontSize = 20) {
  const canvas = document.createElement('canvas')
  canvas.width = gridW
  canvas.height = gridH
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, gridW, gridH)
  ctx.fillStyle = '#fff'
  ctx.font = `bold ${fontSize}px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Multi-line support
  const lines = text.split('\n')
  const lineH = gridH / lines.length
  lines.forEach((line, i) => {
    ctx.fillText(line, gridW / 2, lineH * i + lineH / 2, gridW - 4)
  })

  const data = ctx.getImageData(0, 0, gridW, gridH).data
  const positions = []
  const step = 1
  for (let y = 0; y < gridH; y += step) {
    for (let x = 0; x < gridW; x += step) {
      const idx = (y * gridW + x) * 4
      if (data[idx] > 100) {
        positions.push([
          (x - gridW / 2) * 0.18,
          -(y - gridH / 2) * 0.18,
          0,
        ])
      }
    }
  }
  return positions
}

// ─── Timeline voxels: genera posiciones para cada ítem ─────────────────────
function timelineToVoxels(items, gridW = 80) {
  const positions = []
  const lineH = 4.5
  const startY = ((items.length - 1) / 2) * lineH

  items.forEach((item, i) => {
    const y = startY - i * lineH
    const text = item.done ? `✓ ${item.label}` : `● ${item.label}`
    const canvas = document.createElement('canvas')
    canvas.width = gridW
    canvas.height = 12
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, gridW, 12)
    ctx.fillStyle = '#fff'
    ctx.font = `bold 9px monospace`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 2, 6, gridW - 4)

    const data = ctx.getImageData(0, 0, gridW, 12).data
    for (let py = 0; py < 12; py++) {
      for (let px = 0; px < gridW; px++) {
        const idx = (py * gridW + px) * 4
        if (data[idx] > 100) {
          positions.push([
            (px - gridW / 2) * 0.18,
            y - (py - 6) * 0.18,
            0,
          ])
        }
      }
    }
  })
  return positions
}

// ─── Estados del ciclo ──────────────────────────────────────────────────────
const STATES = {
  URL: 'url',
  PROMPT: 'prompt',
  TIMELINE: 'timeline',
}

const TIMELINE_ITEMS = [
  { label: 'Hook', done: false },
  { label: 'Problema', done: false },
  { label: 'Features', done: false },
  { label: 'Diferenciador', done: false },
  { label: 'Beneficios', done: false },
  { label: 'CTA', done: false },
]

// ─── Instanced cubes mesh ───────────────────────────────────────────────────
const MAX_CUBES = 4000

function CubeField({ targets, phase }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Posiciones actuales de cada cubo (interpoladas)
  const currentPos = useRef([])
  const targetPos = useRef([])
  const scattered = useRef([])
  const colors = useRef([])

  // Generar posición dispersa aleatoria para cada cubo
  const getScattered = useCallback((i) => {
    const r = Math.random
    return [
      (r() - 0.5) * 28,
      (r() - 0.5) * 18,
      (r() - 0.5) * 12,
    ]
  }, [])

  // Inicializar posiciones
  useEffect(() => {
    currentPos.current = Array.from({ length: MAX_CUBES }, (_, i) => getScattered(i))
    scattered.current = Array.from({ length: MAX_CUBES }, (_, i) => getScattered(i))
    colors.current = Array.from({ length: MAX_CUBES }, () => Math.random())
  }, [getScattered])

  // Cuando cambian los targets, actualizar
  useEffect(() => {
    const tgts = targets || []
    for (let i = 0; i < MAX_CUBES; i++) {
      if (i < tgts.length) {
        targetPos.current[i] = [...tgts[i]]
      } else {
        targetPos.current[i] = [...scattered.current[i]]
      }
    }
  }, [targets])

  useFrame((state, delta) => {
    if (!meshRef.current) return
    const mesh = meshRef.current
    const t = state.clock.elapsedTime

    // Factor de lerp según la fase
    let lerpSpeed = 0.035
    if (phase === 'scatter') lerpSpeed = 0.025
    if (phase === 'form') lerpSpeed = 0.055

    const colorAttr = mesh.geometry.attributes.color

    for (let i = 0; i < MAX_CUBES; i++) {
      const cur = currentPos.current[i]
      const tgt = targetPos.current[i] || scattered.current[i]

      if (!cur) continue

      // Smooth lerp con spring
      cur[0] += (tgt[0] - cur[0]) * lerpSpeed
      cur[1] += (tgt[1] - cur[1]) * lerpSpeed
      cur[2] += (tgt[2] - cur[2]) * lerpSpeed

      // Micro-movimiento orgánico
      const wiggle = 0.008
      cur[0] += (Math.random() - 0.5) * wiggle
      cur[1] += (Math.random() - 0.5) * wiggle

      dummy.position.set(cur[0], cur[1], cur[2])

      // Escala — cubos en target más visibles, dispersos casi invisibles
      const isActive = i < (targets?.length || 0) && phase !== 'scatter'
      const dist = Math.sqrt(
        (cur[0] - tgt[0]) ** 2 +
        (cur[1] - tgt[1]) ** 2 +
        (cur[2] - tgt[2]) ** 2
      )
      const proximity = Math.max(0, 1 - dist / 2)
      const scale = isActive
        ? 0.06 + proximity * 0.04
        : 0.03 + Math.random() * 0.01

      dummy.scale.setScalar(scale)

      // Rotación sutil
      dummy.rotation.x = t * 0.2 + i * 0.01
      dummy.rotation.y = t * 0.15 + i * 0.013

      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      // Color
      const c = colors.current[i] || 0.5
      const bright = isActive ? 0.85 + proximity * 0.15 : 0.15 + c * 0.1
      if (colorAttr) {
        // Tono: blancos fríos con toque azul-violeta
        colorAttr.setXYZ(i,
          bright * 0.82,
          bright * 0.88,
          bright * 1.0
        )
      }
    }

    mesh.instanceMatrix.needsUpdate = true
    if (colorAttr) colorAttr.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, MAX_CUBES]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]}>
        <instancedBufferAttribute
          attach="attributes-color"
          args={[new Float32Array(MAX_CUBES * 3).fill(0.3), 3]}
        />
      </boxGeometry>
      <meshBasicMaterial vertexColors toneMapped={false} />
    </instancedMesh>
  )
}

// ─── Controlador del ciclo de animación ─────────────────────────────────────
function AnimationController({ onStateChange }) {
  const [state, setState] = useState(STATES.URL)
  const [phase, setPhase] = useState('form')
  const [targets, setTargets] = useState([])
  const [timelineItems, setTimelineItems] = useState(TIMELINE_ITEMS)
  const timeoutRefs = useRef([])

  const clearAll = () => timeoutRefs.current.forEach(clearTimeout)

  const addTimeout = (fn, ms) => {
    const id = setTimeout(fn, ms)
    timeoutRefs.current.push(id)
    return id
  }

  const runCycle = useCallback(() => {
    clearAll()
    timeoutRefs.current = []

    // ── ESTADO 1: URL ──────────────────────────────────────────────────────
    const urlVoxels = textToVoxels('misitio.com', 80, 20, 16)
    setState(STATES.URL)
    setPhase('form')
    setTargets(urlVoxels.slice(0, MAX_CUBES))
    onStateChange?.('url')

    // Dispersar
    addTimeout(() => {
      setPhase('scatter')
      setTargets([])
    }, 3500)

    // ── ESTADO 2: PROMPT ───────────────────────────────────────────────────
    addTimeout(() => {
      const promptText = 'Video profesional\ncon todas las\nherramientas del sitio'
      const promptVoxels = textToVoxels(promptText, 80, 30, 11)
      setState(STATES.PROMPT)
      setPhase('form')
      setTargets(promptVoxels.slice(0, MAX_CUBES))
      onStateChange?.('prompt')
    }, 5200)

    // Dispersar
    addTimeout(() => {
      setPhase('scatter')
      setTargets([])
    }, 9000)

    // ── ESTADO 3: TIMELINE ─────────────────────────────────────────────────
    addTimeout(() => {
      setState(STATES.TIMELINE)
      onStateChange?.('timeline')

      const resetItems = TIMELINE_ITEMS.map(i => ({ ...i, done: false }))
      setTimelineItems(resetItems)

      // Ir completando ítems uno a uno
      resetItems.forEach((_, idx) => {
        addTimeout(() => {
          setTimelineItems(prev => {
            const next = [...prev]
            if (idx > 0) next[idx - 1] = { ...next[idx - 1], done: true }
            return next
          })

          // Recalcular voxels con estado actual
          const currentItems = resetItems.map((item, i) => ({
            ...item,
            done: i < idx,
          }))
          const tlVoxels = timelineToVoxels(currentItems, 72)
          setTargets(tlVoxels.slice(0, MAX_CUBES))
          setPhase('form')
        }, idx * 1400)
      })

      // Marcar el último como done
      addTimeout(() => {
        setTimelineItems(TIMELINE_ITEMS.map(i => ({ ...i, done: true })))
        const allDone = TIMELINE_ITEMS.map(i => ({ ...i, done: true }))
        const tlVoxels = timelineToVoxels(allDone, 72)
        setTargets(tlVoxels.slice(0, MAX_CUBES))
      }, TIMELINE_ITEMS.length * 1400 + 200)
    }, 11200)

    // Dispersar y reiniciar
    addTimeout(() => {
      setPhase('scatter')
      setTargets([])
    }, 11200 + TIMELINE_ITEMS.length * 1400 + 2800)

    addTimeout(() => {
      runCycle()
    }, 11200 + TIMELINE_ITEMS.length * 1400 + 4400)
  }, [onStateChange])

  useEffect(() => {
    runCycle()
    return clearAll
  }, [runCycle])

  return <CubeField targets={targets} phase={phase} />
}

// ─── Canvas 3D ───────────────────────────────────────────────────────────────
export default function ParticleHero({ onStateChange }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 18], fov: 55 }}
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <AnimationController onStateChange={onStateChange} />
    </Canvas>
  )
}

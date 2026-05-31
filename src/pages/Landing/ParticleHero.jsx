import { useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Font-to-voxel ──────────────────────────────────────────────────────────
function textToVoxels(text, gridW = 72, gridH = 24, fontSize = 16) {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = gridW
    canvas.height = gridH
    const ctx = canvas.getContext('2d')
    if (!ctx) return []
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, gridW, gridH)
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${fontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const lines = text.split('\n')
    const lineH = gridH / lines.length
    lines.forEach((line, i) => {
      ctx.fillText(line, gridW / 2, lineH * i + lineH / 2, gridW - 4)
    })
    const data = ctx.getImageData(0, 0, gridW, gridH).data
    const positions = []
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        if (data[(y * gridW + x) * 4] > 100) {
          positions.push(new THREE.Vector3(
            (x - gridW / 2) * 0.2,
            -(y - gridH / 2) * 0.2,
            0
          ))
        }
      }
    }
    return positions
  } catch (e) {
    return []
  }
}

function timelineToVoxels(items) {
  const positions = []
  const gridW = 64
  const lineH = 4.2
  const startY = ((items.length - 1) / 2) * lineH
  items.forEach((item, i) => {
    try {
      const label = (item.done ? 'v ' : '> ') + item.label
      const canvas = document.createElement('canvas')
      canvas.width = gridW
      canvas.height = 10
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, gridW, 10)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 8px monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, 1, 5, gridW - 2)
      const data = ctx.getImageData(0, 0, gridW, 10).data
      const y0 = startY - i * lineH
      for (let py = 0; py < 10; py++) {
        for (let px = 0; px < gridW; px++) {
          if (data[(py * gridW + px) * 4] > 100) {
            positions.push(new THREE.Vector3(
              (px - gridW / 2) * 0.2,
              y0 - (py - 5) * 0.2,
              0
            ))
          }
        }
      }
    } catch (e) {}
  })
  return positions
}

// ─── Constantes ─────────────────────────────────────────────────────────────
const MAX_CUBES = 3000

const TIMELINE_ITEMS = [
  { label: 'Hook',          done: false },
  { label: 'Problema',      done: false },
  { label: 'Features',      done: false },
  { label: 'Diferenciador', done: false },
  { label: 'Beneficios',    done: false },
  { label: 'CTA',           done: false },
]

// ─── Cubes instanced mesh ────────────────────────────────────────────────────
function Cubes({ targetsRef, phaseRef }) {
  const meshRef = useRef()
  const dummy = useRef(new THREE.Object3D())
  const curPos = useRef(null)
  const scatterPos = useRef(null)

  useEffect(() => {
    const rng = () => (Math.random() - 0.5)
    scatterPos.current = Array.from({ length: MAX_CUBES }, () =>
      new THREE.Vector3(rng() * 24, rng() * 16, rng() * 10)
    )
    curPos.current = scatterPos.current.map(v => v.clone())
  }, [])

  useFrame((state) => {
    if (!meshRef.current || !curPos.current) return

    const targets = targetsRef.current || []
    const phase = phaseRef.current || 'scatter'
    const speed = phase === 'form' ? 0.06 : 0.03
    const t = state.clock.elapsedTime

    for (let i = 0; i < MAX_CUBES; i++) {
      const cur = curPos.current[i]
      const tgt = i < targets.length
        ? targets[i]
        : scatterPos.current[i]

      // Lerp suave
      cur.lerp(tgt, speed)

      // Micro-wiggle orgánico
      cur.x += (Math.random() - 0.5) * 0.005
      cur.y += (Math.random() - 0.5) * 0.005

      const d = dummy.current
      d.position.copy(cur)

      const isActive = i < targets.length && phase === 'form'
      const dist = cur.distanceTo(tgt)
      const proximity = Math.max(0, 1 - dist / 1.5)
      const scale = isActive
        ? 0.055 + proximity * 0.04
        : 0.025 + Math.random() * 0.008

      d.scale.setScalar(scale)
      d.rotation.x = t * 0.3 + i * 0.02
      d.rotation.y = t * 0.2 + i * 0.017
      d.updateMatrix()
      meshRef.current.setMatrixAt(i, d.matrix)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, MAX_CUBES]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#c8d4f0" toneMapped={false} />
    </instancedMesh>
  )
}

// ─── Controlador de animación ────────────────────────────────────────────────
function Controller({ onStateChange }) {
  const targetsRef = useRef([])
  const phaseRef = useRef('scatter')
  const timeoutsRef = useRef([])

  const add = (fn, ms) => {
    const id = setTimeout(fn, ms)
    timeoutsRef.current.push(id)
  }

  const clear = () => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }

  const scatter = () => {
    phaseRef.current = 'scatter'
    targetsRef.current = []
  }

  const show = (voxels, state) => {
    phaseRef.current = 'form'
    targetsRef.current = voxels.slice(0, MAX_CUBES)
    onStateChange?.(state)
  }

  const cycle = useCallback(() => {
    clear()

    // Estado 1 — URL
    const urlVox = textToVoxels('misitio.com', 72, 20, 16)
    show(urlVox, 'url')

    // Scatter → Prompt
    add(() => scatter(), 3200)
    add(() => {
      const promptVox = textToVoxels('Video profesional\ncon todas las\nherramientas del sitio', 72, 28, 11)
      show(promptVox, 'prompt')
    }, 4800)

    // Scatter → Timeline
    add(() => scatter(), 8400)
    add(() => {
      onStateChange?.('timeline')
      let items = TIMELINE_ITEMS.map(i => ({ ...i, done: false }))

      const tick = (idx) => {
        // Marcar anterior como done
        if (idx > 0) items = items.map((it, j) => j === idx - 1 ? { ...it, done: true } : it)
        const vox = timelineToVoxels(items)
        phaseRef.current = 'form'
        targetsRef.current = vox.slice(0, MAX_CUBES)
        if (idx < items.length) {
          add(() => tick(idx + 1), 1300)
        } else {
          // Marcar el último
          add(() => {
            items = items.map(i => ({ ...i, done: true }))
            targetsRef.current = timelineToVoxels(items).slice(0, MAX_CUBES)
          }, 400)
        }
      }
      tick(0)
    }, 10200)

    // Reiniciar ciclo
    const totalTimeline = 10200 + TIMELINE_ITEMS.length * 1300 + 2000
    add(() => scatter(), totalTimeline)
    add(() => cycle(), totalTimeline + 1600)
  }, [onStateChange])

  useEffect(() => {
    const id = setTimeout(cycle, 500)
    return () => {
      clearTimeout(id)
      clear()
    }
  }, [cycle])

  return <Cubes targetsRef={targetsRef} phaseRef={phaseRef} />
}

// ─── Export ──────────────────────────────────────────────────────────────────
export default function ParticleHero({ onStateChange }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 16], fov: 55 }}
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
    >
      <Controller onStateChange={onStateChange} />
    </Canvas>
  )
}

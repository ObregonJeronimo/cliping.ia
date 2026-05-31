import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const MAX = 3000
const ITEMS = ['Hook', 'Problema', 'Features', 'Diferenciador', 'Beneficios', 'CTA']

// Bitmap 5x7 para cada carácter necesario
const FONT = {
  'm': [[1,0,1,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,1,0,1]],
  'i': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
  's': [[0,1,1,1],[1,0,0,0],[1,0,0,0],[0,1,1,0],[0,0,0,1],[0,0,0,1],[1,1,1,0]],
  't': [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  'o': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '.': [[0],[0],[0],[0],[0],[0],[1]],
  'c': [[0,1,1,1],[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,0,0,0],[0,1,1,1]],
  'a': [[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1]],
  'r': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
  'k': [[1,0,0,0,1],[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
  'e': [[1,1,1,1],[1,0,0,0],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,0,0,0],[1,1,1,1]],
  'n': [[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'g': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[1,0,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'f': [[1,1,1,1],[1,0,0,0],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,0,0,0],[1,0,0,0]],
  'u': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'h': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'l': [[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
  'b': [[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,1,1,0],[1,0,0,1],[1,0,0,1],[1,1,1,0]],
  'd': [[0,0,0,1],[0,0,0,1],[0,0,0,1],[0,1,1,1],[1,0,0,1],[1,0,0,1],[0,1,1,1]],
  'p': [[1,1,1,0],[1,0,0,1],[1,0,0,1],[1,1,1,0],[1,0,0,0],[1,0,0,0],[1,0,0,0]],
  'v': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0]],
  ' ': [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
  '/': [[0,0,0,0,1],[0,0,0,1,0],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[0,1,0,0,0],[1,0,0,0,0]],
  'j': [[0,0,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1],[1,0,1],[0,1,0]],
  'x': [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1],[1,0,0,0,1]],
  'w': [[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,1,0,1],[0,1,0,1,0],[0,1,0,1,0]],
  'y': [[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  'z': [[1,1,1,1,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  'q': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1],[0,1,1,1,1]],
  'F': [[1,1,1,1],[1,0,0,0],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,0,0,0],[1,0,0,0]],
  'H': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'P': [[1,1,1,0],[1,0,0,1],[1,0,0,1],[1,1,1,0],[1,0,0,0],[1,0,0,0],[1,0,0,0]],
  'B': [[1,1,1,0],[1,0,0,1],[1,0,0,1],[1,1,1,0],[1,0,0,1],[1,0,0,1],[1,1,1,0]],
  'D': [[1,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,0]],
  'C': [[0,1,1,1],[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,0,0,0],[0,1,1,1]],
  'T': [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  'A': [[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]],
  'V': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0]],
  'E': [[1,1,1,1],[1,0,0,0],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,0,0,0],[1,1,1,1]],
  'I': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
  'R': [[1,1,1,0],[1,0,0,1],[1,0,0,1],[1,1,1,0],[1,0,1,0],[1,0,0,1],[1,0,0,1]],
  'N': [[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'O': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'K': [[1,0,0,0,1],[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
  'G': [[0,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'L': [[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,0,0,0],[1,1,1,1]],
  'U': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'S': [[0,1,1,1],[1,0,0,0],[1,0,0,0],[0,1,1,0],[0,0,0,1],[0,0,0,1],[1,1,1,0]],
  'M': [[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'W': [[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,1,0,1],[0,1,0,1,0],[0,1,0,1,0]],
  'X': [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1],[1,0,0,0,1]],
  'Y': [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  'Z': [[1,1,1,1,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  'Q': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1],[0,1,1,1,1]],
  'J': [[0,0,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1],[1,0,1],[0,1,0]],
  '?': [[0,1,1,0],[1,0,0,1],[0,0,0,1],[0,0,1,0],[0,1,0,0],[0,0,0,0],[0,1,0,0]],
  '!': [[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,0,0],[0,1,0]],
  'o': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'v': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0]],
}

// Fallback para caracteres no definidos
const FALLBACK = [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1],[0,0,0],[0,0,0]]

function stringToVoxels(text, scale = 0.22, spacing = 1.2) {
  const pts = []
  const chars = text.split('')
  const charW = 6 * spacing  // ancho promedio + espacio
  const totalW = chars.reduce((acc, ch) => {
    const bm = FONT[ch] || (ch === ' ' ? null : FALLBACK)
    return acc + (bm ? (bm[0].length + 1) * scale * spacing : 3 * scale * spacing)
  }, 0)
  
  let xOffset = -totalW / 2
  chars.forEach(ch => {
    if (ch === ' ') { xOffset += 3 * scale * spacing; return }
    const bm = FONT[ch] || FALLBACK
    const cw = bm[0].length
    for (let row = 0; row < bm.length; row++) {
      for (let col = 0; col < cw; col++) {
        if (bm[row][col]) {
          pts.push(new THREE.Vector3(
            xOffset + col * scale * spacing,
            -(row - 3) * scale * spacing,
            0
          ))
        }
      }
    }
    xOffset += (cw + 1) * scale * spacing
  })
  return pts
}

function multilineVoxels(lines, scale = 0.22, lineSpacing = 2.2) {
  const pts = []
  const startY = ((lines.length - 1) / 2) * lineSpacing
  lines.forEach((line, i) => {
    const linePts = stringToVoxels(line, scale)
    linePts.forEach(p => {
      pts.push(new THREE.Vector3(p.x, p.y + startY - i * lineSpacing, p.z))
    })
  })
  return pts
}

function tlVoxels(items) {
  const pts = []
  const lh = 2.0
  const startY = ((items.length - 1) / 2) * lh
  items.forEach((it, i) => {
    const prefix = it.done ? 'v ' : 'o '
    const line = prefix + it.label
    const linePts = stringToVoxels(line, 0.18, 1.1)
    const y0 = startY - i * lh
    linePts.forEach(p => {
      pts.push(new THREE.Vector3(p.x, p.y + y0, p.z))
    })
  })
  return pts
}

export default function ParticleHero({ onStateChange }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const W = el.offsetWidth || 600
    const H = el.offsetHeight || 600

    const renderer = new THREE.WebGLRenderer({
      antialias: false, alpha: true, powerPreference: 'high-performance'
    })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(52, W / H, 0.1, 100)
    cam.position.z = 14

    const geo = new THREE.BoxGeometry(1, 1, 1)
    const mat = new THREE.MeshBasicMaterial({ color: 0xdce6ff })
    const mesh = new THREE.InstancedMesh(geo, mat, MAX)
    mesh.frustumCulled = false
    scene.add(mesh)

    const dummy = new THREE.Object3D()
    const cur = Array.from({ length: MAX }, () =>
      new THREE.Vector3(
        (Math.random() - .5) * 20,
        (Math.random() - .5) * 12,
        (Math.random() - .5) * 6
      ))
    const tgt = cur.map(v => v.clone())
    const base = cur.map(v => v.clone())
    const state = { activeN: 0, forming: false }

    function setTargets(pts) {
      state.activeN = Math.min(pts.length, MAX)
      for (let i = 0; i < MAX; i++)
        tgt[i].copy(i < pts.length ? pts[i] : base[i])
      state.forming = pts.length > 0
    }

    const timers = []
    function wait(ms, fn) {
      const id = setTimeout(fn, ms)
      timers.push(id)
    }

    function runCycle() {
      setTargets(multilineVoxels(['misitio.com']))
      onStateChange?.('url')

      wait(3400, () => {
        setTargets([])
        wait(1600, () => {
          setTargets(multilineVoxels(['Video profesional', 'con todas las', 'herramientas'], 0.19, 2.0))
          onStateChange?.('prompt')
          wait(4000, () => {
            setTargets([])
            wait(1400, () => {
              onStateChange?.('timeline')
              const items = ITEMS.map(l => ({ label: l, done: false }))
              setTargets(tlVoxels(items))
              let idx = 0
              function nextItem() {
                if (idx > 0) items[idx - 1].done = true
                idx++
                setTargets(tlVoxels(items))
                if (idx <= ITEMS.length) {
                  wait(1100, nextItem)
                } else {
                  wait(2400, () => {
                    setTargets([])
                    wait(1400, runCycle)
                  })
                }
              }
              wait(600, nextItem)
            })
          })
        })
      })
    }

    let t = 0, alive = true, rafId
    function animate() {
      if (!alive) return
      rafId = requestAnimationFrame(animate)
      t += 0.016
      const spd = state.forming ? 0.07 : 0.035
      for (let i = 0; i < MAX; i++) {
        const c = cur[i], g = tgt[i]
        c.lerp(g, spd)
        if (!state.forming) {
          c.x += Math.sin(t * 0.6 + i * 0.3) * 0.0025
          c.y += Math.cos(t * 0.45 + i * 0.26) * 0.0025
        }
        dummy.position.copy(c)
        const isActive = i < state.activeN && state.forming
        const dist = c.distanceTo(g)
        const prox = Math.max(0, 1 - dist)
        const sc = isActive ? 0.068 + prox * 0.042 : 0.016 + Math.random() * 0.005
        dummy.scale.setScalar(sc)
        dummy.rotation.x = t * 0.2 + i * 0.018
        dummy.rotation.y = t * 0.15 + i * 0.013
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      renderer.render(scene, cam)
    }

    const onResize = () => {
      const W2 = el.offsetWidth, H2 = el.offsetHeight
      if (!W2 || !H2) return
      cam.aspect = W2 / H2
      cam.updateProjectionMatrix()
      renderer.setSize(W2, H2)
    }
    window.addEventListener('resize', onResize)
    animate()
    const startId = setTimeout(runCycle, 400)

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

  return <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight: '600px' }} />
}

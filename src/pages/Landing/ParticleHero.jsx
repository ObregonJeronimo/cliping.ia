import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const MAX = 3000
const ITEMS = ['Hook', 'Problema', 'Features', 'Diferenciador', 'Beneficios', 'CTA']

function textToVoxels(text, gw, gh, fs) {
  try {
    const c = document.createElement('canvas')
    c.width = gw; c.height = gh
    const cx = c.getContext('2d')
    cx.fillStyle = '#000'; cx.fillRect(0, 0, gw, gh)
    cx.fillStyle = '#fff'
    cx.font = `bold ${fs}px monospace`
    cx.textAlign = 'center'; cx.textBaseline = 'middle'
    const lines = text.split('\n')
    const lh = gh / lines.length
    lines.forEach((l, i) => cx.fillText(l, gw / 2, lh * i + lh / 2, gw - 6))
    const d = c.getImageData(0, 0, gw, gh).data
    const pts = []
    for (let y = 0; y < gh; y++)
      for (let x = 0; x < gw; x++)
        if (d[(y * gw + x) * 4] > 128)
          pts.push(new THREE.Vector3(
            (x - gw / 2) * 0.115,
            -(y - gh / 2) * 0.115,
            0
          ))
    return pts
  } catch (e) { return [] }
}

function tlVoxels(items) {
  const pts = [], gw = 96, lh = 3.6
  const sy = ((items.length - 1) / 2) * lh
  items.forEach((it, i) => {
    try {
      const c = document.createElement('canvas')
      c.width = gw; c.height = 14
      const cx = c.getContext('2d')
      cx.fillStyle = '#000'; cx.fillRect(0, 0, gw, 14)
      cx.fillStyle = '#fff'; cx.font = 'bold 10px monospace'
      cx.textAlign = 'left'; cx.textBaseline = 'middle'
      cx.fillText(`${it.done ? 'v' : 'o'} ${it.label}`, 2, 7, gw - 4)
      const d = c.getImageData(0, 0, gw, 14).data
      const y0 = sy - i * lh
      for (let py = 0; py < 14; py++)
        for (let px = 0; px < gw; px++)
          if (d[(py * gw + px) * 4] > 128)
            pts.push(new THREE.Vector3(
              (px - gw / 2) * 0.115,
              y0 - (py - 7) * 0.115,
              0
            ))
    } catch (e) {}
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

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: false, alpha: true, powerPreference: 'high-performance'
    })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const cam = new THREE.PerspectiveCamera(52, W / H, 0.1, 100)
    cam.position.z = 14

    // ── InstancedMesh ─────────────────────────────────────────────────────
    const geo = new THREE.BoxGeometry(1, 1, 1)
    const mat = new THREE.MeshBasicMaterial({ color: 0xdce6ff })
    const mesh = new THREE.InstancedMesh(geo, mat, MAX)
    mesh.frustumCulled = false
    scene.add(mesh)

    const dummy = new THREE.Object3D()

    // Posiciones iniciales aleatorias
    const cur = Array.from({ length: MAX }, () =>
      new THREE.Vector3(
        (Math.random() - .5) * 20,
        (Math.random() - .5) * 12,
        (Math.random() - .5) * 6
      )
    )
    const tgt = cur.map(v => v.clone())
    const base = cur.map(v => v.clone())
    let activeN = 0
    let forming = false

    // ── Helpers ───────────────────────────────────────────────────────────
    function setTargets(pts) {
      activeN = Math.min(pts.length, MAX)
      for (let i = 0; i < MAX; i++)
        tgt[i].copy(i < pts.length ? pts[i] : base[i])
      forming = pts.length > 0
    }

    function scatter() {
      setTargets([])
      onStateChange?.('scatter')
    }

    // ── Secuencia de animación ─────────────────────────────────────────────
    // Usamos un scheduler simple con delay absoluto desde el inicio del ciclo
    let cycleStart = 0
    const timers = []

    function at(ms, fn) {
      const id = setTimeout(fn, cycleStart + ms - Date.now())
      timers.push(id)
    }

    function cycle() {
      timers.forEach(clearTimeout)
      timers.length = 0
      cycleStart = Date.now()

      // t=0 — URL
      setTargets(textToVoxels('misitio.com', 120, 28, 22))
      onStateChange?.('url')

      // t=3.4s — scatter
      at(3400, () => scatter())

      // t=5.0s — prompt
      at(5000, () => {
        setTargets(textToVoxels(
          'Video profesional\ncon todas las herramientas',
          120, 42, 14
        ))
        onStateChange?.('prompt')
      })

      // t=9.0s — scatter
      at(9000, () => scatter())

      // t=10.4s — timeline, construyendo ítem a ítem
      at(10400, () => {
        onStateChange?.('timeline')
        const items = ITEMS.map(l => ({ label: l, done: false }))

        // Mostrar todos sin completar al inicio
        setTargets(tlVoxels(items))

        // Completar uno a uno
        ITEMS.forEach((_, idx) => {
          setTimeout(() => {
            if (idx > 0) items[idx - 1].done = true
            setTargets(tlVoxels(items))
          }, 600 + idx * 1100)
        })

        // Marcar el último
        setTimeout(() => {
          items[ITEMS.length - 1].done = true
          setTargets(tlVoxels(items))
        }, 600 + ITEMS.length * 1100)
      })

      // t=total — reiniciar
      const total = 10400 + 600 + ITEMS.length * 1100 + 2600
      at(total, () => scatter())
      at(total + 1400, () => cycle())
    }

    // ── Render loop ───────────────────────────────────────────────────────
    let t = 0
    let alive = true
    let rafId

    function animate() {
      if (!alive) return
      rafId = requestAnimationFrame(animate)
      t += 0.016

      const spd = forming ? 0.07 : 0.035

      for (let i = 0; i < MAX; i++) {
        const c = cur[i], g = tgt[i]
        c.lerp(g, spd)

        if (!forming) {
          c.x += Math.sin(t * 0.6 + i * 0.3) * 0.0025
          c.y += Math.cos(t * 0.45 + i * 0.26) * 0.0025
        }

        dummy.position.copy(c)

        const isActive = i < activeN && forming
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

    // ── Resize ────────────────────────────────────────────────────────────
    const onResize = () => {
      const W2 = el.offsetWidth, H2 = el.offsetHeight
      if (!W2 || !H2) return
      cam.aspect = W2 / H2
      cam.updateProjectionMatrix()
      renderer.setSize(W2, H2)
    }
    window.addEventListener('resize', onResize)

    // ── Arrancar ──────────────────────────────────────────────────────────
    animate()
    const startId = setTimeout(cycle, 300)

    // ── Cleanup ───────────────────────────────────────────────────────────
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
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', minHeight: '600px' }}
    />
  )
}

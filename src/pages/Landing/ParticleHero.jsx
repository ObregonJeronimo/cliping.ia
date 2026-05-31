import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const MAX = 3000
const ITEMS = ['Hook', 'Problema', 'Features', 'Diferenciador', 'Beneficios', 'CTA']

function textToVoxels(text, gw = 120, gh = 32, fs = 22) {
  try {
    const c = document.createElement('canvas')
    c.width = gw; c.height = gh
    const cx = c.getContext('2d')
    cx.fillStyle = '#000'; cx.fillRect(0, 0, gw, gh)
    cx.fillStyle = '#fff'
    cx.font = `bold ${fs}px monospace`
    cx.textAlign = 'center'; cx.textBaseline = 'middle'
    const lines = text.split('\n')
    if (lines.length === 1) {
      cx.fillText(text, gw / 2, gh / 2, gw - 6)
    } else {
      const lh = gh / lines.length
      lines.forEach((l, i) => cx.fillText(l, gw / 2, lh * i + lh / 2, gw - 6))
    }
    const d = c.getImageData(0, 0, gw, gh).data
    const pts = []
    for (let y = 0; y < gh; y++)
      for (let x = 0; x < gw; x++)
        if (d[(y * gw + x) * 4] > 128)
          pts.push(new THREE.Vector3((x - gw / 2) * 0.115, -(y - gh / 2) * 0.115, 0))
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
            pts.push(new THREE.Vector3((px - gw / 2) * 0.115, y0 - (py - 7) * 0.115, 0))
    } catch (e) {}
  })
  return pts
}

export default function ParticleHero({ onStateChange }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const W = el.offsetWidth
    const H = el.offsetHeight

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' })
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
      new THREE.Vector3((Math.random() - .5) * 20, (Math.random() - .5) * 12, (Math.random() - .5) * 6))
    const tgt = cur.map(v => v.clone())
    const base = cur.map(v => v.clone())
    let activeN = 0
    let forming = false
    let alive = true

    function show(pts, state) {
      activeN = Math.min(pts.length, MAX)
      for (let i = 0; i < MAX; i++)
        tgt[i].copy(i < pts.length ? pts[i] : base[i])
      forming = pts.length > 0
      onStateChange?.(state)
    }

    function scatter() { show([], 'scatter') }

    const timers = []
    const add = (fn, ms) => timers.push(setTimeout(fn, ms))

    function cycle() {
      // Estado 1 — URL
      show(textToVoxels('misitio.com', 120, 28, 22), 'url')

      add(() => scatter(), 3400)
      add(() => {
        show(
          textToVoxels('Video profesional\ncon todas las herramientas', 120, 40, 14),
          'prompt'
        )
      }, 5000)
      add(() => scatter(), 9000)

      // Estado 3 — Timeline
      add(() => {
        onStateChange?.('timeline')
        let items = ITEMS.map(l => ({ label: l, done: false }))
        show(tlVoxels(items), 'timeline')
        let d = 600
        ITEMS.forEach((_, idx) => {
          add(() => {
            if (idx > 0) items[idx - 1].done = true
            show(tlVoxels(items), 'timeline')
          }, 10400 + d)
          d += 1100
        })
        add(() => {
          items = ITEMS.map(l => ({ label: l, done: true }))
          show(tlVoxels(items), 'timeline')
        }, 10400 + d + 200)
      }, 10400)

      const total = 10400 + ITEMS.length * 1100 + 2600
      add(() => scatter(), total)
      add(() => cycle(), total + 1600)
    }

    let t = 0, rafId
    function animate() {
      if (!alive) return
      rafId = requestAnimationFrame(animate)
      t += 0.016
      const spd = forming ? 0.075 : 0.04
      for (let i = 0; i < MAX; i++) {
        const c = cur[i], g = tgt[i]
        c.lerp(g, spd)
        if (!forming) {
          c.x += Math.sin(t * 0.7 + i * 0.31) * 0.003
          c.y += Math.cos(t * 0.5 + i * 0.27) * 0.003
        }
        dummy.position.copy(c)
        const isActive = i < activeN && forming
        const dist = c.distanceTo(g)
        const prox = Math.max(0, 1 - dist)
        const sc = isActive ? 0.07 + prox * 0.045 : 0.018 + Math.random() * 0.006
        dummy.scale.setScalar(sc)
        dummy.rotation.x = t * 0.22 + i * 0.019
        dummy.rotation.y = t * 0.17 + i * 0.014
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      renderer.render(scene, cam)
    }

    const startId = setTimeout(cycle, 400)
    animate()

    const onResize = () => {
      const W2 = el.offsetWidth, H2 = el.offsetHeight
      cam.aspect = W2 / H2
      cam.updateProjectionMatrix()
      renderer.setSize(W2, H2)
    }
    window.addEventListener('resize', onResize)

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

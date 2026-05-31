import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const MAX = 3000
const ITEMS = ['Hook', 'Problema', 'Features', 'Diferenciador', 'Beneficios', 'CTA']

function textToVoxels(text, gw, gh, fs) {
  try {
    const c = document.createElement('canvas')
    c.width = gw; c.height = gh
    const cx = c.getContext('2d')
    cx.fillStyle = '#000'
    cx.fillRect(0, 0, gw, gh)
    cx.fillStyle = '#fff'
    cx.font = `bold ${fs}px monospace`
    cx.textAlign = 'center'
    cx.textBaseline = 'middle'
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
  } catch (e) {
    console.error('textToVoxels error:', e)
    return []
  }
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

    // Estado mutable via ref para que el render loop siempre lea el valor actual
    const state = { activeN: 0, forming: false }

    function setTargets(pts) {
      state.activeN = Math.min(pts.length, MAX)
      for (let i = 0; i < MAX; i++)
        tgt[i].copy(i < pts.length ? pts[i] : base[i])
      state.forming = pts.length > 0
    }

    // Secuencia con delays RELATIVOS encadenados (chain de setTimeout)
    const timers = []
    function wait(ms, fn) {
      const id = setTimeout(fn, ms)
      timers.push(id)
    }

    function runCycle() {
      // Paso 1: mostrar URL (inmediato)
      const urlPts = textToVoxels('misitio.com', 120, 28, 22)
      console.log('[hero] url voxels:', urlPts.length)
      setTargets(urlPts)
      onStateChange?.('url')

      // Paso 2: scatter a t=3400
      wait(3400, () => {
        setTargets([])
        onStateChange?.('scatter')

        // Paso 3: prompt a t=3400+1600=5000
        wait(1600, () => {
          const promptPts = textToVoxels(
            'Video profesional\ncon todas las herramientas',
            120, 42, 14
          )
          console.log('[hero] prompt voxels:', promptPts.length)
          setTargets(promptPts)
          onStateChange?.('prompt')

          // Paso 4: scatter a t=5000+4000=9000
          wait(4000, () => {
            setTargets([])
            onStateChange?.('scatter')

            // Paso 5: timeline a t=9000+1400=10400
            wait(1400, () => {
              onStateChange?.('timeline')
              const items = ITEMS.map(l => ({ label: l, done: false }))
              setTargets(tlVoxels(items))
              console.log('[hero] timeline voxels:', tlVoxels(items).length)

              // Completar ítems uno a uno, encadenados
              let itemIdx = 0
              function nextItem() {
                if (itemIdx > 0) items[itemIdx - 1].done = true
                itemIdx++
                setTargets(tlVoxels(items))
                if (itemIdx <= ITEMS.length) {
                  wait(1100, nextItem)
                } else {
                  // Todos completos — esperar y reiniciar
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

    // Render loop
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
    // Pequeño delay para asegurar que el DOM está listo
    const startId = setTimeout(runCycle, 500)

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
    <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight: '600px' }} />
  )
}

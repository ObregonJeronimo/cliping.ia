import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────
//  ParticleHero — sistema de texto de particulas con auto-fit al frustum
//
//  CLAVE: ya no se usa un SCALE fijo. Cada texto se muestrea, se calcula su
//  bounding box y se escala automaticamente para entrar en un presupuesto
//  de unidades de mundo que cabe en el frustum de la camara. Asi es
//  imposible que el texto se corte, sin importar largo, lineas o aspect.
// ─────────────────────────────────────────────────────────────────────────

const FONT_SIZE   = 72
const SAMPLE_STEP = 1
const MAX         = 8000
const ITEMS       = ['Hook', 'Problema', 'Features', 'Diferenciador', 'Beneficios', 'CTA']

const MODE_IDLE    = 'idle'
const MODE_FORMING = 'forming'
const MODE_BURST   = 'burst'

// Spring 1D para movimiento con inercia natural (no lerp lineal)
class Spring1D {
  constructor(stiffness = 190, damping = 26) {
    this.k = stiffness; this.d = damping
    this.pos = 0; this.vel = 0; this.tgt = 0
  }
  reset(p) { this.pos = p; this.vel = 0 }
  update(dt) {
    const h = Math.min(dt, 0.033)
    this.vel += (-this.k * (this.pos - this.tgt) - this.d * this.vel) * h
    this.pos += this.vel * h
    return this.pos
  }
}

// Muestrea pixeles opacos del canvas y devuelve coords CRUDAS (y invertida)
function sampleRaw(canvas) {
  const w = canvas.width, h = canvas.height
  const data = canvas.getContext('2d').getImageData(0, 0, w, h).data
  const pts = []
  for (let y = 0; y < h; y += SAMPLE_STEP)
    for (let x = 0; x < w; x += SAMPLE_STEP)
      if (data[(y * w + x) * 4 + 3] > 128) pts.push({ x, y: -y })
  return pts
}

// Normaliza un set de puntos: centra en (0,0) y escala para que su
// dimension mayor entre en maxW x maxH unidades de mundo. Imposible que
// se salga del frustum si maxW/maxH estan dentro de los limites.
function fitToWorld(raw, maxW, maxH) {
  if (!raw.length) return []
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of raw) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  const w = (maxX - minX) || 1
  const h = (maxY - minY) || 1
  const s = Math.min(maxW / w, maxH / h)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return raw.map(p => ({ x: (p.x - cx) * s, y: (p.y - cy) * s }))
}

function makeTextCanvas(string, fontSize) {
  const lines   = string.split('\n')
  const longest = [...lines].sort((a, b) => b.length - a.length)[0]
  const cW = Math.ceil(fontSize * 0.62 * longest.length + 32)
  const cH = Math.ceil(lines.length * fontSize * 1.25 + 16)
  const c  = document.createElement('canvas')
  c.width = cW; c.height = cH
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  lines.forEach((l, i) => ctx.fillText(l, 8, i * fontSize * 1.25 + 8))
  return c
}

function makeTimelineCanvas(items) {
  const fs = 40, rowH = Math.ceil(fs * 1.35), PAD = 12
  const fontStr = `bold ${fs}px monospace`
  const probe = document.createElement('canvas')
  probe.width = 800; probe.height = 1
  const pctx = probe.getContext('2d')
  pctx.font = fontStr
  const maxW = items.reduce((a, it) => {
    const w = pctx.measureText('\u2713  ' + it.label).width
    return w > a ? w : a
  }, 0)
  const cW = Math.ceil(maxW + PAD * 2)
  const cH = Math.ceil(items.length * rowH + PAD)
  const c  = document.createElement('canvas')
  c.width = cW; c.height = cH
  const ctx = c.getContext('2d')
  ctx.font = fontStr
  ctx.textBaseline = 'top'; ctx.textAlign = 'left'
  items.forEach((it, i) => {
    ctx.fillStyle = it.done ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.45)'
    ctx.fillText((it.done ? '\u2713  ' : '\u25cb  ') + it.label, PAD, i * rowH + PAD / 2)
  })
  return c
}

function precomputeAll() {
  // Presupuestos en unidades de mundo (verificado: entran en aspect >= 0.75)
  const urlPts    = fitToWorld(sampleRaw(makeTextCanvas('URL', FONT_SIZE * 1.4)), 10.0, 6.0)
  const promptPts = fitToWorld(sampleRaw(makeTextCanvas('Video profesional\ncon todas las\nherramientas del sitio', FONT_SIZE * 0.5)), 10.5, 7.0)
  const tlStates  = []
  for (let step = 0; step <= ITEMS.length; step++) {
    const snap = ITEMS.map((l, i) => ({ label: l, done: i < step }))
    tlStates.push(fitToWorld(sampleRaw(makeTimelineCanvas(snap)), 9.5, 8.0))
  }
  return { urlPts, promptPts, tlStates }
}

function makeOrbitLoop(rx, ry, seg = 180) {
  const pts = []
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2
    pts.push(new THREE.Vector3(Math.cos(a) * rx, Math.sin(a) * ry, 0))
  }
  return new THREE.BufferGeometry().setFromPoints(pts)
}

export default function ParticleHero({ onStateChange }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const { urlPts, promptPts, tlStates } = precomputeAll()

    const sx = Array.from({ length: MAX }, () => new Spring1D(190, 26))
    const sy = Array.from({ length: MAX }, () => new Spring1D(190, 26))
    const sz = Array.from({ length: MAX }, () => new Spring1D(90, 18))

    let W = el.offsetWidth || 700
    let H = el.offsetHeight || 650

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const cam   = new THREE.PerspectiveCamera(50, W / H, 0.1, 200)
    cam.position.z = 16

    // ResizeObserver en el elemento — corrige aspect cuando el layout calcula
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect
        if (!width || !height) return
        W = width; H = height
        cam.aspect = W / H
        cam.updateProjectionMatrix()
        renderer.setSize(W, H)
      }
    })
    ro.observe(el)

    // Particulas con blending aditivo → glow real al solaparse
    const geo  = new THREE.BoxGeometry(1, 1, 1)
    const mat  = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const mesh = new THREE.InstancedMesh(geo, mat, MAX)
    mesh.frustumCulled = false
    const initCol = new THREE.Color(0x0a0f20)
    for (let i = 0; i < MAX; i++) mesh.setColorAt(i, initCol)
    mesh.instanceColor.needsUpdate = true
    scene.add(mesh)

    // Anillos orbitales con blending aditivo
    const orbits = [
      { rx: 9.0,  ry: 6.0, tiltX: 0.20,  tiltZ: 0.06,  speed: 0.20,  opacity: 0.5  },
      { rx: 11.0, ry: 7.2, tiltX: -0.14, tiltZ: 0.16,  speed: -0.13, opacity: 0.32 },
      { rx: 13.2, ry: 8.6, tiltX: 0.32,  tiltZ: -0.10, speed: 0.34,  opacity: 0.2  },
    ]
    const orbitMeshes = orbits.map(({ rx, ry, tiltX, tiltZ, opacity }) => {
      const m = new THREE.LineBasicMaterial({
        color: 0x8098f0, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
      const loop = new THREE.LineLoop(makeOrbitLoop(rx, ry), m)
      loop.rotation.x = tiltX
      loop.rotation.z = tiltZ
      scene.add(loop)
      return loop
    })

    const dummy  = new THREE.Object3D()
    const colTmp = new THREE.Color()

    // Posiciones idle: nube esferica difusa
    const base = Array.from({ length: MAX }, () => {
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      const r  = 5 + Math.random() * 7
      return new THREE.Vector3(
        r * Math.sin(ph) * Math.cos(th),
        r * Math.sin(ph) * Math.sin(th) * 0.55,
        r * Math.cos(ph) * 0.35,
      )
    })
    // Z sutil por particula para dar profundidad/parallax al texto formado
    const formZ = Array.from({ length: MAX }, (_, i) =>
      (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.6 - 0.3
    )

    for (let i = 0; i < MAX; i++) {
      sx[i].reset(base[i].x); sy[i].reset(base[i].y); sz[i].reset(base[i].z)
    }

    const burstVel = Array.from({ length: MAX }, () =>
      new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.14)
    )

    const cur       = base.map(v => v.clone())
    const tgt       = base.map(v => v.clone())
    const burstFrom = Array.from({ length: MAX }, () => new THREE.Vector3())

    const anim = { mode: MODE_IDLE, activeN: 0, burstT: 0 }

    function setTargets(pts) {
      anim.activeN = Math.min(pts.length, MAX)
      anim.mode    = pts.length > 0 ? MODE_FORMING : MODE_IDLE
      for (let i = 0; i < MAX; i++) {
        const tx = i < pts.length ? pts[i].x : base[i].x
        const ty = i < pts.length ? pts[i].y : base[i].y
        const tz = i < pts.length ? formZ[i] : base[i].z
        tgt[i].set(tx, ty, tz)
        sx[i].tgt = tx; sy[i].tgt = ty; sz[i].tgt = tz
      }
    }

    function triggerBurst(thenFn) {
      for (let i = 0; i < MAX; i++) burstFrom[i].copy(cur[i])
      anim.mode = MODE_BURST; anim.burstT = 0
      setTimeout(thenFn, 600)
    }

    const steps = [
      { dur: 3800, fn: () => { setTargets(urlPts);      onStateChange?.('url') } },
      { dur: 1000, fn: () => triggerBurst(() => setTargets([])) },
      { dur: 4200, fn: () => { setTargets(promptPts);   onStateChange?.('prompt') } },
      { dur: 1000, fn: () => triggerBurst(() => setTargets([])) },
      { dur: 700,  fn: () => { setTargets(tlStates[0]); onStateChange?.('timeline') } },
      { dur: 850,  fn: () => setTargets(tlStates[1]) },
      { dur: 850,  fn: () => setTargets(tlStates[2]) },
      { dur: 850,  fn: () => setTargets(tlStates[3]) },
      { dur: 850,  fn: () => setTargets(tlStates[4]) },
      { dur: 850,  fn: () => setTargets(tlStates[5]) },
      { dur: 1100, fn: () => setTargets(tlStates[6]) },
      { dur: 1000, fn: () => triggerBurst(() => setTargets([])) },
      { dur: 1500, fn: () => {} },
    ]

    let stepIdx = 0, stepStart = null
    function executeStep(idx) { steps[idx].fn(); stepIdx = idx; stepStart = null }
    executeStep(0)

    // Gradiente de color del texto (lila claro arriba → azul abajo)
    const C_TOP = new THREE.Color(0xeef2ff)
    const C_MID = new THREE.Color(0x90a8ff)
    const C_BOT = new THREE.Color(0x4a5cc8)

    let alive = true, rafId = null, lastNow = null

    function animate(now) {
      if (!alive) return
      rafId = requestAnimationFrame(animate)

      const dt = lastNow !== null ? Math.min(now - lastNow, 50) : 16
      lastNow = now
      const dtSec = dt * 0.001

      if (stepStart === null) stepStart = now
      if (now - stepStart >= steps[stepIdx].dur) {
        executeStep((stepIdx + 1) % steps.length)
        stepStart = now
      }

      const t       = now * 0.001
      const forming = anim.mode === MODE_FORMING
      const burst   = anim.mode === MODE_BURST

      if (burst) anim.burstT = Math.min(anim.burstT + dt / 500, 1)

      // Deriva sutil de camara → vida + parallax (respeta reduced-motion)
      if (!reducedMotion) {
        cam.position.x = Math.sin(t * 0.13) * 0.5
        cam.position.y = Math.cos(t * 0.11) * 0.35
        cam.lookAt(0, 0, 0)
      }

      orbits.forEach(({ speed }, i) => { orbitMeshes[i].rotation.y += speed * dtSec })

      for (let i = 0; i < MAX; i++) {
        const c = cur[i]

        if (burst) {
          const e = 1 - Math.pow(1 - anim.burstT, 3)
          c.x = burstFrom[i].x + burstVel[i].x * 20 * e
          c.y = burstFrom[i].y + burstVel[i].y * 20 * e
          c.z = burstFrom[i].z + burstVel[i].z * 8  * e
          sx[i].reset(c.x); sy[i].reset(c.y); sz[i].reset(c.z)
        } else if (forming) {
          c.x = sx[i].update(dtSec); c.y = sy[i].update(dtSec); c.z = sz[i].update(dtSec)
        } else {
          const ph = i * 0.28
          sx[i].tgt = base[i].x + Math.sin(t * 0.42 + ph) * 0.18
          sy[i].tgt = base[i].y + Math.cos(t * 0.35 + ph) * 0.18
          sz[i].tgt = base[i].z + Math.sin(t * 0.46 + ph * 2) * 0.08
          c.x = sx[i].update(dtSec); c.y = sy[i].update(dtSec); c.z = sz[i].update(dtSec)
        }

        dummy.position.copy(c)

        const active = i < anim.activeN && forming
        const prox   = active ? Math.max(0, 1 - c.distanceTo(tgt[i]) * 0.45) : 0

        let scale
        if (burst)       scale = Math.max(0.001, 0.04 - anim.burstT * 0.038)
        else if (active) scale = 0.034 + prox * 0.02
        else             scale = 0.005 + Math.random() * 0.0015

        dummy.scale.setScalar(scale)
        dummy.rotation.x = t * 0.14 + i * 0.018
        dummy.rotation.y = t * 0.10 + i * 0.012
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)

        if (active) {
          // Gradiente vertical segun altura. Color moderado: el blending
          // aditivo suma el brillo en los nucleos densos (glow).
          const n = Math.max(0, Math.min(1, (c.y + 4) / 8))
          if (n > 0.5) colTmp.lerpColors(C_MID, C_TOP, (n - 0.5) * 2)
          else         colTmp.lerpColors(C_BOT, C_MID, n * 2)
          colTmp.multiplyScalar(0.45 + prox * 0.4)
        } else if (burst) {
          colTmp.lerpColors(C_BOT, initCol, anim.burstT).multiplyScalar(1 - anim.burstT * 0.8)
        } else {
          colTmp.copy(initCol).multiplyScalar(0.6 + Math.sin(t * 0.6 + i * 0.38) * 0.3)
        }
        mesh.setColorAt(i, colTmp)
      }

      mesh.instanceMatrix.needsUpdate = true
      mesh.instanceColor.needsUpdate  = true
      renderer.render(scene, cam)
    }

    rafId = requestAnimationFrame(animate)

    return () => {
      alive = false
      if (rafId) cancelAnimationFrame(rafId)
      ro.disconnect()
      renderer.dispose(); geo.dispose(); mat.dispose()
      orbitMeshes.forEach(l => { l.geometry.dispose(); l.material.dispose() })
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [onStateChange])

  return <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight: '650px' }} />
}

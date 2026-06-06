import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────
//  ParticleHero — texto de particulas con auto-fit y subsampleo uniforme
//
//  - Auto-fit: cada texto se escala a un presupuesto de unidades de mundo
//    que cabe en el frustum. Imposible que se corte por tamano.
//  - capPoints: si un texto genera mas puntos que MAX, se subsamplea de
//    forma uniforme en todo el texto (no se trunca la ultima linea).
//  - Blending normal (NO aditivo): texto nitido, no manchas.
// ─────────────────────────────────────────────────────────────────────────

const FONT_SIZE   = 72
const SAMPLE_STEP = 1
const MAX         = 10000
const CAP         = 9600          // tope de puntos por estado (deja headroom)
const ITEMS       = ['Hook', 'Problema', 'Features', 'Diferenciador', 'Beneficios', 'CTA']

const MODE_IDLE    = 'idle'
const MODE_FORMING = 'forming'
const MODE_BURST   = 'burst'

class Spring1D {
  constructor(stiffness = 200, damping = 28) {   // ~critico: settle limpio sin rebote
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

function sampleRaw(canvas) {
  const w = canvas.width, h = canvas.height
  const data = canvas.getContext('2d').getImageData(0, 0, w, h).data
  const pts = []
  for (let y = 0; y < h; y += SAMPLE_STEP)
    for (let x = 0; x < w; x += SAMPLE_STEP)
      if (data[(y * w + x) * 4 + 3] > 100) pts.push({ x, y: -y })
  return pts
}

// Subsampleo uniforme: si hay mas puntos que cap, toma con stride constante.
// Como pts viene en orden row-major, el stride preserva la distribucion
// espacial y TODAS las lineas quedan representadas (no se trunca el final).
function capPoints(pts, cap) {
  if (pts.length <= cap) return pts
  const stride = pts.length / cap
  const out = []
  for (let i = 0; i < pts.length && out.length < cap; i += stride) out.push(pts[Math.floor(i)])
  return out
}

// Centra en (0,0) y escala para entrar en maxW x maxH unidades de mundo
function fitToWorld(raw, maxW, maxH) {
  if (!raw.length) return []
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of raw) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  const s  = Math.min(maxW / ((maxX - minX) || 1), maxH / ((maxY - minY) || 1))
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return raw.map(p => ({ x: (p.x - cx) * s, y: (p.y - cy) * s }))
}

function prep(canvas, maxW, maxH) {
  return fitToWorld(capPoints(sampleRaw(canvas), CAP), maxW, maxH)
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

// Timeline: SIEMPRE dibuja los 6 items a opacidad plena (asi se muestrean
// todos y las posiciones son identicas en cada estado). El progreso se
// muestra solo con el glifo: check (hecho) vs circulo (pendiente).
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
  ctx.fillStyle = '#fff'   // todos a opacidad plena → posiciones estables
  items.forEach((it, i) => {
    ctx.fillText((it.done ? '\u2713  ' : '\u25cb  ') + it.label, PAD, i * rowH + PAD / 2)
  })
  return c
}

function precomputeAll() {
  const urlPts    = prep(makeTextCanvas('URL', FONT_SIZE * 1.4), 10.0, 6.0)
  const promptPts = prep(makeTextCanvas('Video profesional\ncon todas las\nherramientas del sitio', FONT_SIZE * 0.5), 11.0, 7.0)
  const tlStates  = []
  for (let step = 0; step <= ITEMS.length; step++) {
    const snap = ITEMS.map((l, i) => ({ label: l, done: i < step }))
    tlStates.push(prep(makeTimelineCanvas(snap), 9.5, 8.5))
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

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const { urlPts, promptPts, tlStates } = precomputeAll()

    const sx = Array.from({ length: MAX }, () => new Spring1D())
    const sy = Array.from({ length: MAX }, () => new Spring1D())
    const sz = Array.from({ length: MAX }, () => new Spring1D(95, 19))

    let W = el.offsetWidth || 700
    let H = el.offsetHeight || 650

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const cam   = new THREE.PerspectiveCamera(50, W / H, 0.1, 200)
    cam.position.z = 16

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

    // Particulas — blending NORMAL (nitido). Esferas de pocos segmentos:
    // se ven mas suaves que cubos y no generan ruido al rotar.
    const geo  = new THREE.SphereGeometry(1, 6, 5)
    const mat  = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const mesh = new THREE.InstancedMesh(geo, mat, MAX)
    mesh.frustumCulled = false
    const initCol = new THREE.Color(0x141a30)
    for (let i = 0; i < MAX; i++) mesh.setColorAt(i, initCol)
    mesh.instanceColor.needsUpdate = true
    scene.add(mesh)

    const orbits = [
      { rx: 9.5,  ry: 6.2, tiltX: 0.20,  tiltZ: 0.06,  speed: 0.18,  opacity: 0.4  },
      { rx: 11.5, ry: 7.4, tiltX: -0.14, tiltZ: 0.16,  speed: -0.12, opacity: 0.26 },
      { rx: 13.6, ry: 8.8, tiltX: 0.32,  tiltZ: -0.10, speed: 0.3,   opacity: 0.16 },
    ]
    const orbitMeshes = orbits.map(({ rx, ry, tiltX, tiltZ, opacity }) => {
      const m = new THREE.LineBasicMaterial({ color: 0x6c7fd8, transparent: true, opacity })
      const loop = new THREE.LineLoop(makeOrbitLoop(rx, ry), m)
      loop.rotation.x = tiltX
      loop.rotation.z = tiltZ
      scene.add(loop)
      return loop
    })

    const dummy  = new THREE.Object3D()
    const colTmp = new THREE.Color()

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
    const formZ = Array.from({ length: MAX }, (_, i) =>
      ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 0.5 - 0.25
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
      { dur: 4400, fn: () => { setTargets(promptPts);   onStateChange?.('prompt') } },
      { dur: 1000, fn: () => triggerBurst(() => setTargets([])) },
      { dur: 700,  fn: () => { setTargets(tlStates[0]); onStateChange?.('timeline') } },
      { dur: 850,  fn: () => setTargets(tlStates[1]) },
      { dur: 850,  fn: () => setTargets(tlStates[2]) },
      { dur: 850,  fn: () => setTargets(tlStates[3]) },
      { dur: 850,  fn: () => setTargets(tlStates[4]) },
      { dur: 850,  fn: () => setTargets(tlStates[5]) },
      { dur: 1300, fn: () => setTargets(tlStates[6]) },
      { dur: 1000, fn: () => triggerBurst(() => setTargets([])) },
      { dur: 1500, fn: () => {} },
    ]

    let stepIdx = 0, stepStart = null
    function executeStep(idx) { steps[idx].fn(); stepIdx = idx; stepStart = null }
    executeStep(0)

    const C_TOP = new THREE.Color(0xf4f6ff)
    const C_MID = new THREE.Color(0x9db2ff)
    const C_BOT = new THREE.Color(0x5a6cd8)

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

      // Deriva muy sutil de camara → parallax con la profundidad Z, sin marear
      if (!reduced) {
        cam.position.x = Math.sin(t * 0.12) * 0.35
        cam.position.y = Math.cos(t * 0.10) * 0.22
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
        const prox   = active ? Math.max(0, 1 - c.distanceTo(tgt[i]) * 0.5) : 0

        let scale
        if (burst)       scale = Math.max(0.001, 0.036 - anim.burstT * 0.034)
        else if (active) scale = 0.03 + prox * 0.012        // tamano consistente → texto nitido
        else             scale = 0.006

        dummy.scale.setScalar(scale)
        // Esferas casi sin rotacion cuando forman texto (sin ruido visual)
        if (!active) {
          dummy.rotation.x = t * 0.12 + i * 0.018
          dummy.rotation.y = t * 0.09 + i * 0.012
        } else {
          dummy.rotation.set(0, 0, 0)
        }
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)

        if (active) {
          const n = Math.max(0, Math.min(1, (c.y + 4) / 8))
          if (n > 0.5) colTmp.lerpColors(C_MID, C_TOP, (n - 0.5) * 2)
          else         colTmp.lerpColors(C_BOT, C_MID, n * 2)
          colTmp.multiplyScalar(0.7 + prox * 0.3)
        } else if (burst) {
          colTmp.lerpColors(C_BOT, initCol, anim.burstT).multiplyScalar(1 - anim.burstT * 0.7)
        } else {
          colTmp.copy(initCol).multiplyScalar(0.5 + Math.sin(t * 0.6 + i * 0.38) * 0.25)
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

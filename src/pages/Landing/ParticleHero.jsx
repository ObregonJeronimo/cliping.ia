import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────
//  ParticleHero — THREE.Points + ShaderMaterial
//
//  NITIDEZ: el texto se forma en un PLANO perfecto (Z=0) y la camara queda
//  quieta mientras hay texto. Asi la proyeccion 2D no se distorsiona y los
//  trazos quedan rectos y legibles. La deriva de camara y la profundidad
//  solo viven en los estados sin texto (idle / transicion).
//
//  Densidad adaptativa por texto (step distinto) para que ninguno descarte
//  puntos. Puntos con nucleo solido que se solapan = trazos continuos.
// ─────────────────────────────────────────────────────────────────────────

const MAX          = 14000
const CAP          = 13500
const POINT_FACTOR = 1.6
const ALPHA_THRESH = 128       // solo cuerpo solido de la letra (bordes limpios)
const ITEMS        = ['Hook', 'Problema', 'Features', 'Diferenciador', 'Beneficios', 'CTA']

const MODE_IDLE    = 'idle'
const MODE_FORMING = 'forming'
const MODE_BURST   = 'burst'

class Spring1D {
  constructor(stiffness = 210, damping = 29) {
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

function sampleRaw(canvas, step) {
  const w = canvas.width, h = canvas.height
  const data = canvas.getContext('2d').getImageData(0, 0, w, h).data
  const pts = []
  for (let y = 0; y < h; y += step)
    for (let x = 0; x < w; x += step)
      if (data[(y * w + x) * 4 + 3] > ALPHA_THRESH) pts.push({ x, y: -y })
  return pts
}

function capPoints(pts, cap) {
  if (pts.length <= cap) return pts
  const stride = pts.length / cap
  const out = []
  for (let i = 0; i < pts.length && out.length < cap; i += stride) out.push(pts[Math.floor(i)])
  return out
}

function fitToWorld(raw, maxW, maxH) {
  if (!raw.length) return { pts: [], fitScale: 0.01 }
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
  return { pts: raw.map(p => ({ x: (p.x - cx) * s, y: (p.y - cy) * s })), fitScale: s }
}

function prep(canvas, maxW, maxH, step) {
  const { pts, fitScale } = fitToWorld(capPoints(sampleRaw(canvas, step), CAP), maxW, maxH)
  const pointSize = step * fitScale * POINT_FACTOR
  return { pts, pointSize }
}

function makeTextCanvas(string, fontSize) {
  const lines   = string.split('\n')
  const longest = [...lines].sort((a, b) => b.length - a.length)[0]
  const cW = Math.ceil(fontSize * 0.6 * longest.length + 40)
  const cH = Math.ceil(lines.length * fontSize * 1.25 + 20)
  const c  = document.createElement('canvas')
  c.width = cW; c.height = cH
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  lines.forEach((l, i) => ctx.fillText(l, 10, i * fontSize * 1.25 + 10))
  return c
}

function makeTimelineCanvas(items, fs) {
  const rowH = Math.ceil(fs * 1.35), PAD = 16
  const fontStr = `700 ${fs}px monospace`
  const probe = document.createElement('canvas')
  probe.width = 1600; probe.height = 1
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
  ctx.fillStyle = '#fff'
  items.forEach((it, i) => {
    ctx.fillText((it.done ? '\u2713  ' : '\u25cb  ') + it.label, PAD, i * rowH + PAD / 2)
  })
  return c
}

function precomputeAll() {
  // step adaptativo: cada texto usa el step que lo mantiene denso sin descartar
  const urlPts    = prep(makeTextCanvas('URL', 180), 10.0, 6.0, 2)
  const promptPts = prep(makeTextCanvas('Video profesional\ncon todas las\nherramientas del sitio', 90), 11.0, 7.0, 3)
  const tlStates  = []
  for (let step = 0; step <= ITEMS.length; step++) {
    const snap = ITEMS.map((l, i) => ({ label: l, done: i < step }))
    tlStates.push(prep(makeTimelineCanvas(snap, 60), 9.5, 8.5, 2))
  }
  return { urlPts, promptPts, tlStates }
}

function makeOrbitLoop(rx, ry, seg = 200) {
  const pts = []
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2
    pts.push(new THREE.Vector3(Math.cos(a) * rx, Math.sin(a) * ry, 0))
  }
  return new THREE.BufferGeometry().setFromPoints(pts)
}

const VERT = `
  attribute float aSize;
  attribute vec3  aColor;
  varying   vec3  vColor;
  uniform   float uScale;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

const FRAG = `
  varying vec3 vColor;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    float alpha = smoothstep(0.5, 0.43, dist);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`

export default function ParticleHero({ onStateChange }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const { urlPts, promptPts, tlStates } = precomputeAll()

    const sx = Array.from({ length: MAX }, () => new Spring1D())
    const sy = Array.from({ length: MAX }, () => new Spring1D())
    const sz = Array.from({ length: MAX }, () => new Spring1D(110, 21))

    let W = el.offsetWidth || 700
    let H = el.offsetHeight || 650

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(W, H)
    const DPR = Math.min(window.devicePixelRatio, 2)
    renderer.setPixelRatio(DPR)
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const cam   = new THREE.PerspectiveCamera(50, W / H, 0.1, 200)
    cam.position.set(0, 0, 16)

    const computeScale = () => (H * DPR) / (2 * Math.tan((50 / 2) * Math.PI / 180))

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect
        if (!width || !height) return
        W = width; H = height
        cam.aspect = W / H
        cam.updateProjectionMatrix()
        renderer.setSize(W, H)
        material.uniforms.uScale.value = computeScale()
      }
    })
    ro.observe(el)

    const positions = new Float32Array(MAX * 3)
    const colors    = new Float32Array(MAX * 3)
    const sizes     = new Float32Array(MAX)

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aColor',   new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: computeScale() } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    scene.add(points)

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

    for (let i = 0; i < MAX; i++) {
      sx[i].reset(base[i].x); sy[i].reset(base[i].y); sz[i].reset(base[i].z)
    }

    const burstVel = Array.from({ length: MAX }, () =>
      new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.14)
    )

    const cur       = base.map(v => v.clone())
    const tgt       = base.map(v => v.clone())
    const burstFrom = Array.from({ length: MAX }, () => new THREE.Vector3())

    const anim = { mode: MODE_IDLE, activeN: 0, burstT: 0, pointSize: 0.02 }
    const IDLE_SIZE = 0.013

    function setTargets(data) {
      const pts = data.pts || data
      anim.activeN   = Math.min(pts.length, MAX)
      anim.mode      = pts.length > 0 ? MODE_FORMING : MODE_IDLE
      anim.pointSize = data.pointSize || 0.02
      for (let i = 0; i < MAX; i++) {
        const tx = i < pts.length ? pts[i].x : base[i].x
        const ty = i < pts.length ? pts[i].y : base[i].y
        const tz = i < pts.length ? 0 : base[i].z   // texto PLANO en Z=0
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

    const C_TOP = new THREE.Color(0xf6f8ff)
    const C_MID = new THREE.Color(0xbcc8ff)
    const C_BOT = new THREE.Color(0x8c9cf2)
    const C_IDLE = new THREE.Color(0x2a3358)
    const colTmp = new THREE.Color()

    let alive = true, rafId = null, lastNow = null
    let driftAmt = 1   // 1 = deriva activa (idle), 0 = camara quieta (texto)

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

      // La camara se queda QUIETA cuando hay texto (driftAmt -> 0), asi la
      // proyeccion del texto plano no se distorsiona. Deriva solo sin texto.
      if (!reduced) {
        const driftTarget = forming ? 0 : 1
        driftAmt += (driftTarget - driftAmt) * 0.04
        cam.position.x = Math.sin(t * 0.12) * 0.3 * driftAmt
        cam.position.y = Math.cos(t * 0.10) * 0.18 * driftAmt
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

        positions[i * 3]     = c.x
        positions[i * 3 + 1] = c.y
        positions[i * 3 + 2] = c.z

        const active = i < anim.activeN && forming
        const prox   = active ? Math.max(0, 1 - c.distanceTo(tgt[i]) * 0.5) : 0

        if (burst)       sizes[i] = Math.max(0.001, anim.pointSize * (1 - anim.burstT))
        else if (active) sizes[i] = anim.pointSize * (0.85 + prox * 0.15)
        else             sizes[i] = IDLE_SIZE

        if (active) {
          const n = Math.max(0, Math.min(1, (c.y + 4) / 8))
          if (n > 0.5) colTmp.lerpColors(C_MID, C_TOP, (n - 0.5) * 2)
          else         colTmp.lerpColors(C_BOT, C_MID, n * 2)
          colTmp.multiplyScalar(0.88 + prox * 0.12)
        } else if (burst) {
          colTmp.lerpColors(C_BOT, C_IDLE, anim.burstT)
        } else {
          colTmp.copy(C_IDLE).multiplyScalar(0.6 + Math.sin(t * 0.6 + i * 0.38) * 0.3)
        }
        colors[i * 3]     = colTmp.r
        colors[i * 3 + 1] = colTmp.g
        colors[i * 3 + 2] = colTmp.b
      }

      geometry.attributes.position.needsUpdate = true
      geometry.attributes.aColor.needsUpdate   = true
      geometry.attributes.aSize.needsUpdate     = true
      renderer.render(scene, cam)
    }

    rafId = requestAnimationFrame(animate)

    return () => {
      alive = false
      if (rafId) cancelAnimationFrame(rafId)
      ro.disconnect()
      renderer.dispose(); geometry.dispose(); material.dispose()
      orbitMeshes.forEach(l => { l.geometry.dispose(); l.material.dispose() })
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [onStateChange])

  return <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight: '650px' }} />
}

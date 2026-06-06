import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────
//  ParticleHero — campo de particulas de AMBIENTE (enfoque hibrido)
//
//  Las particulas no forman texto: son un campo de energia que converge a
//  una nube eliptica difusa cuando hay texto activo y explota en las
//  transiciones. El texto legible va nitido en una capa HTML (HeroText).
//
//  Emite onPhaseChange({ phase, visible }) para sincronizar el overlay.
// ─────────────────────────────────────────────────────────────────────────

const MAX = 7000

const MODE_CLOUD = 'cloud'
const MODE_BURST = 'burst'

class Spring1D {
  constructor(stiffness = 150, damping = 24) {
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
    float alpha = smoothstep(0.5, 0.1, dist);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`

export default function ParticleHero({ onPhaseChange }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const sx = Array.from({ length: MAX }, () => new Spring1D())
    const sy = Array.from({ length: MAX }, () => new Spring1D())
    const sz = Array.from({ length: MAX }, () => new Spring1D(120, 20))

    let W = el.clientWidth  || 700
    let H = el.clientHeight || 650

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(W, H, false)              // false: NO toca el style del canvas
    const DPR = Math.min(window.devicePixelRatio, 2)
    renderer.setPixelRatio(DPR)
    // canvas como block y absolute para que NO aporte altura al layout
    const cvs = renderer.domElement
    cvs.style.display  = 'block'
    cvs.style.position = 'absolute'
    cvs.style.inset    = '0'
    cvs.style.width    = '100%'
    cvs.style.height   = '100%'
    el.appendChild(cvs)

    const scene = new THREE.Scene()
    const cam   = new THREE.PerspectiveCamera(50, W / H, 0.1, 200)
    cam.position.set(0, 0, 16)

    const computeScale = () => (H * DPR) / (2 * Math.tan((50 / 2) * Math.PI / 180))

    // Resize desacoplado con rAF para evitar el "ResizeObserver loop" que
    // hacia crecer el contenedor infinitamente. Solo actua si cambio de verdad.
    let resizePending = false
    const applyResize = (w, h) => {
      if (w === W && h === H) return
      W = w; H = h
      cam.aspect = W / H
      cam.updateProjectionMatrix()
      renderer.setSize(W, H, false)            // false otra vez: no toca el style
      material.uniforms.uScale.value = computeScale()
    }
    const ro = new ResizeObserver((entries) => {
      if (resizePending) return
      resizePending = true
      requestAnimationFrame(() => {
        resizePending = false
        const e = entries[0]
        if (!e) return
        const w = Math.round(e.contentRect.width)
        const h = Math.round(e.contentRect.height)
        if (w && h) applyResize(w, h)
      })
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
      blending: THREE.AdditiveBlending,
    })

    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    scene.add(points)

    const orbits = [
      { rx: 9.5,  ry: 6.2, tiltX: 0.20,  tiltZ: 0.06,  speed: 0.16,  opacity: 0.4  },
      { rx: 11.5, ry: 7.4, tiltX: -0.14, tiltZ: 0.16,  speed: -0.1,  opacity: 0.26 },
      { rx: 13.6, ry: 8.8, tiltX: 0.32,  tiltZ: -0.10, speed: 0.26,  opacity: 0.16 },
    ]
    const orbitMeshes = orbits.map(({ rx, ry, tiltX, tiltZ, opacity }) => {
      const m = new THREE.LineBasicMaterial({ color: 0x6c7fd8, transparent: true, opacity })
      const loop = new THREE.LineLoop(makeOrbitLoop(rx, ry), m)
      loop.rotation.x = tiltX
      loop.rotation.z = tiltZ
      scene.add(loop)
      return loop
    })

    const cloud = Array.from({ length: MAX }, () => {
      const a  = Math.random() * Math.PI * 2
      const rr = 0.25 + Math.sqrt(Math.random()) * 0.85
      return new THREE.Vector3(
        Math.cos(a) * rr * 7.8,
        Math.sin(a) * rr * 4.8,
        (Math.random() - 0.5) * 2.4,
      )
    })
    const wide = Array.from({ length: MAX }, () => {
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      const r  = 6 + Math.random() * 7
      return new THREE.Vector3(
        r * Math.sin(ph) * Math.cos(th),
        r * Math.sin(ph) * Math.sin(th) * 0.6,
        r * Math.cos(ph) * 0.4,
      )
    })

    for (let i = 0; i < MAX; i++) {
      sx[i].reset(wide[i].x); sy[i].reset(wide[i].y); sz[i].reset(wide[i].z)
    }

    const burstVel = Array.from({ length: MAX }, () =>
      new THREE.Vector3((Math.random() - 0.5) * 0.42, (Math.random() - 0.5) * 0.42, (Math.random() - 0.5) * 0.16)
    )

    const cur       = wide.map(v => v.clone())
    const burstFrom = Array.from({ length: MAX }, () => new THREE.Vector3())

    const anim = { mode: MODE_CLOUD, burstT: 0 }

    function gatherCloud() {
      anim.mode = MODE_CLOUD
      for (let i = 0; i < MAX; i++) {
        sx[i].tgt = cloud[i].x; sy[i].tgt = cloud[i].y; sz[i].tgt = cloud[i].z
      }
    }
    function disperse() {
      anim.mode = MODE_CLOUD
      for (let i = 0; i < MAX; i++) {
        sx[i].tgt = wide[i].x; sy[i].tgt = wide[i].y; sz[i].tgt = wide[i].z
      }
    }
    function triggerBurst() {
      for (let i = 0; i < MAX; i++) burstFrom[i].copy(cur[i])
      anim.mode = MODE_BURST; anim.burstT = 0
      setTimeout(disperse, 650)
    }

    const emit = (phase, visible) => onPhaseChange?.({ phase, visible })

    const steps = [
      { dur: 3600, fn: () => { gatherCloud(); emit('url', true) } },
      { dur: 950,  fn: () => { emit('url', false); triggerBurst() } },
      { dur: 4400, fn: () => { gatherCloud(); emit('prompt', true) } },
      { dur: 950,  fn: () => { emit('prompt', false); triggerBurst() } },
      { dur: 6200, fn: () => { gatherCloud(); emit('timeline', true) } },
      { dur: 950,  fn: () => { emit('timeline', false); triggerBurst() } },
      { dur: 900,  fn: () => {} },
    ]

    let stepIdx = 0, stepStart = null
    function executeStep(idx) { steps[idx].fn(); stepIdx = idx; stepStart = null }
    executeStep(0)

    const C_HI = new THREE.Color(0x8ea4ff)
    const C_LO = new THREE.Color(0x3a4690)
    const colTmp = new THREE.Color()

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

      const t     = now * 0.001
      const burst = anim.mode === MODE_BURST
      if (burst) anim.burstT = Math.min(anim.burstT + dt / 550, 1)

      if (!reduced) {
        cam.position.x = Math.sin(t * 0.1) * 0.4
        cam.position.y = Math.cos(t * 0.08) * 0.25
        cam.lookAt(0, 0, 0)
      }

      orbits.forEach(({ speed }, i) => { orbitMeshes[i].rotation.y += speed * dtSec })

      for (let i = 0; i < MAX; i++) {
        const c = cur[i]

        if (burst) {
          const e = 1 - Math.pow(1 - anim.burstT, 3)
          c.x = burstFrom[i].x + burstVel[i].x * 20 * e
          c.y = burstFrom[i].y + burstVel[i].y * 20 * e
          c.z = burstFrom[i].z + burstVel[i].z * 9  * e
          sx[i].reset(c.x); sy[i].reset(c.y); sz[i].reset(c.z)
        } else {
          const ph = i * 0.31
          const dxx = Math.sin(t * 0.5 + ph) * 0.06
          const dyy = Math.cos(t * 0.43 + ph) * 0.06
          c.x = sx[i].update(dtSec) + dxx
          c.y = sy[i].update(dtSec) + dyy
          c.z = sz[i].update(dtSec)
        }

        positions[i * 3]     = c.x
        positions[i * 3 + 1] = c.y
        positions[i * 3 + 2] = c.z

        const flick = 0.6 + Math.sin(t * 1.2 + i * 0.5) * 0.4
        if (burst) {
          sizes[i] = Math.max(0.002, 0.05 * (1 - anim.burstT * 0.7))
          colTmp.lerpColors(C_HI, C_LO, anim.burstT)
        } else {
          sizes[i] = 0.03 + flick * 0.02
          colTmp.lerpColors(C_LO, C_HI, flick)
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
      if (el.contains(cvs)) el.removeChild(cvs)
    }
  }, [onPhaseChange])

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
}

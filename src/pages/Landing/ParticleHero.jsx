import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const FONT_SIZE   = 72
const SCALE       = 0.030
const SAMPLE_STEP = 2        // bajo de 3 a 2: mas densidad, menos pixelado
const MAX         = 4000
const ITEMS       = ['Hook', 'Problema', 'Features', 'Diferenciador', 'Beneficios', 'CTA']

// ── Modos de transicion ────────────────────────────────────────────────────
const MODE_IDLE    = 'idle'    // flotando en esfera
const MODE_FORMING = 'forming' // convergiendo hacia texto
const MODE_BURST   = 'burst'   // explosion de salida

function sampleCanvas(canvas) {
  const cW = canvas.width, cH = canvas.height
  const img = canvas.getContext('2d').getImageData(0, 0, cW, cH)
  const pts = []
  for (let y = 0; y < cH; y += SAMPLE_STEP)
    for (let x = 0; x < cW; x += SAMPLE_STEP)
      if (img.data[(y * cW + x) * 4 + 3] > 128)
        pts.push({ x: (x - cW / 2) * SCALE, y: -(y - cH / 2) * SCALE })
  return pts
}

function makeTextCanvas(string, fontSize) {
  const lines   = string.split('\n')
  const longest = [...lines].sort((a, b) => b.length - a.length)[0]
  const cW = Math.ceil(fontSize * 0.62 * longest.length + 32)
  const cH = Math.ceil(lines.length * fontSize * 1.25 + 16)
  const c  = document.createElement('canvas')
  c.width = cW; c.height = cH
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, cW, cH)
  ctx.fillStyle = '#fff'
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  lines.forEach((l, i) => ctx.fillText(l, 8, i * fontSize * 1.25 + 8))
  return c
}

function makeTimelineCanvas(items) {
  const fs = 48, rowH = fs * 1.35, cW = 360
  const cH = Math.ceil(items.length * rowH + 16)
  const c  = document.createElement('canvas')
  c.width = cW; c.height = cH
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, cW, cH)
  ctx.font = `bold ${fs}px monospace`
  ctx.textBaseline = 'top'; ctx.textAlign = 'left'
  items.forEach((it, i) => {
    ctx.fillStyle = it.done ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.4)'
    ctx.fillText((it.done ? '\u2713  ' : '\u25cb  ') + it.label, 6, i * rowH + 8)
  })
  return c
}

function precomputeAll() {
  const urlPts    = sampleCanvas(makeTextCanvas('URL', FONT_SIZE * 1.4))
  const promptPts = sampleCanvas(makeTextCanvas('Video profesional\ncon todas las\nherramientas del sitio', FONT_SIZE * 0.44))
  const tlStates  = []
  for (let step = 0; step <= ITEMS.length; step++) {
    const snapshot = ITEMS.map((l, i) => ({ label: l, done: i < step }))
    tlStates.push(sampleCanvas(makeTimelineCanvas(snapshot)))
  }
  return { urlPts, promptPts, tlStates }
}

// Crea geometria de elipse para el circulo decorativo
function makeOrbitGeometry(rx, ry, segments = 128) {
  const pts = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push(new THREE.Vector3(Math.cos(a) * rx, Math.sin(a) * ry, 0))
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts)
  return geo
}

export default function ParticleHero({ onStateChange }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const { urlPts, promptPts, tlStates } = precomputeAll()

    const W = el.offsetWidth || 700
    const H = el.offsetHeight || 650

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const cam   = new THREE.PerspectiveCamera(50, W / H, 0.1, 200)
    cam.position.z = 16

    // ── Particulas ─────────────────────────────────────────────────────────
    const geo  = new THREE.BoxGeometry(1, 1, 1)
    const mat  = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const mesh = new THREE.InstancedMesh(geo, mat, MAX)
    mesh.frustumCulled = false
    const initCol = new THREE.Color(0x111830)
    for (let i = 0; i < MAX; i++) mesh.setColorAt(i, initCol)
    mesh.instanceColor.needsUpdate = true
    scene.add(mesh)

    // ── Circulos orbitales ─────────────────────────────────────────────────
    // Tres elipses con distintos radios, inclinaciones y velocidades
    const orbits = [
      { rx: 7.2,  ry: 4.8,  tiltX: 0.18, tiltZ: 0.08,  speed: 0.22,  opacity: 0.55 },
      { rx: 8.4,  ry: 5.6,  tiltX: -0.12, tiltZ: 0.15, speed: -0.14, opacity: 0.35 },
      { rx: 6.0,  ry: 4.0,  tiltX: 0.30, tiltZ: -0.10, speed: 0.38,  opacity: 0.25 },
    ]

    const orbitMeshes = orbits.map(({ rx, ry, tiltX, tiltZ, opacity }) => {
      const orbitGeo = makeOrbitGeometry(rx, ry)
      const orbitMat = new THREE.LineBasicMaterial({
        color: 0x7090e0,
        transparent: true,
        opacity,
        linewidth: 1,
      })
      const line = new THREE.Line(orbitGeo, orbitMat)
      line.rotation.x = tiltX
      line.rotation.z = tiltZ
      scene.add(line)
      return line
    })

    const dummy  = new THREE.Object3D()
    const colTmp = new THREE.Color()

    // Posiciones base: esfera difusa
    const base = Array.from({ length: MAX }, () => {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 5 + Math.random() * 7
      return new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta) * 0.55,
        r * Math.cos(phi) * 0.35,
      )
    })

    // Velocidades de burst por particula (direccion aleatoria)
    const burstVel = Array.from({ length: MAX }, () =>
      new THREE.Vector3(
        (Math.random() - 0.5) * 0.38,
        (Math.random() - 0.5) * 0.38,
        (Math.random() - 0.5) * 0.12,
      )
    )

    const cur  = base.map(v => v.clone())
    const tgt  = base.map(v => v.clone())

    // Estado de animacion
    const anim = {
      mode:    MODE_IDLE,
      activeN: 0,
      burstT:  0,   // progreso del burst [0..1]
    }

    // Copia de posiciones al momento de iniciar el burst
    const burstFrom = Array.from({ length: MAX }, () => new THREE.Vector3())

    function setTargets(pts) {
      anim.activeN = Math.min(pts.length, MAX)
      anim.mode    = pts.length > 0 ? MODE_FORMING : MODE_IDLE
      for (let i = 0; i < MAX; i++)
        tgt[i].set(
          i < pts.length ? pts[i].x : base[i].x,
          i < pts.length ? pts[i].y : base[i].y,
          0,
        )
    }

    // Dispara el burst: guarda posicion actual y lanza explosion
    function triggerBurst(thenFn) {
      for (let i = 0; i < MAX; i++) burstFrom[i].copy(cur[i])
      anim.mode   = MODE_BURST
      anim.burstT = 0
      // Despues de ~600ms ejecuta la siguiente accion
      setTimeout(thenFn, 600)
    }

    // Secuenciador
    const steps = [
      { dur: 3800,  fn: () => { setTargets(urlPts);      onStateChange?.('url') } },
      { dur: 1000,  fn: () => triggerBurst(() => setTargets([])) },
      { dur: 4200,  fn: () => { setTargets(promptPts);   onStateChange?.('prompt') } },
      { dur: 1000,  fn: () => triggerBurst(() => setTargets([])) },
      { dur: 700,   fn: () => { setTargets(tlStates[0]); onStateChange?.('timeline') } },
      { dur: 900,   fn: () => setTargets(tlStates[1]) },
      { dur: 900,   fn: () => setTargets(tlStates[2]) },
      { dur: 900,   fn: () => setTargets(tlStates[3]) },
      { dur: 900,   fn: () => setTargets(tlStates[4]) },
      { dur: 900,   fn: () => setTargets(tlStates[5]) },
      { dur: 900,   fn: () => setTargets(tlStates[6]) },
      { dur: 1000,  fn: () => triggerBurst(() => setTargets([])) },
      { dur: 1600,  fn: () => {} },
    ]

    let stepIdx   = 0
    let stepStart = null

    function executeStep(idx) {
      steps[idx].fn()
      stepIdx   = idx
      stepStart = null
    }

    executeStep(0)

    const C_TOP  = new THREE.Color(0xffffff)
    const C_MID  = new THREE.Color(0x9db8ff)
    const C_BOT  = new THREE.Color(0x4a5cc8)
    const C_IDLE = new THREE.Color(0x1a2550)

    let alive = true
    let rafId = null
    let lastNow = null

    function animate(now) {
      if (!alive) return
      rafId = requestAnimationFrame(animate)

      const dt = lastNow !== null ? Math.min(now - lastNow, 50) : 16
      lastNow = now

      if (stepStart === null) stepStart = now
      const elapsed = now - stepStart
      if (elapsed >= steps[stepIdx].dur) {
        const nextIdx = (stepIdx + 1) % steps.length
        executeStep(nextIdx)
        stepStart = now
      }

      const t   = now * 0.001
      const isForming = anim.mode === MODE_FORMING
      const isBurst   = anim.mode === MODE_BURST

      // Avanzar burst
      if (isBurst) {
        anim.burstT = Math.min(anim.burstT + dt / 500, 1)
      }

      // Rotar circulos orbitales
      orbits.forEach(({ speed }, idx) => {
        orbitMeshes[idx].rotation.y += speed * dt * 0.001
      })

      for (let i = 0; i < MAX; i++) {
        const c = cur[i], g = tgt[i]

        if (isBurst) {
          // Explosion: las particulas explotan desde burstFrom en direccion burstVel
          // con easing out exponencial
          const bt   = anim.burstT
          const ease = 1 - Math.pow(1 - bt, 3)
          c.x = burstFrom[i].x + burstVel[i].x * 20 * ease
          c.y = burstFrom[i].y + burstVel[i].y * 20 * ease
          c.z = burstFrom[i].z + burstVel[i].z * 8  * ease
        } else if (isForming) {
          // Formacion: converge rapido al principio, suave al llegar
          c.lerp(g, 0.095)
        } else {
          // Idle: drift suave + converge a base lentamente
          c.lerp(g, 0.018)
          c.x += Math.sin(t * 0.42 + i * 0.28) * 0.0015
          c.y += Math.cos(t * 0.35 + i * 0.22) * 0.0015
          c.z += Math.sin(t * 0.23 + i * 0.16) * 0.0007
        }

        dummy.position.copy(c)

        const isActive  = i < anim.activeN && isForming
        const proximity = isActive ? Math.max(0, 1 - c.distanceTo(g) * 0.45) : 0

        let scale
        if (isBurst) {
          // Durante el burst las particulas se encogen mientras vuelan
          scale = Math.max(0.002, (0.078 - anim.burstT * 0.076))
        } else if (isActive) {
          scale = 0.065 + proximity * 0.048
        } else {
          scale = 0.008 + Math.random() * 0.003
        }
        dummy.scale.setScalar(scale)

        dummy.rotation.x = t * 0.14 + i * 0.018
        dummy.rotation.y = t * 0.10 + i * 0.012
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)

        if (isActive) {
          const n = Math.max(0, Math.min(1, (c.y + 2.2) / 4.4))
          colTmp.lerpColors(n > 0.5 ? C_MID : C_BOT, n > 0.5 ? C_TOP : C_MID, n > 0.5 ? (n - 0.5) * 2 : n * 2)
          colTmp.multiplyScalar(0.4 + proximity * 0.6)
        } else if (isBurst) {
          // Color durante el burst: va a azul oscuro mientras explota
          colTmp.lerpColors(C_BOT, C_IDLE, anim.burstT)
          colTmp.multiplyScalar(1 - anim.burstT * 0.7)
        } else {
          colTmp.copy(C_IDLE).multiplyScalar(0.25 + Math.sin(t * 0.6 + i * 0.38) * 0.12)
        }
        mesh.setColorAt(i, colTmp)
      }

      mesh.instanceMatrix.needsUpdate = true
      mesh.instanceColor.needsUpdate  = true
      renderer.render(scene, cam)
    }

    const onResize = () => {
      const W2 = el.offsetWidth, H2 = el.offsetHeight
      if (!W2 || !H2) return
      cam.aspect = W2 / H2; cam.updateProjectionMatrix()
      renderer.setSize(W2, H2)
    }
    window.addEventListener('resize', onResize)

    rafId = requestAnimationFrame(animate)

    return () => {
      alive = false
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      geo.dispose()
      mat.dispose()
      orbitMeshes.forEach(line => { line.geometry.dispose(); line.material.dispose() })
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [onStateChange])

  return <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight: '650px' }} />
}

/**
 * ═══════════════════════════════════════════════════════════════════
 * YERCO MASTERPIECE — 30 segundos, sin un frame quieto
 * Three.js + Canvas 2D + SVG + Anime.js + GSAP Physics2D
 * Cada escena tiene movimiento en todas las capas simultáneamente
 * ═══════════════════════════════════════════════════════════════════
 */
import { useRef, useEffect, useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import * as THREE from '../../node_modules/three/build/three.module.js';
import { animate, createTimeline, stagger, eases } from '../../node_modules/animejs/dist/modules/index.js';
import { gsap } from '../../node_modules/gsap/index.js';
import { Physics2DPlugin } from '../../node_modules/gsap/Physics2DPlugin.js';
import { SplitText } from '../../node_modules/gsap/SplitText.js';

gsap.registerPlugin(Physics2DPlugin, SplitText);

// ─── Constantes ───────────────────────────────────────────────────────────────
const W = 1080, H = 1920;
const FPS = 30;
const GREEN = '#73ce73';
const GREEN_DARK = '#0a1509';
const GREEN_R = 115, GREEN_G = 206, GREEN_B = 115;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ft = (frame) => frame / FPS; // frame to seconds
const ease = (t, type = 'inOutSine') => {
  if (type === 'inOutSine') return -(Math.cos(Math.PI * t) - 1) / 2;
  if (type === 'outExpo') return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  if (type === 'inExpo') return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
  if (type === 'outBack') { const c1=1.70158,c3=c1+1; return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2); }
  return t;
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const remap = (v, a, b, c, d) => lerp(c, d, clamp((v-a)/(b-a), 0, 1));
// Ruido simplex simple
const noise2 = (x, y) => {
  const X = Math.floor(x), Y = Math.floor(y);
  const fx = x-X, fy = y-Y;
  const u = fx*fx*(3-2*fx), v2 = fy*fy*(3-2*fy);
  const h = (n) => { let h2=n*127.1; h2=Math.sin(h2)*43758.5453123; return h2-Math.floor(h2); };
  return lerp(lerp(h(X+Y*57), h(X+1+Y*57), u), lerp(h(X+(Y+1)*57), h(X+1+(Y+1)*57), u), v2)*2-1;
};

// ─── ESCENA 1: Three.js partículas → "YERCO" (frames 0-90) ───────────────────
function Scene1Particles({ frame }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);

  // Posiciones target que forman "YERCO" en una cuadrícula
  const targetPositions = useMemo(() => {
    const pts = [];
    const letters = [
      // Y
      [[0,0],[1,0],[2,0],[0.5,1],[0.5,2],[0.5,3],[0.5,4]],
      // E
      [[4,0],[5,0],[6,0],[4,1],[5,1],[4,2],[4,3],[5,3],[6,3]],
      // R
      [[8,0],[9,0],[10,0],[8,1],[9,1],[10,1],[8,2],[9,2],[8,3],[10,3],[8,4],[10,4]],
      // C
      [[12,0],[13,0],[14,0],[12,1],[12,2],[12,3],[13,3],[14,3]],
      // O
      [[16,0],[17,0],[18,0],[16,1],[18,1],[16,2],[18,2],[16,3],[18,3],[16,4],[17,4],[18,4]],
    ];
    const scale = 60, offX = -580, offY = -150;
    letters.forEach(letter => {
      letter.forEach(([lx, ly]) => {
        pts.push([lx * scale + offX, ly * scale + offY]);
      });
    });
    return pts;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W/H, 0.1, 5000);
    camera.position.z = 900;

    const N = 800;
    const positions = new Float32Array(N * 3);
    const velocities = [];
    const targets = [];

    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2;
      const r = 300 + Math.random() * 400;
      positions[i*3]   = Math.cos(angle) * r + (Math.random()-0.5)*200;
      positions[i*3+1] = Math.sin(angle) * r + (Math.random()-0.5)*200;
      positions[i*3+2] = (Math.random()-0.5) * 600;
      velocities.push({ vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3, vz: (Math.random()-0.5)*2 });
      const tp = targetPositions[i % targetPositions.length];
      targets.push([tp[0] + (Math.random()-0.5)*20, tp[1] + (Math.random()-0.5)*20, (Math.random()-0.5)*80]);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(GREEN),
      size: 6,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // Luz ambiental verde
    const ambient = new THREE.AmbientLight(0x004400, 2);
    scene.add(ambient);

    stateRef.current = { renderer, scene, camera, points, geo, positions, targets, velocities };
    return () => { renderer.dispose(); };
  }, []);

  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    const t = clamp(frame / 90, 0, 1);
    const gather = ease(t, 'inOutSine');
    const { positions, targets, velocities, geo, camera, renderer, scene } = st;
    const N = targets.length;

    for (let i = 0; i < N; i++) {
      const tx = targets[i][0], ty = targets[i][1], tz = targets[i][2];
      const cx = positions[i*3], cy = positions[i*3+1], cz = positions[i*3+2];
      // Órbita caótica + atracción al target
      const orbitSpeed = 0.02 * (1 - gather);
      const orbitX = Math.cos(frame * orbitSpeed + i * 0.3) * 20 * (1 - gather);
      const orbitY = Math.sin(frame * orbitSpeed * 0.7 + i * 0.5) * 15 * (1 - gather);
      positions[i*3]   = lerp(cx, tx + orbitX, gather * 0.08 + 0.01);
      positions[i*3+1] = lerp(cy, ty + orbitY, gather * 0.08 + 0.01);
      positions[i*3+2] = lerp(cz, tz, gather * 0.06 + 0.01);
    }
    geo.attributes.position.needsUpdate = true;

    // Rotación suave de toda la nube
    st.points.rotation.y = Math.sin(frame * 0.008) * 0.3 * (1 - gather * 0.8);
    st.points.rotation.x = Math.cos(frame * 0.006) * 0.15 * (1 - gather * 0.8);

    // Camera zoom in suave
    camera.position.z = lerp(1200, 850, ease(t, 'inOutSine'));
    camera.position.y = Math.sin(frame * 0.01) * 20 * (1-gather);

    renderer.render(scene, camera);
  }, [frame]);

  return (
    <canvas ref={canvasRef} width={W} height={H}
      style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
  );
}

// ─── ESCENA 2: Canvas fluido + headline (frames 60-150) ──────────────────────
function Scene2Fluid({ frame, localFrame }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const t = localFrame / FPS;
    ctx.clearRect(0, 0, W, H);

    // Fluido: múltiples capas de noise con movimiento
    const COLS = 40, ROWS = 70;
    const cw = W / COLS, ch = H / ROWS;

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const nx = x / COLS * 3 + t * 0.4;
        const ny = y / ROWS * 3 + t * 0.3;
        const n = noise2(nx, ny) * 0.5 +
                  noise2(nx * 2.1 + 1.7, ny * 2.1 - 0.5) * 0.3 +
                  noise2(nx * 4.2, ny * 4.2) * 0.2;
        const intensity = (n + 1) / 2;
        const alpha = intensity * 0.35;
        const r = Math.round(GREEN_R * intensity * 1.2);
        const g = Math.round(GREEN_G * intensity);
        const b2 = Math.round(GREEN_B * intensity * 0.8);
        ctx.fillStyle = `rgba(${r},${g},${b2},${alpha})`;
        ctx.fillRect(x * cw, y * ch, cw + 1, ch + 1);
      }
    }

    // Ondas circulares desde el centro
    for (let ring = 0; ring < 5; ring++) {
      const radius = ((t * 200 + ring * 180) % 1200);
      const alpha = Math.max(0, 0.3 - radius / 1200 * 0.3);
      ctx.beginPath();
      ctx.arc(W/2, H/2, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${GREEN_R},${GREEN_G},${GREEN_B},${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [localFrame]);

  const fadeIn = remap(localFrame, 0, 20, 0, 1);
  const fadeOut = remap(localFrame, 70, 90, 1, 0);
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <div style={{ position:'absolute', inset:0, opacity }}>
      <canvas ref={canvasRef} width={W} height={H}
        style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
    </div>
  );
}

// ─── ESCENA 3: SVG path draw + números Physics (frames 120-210) ──────────────
function Scene3SVGNumbers({ frame, localFrame }) {
  const t = localFrame / 90;
  const drawP = clamp(t * 1.5, 0, 1);
  const pathLen = 900;
  const dashOffset = pathLen * (1 - ease(drawP, 'inOutSine'));

  // Partícula viajando por el path
  const particleProgress = clamp((localFrame - 10) / 70, 0, 1);

  // Números que aparecen con bounce
  const num1P = ease(clamp(remap(localFrame, 20, 50, 0, 1), 0, 1), 'outBack');
  const num2P = ease(clamp(remap(localFrame, 40, 70, 0, 1), 0, 1), 'outBack');
  const num3P = ease(clamp(remap(localFrame, 60, 90, 0, 1), 0, 1), 'outBack');

  const fadeIn = remap(localFrame, 0, 15, 0, 1);
  const fadeOut = remap(localFrame, 75, 90, 1, 0);

  // Path que representa el journey
  const journeyPath = "M 100,1700 C 200,1400 400,1200 540,960 S 700,600 540,400 S 400,200 540,120";

  return (
    <div style={{ position:'absolute', inset:0, opacity: Math.min(fadeIn, fadeOut) }}>
      {/* Fondo de partículas flotantes */}
      {Array.from({length: 30}, (_, i) => {
        const x = (Math.sin(i * 2.3 + localFrame * 0.03) * 0.5 + 0.5) * W;
        const y = (Math.cos(i * 1.7 + localFrame * 0.02) * 0.5 + 0.5) * H;
        const size = 3 + Math.sin(i + localFrame * 0.05) * 2;
        return (
          <div key={i} style={{
            position:'absolute', left: x, top: y,
            width: size, height: size, borderRadius:'50%',
            background: `rgba(${GREEN_R},${GREEN_G},${GREEN_B},${0.2 + Math.sin(i * 0.7 + localFrame * 0.04) * 0.15})`,
            transform: 'translate(-50%,-50%)',
          }} />
        );
      })}

      <svg viewBox={`0 0 ${W} ${H}`} style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
        {/* Path glow */}
        <path d={journeyPath} fill="none"
          stroke={`rgba(${GREEN_R},${GREEN_G},${GREEN_B},0.1)`}
          strokeWidth="20" strokeLinecap="round" />
        {/* Path principal que se dibuja */}
        <path d={journeyPath} fill="none"
          stroke={GREEN} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={pathLen} strokeDashoffset={dashOffset}
          style={{ filter:`drop-shadow(0 0 8px ${GREEN})` }} />
        {/* Punto viajero */}
        {particleProgress > 0 && particleProgress < 0.98 && (
          <>
            <circle r="12" fill={GREEN} style={{ filter:`drop-shadow(0 0 12px ${GREEN})` }}>
              <animateMotion dur="2.33s" begin="0s" fill="freeze"
                path={journeyPath} />
            </circle>
            <circle r="6" fill="white" opacity="0.9">
              <animateMotion dur="2.33s" begin="0s" fill="freeze"
                path={journeyPath} />
            </circle>
          </>
        )}
        {/* Etiquetas del journey */}
        {drawP > 0.2 && (
          <text x="140" y="1680" fill={`rgba(255,255,255,${remap(localFrame,10,30,0,0.6)})`}
            fontSize="32" fontFamily="system-ui" fontWeight="600">Pedís online</text>
        )}
        {drawP > 0.55 && (
          <text x="580" y="940" fill={`rgba(255,255,255,${remap(localFrame,35,55,0,0.6)})`}
            fontSize="32" fontFamily="system-ui" fontWeight="600">Preparamos</text>
        )}
        {drawP > 0.85 && (
          <text x="400" y="100" fill={`rgba(255,255,255,${remap(localFrame,60,80,0,0.6)})`}
            fontSize="32" fontFamily="system-ui" fontWeight="600">En tu casa</text>
        )}
      </svg>

      {/* Números con bounce */}
      <div style={{ position:'absolute', left:'50%', top:'45%', transform:'translate(-50%,-50%)', display:'flex', gap:60, alignItems:'center' }}>
        {[
          { val:'+600', label:'Productos', p: num1P },
          { val:'24h', label:'Entrega', p: num2P },
          { val:'+3', label:'Años', p: num3P },
        ].map(({ val, label, p: np }, i) => (
          <div key={i} style={{
            textAlign:'center',
            transform:`scale(${np}) translateY(${(1-np)*60}px)`,
            opacity: np,
          }}>
            <div style={{
              fontSize:88, fontWeight:900, fontFamily:'system-ui',
              letterSpacing:'-0.05em', color:GREEN, lineHeight:1,
              textShadow:`0 0 30px rgba(${GREEN_R},${GREEN_G},${GREEN_B},0.6)`,
            }}>{val}</div>
            <div style={{ fontSize:20, color:'rgba(255,255,255,0.5)', fontFamily:'system-ui', textTransform:'uppercase', letterSpacing:'0.1em' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ESCENA 4: Three.js esfera respirando (frames 180-270) ───────────────────
function Scene4Sphere({ frame, localFrame }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(W, H);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W/H, 0.1, 5000);
    camera.position.z = 700;

    // Esfera de partículas
    const N = 1200;
    const positions = new Float32Array(N * 3);
    const originalR = [];
    for (let i = 0; i < N; i++) {
      const phi = Math.acos(1 - 2 * (i / N));
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 200 + Math.random() * 40;
      originalR.push(r);
      positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i*3+2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: new THREE.Color(GREEN), size: 5, transparent: true, opacity: 0.85 });
    const sphere = new THREE.Points(geo, mat);
    scene.add(sphere);

    stateRef.current = { renderer, scene, camera, sphere, geo, positions, originalR };
    return () => renderer.dispose();
  }, []);

  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    const { positions, originalR, geo, sphere, renderer, scene, camera } = st;
    const N = originalR.length;
    const breathe = Math.sin(localFrame * 0.08) * 0.25 + 1; // 0.75 a 1.25
    for (let i = 0; i < N; i++) {
      const phi = Math.acos(1 - 2 * (i / N));
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const pulse = Math.sin(localFrame * 0.12 + i * 0.05) * 15;
      const r = originalR[i] * breathe + pulse;
      positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i*3+2] = r * Math.cos(phi);
    }
    geo.attributes.position.needsUpdate = true;
    sphere.rotation.y = localFrame * 0.015;
    sphere.rotation.x = Math.sin(localFrame * 0.008) * 0.3;
    renderer.render(scene, camera);
  }, [localFrame]);

  const fadeIn = remap(localFrame, 0, 20, 0, 1);
  const fadeOut = remap(localFrame, 70, 90, 1, 0);
  return (
    <div style={{ position:'absolute', inset:0, opacity: Math.min(fadeIn, fadeOut) }}>
      <canvas ref={canvasRef} width={W} height={H}
        style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
    </div>
  );
}

// ─── ESCENA 5: Canvas noise + glassmorphism (frames 240-330) ─────────────────
function Scene5NoiseGlass({ frame, localFrame }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    const t = localFrame / FPS;

    // Noise field con vectores de flujo
    for (let y = 0; y < H; y += 8) {
      for (let x = 0; x < W; x += 8) {
        const angle = noise2(x/200 + t*0.3, y/200 + t*0.2) * Math.PI * 4;
        const speed = (noise2(x/150 - t*0.2, y/150 + t*0.15) + 1) / 2;
        const len = speed * 16;
        const alpha = speed * 0.25;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        ctx.strokeStyle = `rgba(${GREEN_R},${GREEN_G},${GREEN_B},${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }, [localFrame]);

  const benefits = ['Productos naturales', 'Envíos en 24h', 'Más de 600 variedades', 'Calidad garantizada'];
  const fadeIn = remap(localFrame, 0, 20, 0, 1);
  const fadeOut = remap(localFrame, 70, 90, 1, 0);
  const spotX = 50 + Math.sin(localFrame * 0.04) * 30;
  const spotY = 50 + Math.cos(localFrame * 0.03) * 20;

  return (
    <div style={{ position:'absolute', inset:0, opacity: Math.min(fadeIn, fadeOut) }}>
      <canvas ref={canvasRef} width={W} height={H}
        style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', gap:16, padding:'0 40px' }}>
        {benefits.map((b, i) => {
          const p = ease(clamp(remap(localFrame, i*12, i*12+30, 0, 1), 0, 1), 'outExpo');
          return (
            <div key={i} style={{
              width:'100%', borderRadius:20, padding:'22px 28px',
              background:`radial-gradient(circle at ${spotX}% ${spotY}%, rgba(${GREEN_R},${GREEN_G},${GREEN_B},0.15) 0%, rgba(255,255,255,0.04) 70%)`,
              border:`1px solid rgba(${GREEN_R},${GREEN_G},${GREEN_B},0.2)`,
              backdropFilter:'blur(20px)',
              boxShadow:`0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(${GREEN_R},${GREEN_G},${GREEN_B},${0.05 + Math.sin(localFrame*0.08+i)*0.03})`,
              opacity: p, transform:`translateX(${(1-p)*60}px)`,
              display:'flex', alignItems:'center', gap:16,
            }}>
              <div style={{
                width:10, height:10, borderRadius:'50%', background:GREEN,
                boxShadow:`0 0 ${8+Math.sin(localFrame*0.1+i)*4}px ${GREEN}`,
                flexShrink:0,
              }} />
              <div style={{ fontSize:22, fontWeight:600, color:'#e8f5e8', fontFamily:'system-ui' }}>{b}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ESCENA 6: GSAP Physics2D lluvia de letras (frames 300-390) ──────────────
function Scene6Physics({ frame, localFrame }) {
  const containerRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const tl = gsap.timeline({ paused: true });
    tl.from('.phy-char', {
      physics2D: {
        velocity: () => gsap.utils.random(200, 500),
        angle: () => gsap.utils.random(260, 280),
        gravity: 800,
        friction: 0.2,
      },
      opacity: 0,
      duration: 1.8,
      stagger: { each: 0.06, from: 'random' },
    }, 0)
    .from('.phy-sub', {
      opacity: 0, y: 30, duration: 0.6, ease: 'power2.out',
    }, 1.4);
    animRef.current = tl;
    return () => { tl.kill(); };
  }, []);

  useEffect(() => {
    if (animRef.current) animRef.current.seek(localFrame / FPS, false);
  }, [localFrame]);

  const text = 'DIETÉTICA DE CONFIANZA';
  const fadeIn = remap(localFrame, 0, 15, 0, 1);
  const fadeOut = remap(localFrame, 75, 90, 1, 0);

  return (
    <div ref={containerRef} style={{ position:'absolute', inset:0, opacity: Math.min(fadeIn, fadeOut), overflow:'hidden', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', gap:24, padding:'0 40px' }}>
      {/* Partículas de fondo siempre en movimiento */}
      {Array.from({length:40}, (_,i) => (
        <div key={i} style={{
          position:'absolute',
          left:`${(Math.sin(i*1.3+localFrame*0.02)*0.5+0.5)*100}%`,
          top:`${(Math.cos(i*1.7+localFrame*0.025)*0.5+0.5)*100}%`,
          width: 3+i%4, height: 3+i%4,
          borderRadius:'50%',
          background:`rgba(${GREEN_R},${GREEN_G},${GREEN_B},${0.1+Math.sin(i+localFrame*0.05)*0.08})`,
          transform:'translate(-50%,-50%)',
        }} />
      ))}
      <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', overflow:'hidden', gap:'2px 0' }}>
        {text.split('').map((c, i) => (
          <span key={i} className="phy-char" style={{
            display:'inline-block', fontSize:68, fontWeight:900,
            fontFamily:'system-ui', letterSpacing:'-0.02em',
            color: i%5===0 ? GREEN : '#fff', lineHeight:1.1,
          }}>{c === ' ' ? '\u00A0' : c}</span>
        ))}
      </div>
      <div className="phy-sub" style={{
        fontSize:24, color:`rgba(${GREEN_R},${GREEN_G},${GREEN_B},0.7)`,
        fontFamily:'system-ui', letterSpacing:'0.08em', textTransform:'uppercase',
      }}>Villa Allende · Mendiolaza</div>
    </div>
  );
}

// ─── ESCENA 7: Three.js túnel de anillos (frames 360-450) ────────────────────
function Scene7Tunnel({ frame, localFrame }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(W, H);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, W/H, 0.1, 3000);
    camera.position.z = 600;

    const rings = [];
    for (let i = 0; i < 20; i++) {
      const geo = new THREE.TorusGeometry(80 + i*8, 2, 8, 64);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(GREEN),
        transparent: true,
        opacity: 0.4 + (i/20) * 0.4,
        wireframe: false,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.position.z = -i * 80;
      ring.userData.baseZ = -i * 80;
      scene.add(ring);
      rings.push(ring);
    }

    stateRef.current = { renderer, scene, camera, rings };
    return () => renderer.dispose();
  }, []);

  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    const speed = 3 + localFrame * 0.05; // aceleración
    st.rings.forEach((ring, i) => {
      ring.position.z = ((ring.userData.baseZ + localFrame * speed) % 1600) - 200;
      ring.rotation.z = localFrame * 0.02 + i * 0.3;
      ring.rotation.x = Math.sin(localFrame * 0.03 + i * 0.2) * 0.2;
      const distFromCam = Math.abs(ring.position.z - 600);
      ring.material.opacity = Math.max(0.1, 0.7 - distFromCam / 800);
    });
    st.camera.position.x = Math.sin(localFrame * 0.02) * 20;
    st.camera.position.y = Math.cos(localFrame * 0.015) * 15;
    st.renderer.render(st.scene, st.camera);
  }, [localFrame]);

  const fadeIn = remap(localFrame, 0, 20, 0, 1);
  const fadeOut = remap(localFrame, 70, 90, 1, 0);
  const ctaP = ease(clamp(remap(localFrame, 30, 60, 0, 1), 0, 1), 'outBack');
  const pulse = 1 + Math.sin(localFrame * 0.12) * 0.04;

  return (
    <div style={{ position:'absolute', inset:0, opacity: Math.min(fadeIn, fadeOut) }}>
      <canvas ref={canvasRef} width={W} height={H}
        style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
      {/* CTA al final del túnel */}
      <div style={{
        position:'absolute', left:'50%', top:'50%', transform:`translate(-50%,-50%) scale(${ctaP * pulse})`,
        opacity: ctaP,
      }}>
        <div style={{
          borderRadius:100, padding:'22px 60px',
          background:`linear-gradient(135deg, ${GREEN}, rgba(${GREEN_R},${GREEN_G},${GREEN_B},0.75))`,
          boxShadow:`0 0 ${40+Math.sin(localFrame*0.1)*20}px rgba(${GREEN_R},${GREEN_G},${GREEN_B},0.6), inset 0 1px 0 rgba(255,255,255,0.2)`,
        }}>
          <div style={{ fontSize:28, fontWeight:800, color:'#000', fontFamily:'system-ui', whiteSpace:'nowrap' }}>
            Ver productos →
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ESCENA 8: Morfeo SVG + multi-efectos (frames 420-510) ───────────────────
function Scene8Morph({ frame, localFrame }) {
  const shapes = [
    'M60,8 C88,8 112,32 112,60 C112,88 88,112 60,112 C32,112 8,88 8,60 C8,32 32,8 60,8 Z',
    'M60,4 C90,2 118,26 116,60 C114,92 88,116 60,116 C28,116 2,90 4,60 C6,28 30,6 60,4 Z',
    'M60,8 C85,3 118,30 115,62 C112,94 88,118 58,112 C26,116 2,90 5,60 C8,30 35,13 60,8 Z',
    'M62,6 C92,4 116,32 114,62 C112,92 86,116 58,114 C28,112 4,86 6,60 C8,34 32,8 62,6 Z',
  ];
  const CYCLE = 45;
  const idx = Math.floor(localFrame / CYCLE) % shapes.length;
  const nextIdx = (idx + 1) % shapes.length;
  const t = (localFrame % CYCLE) / CYCLE;
  const eased = ease(t, 'inOutSine');
  const extract = (s) => s.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const numsA = extract(shapes[idx]), numsB = extract(shapes[nextIdx]);
  let ni = 0;
  const morphed = shapes[idx].replace(/-?\d+(?:\.\d+)?/g, () => {
    const v = lerp(numsA[ni], numsB[ni], eased); ni++;
    return Math.round(v*10)/10;
  });

  const fadeIn = remap(localFrame, 0, 15, 0, 1);
  const fadeOut = remap(localFrame, 75, 90, 1, 0);
  const shineX = ((localFrame * 2.5) % 200) - 20;
  const shineOpacity = Math.sin((localFrame % 80) / 80 * Math.PI) * 0.5;
  const ctaP = ease(clamp(remap(localFrame, 20, 50, 0, 1), 0, 1), 'outBack');
  const pulse = 1 + Math.sin(localFrame * 0.1) * 0.03;
  const rings = [1,2,3];

  return (
    <div style={{ position:'absolute', inset:0, opacity: Math.min(fadeIn, fadeOut), display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', gap:40 }}>
      {/* Blob morfando */}
      <div style={{ filter:`drop-shadow(0 0 30px rgba(${GREEN_R},${GREEN_G},${GREEN_B},0.6))` }}>
        <svg viewBox="0 0 120 120" width="280" height="280">
          <defs>
            <radialGradient id="mg" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor={GREEN} />
              <stop offset="100%" stopColor={`rgba(${GREEN_R},${GREEN_G},${GREEN_B},0.4)`} />
            </radialGradient>
          </defs>
          <path d={morphed} fill="url(#mg)" />
        </svg>
      </div>
      {/* Botón CTA con shine y rings */}
      <div style={{ position:'relative', transform:`scale(${ctaP * pulse})`, opacity: ctaP }}>
        {rings.map(r => (
          <div key={r} style={{
            position:'absolute', inset:-(r*14 + Math.sin(localFrame*0.07)*r*3),
            border:`1px solid rgba(${GREEN_R},${GREEN_G},${GREEN_B},${0.25-r*0.07})`,
            borderRadius:100,
          }} />
        ))}
        <div style={{
          position:'relative', overflow:'hidden', borderRadius:100,
          background:`linear-gradient(135deg,${GREEN},rgba(${GREEN_R},${GREEN_G},${GREEN_B},0.75))`,
          padding:'20px 56px',
          boxShadow:`0 0 ${30+Math.sin(localFrame*0.08)*15}px rgba(${GREEN_R},${GREEN_G},${GREEN_B},0.45)`,
        }}>
          <span style={{ fontSize:22, fontWeight:700, color:'#000', fontFamily:'system-ui', position:'relative', zIndex:1 }}>
            Comprar ahora
          </span>
          <div style={{
            position:'absolute', top:0, bottom:0, left:0, width:'45%',
            background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)',
            transform:`translateX(${shineX}%) skewX(-20deg)`,
            opacity: shineOpacity,
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── ESCENA 9: Multi-loop collage (frames 480-570) ───────────────────────────
function Scene9Collage({ frame, localFrame }) {
  const fadeIn = remap(localFrame, 0, 20, 0, 1);
  const fadeOut = remap(localFrame, 70, 90, 1, 0);
  const p = spring({ frame: localFrame, fps: FPS, config:{damping:14,stiffness:80,mass:0.6} });

  // Mini versiones de efectos anteriores corriendo simultáneamente
  const miniBlobs = Array.from({length:6}, (_,i) => {
    const shapes = ['M60,8 C88,8 112,32 112,60 C112,88 88,112 60,112 C32,112 8,88 8,60 C8,32 32,8 60,8 Z', 'M60,4 C90,2 118,26 116,60 C114,92 88,116 60,116 C28,116 2,90 4,60 C6,28 30,6 60,4 Z'];
    const t2 = ((localFrame + i*15) % 45) / 45;
    const ext = (s) => s.match(/-?\d+(?:\.\d+)?/g).map(Number);
    const nA = ext(shapes[0]), nB = ext(shapes[1]);
    let ni = 0;
    const d = shapes[0].replace(/-?\d+(?:\.\d+)?/g, () => { const v=lerp(nA[ni],nB[ni],ease(t2,'inOutSine')); ni++; return Math.round(v*10)/10; });
    const x = [80,540,1000,160,620,960][i];
    const y = [200,150,220,900,860,920][i];
    const size = [120,90,110,100,85,130][i];
    return { d, x, y, size };
  });

  const floatY = Math.sin(localFrame * 0.06) * 20;

  return (
    <div style={{ position:'absolute', inset:0, opacity: Math.min(fadeIn, fadeOut) }}>
      {/* Mini blobs en las esquinas */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
        {miniBlobs.map((b, i) => (
          <g key={i} transform={`translate(${b.x},${b.y}) scale(${b.size/120})`}
            opacity={0.3 + Math.sin(localFrame*0.07+i)*0.15}>
            <path d={b.d} fill={`rgba(${GREEN_R},${GREEN_G},${GREEN_B},0.6)`} />
          </g>
        ))}
        {/* Líneas de conexión animadas */}
        {miniBlobs.map((b,i) => i < miniBlobs.length-1 && (
          <line key={`l${i}`}
            x1={b.x} y1={b.y}
            x2={miniBlobs[(i+1)%miniBlobs.length].x}
            y2={miniBlobs[(i+1)%miniBlobs.length].y}
            stroke={`rgba(${GREEN_R},${GREEN_G},${GREEN_B},${0.08+Math.sin(localFrame*0.04+i)*0.05})`}
            strokeWidth="1.5" />
        ))}
      </svg>
      {/* Centro: nombre grande con glow pulsante */}
      <div style={{ position:'absolute', inset:0, display:'flex', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:16 }}>
        <div style={{
          fontSize:110, fontWeight:900, fontFamily:'system-ui',
          letterSpacing:'-0.05em', color:'#fff',
          transform:`translateY(${floatY}px) scale(${p})`,
          textShadow:`0 0 ${40+Math.sin(localFrame*0.08)*20}px rgba(${GREEN_R},${GREEN_G},${GREEN_B},0.5), 0 0 80px rgba(${GREEN_R},${GREEN_G},${GREEN_B},0.2)`,
          opacity: p,
        }}>YERCO</div>
        <div style={{
          fontSize:24, fontFamily:'system-ui', letterSpacing:'0.2em',
          textTransform:'uppercase', color:`rgba(${GREEN_R},${GREEN_G},${GREEN_B},0.7)`,
          transform:`translateY(${floatY * 0.5}px)`,
          opacity: p * 0.8,
        }}>Dietética · Villa Allende</div>
      </div>
    </div>
  );
}

// ─── ESCENA 10: Three.js implosión final (frames 540-630) ─────────────────────
function Scene10Implosion({ frame, localFrame }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(W, H);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W/H, 0.1, 5000);
    camera.position.z = 900;

    const N = 1500;
    const positions = new Float32Array(N * 3);
    const origins = [];
    for (let i = 0; i < N; i++) {
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      const r = 300 + Math.random() * 500;
      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(theta);
      positions[i*3] = x; positions[i*3+1] = y; positions[i*3+2] = z;
      origins.push([x, y, z]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: new THREE.Color(GREEN), size: 5, transparent: true, opacity: 0.9 });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    stateRef.current = { renderer, scene, camera, pts, geo, positions, origins };
    return () => renderer.dispose();
  }, []);

  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    const { positions, origins, geo, pts, renderer, scene, camera } = st;
    const N = origins.length;
    const t = clamp(localFrame / 90, 0, 1);
    const implode = ease(t, 'inExpo');

    for (let i = 0; i < N; i++) {
      positions[i*3]   = lerp(origins[i][0], 0, implode) + Math.sin(localFrame*0.05+i*0.1)*(1-implode)*5;
      positions[i*3+1] = lerp(origins[i][1], 0, implode) + Math.cos(localFrame*0.04+i*0.1)*(1-implode)*5;
      positions[i*3+2] = lerp(origins[i][2], 0, implode);
    }
    geo.attributes.position.needsUpdate = true;
    pts.rotation.y = localFrame * 0.02;
    pts.rotation.z = localFrame * 0.01;
    camera.position.z = lerp(900, 300, ease(t, 'inOutSine'));
    renderer.render(scene, camera);
  }, [localFrame]);

  const fadeOut = remap(localFrame, 70, 90, 1, 0);
  const logoP = ease(clamp(remap(localFrame, 40, 80, 0, 1), 0, 1), 'outExpo');
  const glow = 40 + Math.sin(localFrame * 0.1) * 20;

  return (
    <div style={{ position:'absolute', inset:0, opacity: fadeOut }}>
      <canvas ref={canvasRef} width={W} height={H}
        style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
      <div style={{
        position:'absolute', inset:0, display:'flex', justifyContent:'center', alignItems:'center',
        flexDirection:'column', gap:12,
      }}>
        <div style={{
          fontSize:120, fontWeight:900, fontFamily:'system-ui', letterSpacing:'-0.06em',
          color:'#fff', opacity: logoP, transform:`scale(${0.5 + logoP*0.5})`,
          textShadow:`0 0 ${glow}px rgba(${GREEN_R},${GREEN_G},${GREEN_B},0.8), 0 0 ${glow*2}px rgba(${GREEN_R},${GREEN_G},${GREEN_B},0.4)`,
          filter:`blur(${(1-logoP)*8}px)`,
        }}>YERCO</div>
        <div style={{
          fontSize:20, letterSpacing:'0.25em', textTransform:'uppercase',
          color:`rgba(${GREEN_R},${GREEN_G},${GREEN_B},${logoP * 0.8})`,
          fontFamily:'system-ui', opacity: logoP,
          transform:`translateY(${(1-logoP)*20}px)`,
        }}>yerco.ar</div>
      </div>
    </div>
  );
}

// ─── COMPOSICIÓN MAESTRA ──────────────────────────────────────────────────────
export function YercoMasterpiece() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cada escena dura 90 frames (3 segundos), con overlap de 15 frames
  const SCENE_DUR = 90;
  const OVERLAP = 15;

  const scenes = [
    { start:   0, Component: Scene1Particles },
    { start:  75, Component: Scene2Fluid },
    { start: 150, Component: Scene3SVGNumbers },
    { start: 225, Component: Scene4Sphere },
    { start: 300, Component: Scene5NoiseGlass },
    { start: 375, Component: Scene6Physics },
    { start: 450, Component: Scene7Tunnel },
    { start: 525, Component: Scene8Morph },
    { start: 600, Component: Scene9Collage },
    { start: 675, Component: Scene10Implosion },
  ];

  return (
    <AbsoluteFill style={{ background: GREEN_DARK, overflow:'hidden' }}>
      {/* Fondo siempre activo — partículas flotantes globales */}
      {Array.from({length:20}, (_,i) => {
        const x = (Math.sin(i*2.1+frame*0.008)*0.5+0.5)*100;
        const y = (Math.cos(i*1.9+frame*0.006)*0.5+0.5)*100;
        const op = 0.06 + Math.sin(i*0.8+frame*0.03)*0.04;
        return (
          <div key={i} style={{
            position:'absolute', left:`${x}%`, top:`${y}%`,
            width:2+i%3, height:2+i%3, borderRadius:'50%',
            background:`rgba(${GREEN_R},${GREEN_G},${GREEN_B},${op})`,
            transform:'translate(-50%,-50%)',
          }} />
        );
      })}

      {/* Gradiente radial pulsante de fondo */}
      <div style={{
        position:'absolute', inset:0,
        background:`radial-gradient(ellipse at ${50+Math.sin(frame*0.01)*10}% ${50+Math.cos(frame*0.008)*10}%, rgba(${GREEN_R},${GREEN_G},${GREEN_B},${0.04+Math.sin(frame*0.05)*0.02}) 0%, transparent 65%)`,
      }} />

      {/* Escenas */}
      {scenes.map(({ start, Component }, i) => {
        const localFrame = frame - start;
        if (localFrame < -OVERLAP || localFrame > SCENE_DUR + OVERLAP) return null;
        return (
          <Component
            key={i}
            frame={frame}
            localFrame={Math.max(0, localFrame)}
          />
        );
      })}
    </AbsoluteFill>
  );
}

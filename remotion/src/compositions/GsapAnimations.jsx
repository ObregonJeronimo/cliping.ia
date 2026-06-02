/**
 * ═══════════════════════════════════════════════════════════════════════
 * GSAP 3.15 — ANIMACIONES EXCLUSIVAS
 * Physics2D, SplitText, DrawSVG, MorphSVG, MotionPath
 * 
 * Técnica Remotion: gsap.globalTimeline.pause() luego seek(ms) por frame
 * ═══════════════════════════════════════════════════════════════════════
 */
import { useEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { gsap } from '../../node_modules/gsap/index.js';
import { SplitText } from '../../node_modules/gsap/SplitText.js';
import { Physics2DPlugin } from '../../node_modules/gsap/Physics2DPlugin.js';
import { DrawSVGPlugin } from '../../node_modules/gsap/DrawSVGPlugin.js';
import { MotionPathPlugin } from '../../node_modules/gsap/MotionPathPlugin.js';

gsap.registerPlugin(SplitText, Physics2DPlugin, DrawSVGPlugin, MotionPathPlugin);

// Hook GSAP — misma técnica que Anime.js: seek por frame
function useGsap(factory, deps = []) {
  const tlRef = useRef(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  useEffect(() => {
    const ctx = gsap.context(() => {
      tlRef.current = factory();
      tlRef.current?.pause();
    });
    return () => ctx.revert();
  }, deps);

  useEffect(() => {
    if (!tlRef.current) return;
    tlRef.current.seek(frame / fps, false);
  });
}

const h2r = (hex) => {
  const h = (hex||'#6366f1').replace('#','').split(/\s/)[0].slice(0,6);
  try { return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`; }
  catch { return '99,102,241'; }
};
const bg0 = (c='#6366f1') => {
  const h=c.replace('#','');
  try {
    const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
    const m=(v,f)=>Math.min(255,Math.max(0,Math.round(v*f))).toString(16).padStart(2,'0');
    return `linear-gradient(145deg,#${m(r,.06)}${m(g,.07)}${m(b,.06)} 0%,#${m(r,.11)}${m(g,.13)}${m(b,.11)} 55%,#${m(r,.06)}${m(g,.07)}${m(b,.06)} 100%)`;
  } catch { return '#07070f'; }
};

// ─── 1. Physics2D SHATTER — letras que caen con gravedad real y rebotan ──────
// Único en GSAP — imposible replicar con Anime.js
export function GsapPhysicsShatter({ headline, primaryColor, bg }) {
  const ref = useRef(null);
  const chars = (headline||'').split('').filter(c => c !== ' ');

  useGsap(() => {
    if (!ref.current) return gsap.timeline();
    const split = SplitText.create('.gps-text', { type: 'chars' });
    const tl = gsap.timeline();
    // Primero el texto aparece unido
    tl.from(split.chars, {
      opacity: 0, y: -80, stagger: 0.03, duration: 0.4,
      ease: 'power2.out',
    })
    // Luego cada letra cae con física real
    .to(split.chars, {
      physics2D: {
        velocity: () => gsap.utils.random(80, 200),
        angle: () => gsap.utils.random(200, 340),
        gravity: 600,
        friction: 0.1,
      },
      opacity: 0,
      duration: 1.4,
      stagger: { each: 0.04, from: 'random' },
    }, '+=1.2');
    return tl;
  }, [headline]);

  return (
    <AbsoluteFill ref={ref} style={{ background: bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', padding:'0 32px' }}>
      <div className="gps-text" style={{
        fontSize: 62, fontWeight: 900, fontFamily: 'system-ui',
        letterSpacing: '-0.03em', color: '#fff', textAlign: 'center',
        lineHeight: 1.1, textShadow: `0 0 20px rgba(${h2r(primaryColor)},0.4)`,
      }}>{headline}</div>
    </AbsoluteFill>
  );
}

// ─── 2. SplitText MASK REVEAL — cada línea sale de detrás de una máscara ─────
// La técnica premium de GSAP — overflow:hidden por línea automático
export function GsapMaskReveal({ headline, subtext, primaryColor, bg }) {
  const ref = useRef(null);

  useGsap(() => {
    if (!ref.current) return gsap.timeline();
    const split = SplitText.create('.gmr-headline', { type: 'lines', mask: 'lines' });
    const tl = gsap.timeline();
    tl.from(split.lines, {
      yPercent: 100, opacity: 0,
      duration: 0.8, stagger: 0.12, ease: 'power3.out',
    });
    if (document.querySelector('.gmr-sub')) {
      tl.from('.gmr-sub', { opacity: 0, y: 20, duration: 0.6, ease: 'power2.out' }, '-=0.3');
    }
    return tl;
  }, [headline, subtext]);

  return (
    <AbsoluteFill ref={ref} style={{ background: bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap: 20, padding:'0 36px' }}>
      <div className="gmr-headline" style={{
        fontSize: 58, fontWeight: 900, fontFamily: 'system-ui',
        letterSpacing: '-0.04em', color: '#fff', textAlign: 'center', lineHeight: 1.15,
      }}>{headline}</div>
      {subtext && (
        <div className="gmr-sub" style={{
          fontSize: 18, color: 'rgba(255,255,255,0.55)', fontFamily: 'system-ui',
          textAlign: 'center', maxWidth: 300, lineHeight: 1.5,
        }}>{subtext}</div>
      )}
    </AbsoluteFill>
  );
}

// ─── 3. SplitText CHARS STAGGER — caracteres con rotación en 3D ──────────────
export function GsapCharsRotate({ headline, primaryColor, bg }) {
  const ref = useRef(null);

  useGsap(() => {
    if (!ref.current) return gsap.timeline();
    const split = SplitText.create('.gcr-text', { type: 'chars' });
    return gsap.timeline().from(split.chars, {
      opacity: 0, rotationX: -90, y: 40,
      transformOrigin: '0 50% -50px',
      duration: 0.7, stagger: 0.04, ease: 'back.out(1.5)',
    });
  }, [headline]);

  return (
    <AbsoluteFill ref={ref} style={{ background: bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', padding:'0 28px', perspective: 600 }}>
      <div className="gcr-text" style={{
        fontSize: 64, fontWeight: 900, fontFamily: 'system-ui',
        letterSpacing: '-0.02em', color: '#fff', textAlign: 'center', lineHeight: 1.1,
      }}>{headline}</div>
    </AbsoluteFill>
  );
}

// ─── 4. SplitText WORDS SCRAMBLE + SETTLE — palabras scrambleadas que se asientan
export function GsapWordsScramble({ headline, primaryColor, bg }) {
  const ref = useRef(null);

  useGsap(() => {
    if (!ref.current) return gsap.timeline();
    const split = SplitText.create('.gws-text', { type: 'words' });
    const tl = gsap.timeline();
    tl.from(split.words, {
      opacity: 0, scale: 0, rotation: () => gsap.utils.random(-20, 20),
      x: () => gsap.utils.random(-100, 100),
      y: () => gsap.utils.random(-80, 80),
      duration: 0.8, stagger: 0.08, ease: 'expo.out',
    });
    return tl;
  }, [headline]);

  return (
    <AbsoluteFill ref={ref} style={{ background: bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', padding:'0 32px' }}>
      <div className="gws-text" style={{
        fontSize: 56, fontWeight: 800, fontFamily: 'system-ui',
        letterSpacing: '-0.03em', color: '#fff', textAlign: 'center', lineHeight: 1.15,
        textShadow: `0 0 30px rgba(${h2r(primaryColor)},0.3)`,
      }}>{headline}</div>
    </AbsoluteFill>
  );
}

// ─── 5. DrawSVG PATH — path que se dibuja con control preciso de % ────────────
export function GsapDrawSvg({ headline, primaryColor, bg }) {
  const ref = useRef(null);

  useGsap(() => {
    if (!ref.current) return gsap.timeline();
    return gsap.timeline()
      .fromTo('.gdsvg-path', { drawSVG: '0%' }, {
        drawSVG: '100%', duration: 2, ease: 'power1.inOut',
      })
      .from('.gdsvg-text', { opacity: 0, y: 20, duration: 0.6, ease: 'power2.out' }, '-=0.5');
  }, [headline]);

  const path = "M 20,100 C 70,20 120,20 170,65 S 260,130 320,80 S 390,10 420,45 S 440,90 440,110";
  return (
    <AbsoluteFill ref={ref} style={{ background: bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap: 28 }}>
      <div style={{ width:'100%', height: 160 }}>
        <svg viewBox="0 0 460 160" style={{ width:'100%', height:'100%', overflow:'visible' }}>
          <path d={path} fill="none" stroke={`rgba(${h2r(primaryColor)},0.1)`} strokeWidth="12" strokeLinecap="round" />
          <path className="gdsvg-path" d={path} fill="none" stroke={primaryColor} strokeWidth="3"
            strokeLinecap="round" style={{ filter:`drop-shadow(0 0 6px ${primaryColor})` }} />
        </svg>
      </div>
      <div className="gdsvg-text" style={{
        fontSize: 42, fontWeight: 700, fontFamily: 'system-ui',
        letterSpacing: '-0.03em', color: '#fff', textAlign: 'center', padding:'0 40px',
      }}>{headline}</div>
    </AbsoluteFill>
  );
}

// ─── 6. MorphSVG SHAPES — interpolación manual entre shapes ─────────────────
export function GsapMorphShapes({ headline, primaryColor, bg }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config:{ damping:14, stiffness:80, mass:0.7 } });

  const shapes = [
    'M60,10 C88,10 110,32 110,60 C110,88 88,110 60,110 C32,110 10,88 10,60 C10,32 32,10 60,10 Z',
    'M60,4 C45,4 10,20 10,60 C10,100 45,116 60,116 C75,116 110,100 110,60 C110,20 75,4 60,4 Z',
    'M10,10 L110,10 L110,110 L10,110 Z',
    'M60,10 L110,110 L10,110 Z',
    'M60,10 C88,10 110,32 110,60 C110,88 88,110 60,110 C32,110 10,88 10,60 C10,32 32,10 60,10 Z',
  ];

  const CYCLE = 80;
  const idx = Math.floor(frame / CYCLE) % (shapes.length - 1);
  const t = (frame % CYCLE) / CYCLE;
  const eased = -(Math.cos(Math.PI * t) - 1) / 2;

  const extractNums = (s) => s.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const lerp = (a, b, t) => a + (b - a) * t;
  const numsA = extractNums(shapes[idx]);
  const numsB = extractNums(shapes[idx + 1]);
  // Padear el más corto con el último valor
  const maxLen = Math.max(numsA.length, numsB.length);
  while (numsA.length < maxLen) numsA.push(numsA[numsA.length-1]);
  while (numsB.length < maxLen) numsB.push(numsB[numsB.length-1]);
  let ni = 0;
  const morphedPath = shapes[idx].replace(/-?\d+(?:\.\d+)?/g, () => {
    if (ni >= maxLen) return 0;
    const v = lerp(numsA[ni], numsB[ni], eased);
    ni++;
    return Math.round(v * 10) / 10;
  });

  return (
    <AbsoluteFill style={{ background: bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap: 28 }}>
      <div style={{ opacity: Math.min(1, p*1.4), transform:`scale(${0.65+p*0.35})`, filter:`drop-shadow(0 0 24px rgba(${h2r(primaryColor)},0.55))` }}>
        <svg viewBox="0 0 120 120" width="200" height="200">
          <defs>
            <radialGradient id="gms-grad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor={primaryColor} />
              <stop offset="100%" stopColor={`rgba(${h2r(primaryColor)},0.55)`} />
            </radialGradient>
          </defs>
          <path d={morphedPath} fill="url(#gms-grad)" />
        </svg>
      </div>
      {headline && (
        <div style={{ fontSize:40, fontWeight:700, fontFamily:'system-ui', letterSpacing:'-0.03em', color:'#fff', textAlign:'center', padding:'0 40px', opacity:Math.min(1,p*1.6) }}>{headline}</div>
      )}
    </AbsoluteFill>
  );
}

// ─── 7. MotionPath — elemento que viaja a lo largo de un path SVG ────────────
export function GsapMotionPath({ headline, steps, primaryColor, bg }) {
  const ref = useRef(null);
  const safeSteps = (steps||['Paso 1','Paso 2','Paso 3']).slice(0,3).map(s => typeof s==='string'?s:s?.title||s?.text||'');

  useGsap(() => {
    if (!ref.current) return gsap.timeline();
    return gsap.timeline()
      .from('.gmp-path-line', { drawSVG: '0%', duration: 2, ease: 'power1.inOut' }, 0)
      .to('.gmp-dot', {
        motionPath: { path: '#gmp-track', align: '#gmp-track', alignOrigin: [0.5, 0.5] },
        duration: 2, ease: 'power1.inOut',
      }, 0)
      .from('.gmp-step', { opacity: 0, scale: 0, duration: 0.4, stagger: 0.5, ease: 'back.out(2)' }, 0.3);
  }, [JSON.stringify(safeSteps)]);

  return (
    <AbsoluteFill ref={ref} style={{ background: bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:16, padding:'0 24px' }}>
      {headline && <div style={{ fontSize:22, fontWeight:600, color:'rgba(255,255,255,0.45)', fontFamily:'system-ui', marginBottom:8 }}>{headline}</div>}
      <div style={{ width:'100%', position:'relative', height:160 }}>
        <svg viewBox="0 0 360 120" style={{ width:'100%', height:'100%', overflow:'visible' }}>
          <path id="gmp-track" d="M 30,60 C 80,20 130,100 180,60 C 230,20 280,100 330,60"
            fill="none" stroke={`rgba(${h2r(primaryColor)},0.12)`} strokeWidth="3" strokeLinecap="round" />
          <path className="gmp-path-line" d="M 30,60 C 80,20 130,100 180,60 C 230,20 280,100 330,60"
            fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round"
            style={{ filter:`drop-shadow(0 0 4px ${primaryColor})` }} />
          <circle className="gmp-dot" r="8" fill={primaryColor}
            style={{ filter:`drop-shadow(0 0 8px ${primaryColor})` }} cx="30" cy="60" />
        </svg>
        {/* Step labels */}
        {safeSteps.map((step, i) => (
          <div key={i} className="gmp-step" style={{
            position:'absolute', textAlign:'center', width:100,
            left: `${i * 42}%`, top: i % 2 === 0 ? '60%' : '5%',
            transform:'translateX(-50%)',
            fontSize:13, fontWeight:600, color:'#e0e0e0', fontFamily:'system-ui',
          }}>
            <div style={{ width:20, height:20, borderRadius:'50%', background:primaryColor, margin:'0 auto 4px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#000', fontWeight:700 }}>{i+1}</div>
            {step}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

// ─── 8. Physics2D RAIN — palabras/datos que llueven desde arriba ─────────────
export function GsapPhysicsRain({ benefits, primaryColor, bg }) {
  const ref = useRef(null);
  const items = (benefits||[]).slice(0,6).map(b=>typeof b==='string'?b:b?.title||'');

  useGsap(() => {
    if (!ref.current) return gsap.timeline();
    return gsap.timeline()
      .from('.gpr-item', {
        physics2D: {
          velocity: () => gsap.utils.random(100, 250),
          angle: 90,
          gravity: 300,
          friction: 0.15,
        },
        opacity: [0, 1],
        duration: 1.8,
        stagger: { each: 0.15, from: 'random' },
      });
  }, [JSON.stringify(items)]);

  return (
    <AbsoluteFill ref={ref} style={{ background: bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:14, padding:'0 28px' }}>
      {items.map((item, i) => (
        <div key={i} className="gpr-item" style={{
          padding:'12px 20px', borderRadius:12,
          background:`rgba(${h2r(primaryColor)},0.1)`,
          border:`1px solid rgba(${h2r(primaryColor)},0.2)`,
          fontSize:16, color:'#e0e0e0', fontFamily:'system-ui', fontWeight:500,
          width:'100%',
        }}>
          <span style={{ color:primaryColor, marginRight:10 }}>↓</span>{item}
        </div>
      ))}
    </AbsoluteFill>
  );
}

// ─── 9. SplitText LINES WAVE — líneas que ondulan con physics ────────────────
export function GsapLinesWave({ headline, primaryColor, bg }) {
  const ref = useRef(null);

  useGsap(() => {
    if (!ref.current) return gsap.timeline();
    const split = SplitText.create('.glw-text', { type: 'lines,words,chars' });
    return gsap.timeline()
      .from(split.chars, {
        opacity: 0, y: 60, rotation: 10,
        duration: 0.6,
        stagger: { each: 0.02, from: 'start', ease: 'power2.inOut' },
        ease: 'power3.out',
      });
  }, [headline]);

  return (
    <AbsoluteFill ref={ref} style={{ background: bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', padding:'0 32px' }}>
      <div className="glw-text" style={{
        fontSize: 58, fontWeight: 800, fontFamily: 'system-ui',
        letterSpacing: '-0.035em', color: '#fff', textAlign: 'center', lineHeight: 1.2,
      }}>{headline}</div>
    </AbsoluteFill>
  );
}

// ─── 10. GSAP STAGGER ELASTIC — cards con elastic stagger ───────────────────
export function GsapElasticCards({ benefits, headline, primaryColor, bg }) {
  const ref = useRef(null);
  const items = (benefits||[]).slice(0,4).map(b=>typeof b==='string'?b:b?.title||'');

  useGsap(() => {
    if (!ref.current) return gsap.timeline();
    return gsap.timeline()
      .from('.gec-card', {
        scale: 0, opacity: 0, rotation: () => gsap.utils.random(-8, 8),
        duration: 0.8, stagger: 0.12, ease: 'elastic.out(1, 0.6)',
      });
  }, [JSON.stringify(items)]);

  return (
    <AbsoluteFill ref={ref} style={{ background: bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:14, padding:'24px' }}>
      {headline && <div style={{ fontSize:20, fontWeight:600, color:'rgba(255,255,255,0.45)', fontFamily:'system-ui', marginBottom:6 }}>{headline}</div>}
      {items.map((item,i) => (
        <div key={i} className="gec-card" style={{
          width:'100%', borderRadius:16, padding:'18px 22px',
          background:`rgba(${h2r(primaryColor)},${i%2===0?0.1:0.06})`,
          border:`1px solid rgba(${h2r(primaryColor)},${i%2===0?0.25:0.1})`,
          display:'flex', alignItems:'center', gap:14,
        }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:primaryColor, boxShadow:`0 0 6px ${primaryColor}`, flexShrink:0 }} />
          <div style={{ fontSize:16, color:'#e0e0e0', fontFamily:'system-ui', fontWeight:500 }}>{item}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
}

// ─── 11. GSAP FLIP CARDS — cards que hacen flip 3D ──────────────────────────
export function GsapFlipReveal({ benefits, primaryColor, bg }) {
  const ref = useRef(null);
  const items = (benefits||[]).slice(0,4).map(b=>typeof b==='string'?b:b?.title||'');

  useGsap(() => {
    if (!ref.current) return gsap.timeline();
    return gsap.timeline()
      .from('.gfr-card', {
        rotationY: -90, opacity: 0, transformOrigin: 'left center',
        duration: 0.7, stagger: 0.15, ease: 'power3.out',
      });
  }, [JSON.stringify(items)]);

  return (
    <AbsoluteFill ref={ref} style={{ background: bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:12, padding:'24px', perspective:800 }}>
      {items.map((item,i) => (
        <div key={i} className="gfr-card" style={{
          width:'100%', borderRadius:14, padding:'16px 22px',
          background:`rgba(${h2r(primaryColor)},0.08)`,
          border:`1px solid rgba(${h2r(primaryColor)},0.18)`,
          display:'flex', alignItems:'center', gap:14,
        }}>
          <div style={{ width:28, height:28, borderRadius:8, background:`rgba(${h2r(primaryColor)},0.2)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:primaryColor, fontWeight:700, flexShrink:0 }}>{i+1}</div>
          <div style={{ fontSize:16, color:'#e0e0e0', fontFamily:'system-ui', fontWeight:500 }}>{item}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
}

// ─── 12. Physics2D CTA BURST — el CTA explota con partículas físicas ─────────
export function GsapPhysicsBurst({ cta, subtext, primaryColor, bg }) {
  const ref = useRef(null);

  useGsap(() => {
    if (!ref.current) return gsap.timeline();
    return gsap.timeline()
      .from('.gpb-text', { opacity: 0, y: -20, duration: 0.6, ease: 'power2.out' }, 0)
      .from('.gpb-btn', { scale: 0, opacity: 0, duration: 0.5, ease: 'back.out(2)' }, 0.3)
      .from('.gpb-particle', {
        physics2D: {
          velocity: () => gsap.utils.random(60, 160),
          angle: () => gsap.utils.random(0, 360),
          gravity: 200, friction: 0.2,
        },
        opacity: [1, 0],
        duration: 1.2,
        stagger: { each: 0.04, from: 'center' },
      }, 0.5);
  }, [cta, subtext]);

  return (
    <AbsoluteFill ref={ref} style={{ background: bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:28 }}>
      {/* Partículas */}
      {Array.from({length:16}, (_,i) => (
        <div key={i} className="gpb-particle" style={{
          position:'absolute', left:'50%', top:'60%',
          width: 4+(i%3)*3, height: 4+(i%3)*3, borderRadius:'50%',
          background: i%2===0 ? primaryColor : `rgba(${h2r(primaryColor)},0.5)`,
        }} />
      ))}
      <div className="gpb-text" style={{ fontSize:40, fontWeight:700, fontFamily:'system-ui', color:'#fff', textAlign:'center', padding:'0 40px', lineHeight:1.25 }}>{subtext||'¿Listo para empezar?'}</div>
      <div className="gpb-btn" style={{ borderRadius:100, background:`linear-gradient(135deg,${primaryColor},rgba(${h2r(primaryColor)},.75))`, padding:'18px 52px', boxShadow:`0 0 32px rgba(${h2r(primaryColor)},.4)` }}>
        <span style={{ fontSize:21, fontWeight:700, color:'#fff', fontFamily:'system-ui' }}>{cta||'Empezá ahora'}</span>
      </div>
    </AbsoluteFill>
  );
}

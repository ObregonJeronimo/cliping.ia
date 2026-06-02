/**
 * ═══════════════════════════════════════════════════════════════════════
 * ANIME.JS v4 — BIBLIOTECA PARAMÉTRICA COMPLETA
 * Cada animación usa TODOS sus parámetros para ser visualmente única.
 * No hay dos renders iguales si los params cambian.
 * ═══════════════════════════════════════════════════════════════════════
 */
import { useEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import {
  animate, createTimeline, stagger, eases,
  scrambleText, createDrawable, irregular, utils,
} from '../../node_modules/animejs/dist/modules/index.js';

// ─── Hook base ────────────────────────────────────────────────────────────────
function useAnime(factory, deps = []) {
  const ref = useRef(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  useEffect(() => {
    ref.current = factory();
    if (ref.current?.pause) ref.current.pause();
    return () => { ref.current = null; };
  }, deps);
  useEffect(() => {
    if (!ref.current?.seek) return;
    ref.current.seek((frame / fps) * 1000);
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export const h2r = (hex) => {
  const h = (hex||'#6366f1').replace('#','').split(/[\s—]/)[0].slice(0,6);
  try { return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`; }
  catch { return '99,102,241'; }
};
export const bg0 = (c='#6366f1') => {
  const h=(c||'#6366f1').replace('#','').split(/[\s—]/)[0];
  try {
    const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
    const m=(v,f)=>Math.min(255,Math.max(0,Math.round(v*f))).toString(16).padStart(2,'0');
    return `linear-gradient(145deg,#${m(r,.06)}${m(g,.07)}${m(b,.06)} 0%,#${m(r,.11)}${m(g,.13)}${m(b,.11)} 55%,#${m(r,.06)}${m(g,.07)}${m(b,.06)} 100%)`;
  } catch { return '#07070f'; }
};

// Derivar colores secundarios del primary
const deriveColors = (primary) => {
  const h = (primary||'#6366f1').replace('#','').split(/[\s—]/)[0];
  try {
    const r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16);
    const lighten = (v,f) => Math.min(255,Math.round(v*f)).toString(16).padStart(2,'0');
    const accent2 = `#${lighten(r,1.3)}${lighten(g,0.8)}${lighten(b,1.4)}`;
    return { r, g, b, accent2 };
  } catch { return { r:99, g:102, b:241, accent2:'#818cf8' }; }
};

// Parsear easing string a función de anime.js
const parseEase = (easeName) => {
  const map = {
    'outExpo': 'outExpo', 'outBack': 'outBack(1.4)', 'outElastic': 'outElastic(1,0.65)',
    'outBounce': 'outBounce', 'outQuart': 'outQuart', 'inOutSine': 'inOutSine',
    'outCubic': 'outCubic', 'linear': 'linear', 'inExpo': 'inExpo',
  };
  return map[easeName] || easeName || 'outExpo';
};

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 1 — STAGGER TECHNIQUES
// ══════════════════════════════════════════════════════════════════════════════

// 1. Stagger desde el centro — parametrizado
export function AnimeStaggerCenter({
  headline, primaryColor, bg,
  staggerDelay = 90, staggerFrom = 'center', easeName = 'outExpo',
  fontSize = 56, glowIntensity = 0.4, showLine = true,
}) {
  const ref = useRef(null);
  const words = (headline||'').split(' ').filter(Boolean);
  const { r, g, b } = deriveColors(primaryColor);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay: false })
      .add('.asc-w', {
        opacity: [0,1], translateY: [50,0],
        filter: ['blur(10px)','blur(0px)'],
        duration: 700, delay: stagger(staggerDelay, { from: staggerFrom }),
        ease: parseEase(easeName),
      }, 0)
      .add(showLine ? '.asc-line' : [], {
        scaleX:[0,1], opacity:[0,.6], duration:400, ease:'outQuart'
      }, 450);
  }, [headline, staggerDelay, staggerFrom, easeName]);
  return (
    <AbsoluteFill ref={ref} style={{ background: bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:24, padding:'0 36px' }}>
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 50% 50%, rgba(${r},${g},${b},${glowIntensity*0.15}) 0%, transparent 65%)` }} />
      <div style={{ display:'flex', flexWrap:'wrap', gap:'8px 12px', justifyContent:'center' }}>
        {words.map((w,i) => <span key={i} className="asc-w" style={{ display:'inline-block', opacity:0, fontSize, fontWeight:800, fontFamily:'system-ui', letterSpacing:'-0.03em', color:'#fff', lineHeight:1.15 }}>{w}</span>)}
      </div>
      {showLine && <div className="asc-line" style={{ width:60, height:2, opacity:0, transformOrigin:'center', background:`linear-gradient(90deg,transparent,${primaryColor},transparent)`, boxShadow:`0 0 8px rgba(${r},${g},${b},0.5)` }} />}
    </AbsoluteFill>
  );
}

// 2. Stagger 2D grid — parametrizado
export function AnimeStaggerGrid2D({
  benefits, headline, primaryColor, bg,
  cols = 2, staggerDelay = 80, easeName = 'outExpo',
  cardStyle = 'glass', glowIntensity = 0.12,
}) {
  const ref = useRef(null);
  const items = (benefits||[]).slice(0,6).map(b=>typeof b==='string'?b:b?.title||'');
  const rows = Math.ceil(items.length/cols);
  const { r, g, b: bc } = deriveColors(primaryColor);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .add(headline ? '.asg-title' : [], { opacity:[0,1], translateY:[-20,0], duration:400, ease:'outQuart' }, 0)
      .add('.asg-card', {
        opacity:[0,1], scale:[0.7,1], filter:['blur(6px)','blur(0px)'],
        duration:600, delay: stagger(staggerDelay, { grid:[cols,rows], from:'center' }),
        ease: parseEase(easeName),
      }, headline ? 200 : 0);
  }, [JSON.stringify(items), headline, staggerDelay, easeName]);
  const cardBg = cardStyle === 'solid'
    ? `rgba(${r},${g},${bc},0.15)`
    : cardStyle === 'outline'
    ? 'transparent'
    : `rgba(${r},${g},${bc},${glowIntensity})`;
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:16, padding:'20px' }}>
      {headline && <div className="asg-title" style={{ fontSize:22, fontWeight:600, color:'rgba(255,255,255,0.5)', fontFamily:'system-ui', opacity:0, marginBottom:4 }}>{headline}</div>}
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:12, width:'100%' }}>
        {items.map((item,i) => (
          <div key={i} className="asg-card" style={{ opacity:0, background:cardBg, border:`1px solid rgba(${r},${g},${bc},${cardStyle==='outline'?0.4:0.2})`, borderRadius:16, padding:'20px 16px', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:primaryColor, boxShadow:`0 0 ${6+i%3*2}px ${primaryColor}`, flexShrink:0 }} />
            <div style={{ fontSize:15, color:'#e0e0e0', fontFamily:'system-ui', fontWeight:500, lineHeight:1.4 }}>{item}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

// 3. Stagger irregular — parametrizado
export function AnimeStaggerIrregular({
  headline, benefits, primaryColor, bg,
  irregularSegments = 10, irregularRandomness = 0.5,
  fontSize = 17, gap = 10,
}) {
  const ref = useRef(null);
  const items = (benefits||[]).slice(0,6).map(b=>typeof b==='string'?b:b?.title||'');
  const { r, g, b: bc } = deriveColors(primaryColor);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return animate('.asi-item', {
      autoplay:false, opacity:[0,1],
      translateY:[30,0], scale:[0.85,1],
      duration:700,
      delay: stagger(60, { ease: irregular(irregularSegments, irregularRandomness) }),
      ease:'outExpo',
    });
  }, [JSON.stringify(items)]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap, padding:'0 28px' }}>
      {headline && <div style={{ fontSize:22, fontWeight:600, color:'rgba(255,255,255,0.4)', fontFamily:'system-ui', marginBottom:8 }}>{headline}</div>}
      {items.map((item,i) => (
        <div key={i} className="asi-item" style={{ width:'100%', opacity:0, padding:'14px 20px', borderRadius:12, background:`rgba(${r},${g},${bc},0.08)`, border:`1px solid rgba(${r},${g},${bc},0.15)`, fontSize, color:'#e0e0e0', fontFamily:'system-ui' }}>{item}</div>
      ))}
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 2 — TEXT TECHNIQUES
// ══════════════════════════════════════════════════════════════════════════════

// 4. scrambleText — parametrizado
export function AnimeScrambleReveal({
  headline, primaryColor, bg,
  scrambleSpeed = 0.5, scrambleChars = '#@!%&ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  fontSize = 52, fontWeight = 700, monospace = true,
  glowColor = null,
}) {
  const ref = useRef(null);
  const { r, g, b } = deriveColors(primaryColor);
  const glow = glowColor || primaryColor;
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .add('.asr-text', {
        innerHTML: scrambleText({ speed: scrambleSpeed, chars: scrambleChars }),
        duration: 1600, ease:'linear',
      }, 0)
      .add('.asr-sub', { opacity:[0,1], translateY:[12,0], duration:400, ease:'outQuart' }, 1200);
  }, [headline, scrambleSpeed, scrambleChars]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:20, padding:'0 36px' }}>
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 50% 40%, rgba(${r},${g},${b},0.12) 0%, transparent 65%)` }} />
      <p className="asr-text" style={{ fontSize, fontWeight, fontFamily: monospace ? 'monospace' : 'system-ui', letterSpacing: monospace ? '0.04em' : '-0.02em', color:'#fff', textAlign:'center', lineHeight:1.3, margin:0, textShadow:`0 0 20px rgba(${h2r(glow)},0.4)` }}>{headline}</p>
      <div className="asr-sub" style={{ opacity:0, width:50, height:2, background:primaryColor, boxShadow:`0 0 8px ${primaryColor}` }} />
    </AbsoluteFill>
  );
}

// 5. Letter by letter — parametrizado
export function AnimeLetterByLetter({
  headline, primaryColor, bg,
  staggerDelay = 45, rotateAngle = -12, easeName = 'outBack(1.4)',
  fontSize = 64, accentEvery = 6, fontWeight = 900,
}) {
  const ref = useRef(null);
  const chars = (headline||'').split('');
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return animate('.all-c', {
      autoplay:false, opacity:[0,1],
      translateY:['-1.2em',0], rotate:[`${rotateAngle}deg`,'0deg'],
      duration:550, delay:stagger(staggerDelay), ease: parseEase(easeName),
    });
  }, [headline, staggerDelay, rotateAngle, easeName]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', padding:'0 28px' }}>
      <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', overflow:'hidden' }}>
        {chars.map((c,i) => <span key={i} className="all-c" style={{ display:'inline-block', opacity:0, fontSize, fontWeight, fontFamily:'system-ui', letterSpacing:'-0.02em', lineHeight:1.1, color: i % accentEvery === 0 ? primaryColor : '#fff' }}>{c===' '?'\u00A0':c}</span>)}
      </div>
    </AbsoluteFill>
  );
}

// 6. Blur words — parametrizado
export function AnimeBlurWords({
  headline, primaryColor, bg,
  staggerDelay = 70, blurAmount = 12, fontSize = 58,
  direction = 'up', fontWeight = 700,
}) {
  const ref = useRef(null);
  const words = (headline||'').split(' ').filter(Boolean);
  const translateFrom = direction === 'up' ? [20,0] : direction === 'down' ? [-20,0] : direction === 'left' ? [0,0] : [0,0];
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return animate('.abw-w', {
      autoplay:false, opacity:[0,1], translateY: translateFrom,
      filter:[`blur(${blurAmount}px)`,'blur(0px)'],
      duration:650, delay:stagger(staggerDelay), ease:'outCubic',
    });
  }, [headline, staggerDelay, blurAmount, direction]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:20, padding:'0 36px' }}>
      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 10px', justifyContent:'center' }}>
        {words.map((w,i) => <span key={i} className="abw-w" style={{ display:'inline-block', opacity:0, fontSize, fontWeight, fontFamily:'system-ui', letterSpacing:'-0.035em', color:'#fff', lineHeight:1.15 }}>{w}</span>)}
      </div>
    </AbsoluteFill>
  );
}

// 7. Kinetic timeline — parametrizado
export function AnimeKineticTimeline({
  headline, subtext, cta, primaryColor, bg,
  headlineSize = 58, headlineEase = 'outBack(1.6)',
  subOpacity = 0.65, badgeStyle = 'pill', showBadge = true,
}) {
  const ref = useRef(null);
  const { r, g, b } = deriveColors(primaryColor);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .add('.akt-h', { translateY:[70,0], opacity:[0,1], duration:750, ease: parseEase(headlineEase) }, 0)
      .add('.akt-s', { opacity:[0,subOpacity], filter:['blur(8px)','blur(0px)'], translateY:[24,0], duration:550, ease:'outQuart' }, '-=400')
      .add(showBadge ? '.akt-b' : [], { scale:[0,1], opacity:[0,1], duration:450, ease:'outElastic(1,.65)' }, '-=200');
  }, [headline, subtext, cta, headlineSize, headlineEase]);
  const badgeRadius = badgeStyle === 'pill' ? 100 : badgeStyle === 'square' ? 8 : 16;
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:18, padding:'0 36px' }}>
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 50% 50%, rgba(${r},${g},${b},0.1) 0%, transparent 60%)` }} />
      <div className="akt-h" style={{ fontSize:headlineSize, fontWeight:900, fontFamily:'system-ui', letterSpacing:'-0.04em', color:'#fff', textAlign:'center', lineHeight:1.1, opacity:0 }}>{headline}</div>
      {subtext && <div className="akt-s" style={{ fontSize:18, color:'rgba(255,255,255,0.6)', fontFamily:'system-ui', textAlign:'center', maxWidth:300, lineHeight:1.5, opacity:0 }}>{subtext}</div>}
      {showBadge && cta && <div className="akt-b" style={{ padding:'10px 26px', borderRadius:badgeRadius, opacity:0, background:`rgba(${r},${g},${b},0.15)`, border:`1px solid rgba(${r},${g},${b},0.4)` }}><span style={{ fontSize:14, fontWeight:600, color:primaryColor, fontFamily:'system-ui' }}>{cta}</span></div>}
    </AbsoluteFill>
  );
}

// 8. TrueFocus — parametrizado
export function AnimeTrueFocus({
  headline, primaryColor, bg,
  wordDuration = 50, blurOut = 5, scaleActive = 1.06,
  activeColor = null,
}) {
  const frame = useCurrentFrame();
  const words = (headline||'').split(' ').filter(Boolean);
  const activeIdx = Math.floor(frame / wordDuration) % words.length;
  const p = spring({ frame, fps: 30, config:{ damping:14, stiffness:90, mass:0.5 } });
  const color = activeColor || primaryColor;
  return (
    <AbsoluteFill style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', padding:'0 32px' }}>
      <div style={{ display:'flex', flexWrap:'wrap', gap:'4px 12px', justifyContent:'center', opacity:Math.min(1,p*1.4) }}>
        {words.map((w,i) => {
          const isFocus = i===activeIdx;
          const dist = Math.abs(i-activeIdx);
          return <span key={i} style={{ display:'inline-block', fontSize:52, fontWeight:800, fontFamily:'system-ui', letterSpacing:'-0.035em', lineHeight:1.1, color: isFocus ? color : '#fff', filter:`blur(${isFocus?0:Math.min(dist*1.5+2, blurOut)}px)`, opacity: isFocus?1:Math.max(0.15,0.5-dist*0.15), transform:`scale(${isFocus?scaleActive:1})`, textShadow: isFocus?`0 0 20px rgba(${h2r(color)},0.5)`:'none' }}>{w}</span>;
        })}
      </div>
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 3 — SVG TECHNIQUES
// ══════════════════════════════════════════════════════════════════════════════

// 9. SVG Draw — parametrizado
export function AnimeSvgDraw({
  headline, primaryColor, bg,
  pathStyle = 'wave', strokeWidth = 3, glowStrength = 6,
  drawDuration = 1500, showDot = true,
}) {
  const ref = useRef(null);
  const pathRef = useRef(null);
  const paths = {
    wave: "M 20,100 C 60,20 100,20 140,60 S 220,120 270,80 S 340,10 380,40 S 410,90 410,110",
    straight: "M 20,100 L 420,100",
    curve: "M 20,150 C 100,20 320,20 420,100",
    zigzag: "M 20,100 L 120,20 L 220,100 L 320,20 L 420,100",
    spiral: "M 220,100 C 250,50 300,50 300,100 S 250,150 220,150 S 140,100 150,60 S 220,20 270,30",
  };
  const path = paths[pathStyle] || paths.wave;
  useAnime(() => {
    if (!pathRef.current) return { seek:()=>{} };
    const drawable = createDrawable(pathRef.current);
    return createTimeline({ autoplay:false })
      .add(drawable, { draw:'0% 100%', duration:drawDuration, ease:'inOutSine' }, 0)
      .add('.asd-text', { opacity:[0,1], translateY:[16,0], duration:500, ease:'outQuart' }, drawDuration * 0.65);
  }, [headline, pathStyle, drawDuration]);
  const { r, g, b } = deriveColors(primaryColor);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:28 }}>
      <div style={{ width:'100%', height:160 }}>
        <svg viewBox="0 0 430 160" style={{ width:'100%', height:'100%', overflow:'visible' }}>
          <path d={path} fill="none" stroke={`rgba(${r},${g},${b},0.12)`} strokeWidth={strokeWidth*4} strokeLinecap="round" />
          <path ref={pathRef} d={path} fill="none" stroke={primaryColor} strokeWidth={strokeWidth} strokeLinecap="round" style={{ filter:`drop-shadow(0 0 ${glowStrength}px ${primaryColor})` }} />
          {showDot && (
            <circle r={strokeWidth*2} fill={primaryColor} style={{ filter:`drop-shadow(0 0 ${glowStrength*1.5}px ${primaryColor})` }}>
              <animateMotion dur={`${drawDuration/1000}s`} begin="0s" fill="freeze" path={path} />
            </circle>
          )}
        </svg>
      </div>
      <div className="asd-text" style={{ opacity:0, fontSize:42, fontWeight:700, fontFamily:'system-ui', letterSpacing:'-0.03em', color:'#fff', textAlign:'center', padding:'0 40px' }}>{headline}</div>
    </AbsoluteFill>
  );
}

// 10. Morph Blob — interpolación manual paramétrica
export function AnimeMorphBlob({
  headline, primaryColor, bg,
  blobSize = 210, morphSpeed = 90, blobOpacity = 0.85,
  glowStrength = 24, gradientStyle = 'radial',
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config:{ damping:14, stiffness:80, mass:0.7 } });
  const shapes = [
    'M60,8 C88,8 112,32 112,60 C112,88 88,112 60,112 C32,112 8,88 8,60 C8,32 32,8 60,8 Z',
    'M60,4 C90,2 118,26 116,60 C114,92 88,116 60,116 C28,116 2,90 4,60 C6,28 30,6 60,4 Z',
    'M60,8 C85,3 118,30 115,62 C112,94 88,118 58,112 C26,116 2,90 5,60 C8,30 35,13 60,8 Z',
    'M62,6 C92,4 116,32 114,62 C112,92 86,116 58,114 C28,112 4,86 6,60 C8,34 32,8 62,6 Z',
  ];
  const idx = Math.floor(frame / morphSpeed) % shapes.length;
  const nextIdx = (idx + 1) % shapes.length;
  const t = (frame % morphSpeed) / morphSpeed;
  const eased = -(Math.cos(Math.PI * t) - 1) / 2;
  const ext = (s) => s.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const nA = ext(shapes[idx]), nB = ext(shapes[nextIdx]);
  let ni = 0;
  const morphed = shapes[idx].replace(/-?\d+(?:\.\d+)?/g, () => {
    const v = nA[ni] + (nB[ni] - nA[ni]) * eased; ni++;
    return Math.round(v*10)/10;
  });
  const { r, g, b } = deriveColors(primaryColor);
  const fillStyle = gradientStyle === 'solid'
    ? primaryColor
    : `url(#bmg-${gradientStyle})`;
  return (
    <AbsoluteFill style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:28 }}>
      <div style={{ opacity:Math.min(1,p*1.4)*blobOpacity, transform:`scale(${0.65+p*0.35})`, filter:`drop-shadow(0 0 ${glowStrength}px rgba(${r},${g},${b},0.55))` }}>
        <svg viewBox="0 0 120 120" width={blobSize} height={blobSize}>
          <defs>
            <radialGradient id="bmg-radial" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor={primaryColor} />
              <stop offset="100%" stopColor={`rgba(${r},${g},${b},0.55)`} />
            </radialGradient>
            <linearGradient id="bmg-linear" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={primaryColor} />
              <stop offset="100%" stopColor={`rgba(${r},${g},${b},0.4)`} />
            </linearGradient>
          </defs>
          <path d={morphed} fill={gradientStyle === 'solid' ? primaryColor : `url(#bmg-${gradientStyle})`} />
        </svg>
      </div>
      {headline && <div style={{ fontSize:40, fontWeight:700, fontFamily:'system-ui', letterSpacing:'-0.03em', color:'#fff', textAlign:'center', padding:'0 40px', opacity:Math.min(1,p*1.6), transform:`translateY(${(1-Math.min(1,p*1.3))*20}px)` }}>{headline}</div>}
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 4 — KEYFRAMES / TIMELINE
// ══════════════════════════════════════════════════════════════════════════════

// 11. Keyframe bounce — parametrizado
export function AnimeKeyframeBounce({
  headline, primaryColor, bg,
  staggerDelay = 80, overshootScale = 1.1, fontSize = 56,
  accentEvery = 3,
}) {
  const ref = useRef(null);
  const words = (headline||'').split(' ').filter(Boolean);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false, defaults:{ ease:'outBounce' } })
      .add('.akb-w', {
        keyframes: [
          { translateY:-80, opacity:0, scale:0.5, duration:0 },
          { translateY:10, opacity:1, scale:overshootScale, duration:500, ease:'outExpo' },
          { translateY:0, scale:1, duration:200, ease:'outBounce' },
        ],
        delay: stagger(staggerDelay),
      }, 0);
  }, [headline, staggerDelay, overshootScale]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', padding:'0 32px' }}>
      <div style={{ display:'flex', flexWrap:'wrap', gap:'8px 12px', justifyContent:'center' }}>
        {words.map((w,i) => <span key={i} className="akb-w" style={{ display:'inline-block', fontSize, fontWeight:800, fontFamily:'system-ui', letterSpacing:'-0.03em', color:i%accentEvery===0?primaryColor:'#fff', lineHeight:1.15 }}>{w}</span>)}
      </div>
    </AbsoluteFill>
  );
}

// 12. Cinematic Timeline — parametrizado
export function AnimeCinematicTimeline({
  headline, subtext, numbers, primaryColor, bg,
  lineColor = null, headlineSize = 52, numSize = 60,
  showLine = true, numStyle = 'large',
}) {
  const ref = useRef(null);
  const nums = (numbers||[]).slice(0,2);
  const { r, g, b } = deriveColors(primaryColor);
  const lc = lineColor || primaryColor;
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .label('start', 0)
      .add(showLine ? '.act-line' : [], { scaleX:[0,1], opacity:[0,.4], duration:600, ease:'inOutQuart' }, 'start')
      .label('headline', 400)
      .add('.act-h', { translateY:[40,0], opacity:[0,1], duration:700, ease:'outBack(1.3)' }, 'headline')
      .label('sub', 800)
      .add(subtext ? '.act-s' : [], { opacity:[0,.6], filter:['blur(6px)','blur(0px)'], duration:500, ease:'outQuart' }, 'sub')
      .label('nums', 1100)
      .add(nums.length ? '.act-n' : [], { translateY:[20,0], opacity:[0,1], scale:[0.8,1], duration:500, delay:stagger(120), ease:'outExpo' }, 'nums');
  }, [headline, subtext, JSON.stringify(nums), showLine]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:16, padding:'0 36px' }}>
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 50% 40%, rgba(${r},${g},${b},0.08) 0%, transparent 60%)` }} />
      {showLine && <div className="act-line" style={{ width:'70%', height:1, background:`linear-gradient(90deg,transparent,rgba(${h2r(lc)},.5),transparent)`, opacity:0, transformOrigin:'center' }} />}
      <div className="act-h" style={{ fontSize:headlineSize, fontWeight:900, fontFamily:'system-ui', letterSpacing:'-0.04em', color:'#fff', textAlign:'center', lineHeight:1.1, opacity:0 }}>{headline}</div>
      {subtext && <div className="act-s" style={{ fontSize:16, color:'rgba(255,255,255,0.5)', fontFamily:'system-ui', textAlign:'center', opacity:0 }}>{subtext}</div>}
      {nums.length > 0 && (
        <div style={{ display:'flex', gap:24, marginTop:8 }}>
          {nums.map((n,i) => {
            const v = typeof n==='string'?n:n?.value||n?.number||String(n);
            const l = typeof n==='string'?'':n?.label||'';
            return (
              <div key={i} className="act-n" style={{ textAlign:'center', opacity:0 }}>
                <div style={{ fontSize:numSize, fontWeight:900, fontFamily:'system-ui', letterSpacing:'-0.05em', color:primaryColor, lineHeight:1, textShadow:`0 0 20px rgba(${h2r(primaryColor)},0.5)` }}>{v}</div>
                {l && <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontFamily:'system-ui', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:4 }}>{l}</div>}
              </div>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 5 — ALTERNATE / LOOP
// ══════════════════════════════════════════════════════════════════════════════

// 13. Alternate comparison — parametrizado
export function AnimeAlternateComparison({
  benefits, primaryColor, bg,
  cycleDuration = 1000, labels = ['Antes', 'Después'],
  activeScale = 1.04, inactiveOpacity = 0.25,
}) {
  const ref = useRef(null);
  const items = (benefits||['Antes','Después']).slice(0,2).map(b=>typeof b==='string'?b:b?.title||'');
  const { r, g, b: bc } = deriveColors(primaryColor);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return animate('.aac-card', {
      autoplay:false, alternate:true, loop:true,
      opacity:[inactiveOpacity,1], scale:[1-activeScale*0.04, activeScale],
      duration:cycleDuration, delay:stagger(cycleDuration), ease:'inOutSine',
    });
  }, [JSON.stringify(items), cycleDuration, activeScale]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'row', gap:16, padding:'0 24px' }}>
      {items.map((item,i) => (
        <div key={i} className="aac-card" style={{ flex:1, background:`rgba(${r},${g},${bc},${i===0?0.04:0.14})`, border:`1px solid rgba(${r},${g},${bc},${i===0?0.08:0.35})`, borderRadius:16, padding:'24px 20px', textAlign:'center' }}>
          <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.1em', color:`rgba(${r},${g},${bc},0.7)`, fontFamily:'system-ui', marginBottom:10 }}>{labels[i] || (i===0?'Antes':'Después')}</div>
          <div style={{ fontSize:18, fontWeight:600, color:'#e0e0e0', fontFamily:'system-ui', lineHeight:1.4 }}>{item}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
}

// 14. Rotating words — parametrizado
export function AnimeRotatingWords({
  headline, options, primaryColor, bg,
  wordDuration = 60, staticFontSize = 30, activeFontSize = 66,
  staticOpacity = 0.45,
}) {
  const frame = useCurrentFrame();
  const words = options || (headline||'').split('/').map(s=>s.trim()).filter(Boolean) || ['solución'];
  const staticPart = headline?.split('/')[0]?.trim() || '';
  const idx = Math.floor(frame/wordDuration) % words.length;
  const cycleP = (frame%wordDuration)/wordDuration;
  const inP = spring({ frame: frame%wordDuration, fps:30, config:{damping:14,stiffness:100,mass:0.5} });
  const fadeP = cycleP > 0.82 ? Math.max(0,(1-cycleP)/0.18) : 1;
  const entryP = spring({ frame, fps:30, config:{damping:12,stiffness:80,mass:0.6} });
  const { r, g, b } = deriveColors(primaryColor);
  return (
    <AbsoluteFill style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:8, padding:'0 36px' }}>
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 50% 50%, rgba(${r},${g},${b},0.1) 0%, transparent 60%)` }} />
      <div style={{ opacity:entryP, textAlign:'center' }}>
        {staticPart && <div style={{ fontSize:staticFontSize, fontWeight:500, color:`rgba(255,255,255,${staticOpacity})`, fontFamily:'system-ui', marginBottom:4 }}>{staticPart}</div>}
        <div style={{ overflow:'hidden', height:activeFontSize * 1.15 }}>
          <div style={{ transform:`translateY(${(1-inP)*activeFontSize}px)`, opacity:fadeP }}>
            <div style={{ fontSize:activeFontSize, fontWeight:900, fontFamily:'system-ui', letterSpacing:'-0.04em', color:primaryColor, lineHeight:1, textShadow:`0 0 24px rgba(${r},${g},${b},0.4)` }}>{words[idx]}</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 6 — CTA
// ══════════════════════════════════════════════════════════════════════════════

// 15. Shiny button — parametrizado
export function AnimeShinyButton({
  cta, subtext, primaryColor, bg,
  shineSpeed = 900, shineDelay = 1400, shineWidth = '45%',
  buttonPadding = '18px 52px', fontSize = 21, textColor = '#fff',
  glowIntensity = 0.4, subtextOpacity = 0.5,
}) {
  const ref = useRef(null);
  const { r, g, b } = deriveColors(primaryColor);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .add('.asb-text', { opacity:[0,1], translateY:[-20,0], duration:600, ease:'outQuart' }, 0)
      .add('.asb-btn', { scale:[0.8,1], opacity:[0,1], duration:500, ease:'outBack(1.3)' }, '-=300')
      .add('.asb-shine', { translateX:['-120%','220%'], duration:shineSpeed, ease:'inOutQuad', loop:true, loopDelay:shineDelay }, 800);
  }, [cta, subtext, shineSpeed, shineDelay]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:28 }}>
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 50% 60%, rgba(${r},${g},${b},0.1) 0%, transparent 65%)` }} />
      <div className="asb-text" style={{ fontSize:40, fontWeight:700, fontFamily:'system-ui', color:'#fff', textAlign:'center', padding:'0 40px', opacity:0, lineHeight:1.25 }}>{subtext||'¿Listo para empezar?'}</div>
      <div className="asb-btn" style={{ position:'relative', overflow:'hidden', borderRadius:100, opacity:0, background:`linear-gradient(135deg,${primaryColor},rgba(${r},${g},${b},.75))`, padding:buttonPadding, boxShadow:`0 0 32px rgba(${r},${g},${b},${glowIntensity}), inset 0 1px 0 rgba(255,255,255,.15)` }}>
        <span style={{ fontSize, fontWeight:700, color:textColor, fontFamily:'system-ui', letterSpacing:'-0.01em', position:'relative', zIndex:1 }}>{cta||'Empezá ahora'}</span>
        <div className="asb-shine" style={{ position:'absolute', top:0, bottom:0, left:0, width:shineWidth, transform:'skewX(-20deg)', background:'linear-gradient(90deg,transparent,rgba(255,255,255,.32),transparent)' }} />
      </div>
      {subtext && <div style={{ fontSize:13, color:`rgba(255,255,255,${subtextOpacity})`, fontFamily:'system-ui', opacity:0 }}>{subtext}</div>}
    </AbsoluteFill>
  );
}

// 16. Magnetic CTA — parametrizado
export function AnimeMagneticCTA({
  cta, subtext, primaryColor, bg,
  ringCount = 3, ringBaseSize = 18, pulseSpeed = 0.07,
  buttonSize = '18px 48px', glowMax = 24,
}) {
  const ref = useRef(null);
  const frame = useCurrentFrame();
  const { r, g, b } = deriveColors(primaryColor);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .add('.amc-text', { opacity:[0,1], translateY:[-18,0], duration:600, ease:'outQuart' }, 0)
      .add('.amc-ring', { scale:[0,1], opacity:[0,1], duration:600, delay:stagger(80,{from:'center'}), ease:'outElastic(1,.7)' }, 300)
      .add('.amc-btn', { scale:[0.7,1], opacity:[0,1], duration:500, ease:'outBack(1.4)' }, 500);
  }, [cta, subtext, ringCount]);
  const pulse = 1 + Math.sin(frame * pulseSpeed) * 0.04;
  const glow = glowMax + Math.sin(frame * pulseSpeed) * (glowMax * 0.4);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:28 }}>
      <div className="amc-text" style={{ fontSize:40, fontWeight:700, fontFamily:'system-ui', color:'#fff', textAlign:'center', padding:'0 40px', opacity:0, lineHeight:1.25 }}>{subtext||'¿Listo para empezar?'}</div>
      <div style={{ position:'relative', display:'flex', justifyContent:'center', alignItems:'center' }}>
        {Array.from({length:ringCount},(_,r2) => (
          <div key={r2} className="amc-ring" style={{ position:'absolute', inset:-(r2*ringBaseSize + Math.sin(frame*pulseSpeed)*r2*3), borderRadius:100, border:`1px solid rgba(${r},${g},${b},${0.3-r2*0.08})`, opacity:0, transform:`scale(${pulse})` }} />
        ))}
        <div className="amc-btn" style={{ position:'relative', borderRadius:100, opacity:0, background:`linear-gradient(135deg,${primaryColor},rgba(${r},${g},${b},.8))`, padding:buttonSize, boxShadow:`0 0 ${glow}px rgba(${r},${g},${b},.45)` }}>
          <span style={{ fontSize:20, fontWeight:700, color:'#fff', fontFamily:'system-ui', whiteSpace:'nowrap' }}>{cta||'Empezá ahora'}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// 17. Countdown contextual — parametrizado
export function AnimeContextualCountdown({
  deliveryTime, cta, primaryColor, bg,
  barColor = null, numberSize = 100, unitSize = 28,
  showBar = true, barWidth = '65%',
}) {
  const ref = useRef(null);
  const label = deliveryTime||'24h';
  const numMatch = label.match(/\d+/);
  const timeNum = numMatch ? numMatch[0] : '24';
  const unit = label.replace(/\d+/,'').trim()||'hs';
  const { r, g, b } = deriveColors(primaryColor);
  const bc = barColor || primaryColor;
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .add('.acd-num', { scale:[0.6,1], opacity:[0,1], duration:700, ease:'outBack(1.5)' }, 0)
      .add(showBar ? '.acd-bar' : [], { scaleX:[0,1], opacity:[0,1], duration:600, ease:'inOutQuart' }, 400)
      .add('.acd-cta', { opacity:[0,1], translateY:[16,0], duration:500, ease:'outQuart' }, 700);
  }, [deliveryTime, cta, showBar]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:20 }}>
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(circle at 50% 50%, rgba(${r},${g},${b},0.1) 0%, transparent 70%)` }} />
      <div className="acd-num" style={{ textAlign:'center', opacity:0 }}>
        <div style={{ fontSize:numberSize, fontWeight:900, fontFamily:'system-ui', letterSpacing:'-0.06em', color:primaryColor, lineHeight:1, textShadow:`0 0 40px rgba(${h2r(primaryColor)},0.5)` }}>{timeNum}</div>
        <div style={{ fontSize:unitSize, fontWeight:600, color:'rgba(255,255,255,0.7)', fontFamily:'system-ui', letterSpacing:'0.1em', textTransform:'uppercase', marginTop:-8 }}>{unit}</div>
      </div>
      {showBar && <div className="acd-bar" style={{ width:barWidth, height:3, background:'rgba(255,255,255,0.08)', borderRadius:2, opacity:0, overflow:'hidden', transformOrigin:'left' }}>
        <div style={{ height:'100%', width:'100%', background:`linear-gradient(90deg,${bc},rgba(${h2r(bc)},0.4))`, borderRadius:2 }} />
      </div>}
      <div className="acd-cta" style={{ fontSize:26, fontWeight:600, fontFamily:'system-ui', color:'#fff', textAlign:'center', opacity:0 }}>{cta||'Pedí ahora'}</div>
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 7 — DATA / PRODUCT
// ══════════════════════════════════════════════════════════════════════════════

// 18. Counter cascade — parametrizado
export function AnimeCounterCascade({
  stats, primaryColor, bg,
  staggerDelay = 150, numSize = 72, easeName = 'outBack(1.2)',
  cardStyle = 'glass', showLabels = true,
}) {
  const ref = useRef(null);
  const safeStats = (stats||[]).slice(0,3).map(s => typeof s==='string'?{value:s,label:''}:{value:String(s?.value??s?.number??''),label:s?.label??''});
  const { r, g, b } = deriveColors(primaryColor);
  const cardBg = cardStyle === 'solid' ? `rgba(${r},${g},${b},0.15)` : `rgba(${r},${g},${b},0.08)`;
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .add('.acc-card', { opacity:[0,1], translateY:[40,0], scale:[0.8,1], duration:600, delay:stagger(staggerDelay), ease: parseEase(easeName) }, 0);
  }, [JSON.stringify(safeStats), staggerDelay, easeName]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:8, padding:'0 24px' }}>
      <div style={{ display:'flex', gap:20, flexWrap:'wrap', justifyContent:'center' }}>
        {safeStats.map((s,i) => (
          <div key={i} className="acc-card" style={{ opacity:0, textAlign:'center', padding:'20px 24px', background:cardBg, border:`1px solid rgba(${r},${g},${b},0.18)`, borderRadius:18, minWidth:100 }}>
            <div style={{ fontSize:numSize, fontWeight:900, fontFamily:'system-ui', letterSpacing:'-0.05em', color:primaryColor, lineHeight:1, textShadow:`0 0 24px rgba(${h2r(primaryColor)},0.5)` }}>{s.value}</div>
            {showLabels && s.label && <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', fontFamily:'system-ui', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:6 }}>{s.label}</div>}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

// 19. Glass cards — parametrizado
export function AnimeGlassCards({
  benefits, headline, primaryColor, bg,
  glowIntensity = 0.14, dotSize = 8, dotGlow = 8,
  cardPadding = '20px 22px', staggerDelay = 100,
  spotlightSpeed = 0.035,
}) {
  const ref = useRef(null);
  const items = (benefits||[]).slice(0,4).map(b=>typeof b==='string'?b:b?.title||'');
  const frame = useCurrentFrame();
  const spotX = 50 + Math.sin(frame*spotlightSpeed)*28;
  const spotY = 50 + Math.cos(frame*(spotlightSpeed*0.8))*18;
  const { r, g, b: bc } = deriveColors(primaryColor);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .add(headline ? '.agc-title' : [], { opacity:[0,1], translateY:[-16,0], duration:450, ease:'outQuart' }, 0)
      .add('.agc-card', { opacity:[0,1], translateY:[30,0], scale:[0.92,1], duration:550, delay:stagger(staggerDelay), ease:'outExpo' }, 200);
  }, [JSON.stringify(items), headline, staggerDelay]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', padding:24, justifyContent:'center', alignItems:'center', flexDirection:'column', gap:14 }}>
      {headline && <div className="agc-title" style={{ fontSize:22, fontWeight:600, color:'rgba(255,255,255,0.5)', fontFamily:'system-ui', opacity:0, textAlign:'center' }}>{headline}</div>}
      {items.map((item,i) => (
        <div key={i} className="agc-card" style={{ width:'100%', borderRadius:18, padding:cardPadding, opacity:0, background:`radial-gradient(circle at ${spotX}% ${spotY}%, rgba(${r},${g},${bc},${glowIntensity}) 0%, rgba(255,255,255,0.04) 70%)`, border:'1px solid rgba(255,255,255,0.09)', boxShadow:'0 8px 32px rgba(0,0,0,0.3)', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:dotSize, height:dotSize, borderRadius:'50%', background:primaryColor, boxShadow:`0 0 ${dotGlow}px ${primaryColor}`, flexShrink:0 }} />
          <div style={{ fontSize:17, color:'#e0e0e0', fontFamily:'system-ui', fontWeight:500 }}>{item}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
}

// 20. Ticker tape — parametrizado
export function AnimeTickerTape({
  benefits, primaryColor, bg,
  speed = 1.4, dotSize = 6, fontSize = 22,
  fadeEdgeWidth = 64, gap = 22,
}) {
  const items = [...(benefits||[]),...(benefits||[])].map(b=>typeof b==='string'?b:b?.title||'');
  const frame = useCurrentFrame();
  const p = spring({ frame, fps:30, config:{damping:14,stiffness:80,mass:0.6} });
  const offset = (frame * speed) % (items.length * (200+gap) / 2);
  const { r, g, b } = deriveColors(primaryColor);
  return (
    <AbsoluteFill style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:28 }}>
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(circle at 50% 50%, rgba(${r},${g},${b},0.06) 0%, transparent 70%)` }} />
      <div style={{ width:'100%', overflow:'hidden', position:'relative', opacity:Math.min(1,p*1.4) }}>
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:fadeEdgeWidth, background:`linear-gradient(90deg,${bg||'#07070f'},transparent)`, zIndex:2 }} />
        <div style={{ position:'absolute', right:0, top:0, bottom:0, width:fadeEdgeWidth, background:`linear-gradient(270deg,${bg||'#07070f'},transparent)`, zIndex:2 }} />
        <div style={{ display:'flex', gap:0, transform:`translateX(-${offset}px)`, whiteSpace:'nowrap' }}>
          {items.map((item,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:0, flexShrink:0 }}>
              <div style={{ fontSize, fontWeight:600, color:'#fff', fontFamily:'system-ui', padding:`12px ${gap}px`, opacity:0.85 }}>{item}</div>
              <div style={{ width:dotSize, height:dotSize, borderRadius:'50%', background:primaryColor, margin:`0 ${dotSize}px`, boxShadow:`0 0 ${dotSize+2}px ${primaryColor}` }} />
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 8 — OUTRO
// ══════════════════════════════════════════════════════════════════════════════

// 21. Spectrum outro — parametrizado
export function AnimeSpectrumOutro({
  siteName, primaryColor, bg,
  barCount = 28, barGap = 4, barWidth = 7,
  waveSpeed = 0.08, waveAmplitude = 18,
  logoSize = 52, showDivider = true,
}) {
  const ref = useRef(null);
  const frame = useCurrentFrame();
  const { r, g, b } = deriveColors(primaryColor);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .add('.aso-bar', { scaleY:[0,1], opacity:[0,1], duration:600, delay:stagger(20,{from:'center'}), ease:'outElastic(1,.5)' }, 0)
      .add('.aso-logo', { opacity:[0,1], translateY:[20,0], scale:[0.85,1], duration:500, ease:'outExpo' }, 400);
  }, [siteName]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', gap:barGap, alignItems:'flex-end', height:80 }}>
        {Array.from({length:barCount},(_,i) => {
          const h = Math.max(4, 18+Math.sin(i*.55)*16 + Math.sin(frame*waveSpeed+i*.38)*waveAmplitude);
          return <div key={i} className="aso-bar" style={{ width:barWidth, height:h, background:`rgba(${r},${g},${b},${0.35+(i/barCount)*.55})`, borderRadius:'3px 3px 0 0', transformOrigin:'bottom', opacity:0 }} />;
        })}
      </div>
      <div className="aso-logo" style={{ opacity:0, textAlign:'center' }}>
        <div style={{ fontSize:logoSize, fontWeight:700, color:'#fff', fontFamily:'system-ui', letterSpacing:'-0.03em' }}>{siteName}</div>
        {showDivider && <div style={{ height:2, marginTop:10, background:`linear-gradient(90deg,transparent,${primaryColor},transparent)`, opacity:.6 }} />}
      </div>
    </AbsoluteFill>
  );
}

// 22. Typeface fade — parametrizado
export function AnimeTypefaceFade({
  siteName, primaryColor, bg,
  fontSize = 68, fontWeight = 800, letterSpacing = '-0.04em',
  revealDuration = 900, holdFrames = 150,
  showSubline = true, sublineText = 'Powered by IA',
}) {
  const ref = useRef(null);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .add('.atf-logo', { opacity:[0,1], filter:[`blur(20px)`,'blur(0px)'], scale:[0.9,1], duration:revealDuration, ease:'outExpo' }, 0)
      .add('.atf-line', { scaleX:[0,1], opacity:[0,.6], duration:500, ease:'outQuart' }, 500)
      .add(showSubline ? '.atf-sub' : [], { opacity:[0,.5], translateY:[8,0], duration:400, ease:'outQuart' }, 700);
  }, [siteName, revealDuration, showSubline]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:12 }}>
      <div className="atf-logo" style={{ opacity:0, textAlign:'center', padding:'0 24px' }}>
        <div style={{ fontSize, fontWeight, fontFamily:'system-ui', letterSpacing, color:'#fff', lineHeight:1, textTransform:'uppercase' }}>{siteName}</div>
      </div>
      <div className="atf-line" style={{ width:'55%', height:2, background:`linear-gradient(90deg,transparent,${primaryColor},transparent)`, opacity:0, transformOrigin:'center' }} />
      {showSubline && <div className="atf-sub" style={{ fontSize:12, color:`rgba(${h2r(primaryColor)},0.7)`, fontFamily:'system-ui', letterSpacing:'0.12em', textTransform:'uppercase', opacity:0 }}>{sublineText}</div>}
    </AbsoluteFill>
  );
}

// 23. Particle form — parametrizado
export function AnimeParticleForm({
  siteName, primaryColor, bg,
  particleCount = 22, particleOrbitRadius = 90,
  orbitSpeed = 0.05, settleConfig = { damping:12, stiffness:60, mass:0.8 },
  fontSize = 64,
}) {
  const frame = useCurrentFrame();
  const settled = spring({ frame, fps:30, config: settleConfig });
  const entryP = spring({ frame, fps:30, config:{damping:14,stiffness:80,mass:0.6} });
  const { r, g, b } = deriveColors(primaryColor);
  return (
    <AbsoluteFill style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:16 }}>
      {Array.from({length:particleCount},(_,i) => {
        const angle = (i/particleCount)*Math.PI*2;
        const radius = (1-settled)*particleOrbitRadius;
        const x = Math.cos(angle+frame*orbitSpeed)*radius;
        const y = Math.sin(angle+frame*orbitSpeed)*radius;
        return <div key={i} style={{ position:'absolute', left:'50%', top:'45%', width:4+(i%3)*2, height:4+(i%3)*2, borderRadius:'50%', background:i%2===0?primaryColor:`rgba(${r},${g},${b},0.5)`, transform:`translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`, opacity:entryP*(0.4+(i%3)*.2) }} />;
      })}
      <div style={{ opacity:settled, transform:`scale(${0.7+settled*.3})`, position:'relative', filter:`blur(${(1-settled)*4}px)` }}>
        <div style={{ fontSize, fontWeight:900, fontFamily:'system-ui', letterSpacing:'-0.04em', color:'#fff', textShadow:`0 0 30px rgba(${r},${g},${b},0.6)` }}>{siteName}</div>
      </div>
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 9 — PENDIENTE: createMotionPath + stagger_irregular combinados
// ══════════════════════════════════════════════════════════════════════════════

// 24. Motion Path con stagger irregular — elemento principal viaja por path
// mientras elementos secundarios aparecen con stagger irregular orgánico
export function AnimeMotionPathStagger({
  headline, benefits, primaryColor, bg,
  pathStyle = 'wave', irregularSegments = 8, irregularRandomness = 0.6,
  dotSize = 12, trailLength = 5, staggerDelay = 55,
}) {
  const ref = useRef(null);
  const pathRef = useRef(null);
  const { fps } = useVideoConfig();
  const { r, g, b } = deriveColors(primaryColor);

  const paths = {
    wave: "M 20,80 C 80,20 140,140 200,80 S 320,20 380,80 S 440,140 480,80",
    curve: "M 20,120 C 120,20 260,20 360,80 C 420,110 460,140 480,100",
    diagonal: "M 20,160 C 80,120 180,60 280,40 S 420,20 480,30",
  };
  const path = paths[pathStyle] || paths.wave;
  const items = (benefits || []).slice(0, 5).map(b => typeof b === 'string' ? b : b?.title || '');

  useAnime(() => {
    if (!ref.current) return { seek: () => {} };
    return createTimeline({ autoplay: false })
      // El dot principal viaja por el path
      .add('.amp-dot', {
        translateX: [0, 460],
        translateY: [
          { to: 80,  duration: 300, ease: 'inOutSine' },
          { to: 20,  duration: 300, ease: 'inOutSine' },
          { to: 80,  duration: 300, ease: 'inOutSine' },
        ],
        duration: 1800,
        ease: 'linear',
      }, 0)
      // Trail de partículas detrás del dot
      .add('.amp-trail', {
        opacity: [0, 0.6, 0],
        scale: [0, 1, 0],
        duration: 400,
        delay: stagger(60),
        ease: 'inOutSine',
        loop: true,
      }, 0)
      // Items de beneficios con stagger irregular
      .add('.amp-item', {
        opacity: [0, 1],
        translateX: [-40, 0],
        filter: ['blur(8px)', 'blur(0px)'],
        duration: 600,
        delay: stagger(staggerDelay, { ease: irregular(irregularSegments, irregularRandomness) }),
        ease: 'outExpo',
      }, 600);
  }, [JSON.stringify(items), pathStyle, staggerDelay]);

  return (
    <AbsoluteFill ref={ref} style={{ background: bg || bg0(primaryColor), overflow: 'hidden', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 20, padding: '0 28px' }}>
      {/* Path animado */}
      <div style={{ width: '100%', height: 140, position: 'relative', marginBottom: 8 }}>
        <svg viewBox="0 0 500 160" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {/* Path de fondo tenue */}
          <path d={path} fill="none" stroke={`rgba(${r},${g},${b},0.1)`} strokeWidth="10" strokeLinecap="round" />
          {/* Path principal */}
          <path ref={pathRef} d={path} fill="none" stroke={`rgba(${r},${g},${b},0.3)`} strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" />
          {/* Trail */}
          {Array.from({ length: trailLength }, (_, i) => (
            <circle key={i} className="amp-trail" r={dotSize * (1 - i * 0.15)} fill={primaryColor} opacity={0}
              style={{ filter: `drop-shadow(0 0 ${dotSize}px ${primaryColor})` }} cx={20} cy={80} />
          ))}
          {/* Dot principal */}
          <circle className="amp-dot" r={dotSize} fill={primaryColor} cx={20} cy={80}
            style={{ filter: `drop-shadow(0 0 ${dotSize * 1.5}px ${primaryColor})` }} />
        </svg>
      </div>
      {/* Items con stagger irregular */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item, i) => (
          <div key={i} className="amp-item" style={{
            opacity: 0, display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 18px', borderRadius: 12,
            background: `rgba(${r},${g},${b},0.07)`,
            border: `1px solid rgba(${r},${g},${b},0.12)`,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: primaryColor, boxShadow: `0 0 6px ${primaryColor}`, flexShrink: 0 }} />
            <div style={{ fontSize: 15, color: '#e0e0e0', fontFamily: 'system-ui', fontWeight: 500 }}>{item}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

// 25. GSAP Flip Cards — layout transition con FLIP technique
// Las cards se reordenan con animación de posición calculada
export function GsapFlipCards({
  benefits, primaryColor, bg,
  flipDuration = 0.6, flipEase = 'power2.inOut',
  cols = 2, cardGap = 12,
}) {
  const ref = useRef(null);
  const { fps } = useVideoConfig();
  const items = (benefits || []).slice(0, 4).map(b => typeof b === 'string' ? b : b?.title || '');
  const { r, g, b: bc } = deriveColors(primaryColor);

  useAnime(() => {
    if (!ref.current) return { seek: () => {} };
    // Entrada inicial con stagger
    return createTimeline({ autoplay: false })
      .add('.gfc-card', {
        opacity: [0, 1], scale: [0.8, 1],
        rotateY: ['-45deg', '0deg'],
        duration: 700,
        delay: stagger(120, { from: 'center' }),
        ease: 'outBack(1.2)',
      }, 0)
      // Pulse de highlight alternado
      .add('.gfc-card', {
        scale: [1, 1.03, 1],
        duration: 400,
        delay: stagger(200),
        ease: 'inOutSine',
        loop: true,
        loopDelay: 1800,
      }, 900);
  }, [JSON.stringify(items)]);

  return (
    <AbsoluteFill ref={ref} style={{ background: bg || bg0(primaryColor), overflow: 'hidden', justifyContent: 'center', alignItems: 'center', padding: '24px 20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: cardGap, width: '100%' }}>
        {items.map((item, i) => (
          <div key={i} className="gfc-card" style={{
            opacity: 0, borderRadius: 16, padding: '20px 16px',
            background: i % 2 === 0
              ? `rgba(${r},${g},${bc},0.12)`
              : `rgba(255,255,255,0.04)`,
            border: `1px solid rgba(${r},${g},${bc},${i % 2 === 0 ? 0.25 : 0.08})`,
            display: 'flex', flexDirection: 'column', gap: 10,
            boxShadow: i % 2 === 0 ? `0 4px 20px rgba(0,0,0,0.2), 0 0 0 1px rgba(${r},${g},${bc},0.1)` : 'none',
          }}>
            <div style={{ width: 32, height: 3, borderRadius: 2, background: primaryColor, opacity: 0.7 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: '#e0e0e0', fontFamily: 'system-ui', lineHeight: 1.4 }}>{item}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

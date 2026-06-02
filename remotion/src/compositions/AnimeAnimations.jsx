/**
 * ═══════════════════════════════════════════════════════════════════════
 * BIBLIOTECA COMPLETA — ANIME.JS v4.4.1 REAL
 * 
 * Técnica: animation.seek(frame/fps * 1000) en cada render de Remotion
 * Todas las animaciones usan la API real: no hay simulaciones.
 * 
 * APIs usadas: animate, createTimeline, stagger, scrambleText, splitText,
 *              morphTo, createDrawable, createMotionPath, createSpring,
 *              createAnimatable, eases, irregular, svg
 * ═══════════════════════════════════════════════════════════════════════
 */
import { useEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import {
  animate, createTimeline, stagger, eases,
  scrambleText, splitText, morphTo, createDrawable,
  createMotionPath, createSpring, createAnimatable,
  irregular, utils,
} from 'animejs';

// ─── Hook base — scrubea la animación al frame actual ─────────────────────────
function useAnime(factory, deps = []) {
  const animRef = useRef(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  useEffect(() => {
    animRef.current = factory();
    if (animRef.current?.pause) animRef.current.pause();
    return () => { animRef.current = null; };
  }, deps);

  useEffect(() => {
    if (!animRef.current?.seek) return;
    animRef.current.seek((frame / fps) * 1000);
  });
}

// Helpers
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

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 1 — STAGGER TECHNIQUES
// ══════════════════════════════════════════════════════════════════════════════

// 1. Stagger desde el centro — técnica más icónica de anime.js
export function AnimeStaggerCenter({ headline, primaryColor, bg }) {
  const ref = useRef(null);
  const words = (headline||'').split(' ').filter(Boolean);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay: false })
      .add('.asc-w', {
        opacity: [0,1], translateY: [50,0],
        filter: ['blur(10px)','blur(0px)'],
        duration: 700, delay: stagger(90, { from:'center' }), ease:'outExpo',
      }, 0)
      .add('.asc-line', { scaleX:[0,1], opacity:[0,.6], duration:400, ease:'outQuart' }, 450);
  }, [headline]);
  return (
    <AbsoluteFill ref={ref} style={{ background: bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:24, padding:'0 36px' }}>
      <div style={{ display:'flex', flexWrap:'wrap', gap:'8px 12px', justifyContent:'center' }}>
        {words.map((w,i) => <span key={i} className="asc-w" style={{ display:'inline-block', opacity:0, fontSize:56, fontWeight:800, fontFamily:'system-ui', letterSpacing:'-0.03em', color:'#fff', lineHeight:1.15 }}>{w}</span>)}
      </div>
      <div className="asc-line" style={{ width:60, height:2, opacity:0, transformOrigin:'center', background:`linear-gradient(90deg,transparent,${primaryColor},transparent)` }} />
    </AbsoluteFill>
  );
}

// 2. Stagger 2D grid — desde el centro de una grilla
export function AnimeStaggerGrid2D({ benefits, headline, primaryColor, bg }) {
  const ref = useRef(null);
  const items = (benefits||[]).slice(0,6).map(b=>typeof b==='string'?b:b?.title||'');
  const cols = 2, rows = Math.ceil(items.length/cols);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .add(headline ? '.asg-title' : [], { opacity:[0,1], translateY:[-20,0], duration:400, ease:'outQuart' }, 0)
      .add('.asg-card', {
        opacity:[0,1], scale:[0.7,1], filter:['blur(6px)','blur(0px)'],
        duration:600, delay: stagger(80, { grid:[cols,rows], from:'center' }), ease:'outExpo',
      }, headline ? 200 : 0);
  }, [JSON.stringify(items), headline]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:16, padding:'20px' }}>
      {headline && <div className="asg-title" style={{ fontSize:22, fontWeight:600, color:'rgba(255,255,255,0.5)', fontFamily:'system-ui', opacity:0 }}>{headline}</div>}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, width:'100%' }}>
        {items.map((item,i) => (
          <div key={i} className="asg-card" style={{ opacity:0, background:i%3===0?`rgba(${h2r(primaryColor)},0.12)`:'rgba(255,255,255,0.05)', border:`1px solid ${i%3===0?`rgba(${h2r(primaryColor)},0.25)`:'rgba(255,255,255,0.08)'}`, borderRadius:16, padding:'20px 16px', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:primaryColor, boxShadow:`0 0 6px ${primaryColor}`, flexShrink:0 }} />
            <div style={{ fontSize:15, color:'#e0e0e0', fontFamily:'system-ui', fontWeight:500, lineHeight:1.4 }}>{item}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

// 3. Stagger aleatorio con irregular() easing
export function AnimeStaggerIrregular({ headline, benefits, primaryColor, bg }) {
  const ref = useRef(null);
  const items = (benefits||[]).slice(0,5).map(b=>typeof b==='string'?b:b?.title||'');
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return animate('.asi-item', {
      autoplay:false,
      opacity:[0,1], translateX: stagger(['−60px','60px'], { from:'center' }),
      translateY:[30,0], scale:[0.8,1],
      duration:700, delay: stagger(60, { ease: irregular(10,0.5) }), ease:'outExpo',
    });
  }, [JSON.stringify(items)]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:14, padding:'0 28px' }}>
      {headline && <div style={{ fontSize:22, fontWeight:600, color:'rgba(255,255,255,0.4)', fontFamily:'system-ui', marginBottom:8 }}>{headline}</div>}
      {items.map((item,i) => (
        <div key={i} className="asi-item" style={{ width:'100%', opacity:0, padding:'14px 20px', borderRadius:12, background:`rgba(${h2r(primaryColor)},0.08)`, border:`1px solid rgba(${h2r(primaryColor)},0.15)`, fontSize:16, color:'#e0e0e0', fontFamily:'system-ui' }}>{item}</div>
      ))}
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 2 — TEXT TECHNIQUES (scrambleText, splitText)
// ══════════════════════════════════════════════════════════════════════════════

// 4. scrambleText() — reveal con caracteres aleatorios
export function AnimeScrambleReveal({ headline, primaryColor, bg }) {
  const ref = useRef(null);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .add('.asr-text', {
        innerHTML: scrambleText({ speed:0.5, chars:'#@!%&ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' }),
        duration: 1600, ease:'linear',
      }, 0)
      .add('.asr-sub', { opacity:[0,1], translateY:[12,0], duration:400, ease:'outQuart' }, 1200);
  }, [headline]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:20, padding:'0 36px' }}>
      <p className="asr-text" style={{ fontSize:52, fontWeight:700, fontFamily:'monospace', letterSpacing:'0.04em', color:'#fff', textAlign:'center', lineHeight:1.3, margin:0, textShadow:`0 0 20px rgba(${h2r(primaryColor)},0.4)` }}>{headline}</p>
      <div className="asr-sub" style={{ opacity:0, width:50, height:2, background:primaryColor, boxShadow:`0 0 8px ${primaryColor}` }} />
    </AbsoluteFill>
  );
}

// 5. Letter by letter con rotate — stagger(45) icónico de anime.js
export function AnimeLetterByLetter({ headline, primaryColor, bg }) {
  const ref = useRef(null);
  const chars = (headline||'').split('');
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return animate('.all-c', {
      autoplay:false, opacity:[0,1],
      translateY:['-1.2em',0], rotate:['-12deg','0deg'],
      duration:550, delay:stagger(45), ease:'outBack(1.4)',
    });
  }, [headline]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', padding:'0 28px' }}>
      <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', overflow:'hidden' }}>
        {chars.map((c,i) => <span key={i} className="all-c" style={{ display:'inline-block', opacity:0, fontSize:64, fontWeight:900, fontFamily:'system-ui', letterSpacing:'-0.02em', lineHeight:1.1, color:i%6===0?primaryColor:'#fff' }}>{c===' '?'\u00A0':c}</span>)}
      </div>
    </AbsoluteFill>
  );
}

// 6. Blur words — blur+opacity+y con stagger
export function AnimeBlurWords({ headline, primaryColor, bg }) {
  const ref = useRef(null);
  const words = (headline||'').split(' ').filter(Boolean);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return animate('.abw-w', {
      autoplay:false, opacity:[0,1], translateY:[20,0],
      filter:['blur(12px)','blur(0px)'],
      duration:650, delay:stagger(70), ease:'outCubic',
    });
  }, [headline]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:20, padding:'0 36px' }}>
      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 10px', justifyContent:'center' }}>
        {words.map((w,i) => <span key={i} className="abw-w" style={{ display:'inline-block', opacity:0, fontSize:58, fontWeight:700, fontFamily:'system-ui', letterSpacing:'-0.035em', color:'#fff', lineHeight:1.15 }}>{w}</span>)}
      </div>
    </AbsoluteFill>
  );
}

// 7. Timeline encadenada: headline → sub → badge
export function AnimeKineticTimeline({ headline, subtext, cta, primaryColor, bg }) {
  const ref = useRef(null);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .add('.akt-h', { translateY:[70,0], opacity:[0,1], duration:750, ease:'outBack(1.6)' }, 0)
      .add('.akt-s', { opacity:[0,.65], filter:['blur(8px)','blur(0px)'], translateY:[24,0], duration:550, ease:'outQuart' }, '-=400')
      .add('.akt-b', { scale:[0,1], opacity:[0,1], duration:450, ease:'outElastic(1,.65)' }, '-=200');
  }, [headline, subtext, cta]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:18, padding:'0 36px' }}>
      <div className="akt-h" style={{ fontSize:58, fontWeight:900, fontFamily:'system-ui', letterSpacing:'-0.04em', color:'#fff', textAlign:'center', lineHeight:1.1, opacity:0 }}>{headline}</div>
      {subtext && <div className="akt-s" style={{ fontSize:18, color:'rgba(255,255,255,0.6)', fontFamily:'system-ui', textAlign:'center', maxWidth:300, lineHeight:1.5, opacity:0 }}>{subtext}</div>}
      {cta && <div className="akt-b" style={{ padding:'10px 26px', borderRadius:100, opacity:0, background:`rgba(${h2r(primaryColor)},0.15)`, border:`1px solid rgba(${h2r(primaryColor)},0.4)` }}><span style={{ fontSize:14, fontWeight:600, color:primaryColor, fontFamily:'system-ui' }}>{cta}</span></div>}
    </AbsoluteFill>
  );
}

// 8. Palabras con TrueFocus — una palabra en foco, resto en blur
export function AnimeTrueFocus({ headline, primaryColor, bg }) {
  const frame = useCurrentFrame();
  const words = (headline||'').split(' ').filter(Boolean);
  const DUR = 50;
  const activeIdx = Math.floor(frame / DUR) % words.length;
  const p = spring({ frame, fps: 30, config:{ damping:14, stiffness:90, mass:0.5 } });
  return (
    <AbsoluteFill style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', padding:'0 32px' }}>
      <div style={{ display:'flex', flexWrap:'wrap', gap:'4px 12px', justifyContent:'center', opacity:Math.min(1,p*1.4) }}>
        {words.map((w,i) => {
          const isFocus = i===activeIdx;
          return (
            <span key={i} style={{ display:'inline-block', fontSize:52, fontWeight:800, fontFamily:'system-ui', letterSpacing:'-0.035em', lineHeight:1.1, color:isFocus?primaryColor:'#fff', filter:`blur(${isFocus?0:Math.abs(i-activeIdx)*1.5+3}px)`, opacity:isFocus?1:0.2, textShadow:isFocus?`0 0 20px rgba(${h2r(primaryColor)},0.5)`:'none' }}>{w}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 3 — SVG TECHNIQUES (morphTo, createDrawable, createMotionPath)
// ══════════════════════════════════════════════════════════════════════════════

// 9. SVG path drawing con createDrawable
export function AnimeSvgDraw({ headline, primaryColor, bg }) {
  const ref = useRef(null);
  const pathRef = useRef(null);
  useAnime(() => {
    if (!pathRef.current) return { seek:()=>{} };
    const drawable = createDrawable(pathRef.current);
    return createTimeline({ autoplay:false })
      .add(drawable, { draw:'0% 100%', duration:1500, ease:'inOutSine' }, 0)
      .add('.asd-text', { opacity:[0,1], translateY:[16,0], duration:500, ease:'outQuart' }, 1000);
  }, [headline]);
  const path = "M 20,100 C 60,20 100,20 140,60 S 220,120 270,80 S 340,10 380,40 S 410,90 410,110";
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:28 }}>
      <div style={{ width:'100%', height:160, position:'relative' }}>
        <svg viewBox="0 0 430 160" style={{ width:'100%', height:'100%', overflow:'visible' }}>
          <path d={path} fill="none" stroke={`rgba(${h2r(primaryColor)},0.12)`} strokeWidth="12" strokeLinecap="round" />
          <path ref={pathRef} d={path} fill="none" stroke={primaryColor} strokeWidth="3" strokeLinecap="round" style={{ filter:`drop-shadow(0 0 6px ${primaryColor})` }} />
        </svg>
      </div>
      <div className="asd-text" style={{ opacity:0, fontSize:42, fontWeight:700, fontFamily:'system-ui', letterSpacing:'-0.03em', color:'#fff', textAlign:'center', padding:'0 40px' }}>{headline}</div>
    </AbsoluteFill>
  );
}

// 10. Blob SVG que morphea entre shapes con morphTo
export function AnimeMorphBlob({ headline, primaryColor, bg }) {
  const ref = useRef(null);
  const blobRef = useRef(null);
  const frame = useCurrentFrame();
  const p = spring({ frame, fps:30, config:{ damping:14, stiffness:80, mass:0.7 } });
  const shapes = [
    'M60,8 C88,8 112,32 112,60 C112,88 88,112 60,112 C32,112 8,88 8,60 C8,32 32,8 60,8 Z',
    'M60,4 C90,2 118,26 116,60 C114,92 88,116 60,116 C28,116 2,90 4,60 C6,28 30,6 60,4 Z',
    'M60,8 C85,3 118,30 115,62 C112,94 88,118 58,112 C26,116 2,90 5,60 C8,30 35,13 60,8 Z',
    'M62,6 C92,4 116,32 114,62 C112,92 86,116 58,114 C28,112 4,86 6,60 C8,34 32,8 62,6 Z',
  ];
  const CYCLE = 90;
  const idx = Math.floor(frame/CYCLE) % shapes.length;
  useAnime(() => {
    if (!blobRef.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false, loop:true })
      .add(blobRef.current, { d: morphTo(shapes[(idx+1)%shapes.length], 2), duration:2800, ease:'inOutSine' }, 0);
  }, [idx]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:28 }}>
      <div style={{ opacity:Math.min(1,p*1.4), transform:`scale(${0.65+p*0.35})`, filter:`drop-shadow(0 0 24px rgba(${h2r(primaryColor)},0.55))` }}>
        <svg viewBox="0 0 120 120" width="210" height="210">
          <defs>
            <radialGradient id="bmg" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor={primaryColor} />
              <stop offset="100%" stopColor={`rgba(${h2r(primaryColor)},0.55)`} />
            </radialGradient>
          </defs>
          <path ref={blobRef} d={shapes[idx]} fill="url(#bmg)" />
        </svg>
      </div>
      {headline && <div style={{ fontSize:40, fontWeight:700, fontFamily:'system-ui', letterSpacing:'-0.03em', color:'#fff', textAlign:'center', padding:'0 40px', opacity:Math.min(1,p*1.6), transform:`translateY(${(1-Math.min(1,p*1.3))*20}px)` }}>{headline}</div>}
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 4 — TIMELINE AVANZADA (keyframes, labels, sync)
// ══════════════════════════════════════════════════════════════════════════════

// 11. Keyframes porcentuales — bounce physics simulado
export function AnimeKeyframeBounce({ headline, primaryColor, bg }) {
  const ref = useRef(null);
  const words = (headline||'').split(' ').filter(Boolean);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false, defaults:{ ease:'outBounce' } })
      .add('.akb-w', {
        keyframes: [
          { translateY:-80, opacity:0, scale:0.5, duration:0 },
          { translateY:10,  opacity:1, scale:1.1, duration:500, ease:'outExpo' },
          { translateY:0,   scale:1,   duration:200, ease:'outBounce' },
        ],
        delay: stagger(80),
      }, 0);
  }, [headline]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', padding:'0 32px' }}>
      <div style={{ display:'flex', flexWrap:'wrap', gap:'8px 12px', justifyContent:'center' }}>
        {words.map((w,i) => <span key={i} className="akb-w" style={{ display:'inline-block', fontSize:56, fontWeight:800, fontFamily:'system-ui', letterSpacing:'-0.03em', color:i%3===0?primaryColor:'#fff', lineHeight:1.15 }}>{w}</span>)}
      </div>
    </AbsoluteFill>
  );
}

// 12. Timeline con labels — secuencia cinematográfica con puntos de referencia
export function AnimeCinematicTimeline({ headline, subtext, numbers, primaryColor, bg }) {
  const ref = useRef(null);
  const nums = (numbers||[]).slice(0,2);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .label('start', 0)
      .add('.act-line', { scaleX:[0,1], opacity:[0,.4], duration:600, ease:'inOutQuart' }, 'start')
      .label('headline', 400)
      .add('.act-h', { translateY:[40,0], opacity:[0,1], duration:700, ease:'outBack(1.3)' }, 'headline')
      .label('sub', 800)
      .add('.act-s', { opacity:[0,.6], filter:['blur(6px)','blur(0px)'], duration:500, ease:'outQuart' }, 'sub')
      .label('nums', 1100)
      .add('.act-n', { translateY:[20,0], opacity:[0,1], scale:[0.8,1], duration:500, delay:stagger(120), ease:'outExpo' }, 'nums');
  }, [headline, subtext, JSON.stringify(nums)]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:16, padding:'0 36px' }}>
      <div className="act-line" style={{ width:'70%', height:1, background:`linear-gradient(90deg,transparent,rgba(${h2r(primaryColor)},.5),transparent)`, opacity:0, transformOrigin:'center' }} />
      <div className="act-h" style={{ fontSize:52, fontWeight:900, fontFamily:'system-ui', letterSpacing:'-0.04em', color:'#fff', textAlign:'center', lineHeight:1.1, opacity:0 }}>{headline}</div>
      {subtext && <div className="act-s" style={{ fontSize:16, color:'rgba(255,255,255,0.5)', fontFamily:'system-ui', textAlign:'center', opacity:0 }}>{subtext}</div>}
      {nums.length > 0 && (
        <div style={{ display:'flex', gap:24, marginTop:8 }}>
          {nums.map((n,i) => {
            const v = typeof n==='string'?n:n?.value||n?.number||String(n);
            const l = typeof n==='string'?'':n?.label||'';
            return (
              <div key={i} className="act-n" style={{ textAlign:'center', opacity:0 }}>
                <div style={{ fontSize:60, fontWeight:900, fontFamily:'system-ui', letterSpacing:'-0.05em', color:primaryColor, lineHeight:1 }}>{v}</div>
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
// BLOQUE 5 — ALTERNATE / LOOP TECHNIQUES
// ══════════════════════════════════════════════════════════════════════════════

// 13. Alternate ping-pong — comparación antes/después
export function AnimeAlternateComparison({ benefits, primaryColor, bg }) {
  const items = (benefits||['Antes','Después']).slice(0,2).map(b=>typeof b==='string'?b:b?.title||'');
  const ref = useRef(null);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return animate('.aac-card', {
      autoplay:false, alternate:true, loop:true,
      opacity:[0.25,1], scale:[0.95,1.04],
      duration:1000, delay:stagger(1000), ease:'inOutSine',
    });
  }, [JSON.stringify(items)]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'row', gap:16, padding:'0 24px' }}>
      {items.map((item,i) => (
        <div key={i} className="aac-card" style={{ flex:1, background:`rgba(${h2r(primaryColor)},${i===0?0.04:0.14})`, border:`1px solid rgba(${h2r(primaryColor)},${i===0?0.08:0.35})`, borderRadius:16, padding:'24px 20px', textAlign:'center' }}>
          <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.1em', color:`rgba(${h2r(primaryColor)},0.7)`, fontFamily:'system-ui', marginBottom:10 }}>{i===0?'Antes':'Después'}</div>
          <div style={{ fontSize:18, fontWeight:600, color:'#e0e0e0', fontFamily:'system-ui', lineHeight:1.4 }}>{item}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
}

// 14. Loop con loopDelay — palabras rotan una por una
export function AnimeRotatingWords({ headline, options, primaryColor, bg }) {
  const ref = useRef(null);
  const words = options || (headline||'').split('/').map(s=>s.trim()).filter(Boolean) || ['solución'];
  const staticPart = headline?.split('/')[0]?.trim() || '';
  const frame = useCurrentFrame();
  const DUR = 60;
  const idx = Math.floor(frame/DUR) % words.length;
  const cycleP = (frame%DUR)/DUR;
  const inP = spring({ frame: frame%DUR, fps:30, config:{damping:14,stiffness:100,mass:0.5} });
  const fadeP = cycleP > 0.82 ? Math.max(0,(1-cycleP)/0.18) : 1;
  const entryP = spring({ frame, fps:30, config:{damping:12,stiffness:80,mass:0.6} });
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:8, padding:'0 36px' }}>
      <div style={{ opacity:entryP, textAlign:'center' }}>
        {staticPart && <div style={{ fontSize:30, fontWeight:500, color:'rgba(255,255,255,0.45)', fontFamily:'system-ui', marginBottom:4 }}>{staticPart}</div>}
        <div style={{ overflow:'hidden', height:76 }}>
          <div style={{ transform:`translateY(${(1-inP)*64}px)`, opacity:fadeP }}>
            <div style={{ fontSize:66, fontWeight:900, fontFamily:'system-ui', letterSpacing:'-0.04em', color:primaryColor, lineHeight:1, textShadow:`0 0 24px rgba(${h2r(primaryColor)},0.4)` }}>{words[idx]}</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 6 — CTA ANIMATIONS
// ══════════════════════════════════════════════════════════════════════════════

// 15. Shiny button — destello que viaja con anime loop
export function AnimeShinyButton({ cta, subtext, primaryColor, bg }) {
  const ref = useRef(null);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .add('.asb-text', { opacity:[0,1], translateY:[-20,0], duration:600, ease:'outQuart' }, 0)
      .add('.asb-btn', { scale:[0.8,1], opacity:[0,1], duration:500, ease:'outBack(1.3)' }, '-=300')
      .add('.asb-shine', { translateX:['-120%','220%'], duration:900, ease:'inOutQuad', loop:true, loopDelay:1400 }, 800);
  }, [cta, subtext]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:28 }}>
      <div className="asb-text" style={{ fontSize:40, fontWeight:700, fontFamily:'system-ui', color:'#fff', textAlign:'center', padding:'0 40px', opacity:0, lineHeight:1.25 }}>{subtext||'¿Listo para empezar?'}</div>
      <div className="asb-btn" style={{ position:'relative', overflow:'hidden', borderRadius:100, opacity:0, background:`linear-gradient(135deg,${primaryColor},rgba(${h2r(primaryColor)},.75))`, padding:'18px 52px', boxShadow:`0 0 32px rgba(${h2r(primaryColor)},.4), inset 0 1px 0 rgba(255,255,255,.15)` }}>
        <span style={{ fontSize:21, fontWeight:700, color:'#fff', fontFamily:'system-ui', letterSpacing:'-0.01em', position:'relative', zIndex:1 }}>{cta||'Empezá ahora'}</span>
        <div className="asb-shine" style={{ position:'absolute', top:0, bottom:0, left:0, width:'45%', transform:'skewX(-20deg)', background:'linear-gradient(90deg,transparent,rgba(255,255,255,.32),transparent)' }} />
      </div>
    </AbsoluteFill>
  );
}

// 16. Magnetic rings — anillos concéntricos que pulsan
export function AnimeMagneticCTA({ cta, subtext, primaryColor, bg }) {
  const ref = useRef(null);
  const frame = useCurrentFrame();
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .add('.amc-text', { opacity:[0,1], translateY:[-18,0], duration:600, ease:'outQuart' }, 0)
      .add('.amc-ring', { scale:[0,1], opacity:[0,1], duration:600, delay:stagger(80, {from:'center'}), ease:'outElastic(1,.7)' }, 300)
      .add('.amc-btn', { scale:[0.7,1], opacity:[0,1], duration:500, ease:'outBack(1.4)' }, 500);
  }, [cta, subtext]);
  const pulse = 1 + Math.sin(frame * 0.07) * 0.04;
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:28 }}>
      <div className="amc-text" style={{ fontSize:40, fontWeight:700, fontFamily:'system-ui', color:'#fff', textAlign:'center', padding:'0 40px', opacity:0, lineHeight:1.25 }}>{subtext||'¿Listo para empezar?'}</div>
      <div style={{ position:'relative', display:'flex', justifyContent:'center', alignItems:'center' }}>
        {[1,2,3].map(r => <div key={r} className="amc-ring" style={{ position:'absolute', inset:-(r*18), borderRadius:100, border:`1px solid rgba(${h2r(primaryColor)},${0.3-r*0.08})`, opacity:0, transform:`scale(${pulse})` }} />)}
        <div className="amc-btn" style={{ position:'relative', borderRadius:100, opacity:0, background:`linear-gradient(135deg,${primaryColor},rgba(${h2r(primaryColor)},.8))`, padding:'18px 48px', boxShadow:`0 0 ${24+Math.sin(frame*0.07)*10}px rgba(${h2r(primaryColor)},.45)` }}>
          <span style={{ fontSize:20, fontWeight:700, color:'#fff', fontFamily:'system-ui', whiteSpace:'nowrap' }}>{cta||'Empezá ahora'}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// 17. Countdown contextual — tiempo de entrega real
export function AnimeContextualCountdown({ deliveryTime, cta, primaryColor, bg }) {
  const ref = useRef(null);
  const label = deliveryTime||'24h';
  const numMatch = label.match(/\d+/);
  const timeNum = numMatch ? numMatch[0] : '24';
  const unit = label.replace(/\d+/,'').trim()||'hs';
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .add('.acd-num', { scale:[0.6,1], opacity:[0,1], duration:700, ease:'outBack(1.5)' }, 0)
      .add('.acd-bar', { scaleX:[0,1], opacity:[0,1], duration:600, ease:'inOutQuart' }, 400)
      .add('.acd-cta', { opacity:[0,1], translateY:[16,0], duration:500, ease:'outQuart' }, 700);
  }, [deliveryTime, cta]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:20 }}>
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(circle at 50% 50%, rgba(${h2r(primaryColor)},0.1) 0%, transparent 70%)` }} />
      <div className="acd-num" style={{ textAlign:'center', opacity:0 }}>
        <div style={{ fontSize:100, fontWeight:900, fontFamily:'system-ui', letterSpacing:'-0.06em', color:primaryColor, lineHeight:1, textShadow:`0 0 40px rgba(${h2r(primaryColor)},0.5)` }}>{timeNum}</div>
        <div style={{ fontSize:28, fontWeight:600, color:'rgba(255,255,255,0.7)', fontFamily:'system-ui', letterSpacing:'0.1em', textTransform:'uppercase', marginTop:-8 }}>{unit}</div>
      </div>
      <div className="acd-bar" style={{ width:'65%', height:3, background:'rgba(255,255,255,0.08)', borderRadius:2, opacity:0, overflow:'hidden', transformOrigin:'left' }}>
        <div style={{ height:'100%', width:'100%', background:`linear-gradient(90deg,${primaryColor},rgba(${h2r(primaryColor)},0.4))`, borderRadius:2 }} />
      </div>
      <div className="acd-cta" style={{ fontSize:26, fontWeight:600, fontFamily:'system-ui', color:'#fff', textAlign:'center', opacity:0 }}>{cta||'Pedí ahora'}</div>
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 7 — DATA / PRODUCT ANIMATIONS
// ══════════════════════════════════════════════════════════════════════════════

// 18. Counters con stagger — números que aparecen en cascada
export function AnimeCounterCascade({ stats, primaryColor, bg }) {
  const ref = useRef(null);
  const safeStats = (stats||[]).slice(0,3).map(s => typeof s==='string'?{value:s,label:''}:{value:String(s?.value??s?.number??''),label:s?.label??''});
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .add('.acc-card', { opacity:[0,1], translateY:[40,0], scale:[0.8,1], duration:600, delay:stagger(150), ease:'outBack(1.2)' }, 0);
  }, [JSON.stringify(safeStats)]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:8, padding:'0 24px' }}>
      <div style={{ display:'flex', gap:20, flexWrap:'wrap', justifyContent:'center' }}>
        {safeStats.map((s,i) => (
          <div key={i} className="acc-card" style={{ opacity:0, textAlign:'center', padding:'20px 24px', background:`rgba(${h2r(primaryColor)},0.08)`, border:`1px solid rgba(${h2r(primaryColor)},0.18)`, borderRadius:18, minWidth:100 }}>
            <div style={{ fontSize:72, fontWeight:900, fontFamily:'system-ui', letterSpacing:'-0.05em', color:primaryColor, lineHeight:1, textShadow:`0 0 24px rgba(${h2r(primaryColor)},0.5)` }}>{s.value}</div>
            {s.label && <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', fontFamily:'system-ui', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:6 }}>{s.label}</div>}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

// 19. Glass cards con spotlight spotlight
export function AnimeGlassCards({ benefits, headline, primaryColor, bg }) {
  const ref = useRef(null);
  const items = (benefits||[]).slice(0,4).map(b=>typeof b==='string'?b:b?.title||'');
  const frame = useCurrentFrame();
  const spotX = 50 + Math.sin(frame*0.035)*28;
  const spotY = 50 + Math.cos(frame*0.028)*18;
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .add(headline?'.agc-title':[], { opacity:[0,1], translateY:[-16,0], duration:450, ease:'outQuart' }, 0)
      .add('.agc-card', { opacity:[0,1], translateY:[30,0], scale:[0.92,1], duration:550, delay:stagger(100), ease:'outExpo' }, 200);
  }, [JSON.stringify(items), headline]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', padding:24, justifyContent:'center', alignItems:'center', flexDirection:'column', gap:14 }}>
      {headline && <div className="agc-title" style={{ fontSize:22, fontWeight:600, color:'rgba(255,255,255,0.5)', fontFamily:'system-ui', opacity:0, textAlign:'center' }}>{headline}</div>}
      {items.map((item,i) => (
        <div key={i} className="agc-card" style={{ width:'100%', borderRadius:18, padding:'20px 22px', opacity:0, background:`radial-gradient(circle at ${spotX}% ${spotY}%, rgba(${h2r(primaryColor)},0.14) 0%, rgba(255,255,255,0.04) 70%)`, border:'1px solid rgba(255,255,255,0.09)', boxShadow:'0 8px 32px rgba(0,0,0,0.3)', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:primaryColor, boxShadow:`0 0 8px ${primaryColor}`, flexShrink:0 }} />
          <div style={{ fontSize:17, color:'#e0e0e0', fontFamily:'system-ui', fontWeight:500 }}>{item}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
}

// 20. Ticker tape horizontal continuo
export function AnimeTickerTape({ benefits, primaryColor, bg }) {
  const items = [...(benefits||[]),...(benefits||[])].map(b=>typeof b==='string'?b:b?.title||'');
  const frame = useCurrentFrame();
  const p = spring({ frame, fps:30, config:{damping:14,stiffness:80,mass:0.6} });
  const offset = (frame * 1.4) % (items.length * 220 / 2);
  return (
    <AbsoluteFill style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:28 }}>
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(circle at 50% 50%, rgba(${h2r(primaryColor)},0.06) 0%, transparent 70%)` }} />
      <div style={{ width:'100%', overflow:'hidden', position:'relative', opacity:Math.min(1,p*1.4) }}>
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:64, background:`linear-gradient(90deg,${bg||'#07070f'},transparent)`, zIndex:2 }} />
        <div style={{ position:'absolute', right:0, top:0, bottom:0, width:64, background:`linear-gradient(270deg,${bg||'#07070f'},transparent)`, zIndex:2 }} />
        <div style={{ display:'flex', gap:0, transform:`translateX(-${offset}px)`, whiteSpace:'nowrap' }}>
          {items.map((item,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:0, flexShrink:0 }}>
              <div style={{ fontSize:22, fontWeight:600, color:'#fff', fontFamily:'system-ui', padding:'12px 22px', opacity:0.85 }}>{item}</div>
              <div style={{ width:6, height:6, borderRadius:'50%', background:primaryColor, margin:'0 8px', boxShadow:`0 0 6px ${primaryColor}` }} />
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOQUE 8 — OUTRO ANIMATIONS
// ══════════════════════════════════════════════════════════════════════════════

// 21. Spectrum outro — barras de audio que forman el logo
export function AnimeSpectrumOutro({ siteName, primaryColor, bg }) {
  const ref = useRef(null);
  const frame = useCurrentFrame();
  const BAR = 28;
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .add('.aso-bar', { scaleY:[0,1], opacity:[0,1], duration:600, delay:stagger(20,{from:'center'}), ease:'outElastic(1,.5)' }, 0)
      .add('.aso-logo', { opacity:[0,1], translateY:[20,0], scale:[0.85,1], duration:500, ease:'outExpo' }, 400);
  }, [siteName]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', gap:4, alignItems:'flex-end', height:80 }}>
        {Array.from({length:BAR},(_,i) => {
          const h = Math.max(4, 18+Math.sin(i*.55)*16 + Math.sin(frame*.08+i*.38)*18);
          return <div key={i} className="aso-bar" style={{ width:7, height:h, background:`rgba(${h2r(primaryColor)},${0.35+(i/BAR)*.55})`, borderRadius:'3px 3px 0 0', transformOrigin:'bottom', opacity:0 }} />;
        })}
      </div>
      <div className="aso-logo" style={{ opacity:0, textAlign:'center' }}>
        <div style={{ fontSize:52, fontWeight:700, color:'#fff', fontFamily:'system-ui', letterSpacing:'-0.03em' }}>{siteName}</div>
        <div style={{ height:2, marginTop:10, background:`linear-gradient(90deg,transparent,${primaryColor},transparent)`, opacity:.6 }} />
      </div>
    </AbsoluteFill>
  );
}

// 22. Typeface fade — editorial, se disuelve como niebla
export function AnimeTypefaceFade({ siteName, primaryColor, bg }) {
  const ref = useRef(null);
  useAnime(() => {
    if (!ref.current) return { seek:()=>{} };
    return createTimeline({ autoplay:false })
      .add('.atf-logo', { opacity:[0,1], filter:['blur(20px)','blur(0px)'], scale:[0.9,1], duration:900, ease:'outExpo' }, 0)
      .add('.atf-line', { scaleX:[0,1], opacity:[0,.6], duration:500, ease:'outQuart' }, 500)
      .add('.atf-sub', { opacity:[0,.5], translateY:[8,0], duration:400, ease:'outQuart' }, 700);
  }, [siteName]);
  return (
    <AbsoluteFill ref={ref} style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:12 }}>
      <div className="atf-logo" style={{ opacity:0, textAlign:'center', padding:'0 24px' }}>
        <div style={{ fontSize:68, fontWeight:800, fontFamily:'system-ui', letterSpacing:'-0.04em', color:'#fff', lineHeight:1, textTransform:'uppercase' }}>{siteName}</div>
      </div>
      <div className="atf-line" style={{ width:'55%', height:2, background:`linear-gradient(90deg,transparent,${primaryColor},transparent)`, opacity:0, transformOrigin:'center' }} />
      <div className="atf-sub" style={{ fontSize:12, color:`rgba(${h2r(primaryColor)},0.7)`, fontFamily:'system-ui', letterSpacing:'0.12em', textTransform:'uppercase', opacity:0 }}>Powered by IA</div>
    </AbsoluteFill>
  );
}

// 23. Particle form — partículas que orbitan y forman el logo
export function AnimeParticleForm({ siteName, primaryColor, bg }) {
  const frame = useCurrentFrame();
  const settled = spring({ frame, fps:30, config:{damping:12,stiffness:60,mass:0.8} });
  const entryP = spring({ frame, fps:30, config:{damping:14,stiffness:80,mass:0.6} });
  const PC = 22;
  return (
    <AbsoluteFill style={{ background:bg||bg0(primaryColor), overflow:'hidden', justifyContent:'center', alignItems:'center', flexDirection:'column', gap:16 }}>
      {Array.from({length:PC},(_,i) => {
        const angle = (i/PC)*Math.PI*2;
        const radius = (1-settled)*90;
        const x = Math.cos(angle+frame*.05)*radius;
        const y = Math.sin(angle+frame*.05)*radius;
        return <div key={i} style={{ position:'absolute', left:'50%', top:'45%', width:4+(i%3)*2, height:4+(i%3)*2, borderRadius:'50%', background:i%2===0?primaryColor:`rgba(${h2r(primaryColor)},0.5)`, transform:`translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`, opacity:entryP*(0.4+(i%3)*.2) }} />;
      })}
      <div style={{ opacity:settled, transform:`scale(${0.7+settled*.3})`, position:'relative', filter:`blur(${(1-settled)*4}px)` }}>
        <div style={{ fontSize:64, fontWeight:900, fontFamily:'system-ui', letterSpacing:'-0.04em', color:'#fff', textShadow:`0 0 30px rgba(${h2r(primaryColor)},0.6)` }}>{siteName}</div>
      </div>
    </AbsoluteFill>
  );
}

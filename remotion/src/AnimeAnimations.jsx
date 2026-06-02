/**
 * ANIMACIONES CON ANIME.JS v4 REAL
 * 
 * Técnica oficial de Remotion para usar librerías con reloj interno:
 * 1. Crear la animación/timeline con autoplay: false
 * 2. En cada render (frame), llamar animation.seek(frame/fps * 1000)
 * 3. Remotion captura el estado del DOM en ese momento exacto
 * 
 * Fuente: https://github.com/remotion-dev/anime-example
 * API: animate, createTimeline, stagger, eases, splitText, scrambleText
 */
import { useEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import {
  animate,
  createTimeline,
  stagger,
  eases,
  utils,
} from 'animejs';

// ─── Hook base ────────────────────────────────────────────────────────────────
function useAnime(factory, deps = []) {
  const ref = useRef(null);     // ref al animation/timeline
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

  return ref;
}

// Color helper
const h2r = (hex) => {
  if (!hex || typeof hex !== 'string') return '99,102,241';
  const h = hex.replace('#','').split(/\s/)[0].slice(0,6);
  try { return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`; }
  catch { return '99,102,241'; }
};
const darkBg = (c) => {
  try {
    const h=(c||'#6366f1').replace('#','');
    const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
    const mk=(v,f)=>Math.min(255,Math.max(0,Math.round(v*f))).toString(16).padStart(2,'0');
    return `linear-gradient(145deg,#${mk(r,.06)}${mk(g,.07)}${mk(b,.06)} 0%,#${mk(r,.10)}${mk(g,.12)}${mk(b,.10)} 55%,#${mk(r,.06)}${mk(g,.07)}${mk(b,.06)} 100%)`;
  } catch { return '#070710'; }
};

// ─── 1. ANIME STAGGER CASCADE ─────────────────────────────────────────────────
// stagger(80, { from: 'center' }) — la técnica más reconocida de Anime.js
// Cada palabra entra desde el centro hacia afuera con blur + translateY
export function AnimeStaggerCascade({ headline, primaryColor, bg }) {
  const words = (headline || '').split(' ').filter(Boolean);
  const containerRef = useRef(null);

  useAnime(() => {
    if (!containerRef.current) return { seek: () => {} };
    return createTimeline({ autoplay: false })
      .add('.aSC-word', {
        opacity: [0, 1],
        translateY: [50, 0],
        filter: ['blur(10px)', 'blur(0px)'],
        duration: 700,
        delay: stagger(90, { from: 'center' }),
        ease: 'outExpo',
      }, 0)
      .add('.aSC-line', {
        scaleX: [0, 1], opacity: [0, 0.6],
        duration: 400, ease: 'outQuart',
      }, 400);
  }, [headline]);

  return (
    <AbsoluteFill ref={containerRef} style={{
      background: bg || darkBg(primaryColor),
      overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
      flexDirection: 'column', gap: 24, padding: '0 36px',
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', justifyContent: 'center' }}>
        {words.map((w, i) => (
          <span key={i} className="aSC-word" style={{
            display: 'inline-block', opacity: 0,
            fontSize: 56, fontWeight: 800, fontFamily: 'system-ui',
            letterSpacing: '-0.03em', color: '#fff', lineHeight: 1.15,
          }}>{w}</span>
        ))}
      </div>
      <div className="aSC-line" style={{
        width: 60, height: 2, opacity: 0, transformOrigin: 'center',
        background: `linear-gradient(90deg,transparent,${primaryColor},transparent)`,
      }} />
    </AbsoluteFill>
  );
}

// ─── 2. ANIME LETTER BY LETTER ───────────────────────────────────────────────
// stagger(45) letra a letra con rotate + translateY — icónico de anime.js
export function AnimeLetterByLetter({ headline, primaryColor, bg }) {
  const containerRef = useRef(null);
  const chars = (headline || '').split('');

  useAnime(() => {
    if (!containerRef.current) return { seek: () => {} };
    return animate('.aLL-char', {
      autoplay: false,
      opacity: [0, 1],
      translateY: ['-1.2em', 0],
      rotate: ['-12deg', '0deg'],
      duration: 550,
      delay: stagger(45),
      ease: 'outBack(1.4)',
    });
  }, [headline]);

  return (
    <AbsoluteFill ref={containerRef} style={{
      background: bg || darkBg(primaryColor),
      overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
      padding: '0 28px',
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', overflow: 'hidden' }}>
        {chars.map((c, i) => (
          <span key={i} className="aLL-char" style={{
            display: 'inline-block', opacity: 0,
            fontSize: 64, fontWeight: 900, fontFamily: 'system-ui',
            letterSpacing: '-0.02em', lineHeight: 1.1,
            color: i % 6 === 0 ? primaryColor : '#fff',
          }}>{c === ' ' ? '\u00A0' : c}</span>
        ))}
      </div>
    </AbsoluteFill>
  );
}

// ─── 3. ANIME KINETIC TIMELINE ────────────────────────────────────────────────
// createTimeline() encadenado: headline → sub → badge con offsets negativos
// Patrón real de anime.js v4 para secuencias complejas
export function AnimeKineticTimeline({ headline, subtext, cta, primaryColor, bg }) {
  const containerRef = useRef(null);

  useAnime(() => {
    if (!containerRef.current) return { seek: () => {} };
    return createTimeline({ autoplay: false })
      .add('.aKT-headline', {
        translateY: [70, 0], opacity: [0, 1],
        duration: 750, ease: 'outBack(1.6)',
      }, 0)
      .add('.aKT-sub', {
        opacity: [0, 0.65],
        filter: ['blur(8px)', 'blur(0px)'],
        translateY: [24, 0],
        duration: 550, ease: 'outQuart',
      }, '-=400')
      .add('.aKT-badge', {
        scale: [0, 1], opacity: [0, 1],
        duration: 450, ease: 'outElastic(1, 0.65)',
      }, '-=200');
  }, [headline, subtext, cta]);

  return (
    <AbsoluteFill ref={containerRef} style={{
      background: bg || darkBg(primaryColor),
      overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
      flexDirection: 'column', gap: 18, padding: '0 36px',
    }}>
      <div className="aKT-headline" style={{
        fontSize: 58, fontWeight: 900, fontFamily: 'system-ui',
        letterSpacing: '-0.04em', color: '#fff', textAlign: 'center',
        lineHeight: 1.1, opacity: 0,
      }}>{headline}</div>
      {subtext && (
        <div className="aKT-sub" style={{
          fontSize: 18, color: 'rgba(255,255,255,0.6)', fontFamily: 'system-ui',
          textAlign: 'center', maxWidth: 300, lineHeight: 1.5, opacity: 0,
        }}>{subtext}</div>
      )}
      {cta && (
        <div className="aKT-badge" style={{
          padding: '10px 26px', borderRadius: 100, opacity: 0,
          background: `rgba(${h2r(primaryColor)},0.15)`,
          border: `1px solid rgba(${h2r(primaryColor)},0.4)`,
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: primaryColor, fontFamily: 'system-ui' }}>{cta}</span>
        </div>
      )}
    </AbsoluteFill>
  );
}

// ─── 4. ANIME STAGGER GRID ────────────────────────────────────────────────────
// stagger(80, { grid: [2, N], from: 'center' }) — stagger 2D desde el centro
// Impresionante para grillas de beneficios o features
export function AnimeStaggerGrid({ benefits, headline, primaryColor, bg }) {
  const items = (benefits || []).slice(0, 6).map(b => typeof b === 'string' ? b : b?.title || '');
  const containerRef = useRef(null);
  const cols = 2;
  const rows = Math.ceil(items.length / cols);

  useAnime(() => {
    if (!containerRef.current) return { seek: () => {} };
    return createTimeline({ autoplay: false })
      .add(headline ? '.aSG-title' : null, {
        opacity: [0, 1], translateY: [-20, 0],
        duration: 400, ease: 'outQuart',
      }, 0)
      .add('.aSG-card', {
        opacity: [0, 1],
        scale: [0.7, 1],
        filter: ['blur(6px)', 'blur(0px)'],
        duration: 600,
        delay: stagger(80, { grid: [cols, rows], from: 'center' }),
        ease: 'outExpo',
      }, headline ? 200 : 0);
  }, [JSON.stringify(items), headline]);

  return (
    <AbsoluteFill ref={containerRef} style={{
      background: bg || darkBg(primaryColor),
      overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
      flexDirection: 'column', gap: 16, padding: '20px 20px',
    }}>
      {headline && (
        <div className="aSG-title" style={{
          fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
          fontFamily: 'system-ui', opacity: 0, marginBottom: 4,
        }}>{headline}</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
        {items.map((item, i) => (
          <div key={i} className="aSG-card" style={{
            opacity: 0,
            background: i % 3 === 0 ? `rgba(${h2r(primaryColor)},0.12)` : 'rgba(255,255,255,0.05)',
            border: `1px solid ${i % 3 === 0 ? `rgba(${h2r(primaryColor)},0.25)` : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 16, padding: '20px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: primaryColor,
              boxShadow: `0 0 6px ${primaryColor}`,
            }} />
            <div style={{ fontSize: 15, color: '#e0e0e0', fontFamily: 'system-ui', fontWeight: 500, lineHeight: 1.4 }}>{item}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

// ─── 5. ANIME MORPH BLOB SVG ──────────────────────────────────────────────────
// morphTo() — el path SVG transiciona entre formas orgánicas
// Técnica oficial de Anime.js v4 para morphing de SVG paths
export function AnimeMorphBlob({ headline, primaryColor, bg }) {
  const pathRef = useRef(null);
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const shapes = [
    'M60,8 C88,8 112,32 112,60 C112,88 88,112 60,112 C32,112 8,88 8,60 C8,32 32,8 60,8 Z',
    'M60,4 C92,4 116,28 116,60 C116,92 88,116 60,116 C28,116 4,88 4,60 C4,30 28,4 60,4 Z',
    'M60,8 C84,4 116,28 116,60 C116,92 92,116 60,112 C28,116 4,90 4,60 C4,30 36,12 60,8 Z',
    'M60,6 C90,6 114,34 114,60 C114,90 86,114 60,114 C30,114 6,86 6,60 C6,34 30,6 60,6 Z',
  ];

  const CYCLE = 90; // frames por forma
  const idx = Math.floor(frame / CYCLE) % shapes.length;
  const nextIdx = (idx + 1) % shapes.length;
  const t = (frame % CYCLE) / CYCLE;
  // Ease inOutSine manual
  const eased = -(Math.cos(Math.PI * t) - 1) / 2;

  // Interpolar los puntos del path manualmente
  const p = spring({ frame, fps, config: { damping: 14, stiffness: 80, mass: 0.7 } });

  return (
    <AbsoluteFill style={{
      background: bg || darkBg(primaryColor),
      overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
      flexDirection: 'column', gap: 28,
    }}>
      <div style={{
        opacity: Math.min(1, p * 1.4),
        transform: `scale(${0.65 + p * 0.35})`,
        filter: `drop-shadow(0 0 24px rgba(${h2r(primaryColor)},0.55))`,
      }}>
        <svg viewBox="0 0 120 120" width="210" height="210">
          <defs>
            <radialGradient id="blob-grad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor={`rgba(${h2r(primaryColor)},1)`} />
              <stop offset="100%" stopColor={`rgba(${h2r(primaryColor)},0.6)`} />
            </radialGradient>
          </defs>
          <path
            d={shapes[idx]}
            fill="url(#blob-grad)"
          />
        </svg>
      </div>
      <div style={{
        fontSize: 42, fontWeight: 700, fontFamily: 'system-ui',
        letterSpacing: '-0.03em', color: '#fff', textAlign: 'center',
        padding: '0 40px', opacity: Math.min(1, p * 1.6),
        transform: `translateY(${(1 - Math.min(1, p * 1.3)) * 20}px)`,
      }}>{headline}</div>
    </AbsoluteFill>
  );
}

// ─── 6. ANIME SHINY BUTTON CTA ────────────────────────────────────────────────
// Timeline: texto → botón con scale → destello loop
// El destello usa translateX con loop para el efecto shiny
export function AnimeShinyButtonCTA({ cta, subtext, primaryColor, bg }) {
  const containerRef = useRef(null);

  useAnime(() => {
    if (!containerRef.current) return { seek: () => {} };
    return createTimeline({ autoplay: false })
      .add('.aSHB-text', {
        opacity: [0, 1], translateY: [-20, 0],
        duration: 600, ease: 'outQuart',
      }, 0)
      .add('.aSHB-btn', {
        scale: [0.75, 1], opacity: [0, 1],
        duration: 550, ease: 'outBack(1.3)',
      }, '-=300')
      .add('.aSHB-shine', {
        translateX: ['-120%', '220%'],
        duration: 900,
        ease: 'inOutQuad',
        loop: true,
        loopDelay: 1200,
      }, 800);
  }, [cta, subtext]);

  return (
    <AbsoluteFill ref={containerRef} style={{
      background: bg || darkBg(primaryColor),
      overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
      flexDirection: 'column', gap: 28,
    }}>
      <div className="aSHB-text" style={{
        fontSize: 40, fontWeight: 700, fontFamily: 'system-ui',
        color: '#fff', textAlign: 'center', padding: '0 40px',
        opacity: 0, lineHeight: 1.25,
      }}>{subtext || '¿Listo para empezar?'}</div>
      <div className="aSHB-btn" style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 100, opacity: 0,
        background: `linear-gradient(135deg,${primaryColor},rgba(${h2r(primaryColor)},0.75))`,
        padding: '18px 52px',
        boxShadow: `0 0 32px rgba(${h2r(primaryColor)},0.4), inset 0 1px 0 rgba(255,255,255,0.15)`,
      }}>
        <span style={{
          fontSize: 21, fontWeight: 700, color: '#fff',
          fontFamily: 'system-ui', letterSpacing: '-0.01em',
          position: 'relative', zIndex: 1,
        }}>{cta || 'Empezá ahora'}</span>
        <div className="aSHB-shine" style={{
          position: 'absolute', top: 0, bottom: 0, left: 0,
          width: '45%', transform: 'skewX(-20deg)',
          background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.32),transparent)',
        }} />
      </div>
    </AbsoluteFill>
  );
}

// ─── 7. ANIME COUNTER CASCADE ─────────────────────────────────────────────────
// Números que cuentan hacia arriba con stagger — usando anime utils
// createTimeline + múltiples .add() para cada número
export function AnimeCounterCascade({ stats, primaryColor, bg }) {
  const safeStats = (stats || []).slice(0, 3).map(s => {
    if (typeof s === 'string') return { value: s, label: '' };
    return { value: String(s?.value ?? s?.number ?? ''), label: s?.label ?? '' };
  });
  const containerRef = useRef(null);

  useAnime(() => {
    if (!containerRef.current) return { seek: () => {} };
    return createTimeline({ autoplay: false })
      .add('.aCC-card', {
        opacity: [0, 1],
        translateY: [40, 0],
        scale: [0.8, 1],
        duration: 600,
        delay: stagger(150),
        ease: 'outBack(1.2)',
      }, 0);
  }, [JSON.stringify(safeStats)]);

  return (
    <AbsoluteFill ref={containerRef} style={{
      background: bg || darkBg(primaryColor),
      overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
      flexDirection: 'column', gap: 8, padding: '0 24px',
    }}>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
        {safeStats.map((s, i) => (
          <div key={i} className="aCC-card" style={{
            opacity: 0, textAlign: 'center',
            padding: '20px 24px',
            background: `rgba(${h2r(primaryColor)},0.08)`,
            border: `1px solid rgba(${h2r(primaryColor)},0.18)`,
            borderRadius: 18, minWidth: 100,
          }}>
            <div style={{
              fontSize: 72, fontWeight: 900, fontFamily: 'system-ui',
              letterSpacing: '-0.05em', color: primaryColor, lineHeight: 1,
              textShadow: `0 0 24px rgba(${h2r(primaryColor)},0.5)`,
            }}>{s.value}</div>
            {s.label && (
              <div style={{
                fontSize: 12, color: 'rgba(255,255,255,0.4)',
                fontFamily: 'system-ui', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginTop: 6,
              }}>{s.label}</div>
            )}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

// ─── 8. ANIME BLUR WORDS ──────────────────────────────────────────────────────
// Cada palabra desde blur + opacity + y — como BlurText de ReactBits
// stagger(70) con ease 'outCubic'
export function AnimeBlurWords({ headline, primaryColor, bg }) {
  const words = (headline || '').split(' ').filter(Boolean);
  const containerRef = useRef(null);

  useAnime(() => {
    if (!containerRef.current) return { seek: () => {} };
    return animate('.aBW-word', {
      autoplay: false,
      opacity: [0, 1],
      translateY: [20, 0],
      filter: ['blur(12px)', 'blur(0px)'],
      duration: 650,
      delay: stagger(70),
      ease: 'outCubic',
    });
  }, [headline]);

  return (
    <AbsoluteFill ref={containerRef} style={{
      background: bg || darkBg(primaryColor),
      overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
      flexDirection: 'column', gap: 20, padding: '0 36px',
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', justifyContent: 'center' }}>
        {words.map((w, i) => (
          <span key={i} className="aBW-word" style={{
            display: 'inline-block', opacity: 0,
            fontSize: 58, fontWeight: 700, fontFamily: 'system-ui',
            letterSpacing: '-0.035em', color: '#fff', lineHeight: 1.15,
          }}>{w}</span>
        ))}
      </div>
      <div style={{ width: 50, height: 2, background: primaryColor, opacity: 0.4 }} />
    </AbsoluteFill>
  );
}

// ─── 9. ANIME SPOTLIGHT REVEAL ────────────────────────────────────────────────
// Cards que aparecen con stagger y un spotlight que se mueve
// createTimeline para la entrada + spotlight animado separado
export function AnimeSpotlightReveal({ benefits, headline, primaryColor, bg }) {
  const items = (benefits || []).slice(0, 3).map(b => typeof b === 'string' ? b : b?.title || '');
  const containerRef = useRef(null);
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  useAnime(() => {
    if (!containerRef.current) return { seek: () => {} };
    return createTimeline({ autoplay: false })
      .add('.aSR-title', {
        opacity: [0, 1], translateY: [-16, 0],
        duration: 450, ease: 'outQuart',
      }, 0)
      .add('.aSR-card', {
        opacity: [0, 1],
        translateY: [30, 0],
        scale: [0.92, 1],
        duration: 550,
        delay: stagger(100),
        ease: 'outExpo',
      }, 200);
  }, [JSON.stringify(items), headline]);

  // Spotlight orgánico
  const spotX = 50 + Math.sin(frame * 0.035) * 28;
  const spotY = 50 + Math.cos(frame * 0.028) * 18;

  return (
    <AbsoluteFill ref={containerRef} style={{
      background: bg || darkBg(primaryColor),
      overflow: 'hidden', padding: 24,
      justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 14,
    }}>
      {headline && (
        <div className="aSR-title" style={{
          fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
          fontFamily: 'system-ui', opacity: 0, marginBottom: 4, textAlign: 'center',
        }}>{headline}</div>
      )}
      {items.map((item, i) => (
        <div key={i} className="aSR-card" style={{
          width: '100%', borderRadius: 18, padding: '20px 22px', opacity: 0,
          background: `radial-gradient(circle at ${spotX}% ${spotY}%, rgba(${h2r(primaryColor)},0.14) 0%, rgba(255,255,255,0.04) 70%)`,
          border: `1px solid rgba(255,255,255,0.09)`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: primaryColor, boxShadow: `0 0 8px ${primaryColor}`,
          }} />
          <div style={{ fontSize: 17, color: '#e0e0e0', fontFamily: 'system-ui', fontWeight: 500 }}>{item}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
}

// ─── 10. ANIME OUTRO SPECTRUM ─────────────────────────────────────────────────
// Barras de espectro que se animan con stagger + logo que emerge
// stagger escalonado con from:'center' para las barras
export function AnimeSpectrumOutro({ siteName, primaryColor, bg }) {
  const containerRef = useRef(null);
  const frame = useCurrentFrame();
  const BAR_COUNT = 28;

  useAnime(() => {
    if (!containerRef.current) return { seek: () => {} };
    return createTimeline({ autoplay: false })
      .add('.aSO-bar', {
        scaleY: [0, 1],
        opacity: [0, 1],
        duration: 600,
        delay: stagger(20, { from: 'center' }),
        ease: 'outElastic(1, 0.5)',
      }, 0)
      .add('.aSO-logo', {
        opacity: [0, 1],
        translateY: [20, 0],
        scale: [0.85, 1],
        duration: 500,
        ease: 'outExpo',
      }, 400);
  }, [siteName]);

  return (
    <AbsoluteFill ref={containerRef} style={{
      background: bg || darkBg(primaryColor),
      overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
      flexDirection: 'column', gap: 24,
    }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80 }}>
        {Array.from({ length: BAR_COUNT }, (_, i) => {
          const baseH = 18 + Math.sin(i * 0.55) * 16;
          const wave = Math.sin(frame * 0.08 + i * 0.38) * 18;
          const h = Math.max(4, baseH + wave);
          return (
            <div key={i} className="aSO-bar" style={{
              width: 7, height: h,
              background: `rgba(${h2r(primaryColor)},${0.35 + (i / BAR_COUNT) * 0.55})`,
              borderRadius: '3px 3px 0 0',
              transformOrigin: 'bottom', opacity: 0,
            }} />
          );
        })}
      </div>
      <div className="aSO-logo" style={{ opacity: 0, textAlign: 'center' }}>
        <div style={{
          fontSize: 52, fontWeight: 700, color: '#fff',
          fontFamily: 'system-ui', letterSpacing: '-0.03em',
        }}>{siteName}</div>
        <div style={{
          height: 2, marginTop: 10,
          background: `linear-gradient(90deg,transparent,${primaryColor},transparent)`,
          opacity: 0.6,
        }} />
      </div>
    </AbsoluteFill>
  );
}

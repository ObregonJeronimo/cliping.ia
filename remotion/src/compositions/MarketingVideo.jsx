import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Img,
  Sequence,
} from 'remotion';

// ─── Helpers ────────────────────────────────────────────────────────────────

function lerp(frame, a, b, from, to) {
  return interpolate(frame, [a, b], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

function spr(frame, fps, delay, damping = 14, stiffness = 120) {
  return spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping, stiffness, mass: 0.6 },
  });
}

// ─── Partículas ─────────────────────────────────────────────────────────────

function Particles({ color, count = 10 }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: count }, (_, i) => {
        const speed = 0.25 + i * 0.13;
        const phase = i * 137.5;
        const x = (i / count) * 100;
        const baseY = 15 + (i % 4) * 22;
        const y = baseY + Math.sin((frame * speed + phase) * Math.PI / 180) * (12 + i * 5);
        const opacity = 0.06 + Math.abs(Math.sin((frame * speed * 0.6 + phase) * Math.PI / 180)) * 0.08;
        const size = 2 + (i % 4);
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${x}%`, top: `${y}%`,
            width: size, height: size,
            borderRadius: '50%',
            background: color,
            opacity,
          }} />
        );
      })}
    </AbsoluteFill>
  );
}

// ─── Glow animado ───────────────────────────────────────────────────────────

function AnimGlow({ color, x = '50%', y = '50%', size = 400 }) {
  const frame = useCurrentFrame();
  const pulse = 0.75 + Math.sin(frame * 0.05) * 0.25;
  return (
    <div style={{
      position: 'absolute',
      width: size, height: size,
      borderRadius: '50%',
      background: `radial-gradient(circle, ${color}${Math.round(pulse * 40).toString(16).padStart(2,'0')} 0%, transparent 70%)`,
      left: x, top: y,
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
    }} />
  );
}

// ─── Línea decorativa animada ────────────────────────────────────────────────

function AnimLine({ color, progress }) {
  return (
    <div style={{
      width: 48 * progress, height: 3,
      background: `linear-gradient(90deg, ${color}, transparent)`,
      borderRadius: 2,
      marginTop: 12,
    }} />
  );
}

// ─── ESCENA 1: Hero ─ 0-3s (frames 0-89) ────────────────────────────────────

function SceneHero({ data, variant }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { primaryColor, secondaryColor, siteName, headline, visualStyle } = data;
  const { bgAngle = 145 } = variant;

  const bgRotate = bgAngle + frame * 0.04;
  const chipP  = spr(frame, fps, 5, 16, 100);
  const titleP = spr(frame, fps, 12, 13, 120);
  const lineP  = spr(frame, fps, 20, 18, 100);
  const subP   = spr(frame, fps, 25, 15, 100);
  const glowP  = spr(frame, fps, 0, 20, 80);

  const isDark = visualStyle !== 'minimal';
  const bg = visualStyle === 'minimal'
    ? '#ffffff'
    : visualStyle === 'brand'
      ? `linear-gradient(${bgRotate}deg, ${primaryColor} 0%, ${secondaryColor} 70%, #0a0010 100%)`
      : visualStyle === 'neon'
        ? `linear-gradient(${bgRotate}deg, #0a0015 0%, #000a1f 100%)`
        : visualStyle === 'corporate'
          ? `linear-gradient(${bgRotate}deg, #0d1a2e 0%, #071020 100%)`
          : `linear-gradient(${bgRotate}deg, #07070f 0%, #0d0d1a 100%)`;

  const accentColor = visualStyle === 'minimal' ? primaryColor : 'rgba(255,255,255,0.85)';
  const chipBg = visualStyle === 'minimal'
    ? `${primaryColor}15`
    : 'rgba(255,255,255,0.12)';
  const chipBorder = visualStyle === 'minimal'
    ? `1px solid ${primaryColor}30`
    : '1px solid rgba(255,255,255,0.2)';

  return (
    <AbsoluteFill style={{ background: bg, overflow: 'hidden' }}>
      {isDark && <Particles color="rgba(255,255,255,0.9)" count={12} />}
      {isDark && <AnimGlow color={primaryColor} x="50%" y="40%" size={500} />}

      {/* Círculo decorativo */}
      <div style={{
        position: 'absolute', width: 550, height: 550, borderRadius: '50%',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : `${primaryColor}10`}`,
        top: -200, right: -180,
        transform: `rotate(${frame * 0.02}deg)`,
      }} />
      <div style={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : `${primaryColor}08`}`,
        bottom: -80, left: -80,
      }} />

      <AbsoluteFill style={{
        justifyContent: 'center', alignItems: 'center',
        flexDirection: 'column', padding: 36, gap: 0,
      }}>
        {/* Chip */}
        <div style={{
          background: chipBg, backdropFilter: 'blur(12px)',
          borderRadius: 100, padding: '6px 18px', marginBottom: 20,
          opacity: chipP, transform: `translateY(${(1-chipP)*20}px)`,
          border: chipBorder,
        }}>
          <span style={{
            color: isDark ? 'rgba(255,255,255,0.9)' : primaryColor,
            fontSize: 11, fontFamily: 'sans-serif', fontWeight: 700, letterSpacing: 2,
          }}>✦ PRESENTAMOS</span>
        </div>

        {/* Nombre */}
        <h1 style={{
          color: isDark ? 'white' : '#0a0a0a',
          fontSize: 60, fontFamily: 'sans-serif', fontWeight: 900,
          textAlign: 'center', margin: '0 0 4px',
          letterSpacing: -2.5, lineHeight: 1.0,
          opacity: titleP,
          transform: `translateY(${(1-titleP)*32}px) scale(${0.82 + titleP * 0.18})`,
          ...(visualStyle === 'minimal' ? {
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          } : {}),
        }}>
          {siteName}
        </h1>

        {/* Línea */}
        <AnimLine color={isDark ? 'rgba(255,255,255,0.6)' : primaryColor} progress={lineP} />

        {/* Headline */}
        <p style={{
          color: isDark ? 'rgba(255,255,255,0.82)' : '#333',
          fontSize: 17, fontFamily: 'sans-serif', fontWeight: 500,
          textAlign: 'center', margin: '16px 0 0', lineHeight: 1.55,
          maxWidth: 280, opacity: subP, transform: `translateY(${(1-subP)*18}px)`,
        }}>
          {headline}
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ─── ESCENA 2: iPhone mockup ─ 3-10s (frames 90-299) ────────────────────────

function SceneMockup({ data, variant }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { primaryColor, secondaryColor, headline, screenshotUrl, visualStyle } = data;

  const phoneP  = spr(frame, fps, 0, 13, 100);
  const textP   = spr(frame, fps, 28, 14, 100);
  const float   = Math.sin(frame * 0.055) * 7;
  const tilt    = Math.sin(frame * 0.038) * 1.8;

  const isDark = visualStyle !== 'minimal';
  const bg = isDark ? 'linear-gradient(180deg, #07070f 0%, #0f0f1a 100%)' : '#f0f0f0';

  return (
    <AbsoluteFill style={{ background: bg, justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      {isDark && <AnimGlow color={primaryColor} x="50%" y="50%" size={420} />}
      {isDark && <Particles color={primaryColor} count={14} />}

      {/* iPhone */}
      <div style={{
        transform: `translateY(${(1-phoneP)*150 + float}px) rotate(${tilt}deg)`,
        opacity: phoneP, position: 'relative', zIndex: 2,
      }}>
        {/* Sombra */}
        <div style={{
          position: 'absolute', bottom: -24, left: '8%', right: '8%', height: 24,
          background: `radial-gradient(ellipse, ${primaryColor}45 0%, transparent 70%)`,
          filter: 'blur(10px)',
        }} />
        {/* Marco */}
        <div style={{
          width: 200, height: 395,
          background: isDark
            ? 'linear-gradient(145deg, #2a2a3e, #1a1a2e)'
            : 'linear-gradient(145deg, #e8e8e8, #d0d0d0)',
          borderRadius: 38,
          border: isDark ? '2.5px solid #3a3a5e' : '2.5px solid #bbb',
          overflow: 'hidden',
          boxShadow: isDark
            ? `0 40px 90px rgba(0,0,0,0.85), 0 0 0 1px #4a4a6e, inset 0 1px 0 rgba(255,255,255,0.08)`
            : `0 30px 70px rgba(0,0,0,0.15), 0 0 0 1px #ccc`,
          position: 'relative',
        }}>
          {/* Dynamic Island */}
          <div style={{
            position: 'absolute', top: 10, left: '50%',
            transform: 'translateX(-50%)',
            width: 72, height: 22,
            background: '#000', borderRadius: 12, zIndex: 10,
          }} />
          {screenshotUrl ? (
            <Img src={screenshotUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: `linear-gradient(180deg, ${primaryColor}40 0%, #050510 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 36 }}>🌐</span>
            </div>
          )}
          {/* Overlay bottom */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
            background: isDark
              ? 'linear-gradient(0deg, rgba(10,10,20,0.8) 0%, transparent 100%)'
              : 'linear-gradient(0deg, rgba(240,240,240,0.8) 0%, transparent 100%)',
          }} />
        </div>
      </div>

      {/* Texto */}
      <div style={{
        marginTop: 30, opacity: textP,
        transform: `translateY(${(1-textP)*20}px)`,
        textAlign: 'center', padding: '0 44px', zIndex: 2,
      }}>
        <p style={{
          color: isDark ? 'rgba(255,255,255,0.65)' : '#555',
          fontSize: 15, fontFamily: 'sans-serif', fontWeight: 400, margin: 0, lineHeight: 1.6,
        }}>{headline}</p>
      </div>
    </AbsoluteFill>
  );
}

// ─── ESCENA 3: Beneficios ─ 10-19s (frames 300-569) ─────────────────────────

function BenefitCard({ text, index, primaryColor, isDark }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delay = index * 20;
  const p = spr(frame, fps, delay, 14, 100);
  const icons = ['⚡', '🎯', '🚀', '✨', '💎', '🔥', '✅', '🛡️'];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      opacity: p, transform: `translateX(${(1-p)*-50}px)`,
      marginBottom: 14,
      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      borderRadius: 14, padding: '12px 16px',
      border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 11, flexShrink: 0,
        background: `linear-gradient(135deg, ${primaryColor}28, ${primaryColor}10)`,
        border: `1px solid ${primaryColor}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
      }}>
        {icons[index % icons.length]}
      </div>
      <span style={{
        color: isDark ? 'rgba(255,255,255,0.88)' : '#222',
        fontSize: 15, fontFamily: 'sans-serif', fontWeight: 500, lineHeight: 1.4,
      }}>{text}</span>
    </div>
  );
}

function SceneBenefits({ data, variant }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { primaryColor, benefits, siteName, visualStyle } = data;
  const isDark = visualStyle !== 'minimal';
  const bg = isDark
    ? (visualStyle === 'neon' ? 'linear-gradient(160deg, #050010, #000a1a)' : 'linear-gradient(160deg, #08080f 0%, #0d0d1a 100%)')
    : '#fafafa';

  const titleP = spr(frame, fps, 0, 16, 100);
  const lineP  = spr(frame, fps, 8, 18, 100);
  const scanY  = lerp(frame, 0, 270, -5, 108);

  return (
    <AbsoluteFill style={{ background: bg, padding: '36px 30px', justifyContent: 'center', overflow: 'hidden' }}>
      {/* Scan line */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${primaryColor}50, transparent)`,
        top: `${scanY}%`, pointerEvents: 'none',
      }} />
      {/* Borde izquierdo */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: `linear-gradient(180deg, transparent, ${primaryColor}, transparent)`,
        opacity: 0.7,
      }} />

      {isDark && <Particles color={primaryColor} count={6} />}

      {/* Header */}
      <div style={{ opacity: titleP, transform: `translateY(${(1-titleP)*-20}px)`, marginBottom: 22 }}>
        <div style={{
          color: primaryColor, fontSize: 10, fontFamily: 'sans-serif',
          fontWeight: 800, letterSpacing: 3.5, textTransform: 'uppercase', marginBottom: 6,
        }}>
          ¿POR QUÉ {siteName?.toUpperCase()}?
        </div>
        <h2 style={{
          color: isDark ? 'white' : '#0a0a0a',
          fontSize: 26, fontFamily: 'sans-serif', fontWeight: 900,
          margin: 0, letterSpacing: -1, lineHeight: 1.15,
        }}>
          Todo lo que necesitás,{'\n'}
          <span style={{ color: primaryColor }}>en un solo lugar.</span>
        </h2>
        <AnimLine color={primaryColor} progress={lineP} />
      </div>

      {(benefits || []).slice(0, 4).map((b, i) => (
        <BenefitCard key={i} text={b} index={i} primaryColor={primaryColor} isDark={isDark} />
      ))}
    </AbsoluteFill>
  );
}

// ─── ESCENA 4: CTA ─ 19-26s (frames 570-779) ────────────────────────────────

function SceneCTA({ data, variant }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { primaryColor, secondaryColor, cta, screenshotUrl, visualStyle, guarantee } = data;
  const isDark = visualStyle !== 'minimal';

  const bgScale   = lerp(frame, 0, 210, 1.0, 1.12);
  const overlayP  = spr(frame, fps, 0, 20, 80);
  const textP     = spr(frame, fps, 30, 14, 100);
  const ctaP      = spr(frame, fps, 48, 12, 100);
  const pulse     = 1 + Math.sin(frame * 0.12) * 0.028;
  const glowVal   = 0.55 + Math.sin(frame * 0.08) * 0.45;
  const glowHex   = Math.round(glowVal * 100).toString(16).padStart(2,'0');

  const bg = isDark
    ? (screenshotUrl ? 'transparent' : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`)
    : '#ffffff';

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: bg }}>
      {screenshotUrl && (
        <div style={{
          position: 'absolute', inset: 0,
          transform: `scale(${bgScale})`, transformOrigin: 'center 30%',
        }}>
          <Img src={screenshotUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        </div>
      )}

      {/* Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: isDark
          ? `linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.15) 100%)`
          : `linear-gradient(0deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.7) 60%, transparent 100%)`,
        opacity: overlayP,
      }} />

      {isDark && <Particles color={primaryColor} count={8} />}
      {isDark && <AnimGlow color={primaryColor} x="50%" y="70%" size={350} />}

      <AbsoluteFill style={{
        justifyContent: 'flex-end', alignItems: 'center',
        paddingBottom: 72, flexDirection: 'column', gap: 14,
      }}>
        <div style={{ opacity: textP, transform: `translateY(${(1-textP)*30}px)`, textAlign: 'center' }}>
          <div style={{
            color: primaryColor, fontSize: 11, fontFamily: 'sans-serif',
            fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8,
          }}>¿Listo para empezar?</div>
          <p style={{
            color: isDark ? 'rgba(255,255,255,0.7)' : '#444',
            fontSize: 15, fontFamily: 'sans-serif', margin: 0, lineHeight: 1.5, maxWidth: 260,
          }}>
            Transformá la forma en que gestionás tu negocio
          </p>
        </div>

        {/* Botón CTA */}
        <div style={{ opacity: ctaP, transform: `translateY(${(1-ctaP)*30}px) scale(${pulse})` }}>
          <div style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
            borderRadius: 100, padding: '16px 34px',
            boxShadow: `0 0 ${28 + glowVal * 32}px ${primaryColor}${glowHex}`,
          }}>
            <span style={{
              color: 'white', fontSize: 17, fontFamily: 'sans-serif',
              fontWeight: 800, letterSpacing: -0.3,
            }}>{cta} →</span>
          </div>
        </div>

        {/* Garantía */}
        {guarantee && (
          <div style={{
            opacity: ctaP * 0.7,
            color: isDark ? 'rgba(255,255,255,0.45)' : '#888',
            fontSize: 12, fontFamily: 'sans-serif',
          }}>✓ {guarantee}</div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ─── ESCENA 5: Logo final ─ 26-30s (frames 780-899) ─────────────────────────

function SceneLogo({ data, variant }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { primaryColor, secondaryColor, siteName, visualStyle } = data;
  const isDark = visualStyle !== 'minimal';

  const p         = spr(frame, fps, 0, 18, 100);
  const glowPulse = 0.65 + Math.sin(frame * 0.1) * 0.35;
  const angle     = frame * 2;

  return (
    <AbsoluteFill style={{
      background: isDark ? '#000' : '#fff',
      justifyContent: 'center', alignItems: 'center', flexDirection: 'column',
    }}>
      <AnimGlow color={primaryColor} x="50%" y="50%" size={520} />

      {/* Partículas orbitando */}
      {[0,1,2,3,4,5].map(i => {
        const a = (angle + i * 60) * Math.PI / 180;
        const r = 100 + (i % 2) * 30;
        return (
          <div key={i} style={{
            position: 'absolute',
            width: 5 + (i%3), height: 5 + (i%3),
            borderRadius: '50%',
            background: i % 2 === 0 ? primaryColor : secondaryColor,
            transform: `translate(${Math.cos(a)*r}px, ${Math.sin(a)*r}px)`,
            opacity: p * 0.75,
          }} />
        );
      })}

      <div style={{
        transform: `scale(${p}) rotate(${(1-p)*-8}deg)`,
        opacity: p, textAlign: 'center', zIndex: 2,
      }}>
        <div style={{
          fontSize: 62, fontFamily: 'sans-serif', fontWeight: 900,
          background: `linear-gradient(135deg, ${isDark ? 'white' : primaryColor}, ${primaryColor}, ${secondaryColor})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: -2.5, marginBottom: 6,
        }}>{siteName}</div>
        <div style={{
          color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
          fontSize: 11, fontFamily: 'sans-serif', letterSpacing: 5, textTransform: 'uppercase',
        }}>Empezá hoy</div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Transición flash entre escenas ─────────────────────────────────────────

function Flash({ atFrame, duration = 6 }) {
  const frame = useCurrentFrame();
  const raw = frame - atFrame;
  if (raw < 0 || raw > duration) return null;
  const opacity = Math.sin((raw / duration) * Math.PI) * 0.35;
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'white', opacity,
      pointerEvents: 'none', zIndex: 999,
    }} />
  );
}

// ─── Composición principal ───────────────────────────────────────────────────

// Timing exacto sin solapamientos
const T = {
  hero:     { from: 0,   dur: 90  },  // 0-3s
  mockup:   { from: 90,  dur: 210 },  // 3-10s
  benefits: { from: 300, dur: 270 },  // 10-19s
  cta:      { from: 570, dur: 210 },  // 19-26s
  logo:     { from: 780, dur: 120 },  // 26-30s
};

export const MarketingVideo = (props) => {
  const {
    siteName = 'Mi Sitio',
    headline = 'La solución que necesitás',
    benefits = ['Beneficio 1', 'Beneficio 2', 'Beneficio 3'],
    cta = 'Empezá gratis',
    primaryColor = '#6366f1',
    secondaryColor = '#818cf8',
    screenshotUrl = null,
    problem = '',
    audience = '',
    features = [],
    numbers = [],
    guarantee = '',
    subheadline = '',
    // Parámetros de variación
    visualStyle = 'dark_premium',
    narrative = 'problem_solution',
    hook = 'question',
    tone = 'enthusiastic',
    focus = 'product',
  } = props;

  const data = {
    siteName, headline, benefits, cta,
    primaryColor, secondaryColor, screenshotUrl,
    problem, audience, features, numbers, guarantee, subheadline,
    visualStyle, narrative, hook, tone, focus,
  };

  // Variante visual basada en los parámetros
  const variant = {
    bgAngle: narrative === 'problem_solution' ? 145
           : narrative === 'story' ? 200
           : narrative === 'urgency' ? 160
           : 135,
  };

  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Sequence from={T.hero.from} durationInFrames={T.hero.dur}>
        <SceneHero data={data} variant={variant} />
      </Sequence>

      <Sequence from={T.mockup.from} durationInFrames={T.mockup.dur}>
        <SceneMockup data={data} variant={variant} />
      </Sequence>

      <Sequence from={T.benefits.from} durationInFrames={T.benefits.dur}>
        <SceneBenefits data={data} variant={variant} />
      </Sequence>

      <Sequence from={T.cta.from} durationInFrames={T.cta.dur}>
        <SceneCTA data={data} variant={variant} />
      </Sequence>

      <Sequence from={T.logo.from} durationInFrames={T.logo.dur}>
        <SceneLogo data={data} variant={variant} />
      </Sequence>

      {/* Flashes de transición exactos entre escenas */}
      <Flash atFrame={T.mockup.from} />
      <Flash atFrame={T.benefits.from} />
      <Flash atFrame={T.cta.from} />
      <Flash atFrame={T.logo.from} />
    </AbsoluteFill>
  );
};

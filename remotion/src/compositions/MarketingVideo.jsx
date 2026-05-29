import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Img,
  Sequence,
} from 'remotion';

// ─── Easing helpers ────────────────────────────────────────────────────────

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

function lerp(frame, inStart, inEnd, outStart, outEnd) {
  return interpolate(frame, [inStart, inEnd], [outStart, outEnd], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

function spr(frame, fps, delay = 0, damping = 14, stiffness = 120) {
  return spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping, stiffness, mass: 0.6 },
  });
}

// ─── Partículas flotantes (siempre en movimiento) ──────────────────────────

function FloatingParticles({ color, count = 8 }) {
  const frame = useCurrentFrame();
  const particles = Array.from({ length: count }, (_, i) => {
    const speed = 0.3 + (i * 0.15);
    const amp = 15 + i * 8;
    const phase = (i * 137.5) % 360;
    const x = (i / count) * 100;
    const baseY = 20 + (i % 3) * 30;
    const y = baseY + Math.sin((frame * speed + phase) * Math.PI / 180) * amp;
    const opacity = 0.1 + Math.sin((frame * speed * 0.7 + phase) * Math.PI / 180) * 0.08;
    const size = 3 + (i % 3) * 2;
    return { x, y, opacity, size };
  });

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: p.size,
          height: p.size,
          borderRadius: '50%',
          background: color,
          opacity: p.opacity,
        }} />
      ))}
    </AbsoluteFill>
  );
}

// ─── Líneas animadas de fondo ──────────────────────────────────────────────

function AnimatedLines({ color }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      {[0, 1, 2].map(i => {
        const offset = lerp(frame, 0, 300, 0, 100 + i * 30);
        return (
          <div key={i} style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${color}20, transparent)`,
            top: `${(30 + i * 25 + offset) % 100}%`,
            transform: 'rotate(-15deg) scaleX(1.5)',
          }} />
        );
      })}
    </AbsoluteFill>
  );
}

// ─── ESCENA 1: Hero (0-3s = frames 0-89) ──────────────────────────────────

function SceneHero({ siteName, headline, primaryColor, secondaryColor }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animaciones de entrada
  const bgProgress = spr(frame, fps, 0, 20, 80);
  const chipProgress = spr(frame, fps, 5, 16, 100);
  const titleProgress = spr(frame, fps, 10, 14, 120);
  const lineProgress = spr(frame, fps, 18, 18, 100);
  const subtitleProgress = spr(frame, fps, 22, 16, 100);

  // Pulso continuo del glow
  const glowPulse = 0.8 + Math.sin(frame * 0.08) * 0.2;
  // Rotación suave del fondo
  const bgRotate = frame * 0.05;

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(${135 + bgRotate}deg, ${primaryColor} 0%, ${secondaryColor} 60%, #1a0533 100%)`,
      overflow: 'hidden',
    }}>
      {/* Círculo glow animado */}
      <div style={{
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(255,255,255,${0.08 * glowPulse}) 0%, transparent 70%)`,
        top: -200,
        left: '50%',
        transform: `translateX(-50%) scale(${bgProgress})`,
      }} />
      <div style={{
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)`,
        bottom: -80,
        left: -60,
      }} />

      <FloatingParticles color="rgba(255,255,255,0.8)" count={10} />
      <AnimatedLines color="white" />

      <AbsoluteFill style={{
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        padding: 36,
        gap: 0,
      }}>
        {/* Chip */}
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(12px)',
          borderRadius: 100,
          padding: '6px 18px',
          marginBottom: 20,
          opacity: chipProgress,
          transform: `translateY(${(1 - chipProgress) * 20}px)`,
          border: '1px solid rgba(255,255,255,0.2)',
        }}>
          <span style={{ color: 'white', fontSize: 11, fontFamily: 'sans-serif', fontWeight: 700, letterSpacing: 2 }}>
            ✦ PRESENTAMOS
          </span>
        </div>

        {/* Nombre */}
        <h1 style={{
          color: 'white',
          fontSize: 58,
          fontFamily: 'sans-serif',
          fontWeight: 900,
          textAlign: 'center',
          margin: '0 0 4px',
          letterSpacing: -2.5,
          lineHeight: 1.0,
          opacity: titleProgress,
          transform: `translateY(${(1 - titleProgress) * 30}px) scale(${0.85 + titleProgress * 0.15})`,
        }}>
          {siteName}
        </h1>

        {/* Línea */}
        <div style={{
          width: 50 * lineProgress,
          height: 3,
          background: 'rgba(255,255,255,0.7)',
          borderRadius: 2,
          margin: '16px auto',
        }} />

        {/* Headline */}
        <p style={{
          color: 'rgba(255,255,255,0.88)',
          fontSize: 17,
          fontFamily: 'sans-serif',
          fontWeight: 500,
          textAlign: 'center',
          margin: 0,
          lineHeight: 1.55,
          maxWidth: 270,
          opacity: subtitleProgress,
          transform: `translateY(${(1 - subtitleProgress) * 20}px)`,
        }}>
          {headline}
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ─── ESCENA 2: iPhone mockup (frames 90-300 = 3s-10s) ─────────────────────

function SceneMockup({ screenshotUrl, primaryColor, secondaryColor, headline }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneProgress = spr(frame, fps, 0, 14, 100);
  const glowProgress = spr(frame, fps, 5, 16, 90);
  const textProgress = spr(frame, fps, 25, 14, 100);

  // Flotación continua del teléfono
  const phoneFloat = Math.sin(frame * 0.06) * 6;
  // Rotación suave
  const phoneRotate = Math.sin(frame * 0.04) * 1.5;

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(180deg, #07070f 0%, #0f0f1a 100%)',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
    }}>
      {/* Glow de fondo animado */}
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${primaryColor}35 0%, transparent 70%)`,
        opacity: glowProgress,
        transform: `scale(${0.5 + glowProgress * 0.7})`,
      }} />

      <FloatingParticles color={primaryColor} count={12} />

      {/* iPhone */}
      <div style={{
        transform: `translateY(${(1 - phoneProgress) * 150 + phoneFloat}px) rotate(${phoneRotate}deg)`,
        opacity: phoneProgress,
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Sombra del teléfono */}
        <div style={{
          position: 'absolute',
          bottom: -20,
          left: '10%',
          right: '10%',
          height: 20,
          background: `radial-gradient(ellipse, ${primaryColor}50 0%, transparent 70%)`,
          filter: 'blur(8px)',
        }} />

        {/* Marco iPhone */}
        <div style={{
          width: 195,
          height: 390,
          background: 'linear-gradient(145deg, #2a2a3e, #1a1a2e)',
          borderRadius: 36,
          border: '2.5px solid #3a3a5e',
          overflow: 'hidden',
          boxShadow: `
            0 40px 100px rgba(0,0,0,0.9),
            0 0 0 1px #4a4a6e,
            inset 0 1px 0 rgba(255,255,255,0.1)
          `,
          position: 'relative',
        }}>
          {/* Dynamic Island */}
          <div style={{
            position: 'absolute',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 70,
            height: 22,
            background: '#000',
            borderRadius: 12,
            zIndex: 10,
          }} />

          {/* Contenido */}
          {screenshotUrl ? (
            <Img src={screenshotUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: `linear-gradient(180deg, ${primaryColor}40 0%, #050510 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 32 }}>🌐</span>
            </div>
          )}

          {/* Overlay gradiente inferior */}
          <div style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: 80,
            background: 'linear-gradient(0deg, rgba(10,10,20,0.8) 0%, transparent 100%)',
          }} />
        </div>
      </div>

      {/* Texto */}
      <div style={{
        marginTop: 28,
        opacity: textProgress,
        transform: `translateY(${(1 - textProgress) * 20}px)`,
        textAlign: 'center',
        padding: '0 44px',
        zIndex: 2,
      }}>
        <p style={{
          color: 'rgba(255,255,255,0.65)',
          fontSize: 15,
          fontFamily: 'sans-serif',
          fontWeight: 400,
          margin: 0,
          lineHeight: 1.6,
        }}>
          {headline}
        </p>
      </div>
    </AbsoluteFill>
  );
}

// ─── ESCENA 3: Beneficios (frames 300-570 = 10s-19s) ──────────────────────

function BenefitCard({ text, index, primaryColor }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delay = index * 18;
  const progress = spr(frame, fps, delay, 14, 100);
  const icons = ['⚡', '🎯', '🚀', '✨', '💎', '🔥'];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      opacity: progress,
      transform: `translateX(${(1 - progress) * -50}px)`,
      marginBottom: 16,
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 14,
      padding: '12px 16px',
      border: `1px solid rgba(255,255,255,0.06)`,
    }}>
      <div style={{
        width: 40, height: 40,
        borderRadius: 10,
        background: `linear-gradient(135deg, ${primaryColor}30, ${primaryColor}10)`,
        border: `1px solid ${primaryColor}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>
        {icons[index % icons.length]}
      </div>
      <span style={{
        color: 'rgba(255,255,255,0.9)',
        fontSize: 15,
        fontFamily: 'sans-serif',
        fontWeight: 500,
        lineHeight: 1.4,
      }}>
        {text}
      </span>
    </div>
  );
}

function SceneBenefits({ benefits, primaryColor, siteName }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spr(frame, fps, 0, 16, 100);
  const lineProgress = spr(frame, fps, 8, 18, 100);
  // Scan line animada
  const scanY = lerp(frame, 0, 270, -10, 110);

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(160deg, #08080f 0%, #0d0d1a 100%)',
      padding: '36px 32px',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Scan line */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0,
        height: 1,
        background: `linear-gradient(90deg, transparent, ${primaryColor}60, transparent)`,
        top: `${scanY}%`,
        pointerEvents: 'none',
      }} />

      {/* Borde izquierdo animado */}
      <div style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: 3,
        background: `linear-gradient(180deg, transparent, ${primaryColor}, transparent)`,
        opacity: 0.8,
      }} />

      <FloatingParticles color={primaryColor} count={6} />

      {/* Header */}
      <div style={{
        opacity: titleProgress,
        transform: `translateY(${(1 - titleProgress) * -20}px)`,
        marginBottom: 24,
      }}>
        <div style={{
          color: primaryColor,
          fontSize: 10,
          fontFamily: 'sans-serif',
          fontWeight: 800,
          letterSpacing: 3.5,
          textTransform: 'uppercase',
          marginBottom: 6,
        }}>
          ¿POR QUÉ {siteName?.toUpperCase()}?
        </div>
        <h2 style={{
          color: 'white',
          fontSize: 26,
          fontFamily: 'sans-serif',
          fontWeight: 900,
          margin: 0,
          letterSpacing: -1,
          lineHeight: 1.15,
        }}>
          Todo lo que necesitás,<br />
          <span style={{ color: primaryColor }}>en un solo lugar.</span>
        </h2>
        {/* Línea animada */}
        <div style={{
          width: 40 * lineProgress,
          height: 2,
          background: `linear-gradient(90deg, ${primaryColor}, transparent)`,
          marginTop: 10,
          borderRadius: 2,
        }} />
      </div>

      {benefits.slice(0, 4).map((b, i) => (
        <BenefitCard key={i} text={b} index={i} primaryColor={primaryColor} />
      ))}
    </AbsoluteFill>
  );
}

// ─── ESCENA 4: CTA con screenshot (frames 570-780 = 19s-26s) ──────────────

function SceneCTA({ screenshotUrl, cta, primaryColor, secondaryColor }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Zoom continuo lento en el screenshot
  const bgScale = lerp(frame, 0, 210, 1.0, 1.12);
  const overlayProgress = spr(frame, fps, 0, 20, 80);
  const textProgress = spr(frame, fps, 30, 14, 100);
  const ctaProgress = spr(frame, fps, 45, 12, 100);

  // Pulso del botón CTA
  const ctaPulse = 1 + Math.sin(frame * 0.12) * 0.03;
  const ctaGlow = 0.6 + Math.sin(frame * 0.08) * 0.4;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* Screenshot con zoom continuo */}
      <div style={{
        position: 'absolute', inset: 0,
        transform: `scale(${bgScale})`,
        transformOrigin: 'center 30%',
      }}>
        {screenshotUrl ? (
          <Img src={screenshotUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          }} />
        )}
      </div>

      {/* Overlay multi-capa */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.2) 100%)`,
        opacity: overlayProgress,
      }} />

      {/* Partículas sobre el overlay */}
      <FloatingParticles color={primaryColor} count={8} />

      {/* Contenido */}
      <AbsoluteFill style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 70,
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{
          opacity: textProgress,
          transform: `translateY(${(1 - textProgress) * 30}px)`,
          textAlign: 'center',
        }}>
          <div style={{
            color: primaryColor,
            fontSize: 11,
            fontFamily: 'sans-serif',
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            ¿Listo para empezar?
          </div>
          <p style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 15,
            fontFamily: 'sans-serif',
            margin: 0,
            lineHeight: 1.5,
            maxWidth: 260,
          }}>
            Empezá hoy y transformá tu negocio digital
          </p>
        </div>

        {/* Botón CTA pulsante */}
        <div style={{
          opacity: ctaProgress,
          transform: `translateY(${(1 - ctaProgress) * 30}px) scale(${ctaPulse})`,
        }}>
          <div style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
            borderRadius: 100,
            padding: '15px 32px',
            boxShadow: `0 0 ${30 + ctaGlow * 30}px ${primaryColor}${Math.round(ctaGlow * 100).toString(16).padStart(2, '0')}`,
          }}>
            <span style={{
              color: 'white',
              fontSize: 17,
              fontFamily: 'sans-serif',
              fontWeight: 800,
              letterSpacing: -0.3,
            }}>
              {cta} →
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ─── ESCENA 5: Logo final (frames 780-900 = 26s-30s) ──────────────────────

function SceneLogo({ siteName, primaryColor, secondaryColor }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spr(frame, fps, 0, 18, 100);
  const glowPulse = 0.7 + Math.sin(frame * 0.1) * 0.3;
  const particleAngle = frame * 2;

  return (
    <AbsoluteFill style={{
      background: '#000',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
    }}>
      {/* Glow pulsante */}
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${primaryColor}${Math.round(glowPulse * 40).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
        transform: `scale(${0.5 + progress * 0.6})`,
      }} />

      {/* Partículas orbitando */}
      {[0, 1, 2, 3].map(i => {
        const angle = (particleAngle + i * 90) * Math.PI / 180;
        const r = 120;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        return (
          <div key={i} style={{
            position: 'absolute',
            width: 6, height: 6,
            borderRadius: '50%',
            background: i % 2 === 0 ? primaryColor : secondaryColor,
            transform: `translate(${px}px, ${py}px)`,
            opacity: progress * 0.8,
          }} />
        );
      })}

      <div style={{
        transform: `scale(${progress}) rotate(${(1 - progress) * -10}deg)`,
        opacity: progress,
        textAlign: 'center',
        zIndex: 2,
      }}>
        <div style={{
          fontSize: 60,
          fontFamily: 'sans-serif',
          fontWeight: 900,
          background: `linear-gradient(135deg, white, ${primaryColor}, ${secondaryColor})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: -2.5,
          marginBottom: 4,
        }}>
          {siteName}
        </div>
        <div style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: 11,
          fontFamily: 'sans-serif',
          letterSpacing: 5,
          textTransform: 'uppercase',
        }}>
          Empezá hoy
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── TRANSICIÓN entre escenas ──────────────────────────────────────────────

function SceneTransition({ fromFrame, duration = 8 }) {
  const frame = useCurrentFrame();
  const progress = lerp(frame, fromFrame, fromFrame + duration, 0, 1);
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'white',
      opacity: Math.sin(progress * Math.PI) * 0.4,
      pointerEvents: 'none',
      zIndex: 100,
    }} />
  );
}

// ─── Composición principal ─────────────────────────────────────────────────

// Timing exacto sin solapamientos
const SCENE_TIMINGS = {
  hero:     { from: 0,   dur: 90  },  // 0-3s
  mockup:   { from: 90,  dur: 210 },  // 3-10s
  benefits: { from: 300, dur: 270 },  // 10-19s
  cta:      { from: 570, dur: 210 },  // 19-26s
  logo:     { from: 780, dur: 120 },  // 26-30s
};

export const MarketingVideo = ({
  siteName = "Mi Sitio",
  headline = "La solución que necesitás",
  benefits = ["Fácil de usar", "Ahorrá tiempo", "Resultados reales"],
  cta = "Empezá gratis",
  primaryColor = "#6366f1",
  secondaryColor = "#818cf8",
  accentColor = "#f0f9ff",
  screenshotUrl = null,
  logoUrl = null,
}) => {
  const T = SCENE_TIMINGS;

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {/* Escena 1: Hero */}
      <Sequence from={T.hero.from} durationInFrames={T.hero.dur}>
        <SceneHero siteName={siteName} headline={headline} primaryColor={primaryColor} secondaryColor={secondaryColor} />
      </Sequence>

      {/* Escena 2: Mockup iPhone */}
      <Sequence from={T.mockup.from} durationInFrames={T.mockup.dur}>
        <SceneMockup screenshotUrl={screenshotUrl} primaryColor={primaryColor} secondaryColor={secondaryColor} headline={headline} />
      </Sequence>

      {/* Escena 3: Beneficios */}
      <Sequence from={T.benefits.from} durationInFrames={T.benefits.dur}>
        <SceneBenefits benefits={benefits} primaryColor={primaryColor} siteName={siteName} />
      </Sequence>

      {/* Escena 4: CTA */}
      <Sequence from={T.cta.from} durationInFrames={T.cta.dur}>
        <SceneCTA screenshotUrl={screenshotUrl} cta={cta} primaryColor={primaryColor} secondaryColor={secondaryColor} />
      </Sequence>

      {/* Escena 5: Logo */}
      <Sequence from={T.logo.from} durationInFrames={T.logo.dur}>
        <SceneLogo siteName={siteName} primaryColor={primaryColor} secondaryColor={secondaryColor} />
      </Sequence>
    </AbsoluteFill>
  );
};

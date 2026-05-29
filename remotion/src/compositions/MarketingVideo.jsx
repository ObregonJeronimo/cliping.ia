import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Img,
  Sequence,
  Audio,
} from 'remotion';

// ─── Helpers ───────────────────────────────────────────────────────────────

function ease(frame, start, end, from, to) {
  return interpolate(frame, [start, end], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

function springAnim(frame, fps, delay = 0, damping = 12) {
  return spring({
    frame: frame - delay,
    fps,
    config: { damping, stiffness: 100, mass: 0.8 },
  });
}

// ─── Scene 1: Hero con nombre del sitio (0-3s = frames 0-89) ─────────────

function SceneHero({ siteName, headline, primaryColor, secondaryColor }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgScale = interpolate(frame, [0, 90], [1.05, 1], { extrapolateRight: 'clamp' });
  const titleY = ease(frame, 0, 25, 60, 0);
  const titleOpacity = ease(frame, 0, 20, 0, 1);
  const subtitleY = ease(frame, 10, 35, 40, 0);
  const subtitleOpacity = ease(frame, 10, 30, 0, 1);
  const lineScale = ease(frame, 15, 40, 0, 1);

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(145deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
      overflow: 'hidden',
    }}>
      {/* Círculos de fondo animados */}
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)',
        top: -150,
        right: -150,
        transform: `scale(${bgScale})`,
      }} />
      <div style={{
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)',
        bottom: -50,
        left: -80,
      }} />

      {/* Contenido central */}
      <AbsoluteFill style={{
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        padding: 40,
      }}>
        {/* Chip superior */}
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)',
          borderRadius: 100,
          padding: '6px 18px',
          marginBottom: 24,
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
        }}>
          <span style={{ color: 'white', fontSize: 13, fontFamily: 'sans-serif', fontWeight: 600, letterSpacing: 1 }}>
            ✦ VIDEO GENERADO CON IA
          </span>
        </div>

        {/* Nombre del sitio */}
        <div style={{
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
        }}>
          <h1 style={{
            color: 'white',
            fontSize: 52,
            fontFamily: 'sans-serif',
            fontWeight: 900,
            textAlign: 'center',
            margin: 0,
            letterSpacing: -2,
            lineHeight: 1.1,
          }}>
            {siteName}
          </h1>
        </div>

        {/* Línea decorativa */}
        <div style={{
          width: 60 * lineScale,
          height: 3,
          background: 'rgba(255,255,255,0.6)',
          borderRadius: 2,
          margin: '20px auto',
        }} />

        {/* Headline */}
        <div style={{
          transform: `translateY(${subtitleY}px)`,
          opacity: subtitleOpacity,
        }}>
          <p style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: 18,
            fontFamily: 'sans-serif',
            fontWeight: 500,
            textAlign: 'center',
            margin: 0,
            lineHeight: 1.5,
            maxWidth: 280,
          }}>
            {headline}
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ─── Scene 2: Mockup del sitio en iPhone (frames 90-300 = 3s-10s) ─────────

function SceneMockup({ screenshotUrl, primaryColor, headline }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneY = springAnim(frame, fps, 0, 14);
  const phoneScale = interpolate(phoneY, [0, 1], [0.7, 1], { extrapolateRight: 'clamp' });
  const textOpacity = ease(frame, 30, 55, 0, 1);
  const textY = ease(frame, 30, 55, 20, 0);

  return (
    <AbsoluteFill style={{
      background: '#0f0f13',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
    }}>
      {/* Glow de fondo */}
      <div style={{
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${primaryColor}40 0%, transparent 70%)`,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }} />

      {/* iPhone mockup */}
      <div style={{
        transform: `translateY(${(1 - phoneY) * 120}px) scale(${phoneScale})`,
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Marco del iPhone */}
        <div style={{
          width: 200,
          height: 380,
          background: '#1a1a2e',
          borderRadius: 32,
          border: '3px solid #333',
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 0 1px #444',
          position: 'relative',
        }}>
          {/* Notch */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 80,
            height: 22,
            background: '#1a1a2e',
            borderRadius: '0 0 16px 16px',
            zIndex: 10,
          }} />
          {/* Screenshot o placeholder */}
          {screenshotUrl ? (
            <Img
              src={screenshotUrl}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(180deg, ${primaryColor}30 0%, #0a0a0f 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                color: 'rgba(255,255,255,0.3)',
                fontSize: 12,
                fontFamily: 'sans-serif',
                textAlign: 'center',
                padding: 20,
              }}>
                🌐 {headline?.slice(0, 30)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Texto debajo */}
      <div style={{
        marginTop: 32,
        opacity: textOpacity,
        transform: `translateY(${textY}px)`,
        textAlign: 'center',
        padding: '0 40px',
        zIndex: 2,
      }}>
        <p style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: 15,
          fontFamily: 'sans-serif',
          margin: 0,
          lineHeight: 1.5,
        }}>
          {headline}
        </p>
      </div>
    </AbsoluteFill>
  );
}

// ─── Scene 3: Beneficios animados (frames 300-570 = 10s-19s) ───────────────

function BenefitItem({ text, index, frame, primaryColor }) {
  const delay = index * 20;
  const opacity = ease(frame, delay, delay + 20, 0, 1);
  const x = ease(frame, delay, delay + 25, -40, 0);

  const icons = ['⚡', '🎯', '🚀', '✨', '💎', '🔥'];
  const icon = icons[index % icons.length];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      opacity,
      transform: `translateX(${x}px)`,
      marginBottom: 20,
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: `${primaryColor}25`,
        border: `1px solid ${primaryColor}50`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <span style={{
        color: 'white',
        fontSize: 16,
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

  const titleOpacity = ease(frame, 0, 20, 0, 1);
  const titleY = ease(frame, 0, 20, -20, 0);

  return (
    <AbsoluteFill style={{
      background: '#0a0a0f',
      padding: 36,
      justifyContent: 'center',
    }}>
      {/* Línea decorativa izquierda */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        background: `linear-gradient(180deg, transparent, ${primaryColor}, transparent)`,
      }} />

      <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, marginBottom: 36 }}>
        <div style={{
          color: primaryColor,
          fontSize: 11,
          fontFamily: 'sans-serif',
          fontWeight: 700,
          letterSpacing: 3,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          ¿POR QUÉ {siteName.toUpperCase()}?
        </div>
        <h2 style={{
          color: 'white',
          fontSize: 28,
          fontFamily: 'sans-serif',
          fontWeight: 800,
          margin: 0,
          letterSpacing: -1,
          lineHeight: 1.2,
        }}>
          Todo lo que necesitás,<br />en un solo lugar.
        </h2>
      </div>

      {benefits.slice(0, 4).map((benefit, i) => (
        <BenefitItem
          key={i}
          text={benefit}
          index={i}
          frame={frame}
          primaryColor={primaryColor}
        />
      ))}
    </AbsoluteFill>
  );
}

// ─── Scene 4: Screenshot con zoom + CTA (frames 570-780 = 19s-26s) ─────────

function SceneCTA({ screenshotUrl, cta, primaryColor, secondaryColor }) {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [0, 210], [1, 1.08], { extrapolateRight: 'clamp' });
  const ctaY = ease(frame, 60, 90, 60, 0);
  const ctaOpacity = ease(frame, 60, 90, 0, 1);
  const overlayOpacity = ease(frame, 0, 30, 0.7, 0.5);
  const pulse = interpolate(
    Math.sin((frame / 15) * Math.PI),
    [-1, 1], [0.95, 1.05]
  );

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* Screenshot con zoom */}
      <div style={{
        position: 'absolute',
        inset: 0,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
      }}>
        {screenshotUrl ? (
          <Img src={screenshotUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          }} />
        )}
      </div>

      {/* Overlay oscuro gradiente */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(0deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,${overlayOpacity}) 60%, transparent 100%)`,
      }} />

      {/* CTA */}
      <AbsoluteFill style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 80,
        flexDirection: 'column',
        gap: 20,
      }}>
        <div style={{
          opacity: ctaOpacity,
          transform: `translateY(${ctaY}px)`,
          textAlign: 'center',
        }}>
          <p style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 14,
            fontFamily: 'sans-serif',
            margin: '0 0 16px',
          }}>
            ¿Listo para empezar?
          </p>
          <div style={{
            display: 'inline-block',
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
            borderRadius: 100,
            padding: '16px 36px',
            transform: `scale(${pulse})`,
            boxShadow: `0 0 40px ${primaryColor}80`,
          }}>
            <span style={{
              color: 'white',
              fontSize: 18,
              fontFamily: 'sans-serif',
              fontWeight: 800,
              letterSpacing: -0.5,
            }}>
              {cta} →
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ─── Scene 5: Logo final (frames 780-900 = 26s-30s) ───────────────────────

function SceneLogo({ siteName, primaryColor, secondaryColor }) {
  const frame = useCurrentFrame();

  const logoScale = springAnim(frame, 30, 5, 18);
  const fadeOut = ease(frame, 90, 120, 1, 0);

  return (
    <AbsoluteFill style={{
      background: '#000',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${primaryColor}30 0%, transparent 70%)`,
      }} />

      <div style={{
        transform: `scale(${logoScale})`,
        opacity: fadeOut,
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 56,
          fontFamily: 'sans-serif',
          fontWeight: 900,
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor}, white)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: -2,
          marginBottom: 8,
        }}>
          {siteName}
        </div>
        <div style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: 13,
          fontFamily: 'sans-serif',
          letterSpacing: 4,
          textTransform: 'uppercase',
        }}>
          Empezá hoy
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Composición principal ─────────────────────────────────────────────────

export const MarketingVideo = ({
  siteName = "Mi Sitio",
  headline = "La solución que necesitás",
  benefits = ["Beneficio 1", "Beneficio 2", "Beneficio 3"],
  cta = "Empezá gratis",
  primaryColor = "#6366f1",
  secondaryColor = "#818cf8",
  accentColor = "#f0f9ff",
  screenshotUrl = null,
  logoUrl = null,
}) => {
  return (
    <AbsoluteFill style={{ background: '#000', fontFamily: 'sans-serif' }}>
      {/* Scene 1: Hero (0-90 frames = 0-3s) */}
      <Sequence from={0} durationInFrames={120}>
        <SceneHero
          siteName={siteName}
          headline={headline}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      </Sequence>

      {/* Scene 2: Mockup iPhone (90-300 frames = 3-10s) */}
      <Sequence from={110} durationInFrames={210}>
        <SceneMockup
          screenshotUrl={screenshotUrl}
          primaryColor={primaryColor}
          headline={headline}
        />
      </Sequence>

      {/* Scene 3: Beneficios (300-570 frames = 10-19s) */}
      <Sequence from={300} durationInFrames={270}>
        <SceneBenefits
          benefits={benefits}
          primaryColor={primaryColor}
          siteName={siteName}
        />
      </Sequence>

      {/* Scene 4: CTA con screenshot (570-780 frames = 19-26s) */}
      <Sequence from={570} durationInFrames={210}>
        <SceneCTA
          screenshotUrl={screenshotUrl}
          cta={cta}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      </Sequence>

      {/* Scene 5: Logo final (780-900 frames = 26-30s) */}
      <Sequence from={780} durationInFrames={120}>
        <SceneLogo
          siteName={siteName}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

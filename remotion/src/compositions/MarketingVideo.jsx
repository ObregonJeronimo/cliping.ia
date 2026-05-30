import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Img,
  Sequence,
} from 'remotion';

// ─── Core helpers ────────────────────────────────────────────────────────────

const lerp = (f, a, b, from, to) =>
  interpolate(f, [a, b], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

const spr = (f, fps, delay = 0, damping = 14, stiffness = 120) =>
  spring({ frame: Math.max(0, f - delay), fps, config: { damping, stiffness, mass: 0.6 } });

const hex2rgb = (hex) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  return `${r},${g},${b}`;
};

// ─── Shared Visual Components ────────────────────────────────────────────────

function Particles({ frame, color, count = 20, spread = 1 }) {
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: count }, (_, i) => {
        const x = (i * 37.3 * spread) % 100;
        const baseY = (i * 53.1) % 100;
        const speed = 0.018 + i * 0.004;
        const y = baseY + Math.sin((frame * speed + i * 80) * Math.PI / 180) * (10 + i % 5 * 4);
        const op = 0.04 + Math.abs(Math.sin(frame * 0.025 + i)) * 0.08;
        const sz = 1.5 + (i % 4);
        return (
          <div key={i} style={{
            position: 'absolute', left: `${x}%`, top: `${y}%`,
            width: sz, height: sz, borderRadius: '50%',
            background: color, opacity: op,
          }} />
        );
      })}
    </AbsoluteFill>
  );
}

function RadialGlow({ color, opacity = 0.25, size = 500 }) {
  const frame = useCurrentFrame();
  const pulse = 0.8 + Math.sin(frame * 0.04) * 0.2;
  return (
    <div style={{
      position: 'absolute', width: size * pulse, height: size * pulse,
      borderRadius: '50%',
      background: `radial-gradient(circle, rgba(${hex2rgb(color)},${opacity}) 0%, transparent 70%)`,
      top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
      pointerEvents: 'none',
    }} />
  );
}

function DarkScene({ color, children, variant = 'default', bg = null }) {
  const bgs = {
    default: `linear-gradient(145deg, #07070f 0%, #0d0d1a 100%)`,
    deep:    `linear-gradient(160deg, #050508 0%, #0a0a12 100%)`,
    warm:    `linear-gradient(145deg, #080508 0%, #120a0a 100%)`,
  };
  const background = bg || bgs[variant] || bgs.default;
  return (
    <AbsoluteFill style={{ background, overflow: 'hidden' }}>
      <Particles frame={0} color={color} count={22} />
      <RadialGlow color={color} opacity={0.18} size={480} />
      {children}
    </AbsoluteFill>
  );
}

function Label({ children, color, style = {} }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 800, letterSpacing: 4,
      textTransform: 'uppercase', color,
      fontFamily: 'system-ui, sans-serif', ...style,
    }}>
      {children}
    </div>
  );
}

function Headline({ children, size = 64, color = '#fff', style = {} }) {
  return (
    <div style={{
      fontSize: size, fontWeight: 900, color,
      letterSpacing: size > 50 ? -2.5 : -1,
      lineHeight: 1.05, fontFamily: 'system-ui, sans-serif', ...style,
    }}>
      {children}
    </div>
  );
}

function GlowLine({ color, progress, width = 48 }) {
  return (
    <div style={{
      width: width * progress, height: 2,
      background: `linear-gradient(90deg, ${color}, transparent)`,
      borderRadius: 2, marginTop: 14,
    }} />
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK ANIMATIONS
// ══════════════════════════════════════════════════════════════════════════════

function CounterExplosion({ frame, fps, number, label, prefix = '', suffix = '', primaryColor }) {
  const numVal = parseFloat(String(number || '1000').replace(/[^0-9.]/g, '')) || 1000;
  const prog = Math.min(Math.max((frame - 8) / 55, 0), 1);
  const eased = 1 - Math.pow(1 - prog, 3);
  const current = Math.floor(eased * numVal);

  const scaleP  = spr(frame, fps, 0, 9, 75);
  const labelP  = spr(frame, fps, 58, 15, 100);
  const pulse   = 1 + Math.sin(frame * 0.14) * 0.025;

  // Burst de partículas cuando llega al máximo
  const burst = frame > 60 && frame < 88;

  return (
    <DarkScene color={primaryColor} variant="deep">
      {burst && Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        const dist = (frame - 60) * 6;
        const op = Math.max(0, 1 - (frame - 60) / 28);
        return (
          <div key={i} style={{
            position: 'absolute', width: 5, height: 5, borderRadius: '50%',
            background: primaryColor, top: '45%', left: '50%',
            transform: `translate(${Math.cos(angle)*dist - 2.5}px, ${Math.sin(angle)*dist - 2.5}px)`,
            opacity: op, boxShadow: `0 0 6px ${primaryColor}`,
          }} />
        );
      })}

      {/* Arco decorativo SVG */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08 }} viewBox="0 0 390 844">
        <circle cx="195" cy="380" r="200" fill="none" stroke={primaryColor} strokeWidth="1"
          strokeDasharray="8 6" transform={`rotate(${frame * 0.3} 195 380)`} />
        <circle cx="195" cy="380" r="130" fill="none" stroke={primaryColor} strokeWidth="0.5"
          strokeDasharray="4 8" transform={`rotate(${-frame * 0.2} 195 380)`} />
      </svg>

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: 36 }}>
        <Label color={primaryColor} style={{ marginBottom: 20, opacity: labelP * 0.7 }}>
          {prefix || 'DATO CLAVE'}
        </Label>

        <div style={{
          transform: `scale(${scaleP * pulse})`,
          textAlign: 'center',
          textShadow: `0 0 80px rgba(${hex2rgb(primaryColor)},0.6)`,
        }}>
          <Headline size={88} color="#fff" style={{ letterSpacing: -4 }}>
            {prefix}{current.toLocaleString('es-AR')}{suffix}
          </Headline>
        </div>

        <div style={{
          opacity: labelP,
          transform: `translateY(${(1 - labelP) * 18}px)`,
          marginTop: 20, textAlign: 'center',
        }}>
          <div style={{
            fontSize: 18, color: `rgba(255,255,255,0.7)`,
            fontWeight: 500, fontFamily: 'system-ui, sans-serif',
          }}>{label}</div>
        </div>

        <GlowLine color={primaryColor} progress={labelP} width={80} />
      </AbsoluteFill>
    </DarkScene>
  );
}

function TypewriterGlitch({ frame, fps, line1, line2, color }) {
  const chars1 = Math.floor(lerp(frame, 8, 45, 0, (line1 || '').length));
  const chars2 = Math.floor(lerp(frame, 50, 82, 0, (line2 || '').length));
  const glitch = Math.sin(frame * 4.1) > 0.93;
  const gX = glitch ? Math.sin(frame * 8) * 5 : 0;
  const cursor = frame % 28 < 16;

  return (
    <DarkScene color={color}>
      {/* Grid lines decorativas */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04 }} viewBox="0 0 390 844">
        {Array.from({ length: 8 }, (_, i) => (
          <line key={i} x1={i * 56} y1="0" x2={i * 56} y2="844" stroke={color} strokeWidth="0.5" />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <line key={i} x1="0" y1={i * 140} x2="390" y2={i * 140} stroke={color} strokeWidth="0.5" />
        ))}
      </svg>

      <AbsoluteFill style={{ justifyContent: 'center', padding: '0 36px', flexDirection: 'column' }}>
        <Label color={color} style={{ marginBottom: 24, opacity: 0.7 }}>
          &gt; INICIANDO_
        </Label>

        <div style={{ transform: `translateX(${gX}px)` }}>
          <Headline size={54} color="#fff" style={{ lineHeight: 1.1 }}>
            {(line1 || '').slice(0, chars1)}
            {chars1 < (line1 || '').length && (
              <span style={{ opacity: cursor ? 1 : 0, color }}>|</span>
            )}
          </Headline>
        </div>

        {chars2 > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              fontSize: 24, fontWeight: 600, color,
              fontFamily: 'monospace', letterSpacing: 1,
            }}>
              {(line2 || '').slice(0, chars2)}
              <span style={{ opacity: cursor ? 1 : 0 }}>_</span>
            </div>
          </div>
        )}

        {/* Líneas de código decorativas */}
        <div style={{ marginTop: 32, opacity: 0.25 }}>
          {['const solution = await find();', 'return profit.toLocaleString();'].map((l, i) => (
            <div key={i} style={{
              fontSize: 12, color, fontFamily: 'monospace',
              marginBottom: 6,
              opacity: lerp(frame, 55 + i * 12, 70 + i * 12, 0, 1),
            }}>{l}</div>
          ))}
        </div>
      </AbsoluteFill>
    </DarkScene>
  );
}

function RevealSwipe({ frame, fps, headline, primaryColor }) {
  const swipe  = lerp(frame, 5, 38, 0, 105);
  const textP  = spr(frame, fps, 8, 14, 100);
  const chipP  = spr(frame, fps, 42, 16, 100);
  const words  = (headline || '').split(' ');

  return (
    <DarkScene color={primaryColor}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: 40 }}>
        {/* Chip superior */}
        <div style={{
          opacity: chipP, transform: `translateY(${(1 - chipP) * -16}px)`,
          marginBottom: 28,
          background: `rgba(${hex2rgb(primaryColor)},0.15)`,
          border: `1px solid rgba(${hex2rgb(primaryColor)},0.4)`,
          borderRadius: 100, padding: '7px 20px',
        }}>
          <Label color={primaryColor}>Nuevo</Label>
        </div>

        {/* Headline con swipe reveal */}
        <div style={{ position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
          <Headline size={58} color="#fff" style={{
            opacity: textP, transform: `translateY(${(1 - textP) * 28}px)`,
            textAlign: 'center', maxWidth: 300,
          }}>
            {headline}
          </Headline>
          {/* Cortina de color que revela */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `rgba(${hex2rgb(primaryColor)},0.9)`,
            transform: `translateX(${swipe}%)`,
            borderRadius: 4,
          }} />
        </div>

        <GlowLine color={primaryColor} progress={chipP} width={60} />
      </AbsoluteFill>
    </DarkScene>
  );
}

function MorphingShapes({ frame, fps, siteName, primaryColor, secondaryColor }) {
  const textP = spr(frame, fps, 45, 16, 100);
  const r1 = 65 + Math.sin(frame * 0.045) * 22;
  const r2 = 85 + Math.sin(frame * 0.038 + 1.5) * 18;
  const rot1 = frame * 0.7;
  const rot2 = -frame * 0.45;
  const rot3 = frame * 0.25;

  return (
    <DarkScene color={primaryColor} variant="deep">
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        {/* SVG morphing shapes */}
        <svg width="320" height="320" viewBox="0 0 320 320" style={{ position: 'absolute', opacity: 0.9 }}>
          <defs>
            <radialGradient id="mg1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={primaryColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="160" cy="160" rx={r1} ry={r2} fill="url(#mg1)"
            transform={`rotate(${rot1} 160 160)`} />
          <ellipse cx="160" cy="160" rx={r2 * 0.65} ry={r1 * 0.65}
            fill="none" stroke={primaryColor} strokeWidth="1.5" opacity="0.5"
            transform={`rotate(${rot2} 160 160)`} />
          <ellipse cx="160" cy="160" rx={r1 * 0.4} ry={r2 * 0.4}
            fill="none" stroke={secondaryColor} strokeWidth="1" opacity="0.35"
            transform={`rotate(${rot3} 160 160)`} />
          <circle cx="160" cy="160" r={35 + Math.sin(frame * 0.07) * 8}
            fill={primaryColor} opacity="0.12" />
        </svg>

        <div style={{
          opacity: textP, transform: `scale(${0.75 + textP * 0.25})`,
          textAlign: 'center', zIndex: 2,
          textShadow: `0 0 60px rgba(${hex2rgb(primaryColor)},0.5)`,
        }}>
          <Headline size={72} color="#fff" style={{ letterSpacing: -3 }}>
            {siteName}
          </Headline>
        </div>
      </AbsoluteFill>
    </DarkScene>
  );
}

function SplitScreenProblem({ frame, fps, problemText, solutionText, primaryColor }) {
  const p    = spr(frame, fps, 0, 12, 90);
  const txtL = spr(frame, fps, 18, 16, 100);
  const txtR = spr(frame, fps, 32, 16, 100);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* Izquierda - antes */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: `${48 * p}%`,
        background: 'linear-gradient(145deg, #150505, #0d0505)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 20px', overflow: 'hidden',
      }}>
        <Particles frame={frame} color="#ff4444" count={8} />
        <div style={{ opacity: txtL, textAlign: 'center' }}>
          <div style={{ fontSize: 36, color: '#ff6b6b', marginBottom: 12 }}>✗</div>
          <Label color="#ff6b6b" style={{ marginBottom: 10 }}>ANTES</Label>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, fontFamily: 'system-ui, sans-serif' }}>
            {problemText}
          </div>
        </div>
      </div>

      {/* Derecha - después */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        width: `${48 * p}%`,
        background: 'linear-gradient(145deg, #070f07, #050d05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 20px', overflow: 'hidden',
      }}>
        <Particles frame={frame} color={primaryColor} count={8} />
        <div style={{ opacity: txtR, textAlign: 'center' }}>
          <div style={{ fontSize: 36, color: primaryColor, marginBottom: 12 }}>✓</div>
          <Label color={primaryColor} style={{ marginBottom: 10 }}>AHORA</Label>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, fontFamily: 'system-ui, sans-serif' }}>
            {solutionText}
          </div>
        </div>
      </div>

      {/* Divisor central */}
      <div style={{
        position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2,
        background: `linear-gradient(180deg, transparent, ${primaryColor}, transparent)`,
        transform: 'translateX(-50%)',
        boxShadow: `0 0 16px ${primaryColor}`,
      }} />
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCT ANIMATIONS
// ══════════════════════════════════════════════════════════════════════════════

function IphoneRise({ frame, fps, screenshotUrl, primaryColor }) {
  const phoneP = spr(frame, fps, 0, 12, 95);
  const float  = Math.sin(frame * 0.052) * 8;
  const tilt   = Math.sin(frame * 0.036) * 1.8;
  const glowP  = spr(frame, fps, 8, 20, 80);

  return (
    <DarkScene color={primaryColor}>
      <div style={{
        position: 'absolute', width: 380, height: 380, borderRadius: '50%',
        background: `radial-gradient(circle, rgba(${hex2rgb(primaryColor)},0.2) 0%, transparent 70%)`,
        top: '50%', left: '50%', transform: `translate(-50%,-50%) scale(${glowP})`,
      }} />

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{
          transform: `translateY(${(1 - phoneP) * 170 + float}px) rotate(${tilt}deg)`,
          opacity: phoneP, position: 'relative',
        }}>
          {/* Sombra */}
          <div style={{
            position: 'absolute', bottom: -22, left: '12%', right: '12%', height: 22,
            background: `radial-gradient(ellipse, rgba(${hex2rgb(primaryColor)},0.4) 0%, transparent 70%)`,
            filter: 'blur(10px)',
          }} />

          {/* iPhone frame */}
          <div style={{
            width: 198, height: 398,
            background: 'linear-gradient(145deg, #252535, #181828)',
            borderRadius: 40, border: '2.5px solid #323250',
            overflow: 'hidden', position: 'relative',
            boxShadow: `
              0 50px 100px rgba(0,0,0,0.9),
              0 0 0 1px #424262,
              inset 0 1px 0 rgba(255,255,255,0.07),
              0 0 50px rgba(${hex2rgb(primaryColor)},0.2)
            `,
          }}>
            {/* Dynamic Island */}
            <div style={{
              position: 'absolute', top: 11, left: '50%',
              transform: 'translateX(-50%)',
              width: 74, height: 23,
              background: '#000', borderRadius: 12, zIndex: 10,
            }} />

            {screenshotUrl ? (
              <Img src={screenshotUrl} style={{
                width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'top',
              }} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: `linear-gradient(180deg, rgba(${hex2rgb(primaryColor)},0.3) 0%, #050510 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: 40 }}>○</div>
              </div>
            )}

            {/* Gradiente inferior */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 90,
              background: 'linear-gradient(0deg, rgba(8,8,20,0.9) 0%, transparent 100%)',
            }} />
          </div>
        </div>
      </AbsoluteFill>
    </DarkScene>
  );
}

function CursorDemo({ frame, fps, screenshotUrl, ctaText, primaryColor }) {
  const phoneP  = spr(frame, fps, 0, 12, 95);
  const cursorP = spr(frame, fps, 42, 16, 100);
  const float   = Math.sin(frame * 0.038) * 7;
  const click   = frame > 115 && frame < 135;
  const clickScale = click ? lerp(frame, 115, 122, 1, 0.82) : lerp(frame, 122, 135, 0.82, 1);
  const cursorX = lerp(frame, 48, 105, 25, 52);
  const cursorY = lerp(frame, 48, 105, 18, 68);
  const rippleScale = click ? lerp(frame, 115, 135, 0.3, 2.5) : 0;
  const rippleOp = click ? lerp(frame, 115, 135, 0.8, 0) : 0;

  return (
    <DarkScene color={primaryColor}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{
          transform: `translateY(${(1 - phoneP) * 150 + float}px)`,
          opacity: phoneP, position: 'relative',
        }}>
          <div style={{
            width: 198, height: 398,
            background: 'linear-gradient(145deg, #252535, #181828)',
            borderRadius: 40, border: '2.5px solid #323250',
            overflow: 'hidden', position: 'relative',
            boxShadow: `0 40px 80px rgba(0,0,0,0.85), 0 0 50px rgba(${hex2rgb(primaryColor)},0.18)`,
          }}>
            <div style={{
              position: 'absolute', top: 11, left: '50%',
              transform: 'translateX(-50%)',
              width: 74, height: 23, background: '#000', borderRadius: 12, zIndex: 10,
            }} />

            {screenshotUrl ? (
              <Img src={screenshotUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: `linear-gradient(180deg, rgba(${hex2rgb(primaryColor)},0.3) 0%, #050510 100%)` }} />
            )}
          </div>

          {/* Cursor SVG animado */}
          {cursorP > 0.05 && (
            <div style={{
              position: 'absolute',
              left: `${cursorX}%`, top: `${cursorY}%`,
              opacity: cursorP, transform: `scale(${clickScale})`,
              zIndex: 20, pointerEvents: 'none',
            }}>
              <svg width="30" height="30" viewBox="0 0 30 30">
                <path d="M4 2L4 24L11 17L15 26L18 25L14 16L24 16Z"
                  fill="white" stroke="rgba(0,0,0,0.6)" strokeWidth="1.5"
                  strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              {/* Ripple de click */}
              {click && (
                <div style={{
                  position: 'absolute', top: -12, left: -12, width: 54, height: 54,
                  borderRadius: '50%',
                  border: `2px solid ${primaryColor}`,
                  opacity: rippleOp,
                  transform: `scale(${rippleScale})`,
                }} />
              )}
            </div>
          )}
        </div>
      </AbsoluteFill>
    </DarkScene>
  );
}

function DashboardBuild({ frame, fps, stats, primaryColor, siteName }) {
  const safeStats = (stats || []).slice(0, 3);
  const headerP = spr(frame, fps, 0, 16, 100);

  return (
    <DarkScene color={primaryColor} variant="deep">
      <AbsoluteFill style={{ padding: '32px 26px', justifyContent: 'center' }}>
        {/* Header */}
        <div style={{
          opacity: headerP, transform: `translateY(${(1-headerP)*-18}px)`,
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: `linear-gradient(135deg, ${primaryColor}, rgba(${hex2rgb(primaryColor)},0.6))`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 16px rgba(${hex2rgb(primaryColor)},0.4)`,
          }}>
            <div style={{ width: 14, height: 14, background: '#fff', borderRadius: 3, opacity: 0.9 }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
            {siteName}
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <div style={{
              background: 'rgba(74,222,128,0.12)',
              border: '1px solid rgba(74,222,128,0.3)',
              borderRadius: 6, padding: '3px 10px',
              fontSize: 10, fontWeight: 700, color: '#4ade80',
              letterSpacing: 2, fontFamily: 'system-ui, sans-serif',
            }}>
              ● EN VIVO
            </div>
          </div>
        </div>

        {/* Stats cards */}
        {safeStats.map((stat, i) => {
          const p = spr(frame, fps, i * 20 + 8, 14, 100);
          const statStr = typeof stat === 'string' ? stat
            : (stat?.label || stat?.value?.toString() || String((i+1)*1000));
          const numMatch = statStr.match(/[\d,.]+/);
          const numVal = numMatch ? parseFloat(numMatch[0].replace(/[,.]/g, '')) : (i+1)*1000;
          const prog = Math.min(Math.max((frame-(i*20+18))/45, 0), 1);
          const eased = 1 - Math.pow(1-prog, 3);
          const current = Math.floor(eased * numVal);
          const isHighlight = i === 0;
          const glowPulse = isHighlight ? (0.4 + Math.sin(frame * 0.08 + i) * 0.4) : 0;

          return (
            <div key={i} style={{
              opacity: p, transform: `translateX(${(1-p)*-32}px)`,
              background: isHighlight
                ? `linear-gradient(135deg, rgba(${hex2rgb(primaryColor)},0.12), rgba(${hex2rgb(primaryColor)},0.05))`
                : 'rgba(255,255,255,0.04)',
              border: isHighlight
                ? `1px solid rgba(${hex2rgb(primaryColor)},0.35)`
                : '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16, padding: '18px 20px', marginBottom: 12,
              boxShadow: isHighlight ? `0 0 ${20 + glowPulse * 20}px rgba(${hex2rgb(primaryColor)},${glowPulse * 0.25})` : 'none',
            }}>
              <div style={{
                fontSize: 10, color: 'rgba(255,255,255,0.45)',
                letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 8,
                fontFamily: 'system-ui, sans-serif', fontWeight: 700,
              }}>
                {typeof stat === 'string'
                  ? (stat.replace(/[\d,.$ ]+/, '').trim() || `Métrica ${i+1}`)
                  : (stat?.label || `Métrica ${i+1}`)}
              </div>
              <div style={{
                fontSize: 38, fontWeight: 900,
                color: isHighlight ? primaryColor : '#fff',
                letterSpacing: -1.5, fontFamily: 'system-ui, sans-serif',
              }}>
                {current.toLocaleString('es-AR')}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </DarkScene>
  );
}

function FlowDiagram({ frame, fps, steps, primaryColor }) {
  const safeSteps = (steps || ['Paso 1', 'Paso 2', 'Paso 3']).slice(0, 4);
  const titleP = spr(frame, fps, 0, 16, 100);
  const lineP  = lerp(frame, 18, 82, 0, 1);

  return (
    <DarkScene color={primaryColor}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 30px' }}>
        <div style={{ width: '100%' }}>
          <div style={{ opacity: titleP, transform: `translateY(${(1-titleP)*-14}px)`, marginBottom: 32, textAlign: 'center' }}>
            <Label color={primaryColor}>Cómo funciona</Label>
          </div>

          {safeSteps.map((step, i) => {
            const p = spr(frame, fps, i * 22 + 10, 14, 100);
            return (
              <div key={i}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  opacity: p, transform: `translateX(${(1-p)*-44}px)`,
                }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${primaryColor}, rgba(${hex2rgb(primaryColor)},0.6))`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 900, color: '#fff',
                    boxShadow: `0 0 20px rgba(${hex2rgb(primaryColor)},0.45)`,
                    fontFamily: 'system-ui, sans-serif',
                  }}>
                    {i + 1}
                  </div>
                  <div style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 14, padding: '14px 18px',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', lineHeight: 1.4, fontFamily: 'system-ui, sans-serif' }}>
                      {step}
                    </div>
                  </div>
                </div>

                {i < safeSteps.length - 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0', paddingLeft: 23 }}>
                    <div style={{
                      width: 2, height: 26,
                      background: `linear-gradient(180deg, ${primaryColor}, rgba(${hex2rgb(primaryColor)},0.1))`,
                      opacity: lineP,
                    }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </DarkScene>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BENEFITS ANIMATIONS
// ══════════════════════════════════════════════════════════════════════════════

function BenefitCardsStagger({ frame, fps, benefits, primaryColor, bg }) {
  const safeBenefits = (benefits || []).slice(0, 4);
  const titleP = spr(frame, fps, 0, 16, 100);
  const lineP  = spr(frame, fps, 8, 18, 100);

  return (
    <DarkScene color={primaryColor} bg={bg}>
      {/* Scan line */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, rgba(${hex2rgb(primaryColor)},0.5), transparent)`,
        top: `${lerp(frame, 0, 270, -5, 108)}%`,
        pointerEvents: 'none',
      }} />

      {/* Borde izquierdo */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: `linear-gradient(180deg, transparent, ${primaryColor}, transparent)`,
        opacity: 0.8,
      }} />

      <AbsoluteFill style={{ padding: '32px 28px', justifyContent: 'center' }}>
        <div style={{ opacity: titleP, transform: `translateY(${(1-titleP)*-16}px)`, marginBottom: 24 }}>
          <Label color={primaryColor} style={{ marginBottom: 8 }}>Por qué elegirnos</Label>
          <Headline size={28} color="#fff" style={{ lineHeight: 1.2 }}>
            Todo lo que necesitás,{' '}
            <span style={{ color: primaryColor }}>en un solo lugar.</span>
          </Headline>
          <GlowLine color={primaryColor} progress={lineP} />
        </div>

        {safeBenefits.map((benefit, i) => {
          const p = spr(frame, fps, 18 + i * 17, 14, 100);
          const glow = 0.5 + Math.sin(frame * 0.07 + i * 1.2) * 0.5;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              opacity: p, transform: `translateX(${(1-p)*-52}px)`,
              marginBottom: 12,
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 14, padding: '13px 16px',
              border: `1px solid rgba(${hex2rgb(primaryColor)},${glow * 0.18})`,
              boxShadow: `0 0 ${glow * 14}px rgba(${hex2rgb(primaryColor)},${glow * 0.1})`,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: `rgba(${hex2rgb(primaryColor)},0.15)`,
                border: `1px solid rgba(${hex2rgb(primaryColor)},0.35)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <polyline points="1.5,8 6,13 14.5,3" stroke={primaryColor}
                    strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={{
                fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.88)',
                lineHeight: 1.45, fontFamily: 'system-ui, sans-serif',
              }}>{benefit}</div>
            </div>
          );
        })}
      </AbsoluteFill>
    </DarkScene>
  );
}

function ComparisonTable({ frame, fps, before, after, primaryColor, siteName, bg }) {
  const safeBefore = (before || []).slice(0, 4);
  const safeAfter  = (after  || []).slice(0, 4);
  const titleP = spr(frame, fps, 0, 16, 100);

  return (
    <DarkScene color={primaryColor} bg={bg}>
      <AbsoluteFill style={{ padding: '28px 22px', justifyContent: 'center' }}>
        <div style={{ opacity: titleP, transform: `translateY(${(1-titleP)*-14}px)`, marginBottom: 18, textAlign: 'center' }}>
          <Headline size={22} color="#fff">
            Sin {siteName}{' '}
            <span style={{ color: 'rgba(255,80,80,0.8)' }}>vs</span>{' '}
            <span style={{ color: primaryColor }}>Con {siteName}</span>
          </Headline>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 8 }}>
          <Label color="rgba(255,80,80,0.8)" style={{ textAlign: 'center' }}>ANTES</Label>
          <Label color={primaryColor} style={{ textAlign: 'center' }}>AHORA</Label>
        </div>

        {safeBefore.map((item, i) => {
          const p = spr(frame, fps, 14 + i * 20, 14, 100);
          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 7,
              opacity: p, transform: `translateY(${(1-p)*18}px)`,
            }}>
              <div style={{
                background: 'rgba(255,80,80,0.06)',
                border: '1px solid rgba(255,80,80,0.18)',
                borderRadius: 11, padding: '10px 12px',
                display: 'flex', gap: 7, alignItems: 'center',
              }}>
                <span style={{ color: 'rgba(255,80,80,0.8)', fontSize: 13, fontWeight: 900, flexShrink: 0 }}>✗</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: 'system-ui, sans-serif', lineHeight: 1.3 }}>{item}</span>
              </div>
              <div style={{
                background: `rgba(${hex2rgb(primaryColor)},0.08)`,
                border: `1px solid rgba(${hex2rgb(primaryColor)},0.25)`,
                borderRadius: 11, padding: '10px 12px',
                display: 'flex', gap: 7, alignItems: 'center',
              }}>
                <span style={{ color: primaryColor, fontSize: 13, fontWeight: 900, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.82)', fontFamily: 'system-ui, sans-serif', lineHeight: 1.3 }}>{safeAfter[i] || ''}</span>
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </DarkScene>
  );
}

function StatCounters({ frame, fps, stats, primaryColor }) {
  const safeStats = (stats || []).slice(0, 4);
  const titleP = spr(frame, fps, 0, 16, 100);

  return (
    <DarkScene color={primaryColor} variant="deep">
      <AbsoluteFill style={{ padding: '32px 26px', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ opacity: titleP, marginBottom: 28, textAlign: 'center' }}>
          <Label color={primaryColor}>Resultados reales</Label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, width: '100%' }}>
          {safeStats.map((stat, i) => {
            const p = spr(frame, fps, i * 16 + 6, 14, 100);
            const statObj = typeof stat === 'string'
              ? { value: parseFloat(stat.replace(/[^0-9.]/g, '')) || 100, label: stat.replace(/[\d,.]+/, '').trim() }
              : (stat && typeof stat === 'object' ? { value: Number(stat.value) || 100, label: stat.label || '' } : { value: 100, label: '' });
            const prog = Math.min(Math.max((frame - i * 16 - 16) / 48, 0), 1);
            const eased = 1 - Math.pow(1-prog, 3);
            const current = Math.floor(eased * (statObj.value || 100));
            const glowPulse = 18 + Math.sin(frame * 0.08 + i) * 10;

            return (
              <div key={i} style={{
                opacity: p, transform: `scale(${0.72 + p * 0.28})`,
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 18, padding: '22px 14px',
                border: `1px solid rgba(${hex2rgb(primaryColor)},0.25)`,
                textAlign: 'center',
                boxShadow: `0 0 ${glowPulse}px rgba(${hex2rgb(primaryColor)},0.15)`,
              }}>
                <div style={{
                  fontSize: 42, fontWeight: 900, color: primaryColor,
                  letterSpacing: -2, fontFamily: 'system-ui, sans-serif',
                }}>{current.toLocaleString('es-AR')}</div>
                <div style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.5)',
                  marginTop: 6, fontWeight: 600, fontFamily: 'system-ui, sans-serif',
                }}>{statObj.label || `Métrica ${i+1}`}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </DarkScene>
  );
}

function FloatingFeatureOrbs({ frame, fps, features, primaryColor, secondaryColor }) {
  const safeFeatures = (features || []).slice(0, 5);
  const centerP = spr(frame, fps, 0, 14, 100);
  const angle = frame * 0.55;

  return (
    <DarkScene color={primaryColor} variant="deep">
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        {/* Centro pulsante */}
        <div style={{
          position: 'absolute', width: 76, height: 76, borderRadius: '50%',
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          boxShadow: `0 0 ${30 + Math.sin(frame * 0.08) * 15}px rgba(${hex2rgb(primaryColor)},0.6)`,
          transform: `scale(${centerP})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 28, height: 28, background: '#fff', borderRadius: '50%', opacity: 0.9 }} />
        </div>

        {/* Órbitas SVG */}
        <svg style={{ position: 'absolute', width: 360, height: 360 }} viewBox="0 0 360 360">
          <circle cx="180" cy="180" r="135" fill="none" stroke={`rgba(${hex2rgb(primaryColor)},0.15)`} strokeWidth="1" />
          <circle cx="180" cy="180" r="90" fill="none" stroke={`rgba(${hex2rgb(primaryColor)},0.1)`} strokeWidth="1" />
        </svg>

        {/* Features orbitando */}
        {safeFeatures.map((feature, i) => {
          const a = (angle + i * (360 / safeFeatures.length)) * Math.PI / 180;
          const r = i % 2 === 0 ? 135 : 90;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          const p = spr(frame, fps, i * 10, 16, 100);

          return (
            <div key={i} style={{
              position: 'absolute', opacity: p,
              transform: `translate(${x}px, ${y}px)`,
            }}>
              <div style={{
                background: '#0d0d1a',
                border: `1.5px solid rgba(${hex2rgb(primaryColor)},0.45)`,
                borderRadius: 12, padding: '8px 11px', maxWidth: 105,
                textAlign: 'center',
                boxShadow: `0 0 14px rgba(${hex2rgb(primaryColor)},0.2)`,
              }}>
                <div style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.8)',
                  fontWeight: 600, lineHeight: 1.35, fontFamily: 'system-ui, sans-serif',
                }}>{(feature || '').slice(0, 32)}</div>
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </DarkScene>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CTA ANIMATIONS
// ══════════════════════════════════════════════════════════════════════════════

function LiquidButtonCTA({ frame, fps, cta, subtext, primaryColor, guarantee }) {
  const titleP  = spr(frame, fps, 0, 16, 100);
  const btnP    = spr(frame, fps, 22, 10, 100);
  const guarP   = spr(frame, fps, 42, 16, 100);
  const pulse   = 1 + Math.sin(frame * 0.11) * 0.028;
  const glow    = 22 + Math.sin(frame * 0.07) * 18;
  const glowOp  = 0.55 + Math.sin(frame * 0.07) * 0.45;
  const glowHex = Math.round(glowOp * 99).toString(16).padStart(2,'0');
  const blobX   = Math.sin(frame * 0.045) * 12;
  const blobY   = Math.sin(frame * 0.065 + 1) * 9;

  return (
    <DarkScene color={primaryColor}>
      {/* Blob SVG líquido detrás del botón */}
      <svg style={{
        position: 'absolute', bottom: '25%', left: '50%',
        transform: `translate(-50%, 50%) translate(${blobX}px, ${blobY}px)`,
        opacity: 0.18, width: 320, height: 130,
      }} viewBox="0 0 320 130">
        <ellipse
          cx="160" cy="65"
          rx={145 + Math.sin(frame * 0.055) * 16}
          ry={52 + Math.sin(frame * 0.042 + 1) * 11}
          fill={primaryColor} style={{ filter: 'blur(22px)' }}
        />
      </svg>

      <AbsoluteFill style={{
        justifyContent: 'flex-end', alignItems: 'center',
        paddingBottom: 80, flexDirection: 'column', gap: 18,
      }}>
        <div style={{ opacity: titleP, transform: `translateY(${(1-titleP)*28}px)`, textAlign: 'center', padding: '0 36px' }}>
          <Label color={primaryColor} style={{ marginBottom: 10 }}>¿Listo para empezar?</Label>
          <div style={{
            fontSize: 20, color: 'rgba(255,255,255,0.72)',
            fontWeight: 500, fontFamily: 'system-ui, sans-serif', lineHeight: 1.4,
          }}>{subtext}</div>
        </div>

        {/* Botón con efecto líquido */}
        <div style={{ opacity: btnP, transform: `scale(${btnP * pulse})` }}>
          <div style={{
            background: `linear-gradient(135deg, ${primaryColor}, rgba(${hex2rgb(primaryColor)},0.8))`,
            borderRadius: 100, padding: '17px 40px',
            boxShadow: `0 0 ${glow}px ${primaryColor}${glowHex}, 0 18px 45px rgba(${hex2rgb(primaryColor)},0.35)`,
          }}>
            <span style={{
              color: '#fff', fontSize: 18, fontWeight: 800,
              letterSpacing: -0.3, fontFamily: 'system-ui, sans-serif',
            }}>{cta} →</span>
          </div>
        </div>

        {guarantee ? (
          <div style={{ opacity: guarP * 0.65 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
              ✓ {guarantee}
            </div>
          </div>
        ) : null}
      </AbsoluteFill>
    </DarkScene>
  );
}

function ScreenshotZoomCTA({ frame, fps, screenshotUrl, cta, primaryColor, guarantee }) {
  const bgScale = lerp(frame, 0, 210, 1.0, 1.14);
  const overlayP = spr(frame, fps, 0, 20, 80);
  const btnP    = spr(frame, fps, 32, 11, 100);
  const pulse   = 1 + Math.sin(frame * 0.11) * 0.028;
  const glow    = 22 + Math.sin(frame * 0.07) * 18;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {screenshotUrl ? (
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${bgScale})`, transformOrigin: 'center 30%' }}>
          <Img src={screenshotUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, rgba(${hex2rgb(primaryColor)},0.4), #07070f)` }} />
      )}

      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(0deg, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.1) 100%)',
        opacity: overlayP,
      }} />

      <Particles frame={frame} color={primaryColor} count={10} />

      <AbsoluteFill style={{
        justifyContent: 'flex-end', alignItems: 'center',
        paddingBottom: 72, flexDirection: 'column', gap: 14,
      }}>
        <div style={{ opacity: btnP, transform: `scale(${btnP * pulse})` }}>
          <div style={{
            background: `linear-gradient(135deg, ${primaryColor}, rgba(${hex2rgb(primaryColor)},0.8))`,
            borderRadius: 100, padding: '17px 38px',
            boxShadow: `0 0 ${glow}px rgba(${hex2rgb(primaryColor)},0.8)`,
          }}>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, fontFamily: 'system-ui, sans-serif' }}>{cta} →</span>
          </div>
        </div>
        {guarantee ? (
          <div style={{ opacity: btnP * 0.6, color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'system-ui, sans-serif' }}>
            ✓ {guarantee}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function UrgencyCTA({ frame, fps, cta, guarantee, primaryColor, audience }) {
  const titleP   = spr(frame, fps, 0, 16, 100);
  const dotP     = spr(frame, fps, 18, 14, 100);
  const btnP     = spr(frame, fps, 36, 10, 100);
  const pulse    = 1 + Math.sin(frame * 0.11) * 0.032;
  const dotBlink = frame % 28 < 18;
  const users    = Math.floor(23 + Math.sin(frame * 0.018) * 4);
  const glow     = 22 + Math.sin(frame * 0.07) * 18;

  return (
    <DarkScene color={primaryColor}>
      <AbsoluteFill style={{
        justifyContent: 'center', alignItems: 'center',
        flexDirection: 'column', padding: 36, gap: 22,
      }}>
        <div style={{ opacity: titleP, textAlign: 'center' }}>
          <Headline size={30} color="#fff" style={{ lineHeight: 1.25, marginBottom: 10 }}>
            Cada día que esperás,{'\n'}
            <span style={{ color: primaryColor }}>es un día perdido.</span>
          </Headline>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', fontFamily: 'system-ui, sans-serif' }}>
            Únete a {audience || 'miles de profesionales'}
          </div>
        </div>

        {/* Usuarios activos */}
        <div style={{
          opacity: dotP,
          display: 'flex', alignItems: 'center', gap: 9,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 100, padding: '9px 18px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#4ade80',
            boxShadow: '0 0 10px #4ade80',
            opacity: dotBlink ? 1 : 0.35,
          }} />
          <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>
            {users} usando ahora
          </span>
        </div>

        <div style={{ opacity: btnP, transform: `scale(${pulse})` }}>
          <div style={{
            background: `linear-gradient(135deg, ${primaryColor}, rgba(${hex2rgb(primaryColor)},0.8))`,
            borderRadius: 100, padding: '17px 42px',
            boxShadow: `0 0 ${glow}px rgba(${hex2rgb(primaryColor)},0.7)`,
          }}>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, fontFamily: 'system-ui, sans-serif' }}>{cta} →</span>
          </div>
        </div>

        {guarantee ? (
          <div style={{ opacity: btnP * 0.6, color: 'rgba(255,255,255,0.38)', fontSize: 12, fontFamily: 'system-ui, sans-serif' }}>
            ✓ {guarantee}
          </div>
        ) : null}
      </AbsoluteFill>
    </DarkScene>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OUTRO ANIMATIONS
// ══════════════════════════════════════════════════════════════════════════════

function LogoParticleBurst({ frame, fps, siteName, primaryColor, secondaryColor }) {
  const p      = spr(frame, fps, 0, 18, 100);
  const burst  = frame > 28 && frame < 65;
  const glowP  = 0.6 + Math.sin(frame * 0.09) * 0.4;

  return (
    <AbsoluteFill style={{ background: '#000', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <div style={{
        position: 'absolute', width: 520, height: 520, borderRadius: '50%',
        background: `radial-gradient(circle, rgba(${hex2rgb(primaryColor)},${glowP * 0.22}) 0%, transparent 70%)`,
      }} />

      {burst && Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const dist = (frame - 28) * 7;
        const op = Math.max(0, 1 - (frame - 28) / 37);
        return (
          <div key={i} style={{
            position: 'absolute', width: 5+(i%3), height: 5+(i%3), borderRadius: '50%',
            background: i % 2 === 0 ? primaryColor : secondaryColor,
            transform: `translate(${Math.cos(a)*dist}px, ${Math.sin(a)*dist}px)`,
            opacity: op, boxShadow: `0 0 8px ${primaryColor}`,
          }} />
        );
      })}

      <div style={{ transform: `scale(${p})`, opacity: p, textAlign: 'center', zIndex: 2 }}>
        <div style={{
          fontSize: 64, fontWeight: 900,
          background: `linear-gradient(135deg, #fff, ${primaryColor}, ${secondaryColor})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: -3, fontFamily: 'system-ui, sans-serif',
        }}>{siteName}</div>
        <div style={{
          color: 'rgba(255,255,255,0.28)', fontSize: 11, letterSpacing: 5,
          textTransform: 'uppercase', marginTop: 10, fontFamily: 'system-ui, sans-serif',
        }}>EMPEZÁ HOY</div>
      </div>
    </AbsoluteFill>
  );
}

function OrbitLogo({ frame, fps, siteName, primaryColor, secondaryColor }) {
  const p     = spr(frame, fps, 0, 18, 100);
  const angle = frame * 1.8;
  const glowP = 0.62 + Math.sin(frame * 0.09) * 0.38;

  return (
    <AbsoluteFill style={{ background: '#000', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <div style={{
        position: 'absolute', width: 520, height: 520, borderRadius: '50%',
        background: `radial-gradient(circle, rgba(${hex2rgb(primaryColor)},${glowP * 0.24}) 0%, transparent 70%)`,
      }} />

      {/* Partículas orbitando */}
      {[0,1,2,3,4,5].map(i => {
        const a = (angle + i * 60) * Math.PI / 180;
        const r = 100 + (i % 2) * 32;
        return (
          <div key={i} style={{
            position: 'absolute', width: 4+(i%3), height: 4+(i%3), borderRadius: '50%',
            background: i%2===0 ? primaryColor : secondaryColor,
            transform: `translate(${Math.cos(a)*r}px, ${Math.sin(a)*r}px)`,
            opacity: p * 0.72,
            boxShadow: `0 0 8px ${i%2===0 ? primaryColor : secondaryColor}`,
          }} />
        );
      })}

      <div style={{
        transform: `scale(${p}) rotate(${(1-p)*-7}deg)`,
        opacity: p, textAlign: 'center', zIndex: 2,
      }}>
        <div style={{
          fontSize: 64, fontWeight: 900,
          background: `linear-gradient(135deg, #fff, ${primaryColor}, ${secondaryColor})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: -3, fontFamily: 'system-ui, sans-serif',
        }}>{siteName}</div>
        <div style={{
          color: 'rgba(255,255,255,0.28)', fontSize: 11, letterSpacing: 5,
          textTransform: 'uppercase', marginTop: 10, fontFamily: 'system-ui, sans-serif',
        }}>EMPEZÁ HOY</div>
      </div>
    </AbsoluteFill>
  );
}

function GradientTextOutro({ frame, fps, siteName, tagline, primaryColor, secondaryColor }) {
  const p = spr(frame, fps, 0, 18, 100);
  const gradAngle = (frame * 1.4) % 360;

  return (
    <AbsoluteFill style={{ background: '#000', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: 36 }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 50%, rgba(${hex2rgb(primaryColor)},0.14) 0%, transparent 65%)`,
      }} />
      <Particles frame={frame} color={primaryColor} count={14} />

      <div style={{ transform: `scale(${p})`, opacity: p, textAlign: 'center', zIndex: 2 }}>
        <div style={{
          fontSize: 60, fontWeight: 900,
          background: `linear-gradient(${gradAngle}deg, ${primaryColor}, ${secondaryColor}, #fff, ${primaryColor})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: -2.5, fontFamily: 'system-ui, sans-serif',
          backgroundSize: '200% 200%',
        }}>{siteName}</div>
        <div style={{
          color: 'rgba(255,255,255,0.48)', fontSize: 15, fontWeight: 500,
          marginTop: 14, lineHeight: 1.5, fontFamily: 'system-ui, sans-serif',
        }}>{tagline}</div>
      </div>
    </AbsoluteFill>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// ANIMACIONES ÉPICAS ADICIONALES
// ══════════════════════════════════════════════════════════════════════════════

// Icon Draw Reveal — íconos SVG que se dibujan progresivamente
function IconDrawReveal({ frame, fps, features, primaryColor }) {
  const safeFeatures = (features || []).slice(0, 3);
  const titleP = spr(frame, fps, 0, 16, 100);

  const ICONS = {
    users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    "check-circle": "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3",
    "credit-card": "M1 4h22v16H1zM1 10h22",
    zap: "M13 2 3 14h9l-1 8 10-12h-9l1-8z",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    trending: "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
    star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    target: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  };

  return (
    <DarkScene color={primaryColor}>
      <AbsoluteFill style={{ padding: '32px 28px', justifyContent: 'center' }}>
        <div style={{ opacity: titleP, transform: `translateY(${(1-titleP)*-14}px)`, marginBottom: 28 }}>
          <Label color={primaryColor} style={{ marginBottom: 8 }}>Lo que obtenés</Label>
          <Headline size={26} color="#fff" style={{ lineHeight: 1.2 }}>
            Diseñado para{' '}
            <span style={{ color: primaryColor }}>profesionales como vos.</span>
          </Headline>
          <GlowLine color={primaryColor} progress={titleP} />
        </div>

        {safeFeatures.map((feat, i) => {
          const p = spr(frame, fps, 20 + i * 25, 14, 100);
          const iconKey = typeof feat === 'object' ? (feat.icon || 'star') : ['zap','shield','star'][i];
          const iconPath = ICONS[iconKey] || ICONS.star;
          const title = typeof feat === 'object' ? feat.title : (typeof feat === 'string' ? feat : `Beneficio ${i+1}`);
          const desc  = typeof feat === 'object' ? (feat.description || '') : '';
          const drawProgress = Math.min(Math.max((frame - 20 - i*25 - 5) / 30, 0), 1);

          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 16,
              opacity: p, transform: `translateX(${(1-p)*-44}px)`,
              marginBottom: 18,
            }}>
              {/* Ícono SVG animado */}
              <div style={{
                width: 48, height: 48, borderRadius: 13, flexShrink: 0,
                background: `rgba(${hex2rgb(primaryColor)},0.12)`,
                border: `1.5px solid rgba(${hex2rgb(primaryColor)},0.35)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 ${12 + Math.sin(frame*0.08+i)*8}px rgba(${hex2rgb(primaryColor)},0.2)`,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{
                    strokeDasharray: 80,
                    strokeDashoffset: 80 * (1 - drawProgress),
                  }}>
                  <path d={iconPath} />
                </svg>
              </div>

              {/* Texto */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 15, fontWeight: 700, color: '#fff',
                  lineHeight: 1.3, fontFamily: 'system-ui, sans-serif', marginBottom: 4,
                }}>{title}</div>
                {desc ? (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'system-ui, sans-serif' }}>
                    {desc}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </DarkScene>
  );
}

// Kinetic Text — palabras que entran con física y peso
function KineticText({ frame, fps, headline, primaryColor, secondaryColor }) {
  const words = (headline || '').split(' ');
  const subtitleP = spr(frame, fps, words.length * 8 + 10, 16, 100);

  return (
    <DarkScene color={primaryColor} variant="deep">
      {/* Grid decorativo */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.04 }} viewBox="0 0 390 844">
        {Array.from({length:7},(_,i)=><line key={i} x1={i*65} y1="0" x2={i*65} y2="844" stroke={primaryColor} strokeWidth="0.5"/>)}
        {Array.from({length:5},(_,i)=><line key={i} x1="0" y1={i*170} x2="390" y2={i*170} stroke={primaryColor} strokeWidth="0.5"/>)}
      </svg>

      <AbsoluteFill style={{ justifyContent:'center', alignItems:'center', flexDirection:'column', padding:36 }}>
        <div style={{ textAlign:'center', marginBottom:20 }}>
          {words.map((word, i) => {
            const p = spr(frame, fps, i * 8, 11, 130);
            const isAccent = i === words.length - 1 || i === Math.floor(words.length/2);
            return (
              <span key={i} style={{
                display: 'inline-block',
                marginRight: 10,
                opacity: p,
                transform: `translateY(${(1-p)*50}px) rotate(${(1-p)*-8}deg)`,
                fontSize: 58, fontWeight: 900,
                color: isAccent ? primaryColor : '#fff',
                letterSpacing: -2.5, lineHeight: 1.05,
                fontFamily: 'system-ui, sans-serif',
                textShadow: isAccent ? `0 0 40px rgba(${hex2rgb(primaryColor)},0.6)` : 'none',
              }}>{word}</span>
            );
          })}
        </div>

        <div style={{ opacity: subtitleP, transform: `translateY(${(1-subtitleP)*16}px)` }}>
          <div style={{
            background: `rgba(${hex2rgb(primaryColor)},0.12)`,
            border: `1px solid rgba(${hex2rgb(primaryColor)},0.3)`,
            borderRadius: 100, padding: '9px 22px',
          }}>
            <Label color={primaryColor}>Descubrí cómo</Label>
          </div>
        </div>
      </AbsoluteFill>
    </DarkScene>
  );
}

// Particle Reveal — texto que emerge de un campo de partículas
function ParticleReveal({ frame, fps, siteName, headline, primaryColor, secondaryColor }) {
  const TOTAL = 90;
  const phase1 = Math.min(frame / 35, 1); // partículas acumulándose
  const textP = spr(frame, fps, 38, 12, 110);
  const ringP = spr(frame, fps, 28, 16, 90);

  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      {/* Partículas que convergen al centro */}
      {Array.from({ length: 40 }, (_, i) => {
        const angle = (i / 40) * Math.PI * 2 + i * 0.3;
        const startR = 220 + (i % 5) * 30;
        const endR   = 20 + (i % 8) * 8;
        const r = startR + (endR - startR) * phase1;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        const op = 0.3 + phase1 * 0.6;
        const sz = 2 + (i % 3);
        return (
          <div key={i} style={{
            position: 'absolute', top: '50%', left: '50%',
            width: sz, height: sz, borderRadius: '50%',
            background: i % 3 === 0 ? primaryColor : i % 3 === 1 ? secondaryColor : '#fff',
            transform: `translate(${x - sz/2}px, ${y - sz/2}px)`,
            opacity: op,
            boxShadow: i % 4 === 0 ? `0 0 6px ${primaryColor}` : 'none',
          }} />
        );
      })}

      {/* Anillos */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} viewBox="0 0 390 844">
        {[60,100,150].map((r,i) => (
          <circle key={i} cx="195" cy="422" r={r * ringP}
            fill="none" stroke={primaryColor} strokeWidth="0.8" opacity={0.2 - i*0.05}
            strokeDasharray="6 4" transform={`rotate(${frame*(0.5-i*0.15)} 195 422)`} />
        ))}
      </svg>

      <AbsoluteFill style={{ justifyContent:'center', alignItems:'center', flexDirection:'column', textAlign:'center', padding:36 }}>
        <div style={{ opacity: textP, transform: `scale(${0.7 + textP*0.3})` }}>
          <Headline size={72} color="#fff" style={{
            textShadow: `0 0 60px rgba(${hex2rgb(primaryColor)},0.7)`,
            letterSpacing: -3,
          }}>
            {siteName}
          </Headline>
          <div style={{
            fontSize: 16, color: `rgba(255,255,255,0.6)`,
            fontFamily: 'system-ui, sans-serif', fontWeight: 500, marginTop: 12,
          }}>{headline}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// Timeline Build — línea de tiempo que se construye de arriba a abajo
function TimelineScroll({ frame, fps, steps, primaryColor }) {
  const safeSteps = (steps || []).slice(0, 4);
  const lineProgress = lerp(frame, 15, 200, 0, 1);
  const titleP = spr(frame, fps, 0, 16, 100);

  return (
    <DarkScene color={primaryColor}>
      <AbsoluteFill style={{ padding: '30px 30px', justifyContent: 'center' }}>
        <div style={{ opacity: titleP, marginBottom: 24 }}>
          <Label color={primaryColor} style={{ marginBottom: 6 }}>El proceso</Label>
          <Headline size={26} color="#fff">Así de simple.</Headline>
        </div>

        <div style={{ position: 'relative' }}>
          {/* Línea vertical animada */}
          <div style={{
            position: 'absolute', left: 22, top: 0,
            width: 2, height: `${lineProgress * 100}%`,
            background: `linear-gradient(180deg, ${primaryColor}, rgba(${hex2rgb(primaryColor)},0.1))`,
            borderRadius: 2,
          }} />

          {safeSteps.map((step, i) => {
            const p = spr(frame, fps, i * 22 + 15, 14, 100);
            const stepText = typeof step === 'string' ? step : (step?.title || step?.label || `Paso ${i+1}`);
            const dotGlow = 10 + Math.sin(frame*0.09+i)*8;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 18,
                marginBottom: 22,
                opacity: p, transform: `translateX(${(1-p)*-30}px)`,
              }}>
                {/* Dot */}
                <div style={{
                  width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                  background: `rgba(${hex2rgb(primaryColor)},0.15)`,
                  border: `2px solid ${primaryColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 ${dotGlow}px rgba(${hex2rgb(primaryColor)},0.5)`,
                  fontSize: 16, fontWeight: 900, color: primaryColor,
                  fontFamily: 'system-ui, sans-serif',
                }}>
                  {i + 1}
                </div>
                <div style={{
                  flex: 1, background: 'rgba(255,255,255,0.04)',
                  borderRadius: 13, padding: '12px 16px',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.4, fontFamily: 'system-ui, sans-serif' }}>
                    {stepText}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </DarkScene>
  );
}

// Progress Bars — métricas con barras que se llenan animadas
function ProgressBars({ frame, fps, metrics, primaryColor }) {
  const safeMetrics = (metrics || []).slice(0, 4);
  const titleP = spr(frame, fps, 0, 16, 100);

  return (
    <DarkScene color={primaryColor}>
      <AbsoluteFill style={{ padding: '32px 28px', justifyContent: 'center' }}>
        <div style={{ opacity: titleP, marginBottom: 28 }}>
          <Label color={primaryColor} style={{ marginBottom: 8 }}>Rendimiento</Label>
          <Headline size={26} color="#fff">Números que importan.</Headline>
          <GlowLine color={primaryColor} progress={titleP} />
        </div>

        {safeMetrics.map((metric, i) => {
          const p = spr(frame, fps, i * 20 + 8, 14, 100);
          const barProgress = lerp(frame, i*20+18, i*20+65, 0, 1);
          const label = typeof metric === 'string' ? metric.replace(/[\d%]+/g,'').trim() : (metric?.label || `Métrica ${i+1}`);
          const pct = typeof metric === 'string'
            ? (parseInt(metric.match(/\d+/)?.[0]) || 75)
            : (metric?.value || 75);
          const displayPct = Math.min(100, Math.round(barProgress * pct));

          return (
            <div key={i} style={{
              marginBottom: 22, opacity: p, transform: `translateX(${(1-p)*-28}px)`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)', fontFamily: 'system-ui, sans-serif' }}>
                  {label || `Métrica ${i+1}`}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: primaryColor, fontFamily: 'system-ui, sans-serif' }}>
                  {displayPct}%
                </div>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  width: `${barProgress * pct}%`,
                  background: `linear-gradient(90deg, ${primaryColor}, rgba(${hex2rgb(primaryColor)},0.7))`,
                  boxShadow: `0 0 10px rgba(${hex2rgb(primaryColor)},0.5)`,
                  transition: 'width 0.1s',
                }} />
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </DarkScene>
  );
}




// ══════════════════════════════════════════════════════════════════════════════
// ANIMACIONES VIRALES 2025 — SCRAMBLE, SPLIT, 3D FLIP, FREEZE FRAME, ZOOM PUNCH
// ══════════════════════════════════════════════════════════════════════════════

// SCRAMBLE DECODE — texto que se decodifica desde caracteres random (estilo hacker/tech)
function ScrambleDecode({ frame, fps, headline, primaryColor, bg }) {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
  const words = (headline || '').split(' ');
  const totalFrames = 80;
  const isDark = !bg || bg.includes('0a') || bg.includes('07') || bg.includes('linear');
  const textColor = isDark ? '#fff' : '#0a0a0a';

  const getChar = (char, wordIdx, charIdx, f) => {
    const startF = wordIdx * 12 + charIdx * 3;
    const endF = startF + 20;
    if (f < startF) return CHARS[Math.floor((f * 7 + wordIdx * 13 + charIdx * 17) % CHARS.length)];
    if (f >= endF) return char;
    const progress = (f - startF) / 20;
    return progress > 0.7 ? char : CHARS[Math.floor((f * 11 + charIdx * 19) % CHARS.length)];
  };

  const titleP = spr(frame, fps, 0, 20, 80);

  return (
    <AbsoluteFill style={{ background: bg || 'linear-gradient(145deg, #07070f 0%, #0d0d1a 100%)', overflow: 'hidden' }}>
      <Particles frame={frame} color={primaryColor} count={14} />
      <RadialGlow color={primaryColor} opacity={0.2} size={420} />

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: 36, textAlign: 'center' }}>
        <Label color={primaryColor} style={{ marginBottom: 20, opacity: titleP }}>
          DECODIFICANDO...
        </Label>

        <div style={{ opacity: Math.min(1, frame / 10) }}>
          {words.map((word, wi) => (
            <div key={wi} style={{ display: 'inline' }}>
              <span style={{
                fontSize: 52, fontWeight: 900, fontFamily: 'monospace',
                letterSpacing: -1, lineHeight: 1.15,
                color: frame > wi * 12 + word.length * 3 ? primaryColor : `rgba(${hex2rgb(primaryColor)},0.4)`,
                textShadow: `0 0 20px rgba(${hex2rgb(primaryColor)},0.4)`,
              }}>
                {word.split('').map((ch, ci) => getChar(ch, wi, ci, frame))}
              </span>
              {wi < words.length - 1 && <span style={{ fontSize: 52, fontWeight: 900, fontFamily: 'monospace', color: 'transparent' }}> </span>}
            </div>
          ))}
        </div>

        <GlowLine color={primaryColor} progress={Math.min(1, frame / 60)} width={100} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// SPLIT CHARS — cada letra del titular entra desde posiciones distintas
function SplitCharsReveal({ frame, fps, headline, primaryColor, bg }) {
  const chars = (headline || '').split('');
  const isDark = !bg || bg.includes('0a') || bg.includes('07') || bg.includes('linear');
  const textColor = isDark ? '#fff' : '#0a0a0a';

  return (
    <AbsoluteFill style={{ background: bg || 'linear-gradient(160deg, #050508 0%, #0a0a14 100%)', overflow: 'hidden' }}>
      <Particles frame={frame} color={primaryColor} count={12} />

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: 32, textAlign: 'center' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>
          {chars.map((ch, i) => {
            const delay = i * 3;
            const p = spr(frame, fps, delay, 12, 140);
            // Cada letra viene de una dirección distinta
            const directions = [
              [0, -80], [80, 0], [0, 80], [-80, 0],
              [60, -60], [-60, 60], [60, 60], [-60, -60],
            ];
            const [dx, dy] = directions[i % directions.length];
            const isAccent = i % 5 === 0 || i === Math.floor(chars.length / 2);

            return ch === ' ' ? (
              <span key={i} style={{ width: 16 }} />
            ) : (
              <span key={i} style={{
                fontSize: 54, fontWeight: 900,
                fontFamily: 'system-ui, sans-serif',
                lineHeight: 1.1,
                color: isAccent ? primaryColor : textColor,
                opacity: p,
                transform: `translate(${dx * (1-p)}px, ${dy * (1-p)}px) rotate(${(1-p) * (i%2===0 ? 15 : -15)}deg)`,
                display: 'inline-block',
                textShadow: isAccent ? `0 0 30px rgba(${hex2rgb(primaryColor)},0.6)` : 'none',
              }}>
                {ch}
              </span>
            );
          })}
        </div>
        <div style={{
          marginTop: 20,
          opacity: spr(frame, fps, chars.length * 3 + 10, 16, 100),
          width: `${Math.min(100, (frame / (chars.length * 3 + 10)) * 100)}%`,
          height: 2, background: primaryColor, borderRadius: 2,
          boxShadow: `0 0 10px ${primaryColor}`,
        }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// 3D CARD FLIP — cards de beneficios que dan vuelta en 3D
function CardFlip3D({ frame, fps, benefits, primaryColor, secondaryColor, bg }) {
  const safeBenefits = (benefits || []).slice(0, 3);
  const isDark = !bg || bg.includes('0a') || bg.includes('07') || bg.includes('linear');
  const CARD_FRAMES = 70; // frames por card
  const currentCard = Math.min(Math.floor(frame / CARD_FRAMES), safeBenefits.length - 1);
  const cardFrame = frame % CARD_FRAMES;
  const flipP = lerp(cardFrame, 0, 35, 0, 1);
  const titleP = spr(frame, fps, 0, 16, 100);

  return (
    <AbsoluteFill style={{ background: bg || 'linear-gradient(145deg, #07070f 0%, #0d0d1a 100%)', overflow: 'hidden' }}>
      <Particles frame={frame} color={primaryColor} count={10} />

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: 36, gap: 24 }}>
        <div style={{ opacity: titleP }}>
          <Label color={primaryColor} style={{ textAlign: 'center', marginBottom: 8 }}>Beneficios clave</Label>
          <Headline size={28} color={isDark ? '#fff' : '#0a0a0a'} style={{ textAlign: 'center' }}>
            Por qué eligen <span style={{ color: primaryColor }}>esta solución</span>
          </Headline>
        </div>

        {/* Card con flip 3D */}
        <div style={{
          width: 300, height: 160,
          perspective: 1000,
          position: 'relative',
        }}>
          {/* Frente de la card */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(135deg, rgba(${hex2rgb(primaryColor)},0.15), rgba(${hex2rgb(secondaryColor)},0.08))`,
            borderRadius: 20,
            border: `1.5px solid rgba(${hex2rgb(primaryColor)},0.4)`,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: 24,
            backfaceVisibility: 'hidden',
            transform: `rotateY(${flipP * 180}deg)`,
            opacity: flipP < 0.5 ? 1 : 0,
            boxShadow: `0 0 30px rgba(${hex2rgb(primaryColor)},0.2)`,
          }}>
            <div style={{ fontSize: 36, marginBottom: 12, color: primaryColor }}>✓</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: isDark ? '#fff' : '#0a0a0a', textAlign: 'center', lineHeight: 1.4, fontFamily: 'system-ui, sans-serif' }}>
              {typeof safeBenefits[currentCard] === 'string'
                ? safeBenefits[currentCard]
                : (safeBenefits[currentCard]?.title || safeBenefits[currentCard]?.label || safeBenefits[currentCard]?.front || String(currentCard + 1))}
            </div>
          </div>

          {/* Dorso de la card (número del siguiente) */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
            borderRadius: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `rotateY(${flipP * 180 - 180}deg)`,
            opacity: flipP >= 0.5 ? 1 : 0,
            boxShadow: `0 0 40px rgba(${hex2rgb(primaryColor)},0.4)`,
          }}>
            <div style={{ fontSize: 64, fontWeight: 900, color: 'rgba(255,255,255,0.15)', fontFamily: 'system-ui, sans-serif' }}>
              {currentCard + 1}/{safeBenefits.length}
            </div>
          </div>
        </div>

        {/* Dots indicadores */}
        <div style={{ display: 'flex', gap: 8 }}>
          {safeBenefits.map((_, i) => (
            <div key={i} style={{
              width: i === currentCard ? 20 : 6, height: 6, borderRadius: 3,
              background: i === currentCard ? primaryColor : `rgba(${hex2rgb(primaryColor)},0.3)`,
            }} />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ZOOM PUNCH CTA — zoom dramático hacia el CTA desde lejos
function ZoomPunchCTA({ frame, fps, cta, subtext, primaryColor, secondaryColor, bg, guarantee }) {
  const zoomIn  = lerp(frame, 0, 40, 3, 1);  // zoom de 3x a 1x
  const fadeIn  = lerp(frame, 0, 25, 0, 1);
  const btnP    = spr(frame, fps, 35, 10, 100);
  const pulse   = 1 + Math.sin(frame * 0.11) * 0.03;
  const glow    = 20 + Math.sin(frame * 0.08) * 15;
  const isDark  = !bg || bg.includes('0a') || bg.includes('07') || bg.includes('linear');

  return (
    <AbsoluteFill style={{ background: bg || 'linear-gradient(145deg, #07070f 0%, #0d0d1a 100%)', overflow: 'hidden' }}>
      <RadialGlow color={primaryColor} opacity={0.2} size={500} />
      <Particles frame={frame} color={primaryColor} count={16} />

      <AbsoluteFill style={{
        justifyContent: 'center', alignItems: 'center', flexDirection: 'column',
        padding: 36, gap: 20,
        transform: `scale(${zoomIn})`,
        opacity: fadeIn,
      }}>
        <div style={{ textAlign: 'center' }}>
          <Label color={primaryColor} style={{ marginBottom: 12 }}>¿Listo para empezar?</Label>
          <div style={{
            fontSize: 22, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.75)' : '#333',
            fontFamily: 'system-ui, sans-serif', lineHeight: 1.4,
          }}>{subtext}</div>
        </div>

        <div style={{ opacity: btnP, transform: `scale(${pulse})` }}>
          <div style={{
            background: `linear-gradient(135deg, ${primaryColor}, rgba(${hex2rgb(primaryColor)},0.8))`,
            borderRadius: 100, padding: '18px 44px',
            boxShadow: `0 0 ${glow}px rgba(${hex2rgb(primaryColor)},0.7), 0 20px 50px rgba(${hex2rgb(primaryColor)},0.3)`,
          }}>
            <span style={{ color: '#fff', fontSize: 20, fontWeight: 900, fontFamily: 'system-ui, sans-serif', letterSpacing: -0.5 }}>
              {cta} →
            </span>
          </div>
        </div>

        {guarantee ? (
          <div style={{ opacity: btnP * 0.6, color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.4)', fontSize: 12, fontFamily: 'system-ui, sans-serif' }}>
            ✓ {guarantee}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// FREEZE FRAME OUTRO — frame congelado con zoom y texto que aparece encima
function FreezeFrameOutro({ frame, fps, siteName, primaryColor, secondaryColor, screenshotUrl }) {
  const freezeP   = spr(frame, fps, 0, 20, 80);
  const textP     = spr(frame, fps, 25, 14, 100);
  const zoomScale = lerp(frame, 0, 120, 1, 1.08);
  const glowPulse = 0.6 + Math.sin(frame * 0.09) * 0.4;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* Screenshot congelado con zoom */}
      {screenshotUrl ? (
        <div style={{
          position: 'absolute', inset: 0,
          transform: `scale(${zoomScale})`, transformOrigin: 'center 30%',
          filter: `brightness(0.35) saturate(0.8)`,
        }}>
          <Img src={screenshotUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: '#000' }} />
      )}

      {/* Overlay de color */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(0deg, ${primaryColor}20 0%, transparent 60%)`,
        opacity: freezeP,
      }} />

      {/* Líneas de scan tipo VHS */}
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} style={{
          position: 'absolute', left: 0, right: 0, height: 1,
          background: `rgba(${hex2rgb(primaryColor)},0.1)`,
          top: `${15 + i * 14}%`,
        }} />
      ))}

      {/* Badge "PAUSADO" estilo VHS */}
      <div style={{
        position: 'absolute', top: 40, left: 24,
        opacity: textP * (0.6 + Math.sin(frame * 0.2) * 0.4),
      }}>
        <div style={{
          background: primaryColor, borderRadius: 4,
          padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{ width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: `10px solid #fff` }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: 2, fontFamily: 'system-ui, sans-serif' }}>PLAY</span>
        </div>
      </div>

      {/* Nombre del sitio */}
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 80, flexDirection: 'column' }}>
        <div style={{ opacity: textP, transform: `scale(${0.8 + textP*0.2})`, textAlign: 'center' }}>
          <div style={{
            fontSize: 64, fontWeight: 900,
            background: `linear-gradient(135deg, #fff, ${primaryColor})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: -3, fontFamily: 'system-ui, sans-serif',
            textShadow: 'none',
          }}>{siteName}</div>
          <div style={{
            color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 5,
            textTransform: 'uppercase', marginTop: 8, fontFamily: 'system-ui, sans-serif',
          }}>EMPEZÁ HOY</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// GRID REVEAL — contenido que aparece en celdas de una grilla animada
function GridReveal({ frame, fps, benefits, primaryColor, secondaryColor, bg }) {
  const safeBenefits = (benefits || []).slice(0, 4);
  const isDark = !bg || bg.includes('0a') || bg.includes('07') || bg.includes('linear');
  const titleP = spr(frame, fps, 0, 16, 100);

  return (
    <AbsoluteFill style={{ background: bg || 'linear-gradient(145deg, #07070f 0%, #0d0d1a 100%)', overflow: 'hidden' }}>
      {/* Grid decorativo de fondo */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.05 }} viewBox="0 0 390 844">
        {Array.from({ length: 7 }, (_, i) => <line key={`v${i}`} x1={i*65} y1="0" x2={i*65} y2="844" stroke={primaryColor} strokeWidth="1" />)}
        {Array.from({ length: 7 }, (_, i) => <line key={`h${i}`} x1="0" y1={i*125} x2="390" y2={i*125} stroke={primaryColor} strokeWidth="1" />)}
      </svg>

      <AbsoluteFill style={{ padding: '32px 24px', justifyContent: 'center' }}>
        <div style={{ opacity: titleP, marginBottom: 24, textAlign: 'center' }}>
          <Label color={primaryColor} style={{ marginBottom: 8 }}>Beneficios</Label>
          <Headline size={26} color={isDark ? '#fff' : '#0a0a0a'}>
            Todo en un <span style={{ color: primaryColor }}>solo lugar.</span>
          </Headline>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {safeBenefits.map((benefit, i) => {
            const delay = i * 15;
            const p = spr(frame, fps, delay + 15, 14, 100);
            const glowP = 0.3 + Math.sin(frame * 0.07 + i * 1.5) * 0.3;
            return (
              <div key={i} style={{
                opacity: p,
                transform: `scale(${0.7 + p*0.3}) translateY(${(1-p)*30}px)`,
                background: i % 2 === 0
                  ? `rgba(${hex2rgb(primaryColor)},0.1)`
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid rgba(${hex2rgb(primaryColor)},${glowP})`,
                borderRadius: 16, padding: '18px 14px',
                textAlign: 'center',
                boxShadow: `0 0 ${glowP*20}px rgba(${hex2rgb(primaryColor)},${glowP*0.2})`,
              }}>
                <div style={{
                  fontSize: 24, marginBottom: 8,
                  color: primaryColor,
                }}>✦</div>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.85)' : '#222',
                  lineHeight: 1.4, fontFamily: 'system-ui, sans-serif',
                }}>{(benefit || '').slice(0, 50)}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// TICKER TAPE — texto que corre horizontalmente tipo ticker de noticias
function TickerTapeHook({ frame, fps, headline, primaryColor, secondaryColor, bg, siteName }) {
  const isDark = !bg || bg.includes('0a') || bg.includes('07') || bg.includes('linear');
  const speed = 2.5;
  const tickerOffset = -(frame * speed) % 600;
  const titleP = spr(frame, fps, 0, 16, 100);

  const tickerText = `${siteName?.toUpperCase() || 'PRODUCTO'} ✦ ${headline?.toUpperCase() || ''} ✦ `;

  return (
    <AbsoluteFill style={{ background: bg || 'linear-gradient(145deg, #07070f 0%, #0d0d1a 100%)', overflow: 'hidden' }}>
      <RadialGlow color={primaryColor} opacity={0.18} size={450} />
      <Particles frame={frame} color={primaryColor} count={14} />

      {/* Ticker superior */}
      <div style={{
        position: 'absolute', top: 120, left: 0, right: 0,
        background: primaryColor, overflow: 'hidden', height: 36,
        display: 'flex', alignItems: 'center',
        opacity: spr(frame, fps, 5, 16, 100),
      }}>
        <div style={{
          whiteSpace: 'nowrap',
          transform: `translateX(${tickerOffset}px)`,
          fontSize: 13, fontWeight: 800, color: '#000',
          fontFamily: 'system-ui, sans-serif', letterSpacing: 2,
        }}>
          {tickerText.repeat(5)}
        </div>
      </div>

      {/* Ticker inferior */}
      <div style={{
        position: 'absolute', bottom: 180, left: 0, right: 0,
        background: `rgba(${hex2rgb(primaryColor)},0.15)`,
        border: `1px solid rgba(${hex2rgb(primaryColor)},0.4)`,
        overflow: 'hidden', height: 30,
        display: 'flex', alignItems: 'center',
        opacity: spr(frame, fps, 10, 16, 100),
      }}>
        <div style={{
          whiteSpace: 'nowrap',
          transform: `translateX(${-tickerOffset * 0.7}px)`,
          fontSize: 11, fontWeight: 700, color: primaryColor,
          fontFamily: 'system-ui, sans-serif', letterSpacing: 3,
        }}>
          {`NUEVO ✦ GRATIS ✦ DISPONIBLE ✦ ${siteName?.toUpperCase() || ''} ✦ `.repeat(5)}
        </div>
      </div>

      {/* Headline central */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: 40, textAlign: 'center' }}>
        <div style={{ opacity: titleP, transform: `scale(${0.85 + titleP*0.15})` }}>
          <Headline size={56} color={isDark ? '#fff' : '#0a0a0a'} style={{ lineHeight: 1.05 }}>
            {headline}
          </Headline>
          <GlowLine color={primaryColor} progress={titleP} width={80} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// SPOTLIGHT — foco de luz que recorre la pantalla revelando contenido
function SpotlightReveal({ frame, fps, benefits, primaryColor, bg, siteName }) {
  const isDark = !bg || bg.includes('0a') || bg.includes('07') || bg.includes('linear');
  const safeBenefits = (benefits || []).slice(0, 3);
  const titleP = spr(frame, fps, 0, 16, 100);

  // Spotlight que se mueve
  const spotX = 195 + Math.sin(frame * 0.04) * 120;
  const spotY = 300 + Math.cos(frame * 0.03 + 1) * 200;

  return (
    <AbsoluteFill style={{ background: isDark ? '#000' : '#f0f0f0', overflow: 'hidden' }}>
      {/* Spotlight SVG */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 390 844">
        <defs>
          <radialGradient id="spotlight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={primaryColor} stopOpacity="0.2" />
            <stop offset="60%" stopColor={primaryColor} stopOpacity="0.05" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={spotX} cy={spotY} rx="180" ry="250" fill="url(#spotlight)" />
      </svg>

      <AbsoluteFill style={{ padding: '32px 28px', justifyContent: 'center' }}>
        <div style={{ opacity: titleP, marginBottom: 28, textAlign: 'center' }}>
          <Label color={primaryColor} style={{ marginBottom: 8 }}>¿Por qué {siteName}?</Label>
          <Headline size={28} color={isDark ? '#fff' : '#0a0a0a'} style={{ textAlign: 'center' }}>
            La diferencia que <span style={{ color: primaryColor }}>marca la diferencia.</span>
          </Headline>
          <GlowLine color={primaryColor} progress={titleP} width={60} />
        </div>

        {safeBenefits.map((benefit, i) => {
          const p = spr(frame, fps, i * 22 + 15, 14, 100);
          return (
            <div key={i} style={{
              opacity: p, transform: `translateX(${(1-p)*-40}px)`,
              marginBottom: 16, padding: '14px 18px',
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
              borderRadius: 14, border: `1px solid rgba(${hex2rgb(primaryColor)},0.2)`,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: primaryColor, flexShrink: 0,
                boxShadow: `0 0 10px ${primaryColor}`,
              }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: isDark ? 'rgba(255,255,255,0.88)' : '#222', fontFamily: 'system-ui, sans-serif', lineHeight: 1.4 }}>
                {benefit}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ANIMACIONES SIGNATURE — WATER DROP, CURSOR, LIQUID FILL, INK SPLASH
// ══════════════════════════════════════════════════════════════════════════════

// WATER DROP TITLE — una gota cae y al impactar "pinta" el título con ondas
function WaterDropTitle({ frame, fps, headline, primaryColor, secondaryColor, bg }) {
  const DROP_FALL   = 35;  // frames cayendo
  const IMPACT      = 36;  // frame del impacto
  const RIPPLE_DUR  = 40;  // duración de las ondas
  const TEXT_START  = 42;  // cuándo aparece el texto

  const dropY = frame < DROP_FALL
    ? lerp(frame, 0, DROP_FALL, -60, 390)  // cae desde arriba hasta el centro
    : 390;

  const dropScale = frame < DROP_FALL ? 1 : lerp(frame, IMPACT, IMPACT+5, 1, 0);
  const dropOpacity = frame < DROP_FALL ? 1 : lerp(frame, IMPACT, IMPACT+4, 1, 0);

  // Ondas que se expanden desde el punto de impacto
  const ripples = [0, 8, 16].map((offset, i) => {
    const f = Math.max(0, frame - IMPACT - offset);
    const maxR = 200 + i * 40;
    const r = Math.min(maxR, f * (maxR / RIPPLE_DUR));
    const op = Math.max(0, 1 - f / RIPPLE_DUR) * (0.6 - i * 0.15);
    return { r, op, active: f > 0 && f < RIPPLE_DUR + 5 };
  });

  // Salpicaduras radiales en el impacto
  const splashActive = frame >= IMPACT && frame < IMPACT + 20;
  const splashProgress = splashActive ? (frame - IMPACT) / 20 : 0;

  // Texto que emerge desde el centro con spring
  const textP = spr(frame, fps, TEXT_START, 16, 110);
  const isDark = !bg || bg.includes('0a') || bg.includes('07') || bg.includes('0d') || bg === '#000';
  const textColor = isDark ? '#fff' : '#0a0a0a';
  const mutedColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)';

  return (
    <AbsoluteFill style={{
      background: bg || `linear-gradient(145deg, #0a0f1e 0%, #0d1528 100%)`,
      overflow: 'hidden',
    }}>
      {/* Partículas de fondo */}
      <Particles frame={frame} color={primaryColor} count={16} />

      {/* SVG de ondas y gota */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox="0 0 390 844">

        {/* Ondas de agua */}
        {ripples.map((r, i) => r.active && (
          <circle key={i} cx="195" cy="390" r={r.r}
            fill="none"
            stroke={primaryColor}
            strokeWidth={3 - i * 0.8}
            opacity={r.op}
          />
        ))}

        {/* Salpicaduras */}
        {splashActive && Array.from({ length: 10 }, (_, i) => {
          const angle = (i / 10) * Math.PI * 2;
          const dist = splashProgress * 60;
          const x = 195 + Math.cos(angle) * dist;
          const y = 390 + Math.sin(angle) * dist * 0.5;
          const op = 1 - splashProgress;
          const r = 4 - splashProgress * 3;
          return r > 0 ? (
            <circle key={i} cx={x} cy={y} r={r}
              fill={primaryColor} opacity={op} />
          ) : null;
        })}

        {/* La gota */}
        {dropOpacity > 0 && (
          <g transform={`translate(195, ${dropY}) scale(${dropScale})`} opacity={dropOpacity}>
            {/* Forma de gota */}
            <path d="M0,-22 C8,-14 14,-4 14,6 C14,16 8,22 0,22 C-8,22 -14,16 -14,6 C-14,-4 -8,-14 0,-22 Z"
              fill={primaryColor}
              style={{ filter: `drop-shadow(0 0 8px ${primaryColor})` }}
            />
            {/* Brillo de la gota */}
            <ellipse cx="-4" cy="-6" rx="3" ry="5" fill="rgba(255,255,255,0.4)" />
          </g>
        )}
      </svg>

      {/* Glow en el punto de impacto */}
      {frame >= IMPACT && frame < IMPACT + 25 && (
        <div style={{
          position: 'absolute',
          width: 200, height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${hex2rgb(primaryColor)},${Math.max(0, 1-(frame-IMPACT)/25)*0.6}) 0%, transparent 70%)`,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
        }} />
      )}

      {/* Texto que emerge */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: 36, textAlign: 'center' }}>
        <div style={{
          opacity: textP,
          transform: `translateY(${(1-textP)*40}px) scale(${0.8 + textP*0.2})`,
        }}>
          <Headline size={58} color={textColor} style={{
            lineHeight: 1.05,
            textShadow: isDark ? `0 0 40px rgba(${hex2rgb(primaryColor)},0.5)` : 'none',
          }}>
            {headline}
          </Headline>
          <GlowLine color={primaryColor} progress={textP} width={80} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// CURSOR CLICK REVEAL — cursor animado hace click en un botón y revela el producto
function CursorClickReveal({ frame, fps, screenshotUrl, cta, primaryColor, bg }) {
  const CURSOR_MOVE = 60;  // frames moviéndose
  const CLICK_F    = 65;  // frame del click
  const REVEAL_F   = 75;  // frame de la revelación

  // Cursor se mueve de esquina inferior izquierda al centro-bajo (donde está el botón)
  const cursorX = lerp(frame, 0, CURSOR_MOVE, 30, 52);
  const cursorY = lerp(frame, 0, CURSOR_MOVE, 85, 68);

  const clickScale = frame >= CLICK_F && frame < CLICK_F+8
    ? lerp(frame, CLICK_F, CLICK_F+8, 1, 0.7)
    : frame >= CLICK_F+8 && frame < CLICK_F+16
    ? lerp(frame, CLICK_F+8, CLICK_F+16, 0.7, 1)
    : 1;

  const rippleActive = frame >= CLICK_F && frame < CLICK_F+35;
  const rippleScale = rippleActive ? lerp(frame, CLICK_F, CLICK_F+35, 0.3, 3) : 0;
  const rippleOp   = rippleActive ? Math.max(0, 1 - (frame-CLICK_F)/35) : 0;

  // Reveal del producto después del click
  const phoneP = spr(frame, fps, REVEAL_F, 12, 95);
  const float  = Math.sin(frame * 0.05) * 6;
  const isDark = !bg || bg.includes('0a') || bg.includes('07');

  return (
    <AbsoluteFill style={{
      background: bg || `linear-gradient(145deg, #0a0f1e 0%, #0d1528 100%)`,
      overflow: 'hidden',
    }}>
      <Particles frame={frame} color={primaryColor} count={12} />
      <RadialGlow color={primaryColor} opacity={0.15} size={400} />

      {/* iPhone con el screenshot */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{
          transform: `translateY(${(1-phoneP)*200 + float}px)`,
          opacity: phoneP,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', bottom: -20, left: '10%', right: '10%', height: 20,
            background: `radial-gradient(ellipse, rgba(${hex2rgb(primaryColor)},0.35) 0%, transparent 70%)`,
            filter: 'blur(8px)',
          }} />
          <div style={{
            width: 195, height: 395,
            background: 'linear-gradient(145deg, #252535, #181828)',
            borderRadius: 38, border: '2.5px solid #323250',
            overflow: 'hidden', position: 'relative',
            boxShadow: `0 40px 90px rgba(0,0,0,0.8), 0 0 50px rgba(${hex2rgb(primaryColor)},0.2)`,
          }}>
            <div style={{ position:'absolute', top:11, left:'50%', transform:'translateX(-50%)', width:72, height:22, background:'#000', borderRadius:12, zIndex:10 }} />
            {screenshotUrl
              ? <Img src={screenshotUrl} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }} />
              : <div style={{ width:'100%', height:'100%', background:`linear-gradient(180deg, rgba(${hex2rgb(primaryColor)},0.3) 0%, #050510 100%)` }} />
            }
          </div>
        </div>
      </AbsoluteFill>

      {/* Cursor animado */}
      {frame < CLICK_F + 20 && (
        <div style={{
          position: 'absolute',
          left: `${cursorX}%`, top: `${cursorY}%`,
          transform: `scale(${clickScale})`,
          zIndex: 20, pointerEvents: 'none',
        }}>
          <svg width="32" height="32" viewBox="0 0 32 32" style={{ filter: `drop-shadow(0 2px 6px rgba(0,0,0,0.5))` }}>
            <path d="M4 2L4 26L12 18L16 28L20 26L16 16L26 16Z"
              fill="white" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5"
              strokeLinejoin="round" strokeLinecap="round" />
          </svg>

          {/* Ripple de click */}
          {rippleActive && (
            <div style={{
              position: 'absolute', top: -16, left: -16,
              width: 64, height: 64, borderRadius: '50%',
              border: `2.5px solid ${primaryColor}`,
              opacity: rippleOp,
              transform: `scale(${rippleScale})`,
            }} />
          )}
        </div>
      )}
    </AbsoluteFill>
  );
}

// LIQUID FILL TEXT — texto que se llena de líquido de abajo hacia arriba
function LiquidFillText({ frame, fps, siteName, headline, primaryColor, secondaryColor, bg }) {
  const fillProgress = lerp(frame, 10, 75, 0, 1); // llenado de 0 a 100%
  const textP = spr(frame, fps, 5, 18, 90);
  const waveOffset = frame * 4; // movimiento de la ola

  // Path de ola sinusoidal para la animación del líquido
  const waveY = 100 - fillProgress * 100; // % desde abajo
  const POINTS = 20;
  const wavePoints = Array.from({ length: POINTS+2 }, (_, i) => {
    const x = (i / POINTS) * 390;
    const y_pct = waveY + Math.sin((x * 0.06) + waveOffset * 0.18) * 3
                         + Math.sin((x * 0.04) + waveOffset * 0.12 + 1) * 2;
    return `${x},${(y_pct / 100) * 200}`;
  }).join(' ');

  const isDark = !bg || bg.includes('0a') || bg.includes('07');
  const textColor = isDark ? '#fff' : '#0a0a0a';

  return (
    <AbsoluteFill style={{
      background: bg || `linear-gradient(145deg, #07070f 0%, #0d0d1a 100%)`,
      overflow: 'hidden',
    }}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: 40 }}>
        {/* Contenedor del texto con clip del líquido */}
        <div style={{ position: 'relative', textAlign: 'center', marginBottom: 16 }}>

          {/* Texto base (gris/contorno) */}
          <div style={{
            fontSize: 76, fontWeight: 900, letterSpacing: -3,
            fontFamily: 'system-ui, sans-serif', lineHeight: 1,
            color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            userSelect: 'none',
            opacity: textP,
          }}>
            {siteName}
          </div>

          {/* Texto "lleno" con clip del líquido */}
          <div style={{
            position: 'absolute', inset: 0,
            fontSize: 76, fontWeight: 900, letterSpacing: -3,
            fontFamily: 'system-ui, sans-serif', lineHeight: 1,
            color: primaryColor,
            clipPath: `inset(${Math.max(0, (1-fillProgress)*100)}% 0 0 0)`,
            textShadow: `0 0 30px rgba(${hex2rgb(primaryColor)},0.6)`,
            opacity: textP,
          }}>
            {siteName}
          </div>

          {/* Ola SVG superpuesta */}
          <svg style={{
            position: 'absolute', left: 0, right: 0,
            top: `${(1-fillProgress)*100 - 5}%`, // justo en el borde del líquido
            width: '100%', height: '15px',
            opacity: fillProgress > 0.02 && fillProgress < 0.98 ? 0.6 : 0,
          }} viewBox="0 0 390 15" preserveAspectRatio="none">
            <polyline points={wavePoints} fill="none" stroke={primaryColor} strokeWidth="2" />
          </svg>
        </div>

        {/* Headline */}
        <div style={{
          opacity: spr(frame, fps, 80, 16, 100),
          transform: `translateY(${lerp(frame, 78, 90, 16, 0)}px)`,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 16, fontWeight: 500, color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.6)',
            fontFamily: 'system-ui, sans-serif', lineHeight: 1.5,
          }}>{headline}</div>
        </div>
      </AbsoluteFill>

      {/* Partículas de burbuja subiendo */}
      {Array.from({ length: 8 }, (_, i) => {
        const bx = 30 + (i * 45) % 330;
        const baseY = 900 - (frame * (1 + i * 0.3) + i * 80) % 950;
        const bop = baseY < 844 ? Math.min(1, (844 - baseY) / 200) * 0.4 : 0;
        const br = 2 + (i % 3);
        return bop > 0 ? (
          <div key={i} style={{
            position: 'absolute', left: bx, top: baseY,
            width: br*2, height: br*2, borderRadius: '50%',
            border: `1px solid rgba(${hex2rgb(primaryColor)},0.5)`,
            opacity: bop,
          }} />
        ) : null;
      })}
    </AbsoluteFill>
  );
}

// INK SPLASH TRANSITION — transición con salpicadura de tinta que llena la pantalla
function InkSplashCTA({ frame, fps, cta, subtext, primaryColor, secondaryColor, bg, guarantee }) {
  // Fase 1: tinta que se expande desde el centro (frames 0-40)
  // Fase 2: contenido del CTA aparece (frames 35+)
  const inkScale  = lerp(frame, 0, 45, 0, 3.5);
  const inkOpacity = frame < 40 ? 1 : lerp(frame, 40, 55, 1, 0);
  const contentP  = spr(frame, fps, 38, 14, 100);
  const btnP      = spr(frame, fps, 50, 10, 100);
  const pulse     = 1 + Math.sin(frame * 0.11) * 0.028;
  const glow      = 22 + Math.sin(frame * 0.07) * 18;

  return (
    <AbsoluteFill style={{
      background: bg || `linear-gradient(145deg, #07070f 0%, #0d0d1a 100%)`,
      overflow: 'hidden',
    }}>
      <Particles frame={frame} color={primaryColor} count={18} />

      {/* Mancha de tinta que se expande */}
      <div style={{
        position: 'absolute',
        width: 120, height: 120, borderRadius: '50%',
        background: `radial-gradient(circle, ${primaryColor} 30%, ${secondaryColor} 60%, ${primaryColor}00 100%)`,
        top: '50%', left: '50%',
        transform: `translate(-50%, -50%) scale(${inkScale})`,
        opacity: inkOpacity * 0.3,
      }} />

      {/* SVG de salpicaduras */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: inkOpacity * 0.5 }} viewBox="0 0 390 844">
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const dist  = inkScale * 80;
          const cx    = 195 + Math.cos(angle) * dist;
          const cy    = 422 + Math.sin(angle) * dist * 0.7;
          const r     = Math.max(0, (inkScale * 20) - i * 3);
          return r > 0 ? (
            <circle key={i} cx={cx} cy={cy} r={r}
              fill={i % 2 === 0 ? primaryColor : secondaryColor} />
          ) : null;
        })}
      </svg>

      {/* Contenido del CTA */}
      <AbsoluteFill style={{
        justifyContent: 'flex-end', alignItems: 'center',
        paddingBottom: 80, flexDirection: 'column', gap: 18,
      }}>
        <div style={{ opacity: contentP, transform: `translateY(${(1-contentP)*24}px)`, textAlign: 'center', padding: '0 36px' }}>
          <Label color={primaryColor} style={{ marginBottom: 10 }}>¿Listo para empezar?</Label>
          <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.7)', fontFamily: 'system-ui, sans-serif', fontWeight: 500, lineHeight: 1.4 }}>
            {subtext}
          </div>
        </div>

        <div style={{ opacity: btnP, transform: `scale(${btnP * pulse})` }}>
          <div style={{
            background: `linear-gradient(135deg, ${primaryColor}, rgba(${hex2rgb(primaryColor)},0.8))`,
            borderRadius: 100, padding: '17px 40px',
            boxShadow: `0 0 ${glow}px rgba(${hex2rgb(primaryColor)},0.65), 0 16px 40px rgba(${hex2rgb(primaryColor)},0.3)`,
          }}>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, fontFamily: 'system-ui, sans-serif' }}>{cta} →</span>
          </div>
        </div>

        {guarantee ? (
          <div style={{ opacity: btnP * 0.6, color: 'rgba(255,255,255,0.38)', fontSize: 12, fontFamily: 'system-ui, sans-serif' }}>
            ✓ {guarantee}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// LIGHT SCENE — para páginas claras (fondo blanco/claro)
function LightScene({ color, children }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: '#f8f8f8', overflow: 'hidden' }}>
      {/* Partículas sutiles */}
      {Array.from({ length: 12 }, (_, i) => {
        const x = (i * 37.3) % 100;
        const baseY = (i * 53.1) % 100;
        const y = baseY + Math.sin((frame * 0.018 + i * 80) * Math.PI / 180) * 10;
        const op = 0.03 + Math.abs(Math.sin(frame * 0.025 + i)) * 0.05;
        const sz = 1.5 + (i % 3);
        return <div key={i} style={{ position:'absolute', left:`${x}%`, top:`${y}%`, width:sz, height:sz, borderRadius:'50%', background:color, opacity:op }} />;
      })}
      <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:`radial-gradient(circle, rgba(${hex2rgb(color)},0.08) 0%, transparent 70%)`, top:'50%', left:'50%', transform:'translate(-50%,-50%)' }} />
      {children}
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ANIMACIONES ÉPICAS — LIQUID, MORPHING, PAINT, GOOEY
// ══════════════════════════════════════════════════════════════════════════════

// LIQUID BLOB MORPH — formas orgánicas que se transforman con SVG filters
function LiquidBlobMorph({ frame, fps, siteName, headline, primaryColor, secondaryColor }) {
  const textP   = spr(frame, fps, 40, 14, 100);
  const t       = frame / 30; // tiempo en segundos

  // Puntos del path que morphean — 8 puntos formando un blob
  const blobPoints = (time, rx, ry) => {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const wobble = 1 + Math.sin(time * 1.3 + i * 0.8) * 0.22 + Math.cos(time * 0.9 + i * 1.2) * 0.15;
      const x = 195 + Math.cos(angle) * rx * wobble;
      const y = 422 + Math.sin(angle) * ry * wobble;
      pts.push([x, y]);
    }
    // Generar path suave con curvas bezier
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length; i++) {
      const next = pts[(i + 1) % pts.length];
      const curr = pts[i];
      const cx1 = curr[0] + (next[0] - pts[(i - 1 + pts.length) % pts.length][0]) * 0.2;
      const cy1 = curr[1] + (next[1] - pts[(i - 1 + pts.length) % pts.length][1]) * 0.2;
      const cx2 = next[0] - (pts[(i + 2) % pts.length][0] - curr[0]) * 0.2;
      const cy2 = next[1] - (pts[(i + 2) % pts.length][1] - curr[1]) * 0.2;
      d += ` C ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${next[0].toFixed(1)} ${next[1].toFixed(1)}`;
    }
    return d + ' Z';
  };

  const blob1 = blobPoints(t, 160, 180);
  const blob2 = blobPoints(t * 0.7 + 1, 100, 110);
  const pulse = 0.7 + Math.sin(frame * 0.06) * 0.3;

  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      {/* SVG Gooey filter */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="gooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
            <feColorMatrix in="blur" mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="gooey" />
          </filter>
          <radialGradient id="blobGrad1" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor={primaryColor} stopOpacity="0.95" />
            <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.6" />
          </radialGradient>
          <radialGradient id="blobGrad2" cx="60%" cy="60%" r="60%">
            <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={primaryColor} stopOpacity="0.4" />
          </radialGradient>
        </defs>
      </svg>

      {/* Blobs con filtro gooey */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'url(#gooey)' }} viewBox="0 0 390 844">
        <path d={blob1} fill="url(#blobGrad1)" opacity="0.85" />
        <path d={blob2} fill="url(#blobGrad2)" opacity="0.7" />
        {/* Blob pequeño satélite */}
        <circle
          cx={195 + Math.cos(t * 1.1) * 120}
          cy={422 + Math.sin(t * 0.9) * 100}
          r={30 + Math.sin(t * 1.5) * 10}
          fill={primaryColor} opacity="0.6"
        />
      </svg>

      {/* Overlay oscuro para legibilidad */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: 36, textAlign: 'center' }}>
        <div style={{ opacity: textP, transform: `scale(${0.8 + textP * 0.2})` }}>
          <Headline size={66} color="#fff" style={{ textShadow: '0 2px 30px rgba(0,0,0,0.8)' }}>
            {siteName}
          </Headline>
          <div style={{
            fontSize: 16, color: 'rgba(255,255,255,0.75)',
            fontFamily: 'system-ui, sans-serif', fontWeight: 500,
            marginTop: 14, lineHeight: 1.5,
            textShadow: '0 2px 12px rgba(0,0,0,0.8)',
          }}>{headline}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// PAINT BRUSH REVEAL — texto que aparece como si fuera pintado con un pincel
function PaintBrushReveal({ frame, fps, headline, primaryColor, secondaryColor }) {
  const words   = (headline || '').split(' ');
  const titleP  = spr(frame, fps, 0, 16, 100);

  // El pincel se mueve de izquierda a derecha
  const brushX  = lerp(frame, 0, 55, -50, 440);
  const brushY  = 380 + Math.sin(frame * 0.15) * 20;
  const inkDrop = Math.abs(Math.sin(frame * 0.2)) * 8;

  // Clip path que sigue al pincel — revela el texto
  const revealPct = Math.min(100, (frame / 55) * 110);

  return (
    <AbsoluteFill style={{ background: '#0a0a0a', overflow: 'hidden' }}>
      <Particles frame={frame} color={primaryColor} count={10} />

      {/* SVG del pincel y trazos */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 390 844">
        <defs>
          <clipPath id="paintReveal">
            <rect x="0" y="0" width={`${revealPct}%`} height="100%" />
          </clipPath>
          <filter id="inkBlur">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed={Math.floor(frame / 5)} />
            <feDisplacementMap in="SourceGraphic" scale="4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>

        {/* Trazo de pincel principal — grueso y orgánico */}
        {frame > 2 && (
          <path
            d={`M -20 ${brushY} Q ${brushX * 0.3} ${brushY - 30} ${brushX * 0.6} ${brushY + 15} Q ${brushX * 0.8} ${brushY - 10} ${brushX} ${brushY}`}
            stroke={primaryColor} strokeWidth={28 + inkDrop}
            fill="none" strokeLinecap="round" opacity="0.85"
            filter="url(#inkBlur)"
          />
        )}

        {/* Trazo secundario más fino */}
        {frame > 5 && (
          <path
            d={`M -20 ${brushY + 15} Q ${brushX * 0.4} ${brushY + 35} ${brushX * 0.7} ${brushY + 8} Q ${brushX * 0.9} ${brushY + 20} ${brushX} ${brushY + 12}`}
            stroke={secondaryColor} strokeWidth={10 + inkDrop * 0.5}
            fill="none" strokeLinecap="round" opacity="0.5"
            filter="url(#inkBlur)"
          />
        )}

        {/* Salpicaduras de tinta */}
        {frame > 10 && [0,1,2,3].map(i => (
          <circle key={i}
            cx={brushX - 20 - i * 15 + Math.sin(frame * 0.3 + i) * 8}
            cy={brushY + (i % 2 === 0 ? -1 : 1) * (20 + i * 10) + Math.cos(frame * 0.2 + i) * 5}
            r={2 + i * 1.5}
            fill={i % 2 === 0 ? primaryColor : secondaryColor}
            opacity={0.6 - i * 0.1}
          />
        ))}
      </svg>

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: 36 }}>
        {/* Texto revelado por el pincel */}
        <div style={{ clipPath: `inset(0 ${100 - revealPct}% 0 0)`, textAlign: 'center' }}>
          <Headline size={56} color="#fff" style={{ lineHeight: 1.1 }}>
            {headline}
          </Headline>
        </div>

        {/* Subtexto aparece después */}
        <div style={{
          opacity: lerp(frame, 60, 82, 0, 1),
          transform: `translateY(${lerp(frame, 60, 82, 16, 0)}px)`,
          marginTop: 20,
          background: `rgba(${hex2rgb(primaryColor)},0.15)`,
          border: `1px solid rgba(${hex2rgb(primaryColor)},0.35)`,
          borderRadius: 100, padding: '8px 22px',
        }}>
          <Label color={primaryColor}>Descubrí más</Label>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// WATER RIPPLE CTA — botón con efecto de ondas de agua al "aparecer"
function WaterRippleCTA({ frame, fps, cta, subtext, primaryColor, guarantee }) {
  const btnP   = spr(frame, fps, 12, 10, 100);
  const textP  = spr(frame, fps, 0, 16, 100);
  const guarP  = spr(frame, fps, 42, 16, 100);
  const pulse  = 1 + Math.sin(frame * 0.1) * 0.025;

  // Ondas que emanan del botón
  const ripples = [0, 18, 36].map(offset => {
    const f = Math.max(0, frame - offset);
    const scale = 1 + (f / 90) * 2.5;
    const op    = Math.max(0, 1 - f / 90) * 0.5;
    return { scale, op, active: f > 0 && f < 90 };
  });

  return (
    <DarkScene color={primaryColor}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: 36, gap: 20 }}>
        <div style={{ opacity: textP, transform: `translateY(${(1-textP)*24}px)`, textAlign: 'center' }}>
          <Label color={primaryColor} style={{ marginBottom: 10 }}>¿Listo para empezar?</Label>
          <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.7)', fontFamily: 'system-ui, sans-serif', fontWeight: 500, lineHeight: 1.4 }}>
            {subtext}
          </div>
        </div>

        {/* Botón con ondas */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Ondas de agua */}
          {ripples.map((r, i) => r.active && (
            <div key={i} style={{
              position: 'absolute',
              width: 220, height: 58,
              borderRadius: 100,
              border: `2px solid rgba(${hex2rgb(primaryColor)},${r.op})`,
              transform: `scale(${r.scale})`,
              pointerEvents: 'none',
            }} />
          ))}

          {/* Botón principal */}
          <div style={{
            opacity: btnP, transform: `scale(${btnP * pulse})`,
            position: 'relative', zIndex: 2,
          }}>
            <div style={{
              background: `linear-gradient(135deg, ${primaryColor}, rgba(${hex2rgb(primaryColor)},0.8))`,
              borderRadius: 100, padding: '17px 40px',
              boxShadow: `0 0 ${24 + Math.sin(frame*0.07)*16}px rgba(${hex2rgb(primaryColor)},0.65), 0 16px 40px rgba(${hex2rgb(primaryColor)},0.3)`,
            }}>
              <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, fontFamily: 'system-ui, sans-serif' }}>
                {cta} →
              </span>
            </div>
          </div>
        </div>

        {guarantee ? (
          <div style={{ opacity: guarP * 0.6 }}>
            <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
              ✓ {guarantee}
            </div>
          </div>
        ) : null}
      </AbsoluteFill>
    </DarkScene>
  );
}

// NEON SIGN — texto que se enciende como un letrero de neón
function NeonSignOutro({ frame, fps, siteName, primaryColor, secondaryColor }) {
  const p = spr(frame, fps, 0, 14, 100);
  // Efecto de encendido progresivo — el neón parpadea al inicio
  const flicker = frame < 25
    ? (frame % 4 < 2 ? 1 : 0.2)
    : frame < 40
    ? (frame % 7 < 5 ? 1 : 0.4)
    : 1;

  const glowIntensity = (20 + Math.sin(frame * 0.06) * 8) * flicker;
  const glowOp = (0.7 + Math.sin(frame * 0.05) * 0.3) * flicker;

  // Letras del logo que se encienden una por una
  const letters = siteName.split('');
  const letterDelay = 4;

  return (
    <AbsoluteFill style={{ background: '#000', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      {/* Fondo oscuro con leve glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 50%, rgba(${hex2rgb(primaryColor)},${glowOp * 0.12}) 0%, transparent 60%)`,
      }} />

      {/* Marco de letrero */}
      <div style={{
        border: `2px solid rgba(${hex2rgb(primaryColor)},0.2)`,
        borderRadius: 16, padding: '24px 36px',
        position: 'relative', marginBottom: 20,
        boxShadow: `0 0 ${glowIntensity * 0.5}px rgba(${hex2rgb(primaryColor)},0.2)`,
        opacity: p,
      }}>
        {/* Tornillos decorativos */}
        {[{top:8,left:8},{top:8,right:8},{bottom:8,left:8},{bottom:8,right:8}].map((pos,i) => (
          <div key={i} style={{
            position:'absolute', width:8, height:8, borderRadius:'50%',
            background: `rgba(${hex2rgb(primaryColor)},0.4)`, ...pos,
          }} />
        ))}

        {/* Letras de neón */}
        <div style={{ display: 'flex', gap: 2 }}>
          {letters.map((letter, i) => {
            const letterOn = frame > i * letterDelay;
            const letterFlicker = letterOn && frame < i * letterDelay + 15
              ? (frame % 3 < 2 ? 1 : 0.1)
              : letterOn ? 1 : 0;

            return (
              <span key={i} style={{
                fontSize: 64, fontWeight: 900,
                fontFamily: 'system-ui, sans-serif',
                color: letterOn ? primaryColor : 'rgba(255,255,255,0.05)',
                textShadow: letterOn ? `
                  0 0 7px #fff,
                  0 0 ${glowIntensity}px ${primaryColor},
                  0 0 ${glowIntensity*2}px ${primaryColor},
                  0 0 ${glowIntensity*4}px ${primaryColor}
                ` : 'none',
                letterSpacing: -2,
                opacity: letterFlicker,
                transition: 'color 0.1s',
              }}>
                {letter}
              </span>
            );
          })}
        </div>
      </div>

      {/* Tagline debajo */}
      <div style={{
        opacity: lerp(frame, letters.length * letterDelay + 10, letters.length * letterDelay + 30, 0, 1),
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13, letterSpacing: 4, textTransform: 'uppercase',
        fontFamily: 'system-ui, sans-serif',
      }}>
        Empezá hoy
      </div>
    </AbsoluteFill>
  );
}

// MORPHING CARD — card que morphea su forma mientras muestra beneficios
function MorphingCard({ frame, fps, benefits, primaryColor, secondaryColor }) {
  const safeBenefits = (benefits || []).slice(0, 3);
  const t = frame / 30;

  // La card morphea su border-radius
  const br1 = 50 + Math.sin(t * 0.8) * 30;
  const br2 = 20 + Math.sin(t * 0.9 + 1) * 20;
  const br3 = 40 + Math.sin(t * 0.7 + 2) * 25;
  const br4 = 15 + Math.sin(t * 1.1 + 3) * 15;

  const currentBenefit = Math.floor((frame / 90) * safeBenefits.length) % safeBenefits.length;
  const benefitP = spr(frame % 90, fps, 0, 12, 100);

  return (
    <DarkScene color={primaryColor} variant="deep">
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: 36 }}>
        {/* Título */}
        <div style={{ marginBottom: 32, textAlign: 'center', opacity: spr(frame, fps, 0, 16, 100) }}>
          <Label color={primaryColor} style={{ marginBottom: 8 }}>Por qué elegirnos</Label>
          <Headline size={28} color="#fff">Diseñado para destacar.</Headline>
        </div>

        {/* Card morpheante */}
        <div style={{
          width: 300, height: 180,
          background: `linear-gradient(135deg, rgba(${hex2rgb(primaryColor)},0.2), rgba(${hex2rgb(secondaryColor)},0.1))`,
          borderRadius: `${br1}px ${br2}px ${br3}px ${br4}px`,
          border: `1.5px solid rgba(${hex2rgb(primaryColor)},0.4)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          boxShadow: `0 0 ${20 + Math.sin(t)*10}px rgba(${hex2rgb(primaryColor)},0.25)`,
          textAlign: 'center',
        }}>
          <div style={{ opacity: benefitP, transform: `scale(${0.8 + benefitP * 0.2})` }}>
            <div style={{
              fontSize: 15, fontWeight: 600, color: '#fff',
              fontFamily: 'system-ui, sans-serif', lineHeight: 1.5,
            }}>
              {typeof safeBenefits[currentBenefit] === 'string'
                ? safeBenefits[currentBenefit]
                : (safeBenefits[currentBenefit]?.title || safeBenefits[currentBenefit]?.label || '')}
            </div>
          </div>
        </div>

        {/* Dots indicadores */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          {safeBenefits.map((_, i) => (
            <div key={i} style={{
              width: i === currentBenefit ? 20 : 6,
              height: 6, borderRadius: 3,
              background: i === currentBenefit ? primaryColor : 'rgba(255,255,255,0.2)',
              transition: 'width 0.3s',
            }} />
          ))}
        </div>
      </AbsoluteFill>
    </DarkScene>
  );
}

// TYPEWRITER WITH CURSOR — text que se tipea con cursor parpadeante y fondo de terminal
function TerminalReveal({ frame, fps, headline, subheadline, primaryColor }) {
  const lines = [
    `> Analizando ${new URL('https://example.com').hostname || 'sitio'}...`,
    `> Extracting insights...`,
    `> ${headline}`,
  ].filter(Boolean);

  // Cuántos caracteres mostrar en total
  const totalChars = lines.reduce((a, l) => a + l.length, 0);
  const charsToShow = Math.floor(lerp(frame, 5, 75, 0, totalChars));

  let remaining = charsToShow;
  const renderedLines = lines.map(line => {
    if (remaining <= 0) return { text: '', full: false };
    if (remaining >= line.length) { remaining -= line.length; return { text: line, full: true }; }
    const t = line.slice(0, remaining); remaining = 0; return { text: t, full: false };
  });

  const cursor = frame % 25 < 14;
  const promptP = spr(frame, fps, 0, 16, 100);

  return (
    <AbsoluteFill style={{ background: '#050508', overflow: 'hidden' }}>
      {/* Grid de fondo */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.04 }} viewBox="0 0 390 844">
        {Array.from({length:8},(_,i)=><line key={i} x1={i*56} y1="0" x2={i*56} y2="844" stroke={primaryColor} strokeWidth="0.5"/>)}
        {Array.from({length:7},(_,i)=><line key={i} x1="0" y1={i*125} x2="390" y2={i*125} stroke={primaryColor} strokeWidth="0.5"/>)}
      </svg>

      <RadialGlow color={primaryColor} opacity={0.12} size={400} />

      <AbsoluteFill style={{ justifyContent:'center', padding:'0 28px', flexDirection:'column' }}>
        {/* Header de terminal */}
        <div style={{
          background:'rgba(255,255,255,0.04)', borderRadius:'12px 12px 0 0',
          padding:'10px 16px', border:'1px solid rgba(255,255,255,0.08)',
          display:'flex', alignItems:'center', gap:8, marginBottom:0,
          opacity: promptP,
        }}>
          {['#ff5f57','#febc2e','#28c840'].map((c,i)=>(
            <div key={i} style={{width:10,height:10,borderRadius:'50%',background:c}} />
          ))}
          <span style={{fontSize:11,color:'rgba(255,255,255,0.3)',fontFamily:'monospace',marginLeft:8}}>
            cliping.ia — terminal
          </span>
        </div>

        <div style={{
          background:'rgba(0,0,0,0.5)', borderRadius:'0 0 12px 12px',
          padding:'20px 20px', border:'1px solid rgba(255,255,255,0.08)',
          borderTop:'none', opacity: promptP,
        }}>
          {renderedLines.map((line, i) => (
            <div key={i} style={{
              fontSize: i === 2 ? 22 : 13,
              fontFamily:'monospace',
              color: i === 2 ? '#fff' : `rgba(${hex2rgb(primaryColor)},0.7)`,
              fontWeight: i === 2 ? 700 : 400,
              lineHeight: i === 2 ? 1.3 : 1.6,
              marginBottom: i === 2 ? 0 : 4,
            }}>
              {line.text}
              {!line.full && <span style={{opacity: cursor ? 1 : 0, color: primaryColor}}>█</span>}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}


function PhoneNotification({ frame, fps, notifications, primaryColor, siteName, bg }) {
  const safeNotifs = (notifications || [
    `💰 Pago recibido`,
    `✅ Sesión confirmada`,
    `📊 Todo al día`,
  ]).slice(0, 4);

  const phoneP = spr(frame, fps, 0, 12, 95);
  const float  = Math.sin(frame * 0.045) * 6;
  const tilt   = Math.sin(frame * 0.03) * 1.5;

  // Cada notificación aparece escalonada
  const notifFrames = safeNotifs.map((_, i) => 40 + i * 35);

  return (
    <AbsoluteFill style={{ background: bg || 'linear-gradient(145deg, #07070f 0%, #0d0d1a 100%)', overflow: 'hidden' }}>
      <Particles frame={frame} color={primaryColor} count={14} />
      <RadialGlow color={primaryColor} opacity={0.15} size={380} />

      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{
          transform: `translateY(${(1-phoneP)*150 + float}px) rotate(${tilt}deg)`,
          opacity: phoneP, position: 'relative',
        }}>
          {/* Sombra */}
          <div style={{ position:'absolute', bottom:-18, left:'10%', right:'10%', height:18, background:`radial-gradient(ellipse,rgba(${hex2rgb(primaryColor)},0.32) 0%,transparent 70%)`, filter:'blur(8px)' }}/>

          {/* iPhone */}
          <div style={{ width:196, height:396, background:'linear-gradient(145deg,#252535,#181828)', borderRadius:40, border:'2.5px solid #323250', overflow:'visible', position:'relative',
            boxShadow:`0 40px 90px rgba(0,0,0,0.85), 0 0 50px rgba(${hex2rgb(primaryColor)},0.15)` }}>

            {/* Pantalla */}
            <div style={{ position:'absolute', inset:0, borderRadius:38, overflow:'hidden', background:'linear-gradient(180deg, #0a0a14 0%, #050510 100%)' }}>
              <div style={{ position:'absolute', top:11, left:'50%', transform:'translateX(-50%)', width:74, height:22, background:'#000', borderRadius:12, zIndex:10 }}/>

              {/* Header del app */}
              <div style={{ position:'absolute', top:42, left:0, right:0, padding:'8px 14px', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:`linear-gradient(135deg,${primaryColor},rgba(${hex2rgb(primaryColor)},0.6))`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:10, height:10, background:'#fff', borderRadius:2, opacity:0.9 }}/>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:'#fff', fontFamily:'system-ui,sans-serif' }}>{siteName}</span>
              </div>

              {/* Notificaciones */}
              {safeNotifs.map((notif, i) => {
                const startF = notifFrames[i];
                const p = spr(frame, fps, startF, 14, 110);
                const slideIn = lerp(frame, startF, startF+18, 220, 0);
                const notifText = typeof notif === 'string' ? notif : (notif?.text || notif?.label || `Notificación ${i+1}`);
                return (
                  <div key={i} style={{
                    position:'absolute',
                    left:8, right:8,
                    top: 90 + i * 72,
                    opacity: p,
                    transform: `translateX(${slideIn * (1-p)}px)`,
                    background:'rgba(255,255,255,0.06)',
                    border:`1px solid rgba(${hex2rgb(primaryColor)},0.25)`,
                    borderRadius:12, padding:'10px 12px',
                    display:'flex', alignItems:'center', gap:8,
                    boxShadow: p > 0.8 ? `0 0 12px rgba(${hex2rgb(primaryColor)},0.2)` : 'none',
                  }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:primaryColor, flexShrink:0, boxShadow:`0 0 6px ${primaryColor}` }}/>
                    <span style={{ fontSize:10, color:'rgba(255,255,255,0.85)', fontFamily:'system-ui,sans-serif', fontWeight:500, lineHeight:1.3 }}>
                      {notifText.slice(0, 38)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTER
// ══════════════════════════════════════════════════════════════════════════════

const ANIM_MAP = {
  // Hook — signature animations
  water_drop_title:      WaterDropTitle,
  liquid_fill_text:      LiquidFillText,
  // Hook — básicas
  counter_explosion:     CounterExplosion,
  liquid_blob_morph:     LiquidBlobMorph,
  paint_brush_reveal:    PaintBrushReveal,
  terminal_reveal:       TerminalReveal,
  typewriter_glitch:     TypewriterGlitch,
  reveal_swipe:          RevealSwipe,
  morphing_shapes:       MorphingShapes,
  split_screen_problem:  SplitScreenProblem,
  liquid_title:          RevealSwipe,
  word_split:            KineticText,
  particle_text:         ParticleReveal,
  kinetic_text:          KineticText,
  particle_reveal:       ParticleReveal,
  // Product
  iphone_rise:           IphoneRise,
  cursor_demo:           CursorDemo,
  browser_window:        IphoneRise,
  dashboard_build:       DashboardBuild,
  flow_diagram:          FlowDiagram,
  phone_notification:    PhoneNotification,
  // Benefits
  benefit_cards_stagger: BenefitCardsStagger,
  stat_counters:         StatCounters,
  comparison_table:      ComparisonTable,
  timeline_scroll:       TimelineScroll,
  floating_feature_orbs: FloatingFeatureOrbs,
  icon_draw_reveal:      IconDrawReveal,
  progress_bars:         ProgressBars,
  // CTA
  liquid_button_cta:     LiquidButtonCTA,
  screenshot_zoom_cta:   ScreenshotZoomCTA,
  urgency_countdown:     UrgencyCTA,
  // CTA — virales
  zoom_punch_cta:        ZoomPunchCTA,
  // CTA signature
  ink_splash_cta:        InkSplashCTA,
  cursor_click_reveal:   CursorClickReveal,
  // CTA adicionales
  water_ripple_cta:      WaterRippleCTA,
  // Benefits — virales
  card_flip_3d:          CardFlip3D,
  grid_reveal:           GridReveal,
  spotlight_reveal:      SpotlightReveal,
  // Benefits adicionales
  morphing_card:         MorphingCard,
  // Outro — virales
  freeze_frame_outro:    FreezeFrameOutro,
  // Outro
  logo_particle_burst:   LogoParticleBurst,
  orbit_logo:            OrbitLogo,
  gradient_text_outro:   GradientTextOutro,
  neon_sign:             NeonSignOutro,
};

function SceneWrapper({ animName, params, frame, fps }) {
  const Component = ANIM_MAP[animName] || BenefitCardsStagger;
  return <Component frame={frame} fps={fps} {...params} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// FLASH TRANSITION
// ══════════════════════════════════════════════════════════════════════════════

function Flash({ atFrame, dur = 7 }) {
  const frame = useCurrentFrame();
  const f = frame - atFrame;
  if (f < 0 || f > dur) return null;
  const op = Math.sin((f / dur) * Math.PI) * 0.4;
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'white', opacity: op,
      pointerEvents: 'none', zIndex: 999,
    }} />
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSICIÓN PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

const T = {
  hook:     { from: 0,   dur: 90  },
  product:  { from: 90,  dur: 210 },
  benefits: { from: 300, dur: 270 },
  cta:      { from: 570, dur: 210 },
  outro:    { from: 780, dur: 120 },
};

export const MarketingVideo = (props) => {
  const {
    siteName = 'Mi Sitio', headline = 'La solución que necesitás',
    subheadline = '', benefits = [], features = [],
    cta = 'Empezá gratis', problem = '', audience = '',
    numbers = [], guarantee = '',
    primaryColor = '#6366f1', secondaryColor = '#818cf8',
    screenshotUrl = null,
    hookAnimation = 'reveal_swipe',     hookParams = {},
    productAnimation = 'iphone_rise',   productParams = {},
    benefitsAnimation = 'benefit_cards_stagger', benefitsParams = {},
    ctaAnimation = 'liquid_button_cta', ctaParams = {},
    outroAnimation = 'orbit_logo',      outroParams = {},
    brief = {},
  } = props;

  // Colores del brief creativo del director de arte
  const brandBg     = brief?.paleta?.fondo   || `linear-gradient(145deg, #07070f 0%, #0d0d1a 100%)`;
  const brandAccent = brief?.paleta?.acento  || primaryColor;
  const brandText   = brief?.paleta?.texto   || '#ffffff';

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const base = {
    primaryColor: brandAccent || primaryColor,
    secondaryColor, siteName, headline, subheadline,
    benefits, features, cta, problem, audience, numbers, guarantee,
    screenshotUrl,
    brandBg, brandText, brief,
    steps: features.length > 0 ? features : benefits.slice(0, 4),
    stats: numbers.length > 0 ? numbers : benefits.slice(0, 4),
    before: [problem, 'Sin control', 'Tiempo perdido', 'Errores frecuentes'].slice(0, 4),
    after: benefits.slice(0, 4),
    words: (headline || '').split(' '),
    tagline: subheadline || headline,
    line1: headline, line2: subheadline,
    title: siteName, subtitle: subheadline,
    label: 'usuarios satisfechos', prefix: '$', suffix: '+',
    number: numbers[0] || '1000',
    problemText: problem,
    solutionText: benefits[0] || cta,
    ctaText: cta,
    subtext: subheadline || `Transformá ${audience || 'tu negocio'} hoy`,
  };

  const merged = (extra) => ({ ...base, bg: brandBg, ...extra });

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Sequence from={T.hook.from} durationInFrames={T.hook.dur}>
        <SceneWrapper animName={hookAnimation} params={merged(hookParams)} frame={frame} fps={fps} />
      </Sequence>

      <Sequence from={T.product.from} durationInFrames={T.product.dur}>
        <SceneWrapper animName={productAnimation} params={merged(productParams)} frame={frame - T.product.from} fps={fps} />
      </Sequence>

      <Sequence from={T.benefits.from} durationInFrames={T.benefits.dur}>
        <SceneWrapper animName={benefitsAnimation} params={merged(benefitsParams)} frame={frame - T.benefits.from} fps={fps} />
      </Sequence>

      <Sequence from={T.cta.from} durationInFrames={T.cta.dur}>
        <SceneWrapper animName={ctaAnimation} params={merged(ctaParams)} frame={frame - T.cta.from} fps={fps} />
      </Sequence>

      <Sequence from={T.outro.from} durationInFrames={T.outro.dur}>
        <SceneWrapper animName={outroAnimation} params={merged(outroParams)} frame={frame - T.outro.from} fps={fps} />
      </Sequence>

      <Flash atFrame={T.product.from} />
      <Flash atFrame={T.benefits.from} />
      <Flash atFrame={T.cta.from} />
      <Flash atFrame={T.outro.from} />
    </AbsoluteFill>
  );
};

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

function DarkScene({ color, children, variant = 'default' }) {
  const bgs = {
    default: `linear-gradient(145deg, #07070f 0%, #0d0d1a 100%)`,
    deep:    `linear-gradient(160deg, #050508 0%, #0a0a12 100%)`,
    warm:    `linear-gradient(145deg, #080508 0%, #120a0a 100%)`,
  };
  return (
    <AbsoluteFill style={{ background: bgs[variant] || bgs.default, overflow: 'hidden' }}>
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

function BenefitCardsStagger({ frame, fps, benefits, primaryColor }) {
  const safeBenefits = (benefits || []).slice(0, 4);
  const titleP = spr(frame, fps, 0, 16, 100);
  const lineP  = spr(frame, fps, 8, 18, 100);

  return (
    <DarkScene color={primaryColor}>
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

function ComparisonTable({ frame, fps, before, after, primaryColor, siteName }) {
  const safeBefore = (before || []).slice(0, 4);
  const safeAfter  = (after  || []).slice(0, 4);
  const titleP = spr(frame, fps, 0, 16, 100);

  return (
    <DarkScene color={primaryColor}>
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
// ROUTER
// ══════════════════════════════════════════════════════════════════════════════

const ANIM_MAP = {
  // Hook
  counter_explosion:     CounterExplosion,
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
  phone_notification:    IphoneRise,
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
  // Outro
  logo_particle_burst:   LogoParticleBurst,
  orbit_logo:            OrbitLogo,
  gradient_text_outro:   GradientTextOutro,
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
  } = props;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const base = {
    primaryColor, secondaryColor, siteName, headline, subheadline,
    benefits, features, cta, problem, audience, numbers, guarantee,
    screenshotUrl,
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

  const merged = (extra) => ({ ...base, ...extra });

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

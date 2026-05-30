import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Img,
  Sequence,
} from 'remotion';

// ─── Helpers base ────────────────────────────────────────────────────────────

const lerp = (frame, a, b, from, to) =>
  interpolate(frame, [a, b], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

const spr = (frame, fps, delay = 0, damping = 14, stiffness = 120) =>
  spring({ frame: Math.max(0, frame - delay), fps, config: { damping, stiffness, mass: 0.6 } });

const BG = '#07070f';

// ─── Fondo oscuro con partículas ─────────────────────────────────────────────

function DarkBg({ color, particleCount = 20, children }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `linear-gradient(145deg, ${BG} 0%, #0d0d1a 100%)`, overflow: 'hidden' }}>
      {Array.from({ length: particleCount }, (_, i) => {
        const x = (i * 37.3) % 100;
        const baseY = (i * 53.1) % 100;
        const y = baseY + Math.sin((frame * (0.02 + i * 0.005) + i * 100)) * 15;
        const op = 0.05 + Math.abs(Math.sin(frame * 0.03 + i)) * 0.1;
        const sz = 1.5 + (i % 3);
        return <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: sz, height: sz, borderRadius: '50%', background: color, opacity: op }} />;
      })}
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${color}20 0%, transparent 65%)`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
      {children}
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOK ANIMATIONS
// ══════════════════════════════════════════════════════════════════════════════

function LiquidTitle({ frame, fps, headline, subtitle, primaryColor }) {
  const blobP = spr(frame, fps, 0, 8, 60);
  const textP = spr(frame, fps, 15, 14, 110);
  const subP  = spr(frame, fps, 28, 16, 100);
  const blob  = 50 + Math.sin(frame * 0.06) * 8;
  const blob2 = 50 + Math.sin(frame * 0.04 + 2) * 6;

  return (
    <DarkBg color={primaryColor} particleCount={25}>
      {/* SVG blob líquido */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }} viewBox="0 0 390 844">
        <ellipse cx="195" cy="422" rx={`${blob * blobP}`} ry={`${blob2 * blobP}`}
          fill={primaryColor} style={{ filter: 'blur(40px)' }} />
      </svg>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: 36 }}>
        <div style={{ opacity: textP, transform: `scale(${0.7 + textP * 0.3}) translateY(${(1 - textP) * 40}px)`, textAlign: 'center' }}>
          <div style={{ fontSize: 68, fontWeight: 900, color: '#fff', letterSpacing: -3, lineHeight: 1.05, textShadow: `0 0 60px ${primaryColor}60` }}>
            {headline}
          </div>
        </div>
        <div style={{ opacity: subP, transform: `translateY(${(1 - subP) * 20}px)`, marginTop: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: primaryColor, letterSpacing: 4, textTransform: 'uppercase' }}>
            {subtitle}
          </div>
        </div>
      </AbsoluteFill>
    </DarkBg>
  );
}

function TypewriterGlitch({ frame, fps, line1, line2, color }) {
  const totalChars1 = (line1 || '').length;
  const totalChars2 = (line2 || '').length;
  const chars1 = Math.floor(lerp(frame, 5, 40, 0, totalChars1));
  const chars2 = Math.floor(lerp(frame, 45, 75, 0, totalChars2));
  const glitch = Math.sin(frame * 3.7) > 0.92;
  const glitchX = glitch ? (Math.sin(frame * 7) * 4) : 0;

  return (
    <DarkBg color={color} particleCount={10}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'flex-start', padding: '0 36px', flexDirection: 'column' }}>
        <div style={{ fontSize: 11, color: color, letterSpacing: 4, fontFamily: 'monospace', marginBottom: 16, opacity: 0.7 }}>
          &gt; INICIANDO...
        </div>
        <div style={{ fontSize: 52, fontWeight: 900, color: '#fff', letterSpacing: -2, lineHeight: 1.1, transform: `translateX(${glitchX}px)` }}>
          {(line1 || '').slice(0, chars1)}<span style={{ opacity: frame % 30 < 15 ? 1 : 0, color }}>|</span>
        </div>
        {chars2 > 0 && (
          <div style={{ fontSize: 28, fontWeight: 600, color, marginTop: 12, fontFamily: 'monospace' }}>
            {(line2 || '').slice(0, chars2)}<span style={{ opacity: frame % 30 < 15 ? 1 : 0 }}>_</span>
          </div>
        )}
        {/* Líneas de código decorativas */}
        {[0, 1, 2].map(i => (
          <div key={i} style={{ fontSize: 11, color: '#ffffff20', fontFamily: 'monospace', marginTop: 8 }}>
            {['const solution = true;', 'await problem.resolve();', 'return success;'][i]}
          </div>
        ))}
      </AbsoluteFill>
    </DarkBg>
  );
}

function CounterExplosion({ frame, fps, number, label, prefix = '', suffix = '', primaryColor }) {
  const numVal = parseFloat((number || '0').toString().replace(/[^0-9.]/g, '')) || 1000;
  const progress = Math.min(Math.max((frame - 10) / 50, 0), 1);
  const eased = 1 - Math.pow(1 - progress, 3);
  const current = Math.floor(eased * numVal);
  const scaleP = spr(frame, fps, 0, 10, 80);
  const labelP = spr(frame, fps, 55, 14, 100);
  const particleBurst = frame > 58 && frame < 90;
  const pulse = 1 + Math.sin(frame * 0.15) * 0.03;

  return (
    <DarkBg color={primaryColor} particleCount={30}>
      {particleBurst && Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const dist = (frame - 58) * 5;
        return (
          <div key={i} style={{
            position: 'absolute', width: 6, height: 6, borderRadius: '50%',
            background: primaryColor, top: '50%', left: '50%',
            transform: `translate(${Math.cos(angle) * dist - 3}px, ${Math.sin(angle) * dist - 3}px)`,
            opacity: Math.max(0, 1 - (frame - 58) / 32),
          }} />
        );
      })}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <div style={{ transform: `scale(${scaleP * pulse})`, textAlign: 'center' }}>
          <div style={{ fontSize: 16, color: primaryColor, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>
            {prefix}
          </div>
          <div style={{ fontSize: 82, fontWeight: 900, color: '#fff', letterSpacing: -4, textShadow: `0 0 80px ${primaryColor}80` }}>
            {current.toLocaleString('es-AR')}{suffix}
          </div>
        </div>
        <div style={{ opacity: labelP, transform: `translateY(${(1 - labelP) * 20}px)`, marginTop: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{label}</div>
        </div>
      </AbsoluteFill>
    </DarkBg>
  );
}

function MorphingShapes({ frame, fps, siteName, primaryColor, secondaryColor }) {
  const progress = lerp(frame, 0, 89, 0, 1);
  const textP = spr(frame, fps, 50, 16, 100);
  const r1 = 60 + Math.sin(frame * 0.05) * 20;
  const r2 = 80 + Math.sin(frame * 0.04 + 1) * 15;
  const rot = frame * 0.8;
  const rot2 = -frame * 0.5;

  return (
    <DarkBg color={primaryColor} particleCount={20}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <svg width="300" height="300" viewBox="0 0 300 300" style={{ position: 'absolute' }}>
          <ellipse cx="150" cy="150" rx={r1} ry={r2} fill="none" stroke={primaryColor}
            strokeWidth="2" opacity="0.4" transform={`rotate(${rot} 150 150)`} />
          <ellipse cx="150" cy="150" rx={r2 * 0.7} ry={r1 * 0.7} fill="none" stroke={secondaryColor}
            strokeWidth="1.5" opacity="0.3" transform={`rotate(${rot2} 150 150)`} />
          <circle cx="150" cy="150" r={40 + Math.sin(frame * 0.08) * 10}
            fill={primaryColor} opacity="0.15" />
        </svg>
        <div style={{ opacity: textP, transform: `scale(${0.8 + textP * 0.2})`, textAlign: 'center', zIndex: 2 }}>
          <div style={{ fontSize: 72, fontWeight: 900, background: `linear-gradient(135deg, #fff, ${primaryColor})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -3 }}>
            {siteName}
          </div>
        </div>
      </AbsoluteFill>
    </DarkBg>
  );
}

function RevealSwipe({ frame, fps, headline, primaryColor }) {
  const swipeP = lerp(frame, 5, 35, 0, 100);
  const textP  = spr(frame, fps, 10, 14, 100);
  const chipP  = spr(frame, fps, 40, 16, 100);

  return (
    <DarkBg color={primaryColor} particleCount={15}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: 36 }}>
        <div style={{ position: 'relative', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ fontSize: 62, fontWeight: 900, color: '#fff', letterSpacing: -2.5, lineHeight: 1.05, textAlign: 'center' }}>
            {headline}
          </div>
          {/* Swipe de color que revela el texto */}
          <div style={{
            position: 'absolute', inset: 0, background: primaryColor,
            transform: `translateX(${swipeP}%)`,
            mixBlendMode: 'multiply',
          }} />
        </div>
        <div style={{ opacity: chipP, transform: `translateY(${(1 - chipP) * 16}px)` }}>
          <div style={{ background: `${primaryColor}20`, border: `1px solid ${primaryColor}50`, borderRadius: 100, padding: '8px 20px' }}>
            <span style={{ color: primaryColor, fontSize: 12, fontWeight: 700, letterSpacing: 3 }}>DESCUBRÍ MÁS</span>
          </div>
        </div>
      </AbsoluteFill>
    </DarkBg>
  );
}

function SplitScreenProblem({ frame, fps, problemText, solutionText, primaryColor }) {
  const splitP = spr(frame, fps, 0, 12, 90);
  const textLP = spr(frame, fps, 20, 16, 100);
  const textRP = spr(frame, fps, 35, 16, 100);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* Lado izquierdo - problema */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: `${50 * splitP}%`, background: '#1a0a0a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px', overflow: 'hidden',
      }}>
        <div style={{ opacity: textLP, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✗</div>
          <div style={{ fontSize: 16, color: '#ff6b6b', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ANTES</div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>{problemText}</div>
        </div>
      </div>
      {/* Lado derecho - solución */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        width: `${50 * splitP}%`, background: '#07070f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px', overflow: 'hidden',
      }}>
        <div style={{ opacity: textRP, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 16, color: primaryColor, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>AHORA</div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>{solutionText}</div>
        </div>
      </div>
      {/* Divisor central */}
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: primaryColor, transform: 'translateX(-50%)', boxShadow: `0 0 20px ${primaryColor}` }} />
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCT ANIMATIONS
// ══════════════════════════════════════════════════════════════════════════════

function IphoneRise({ frame, fps, screenshotUrl, primaryColor }) {
  const phoneP = spr(frame, fps, 0, 13, 100);
  const float  = Math.sin(frame * 0.055) * 7;
  const tilt   = Math.sin(frame * 0.038) * 1.5;
  const glowP  = spr(frame, fps, 5, 20, 80);

  return (
    <DarkBg color={primaryColor} particleCount={18}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', background: `radial-gradient(circle, ${primaryColor}25 0%, transparent 70%)`, opacity: glowP }} />
        <div style={{ transform: `translateY(${(1 - phoneP) * 160 + float}px) rotate(${tilt}deg)`, opacity: phoneP, position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: -20, left: '10%', right: '10%', height: 20, background: `radial-gradient(ellipse, ${primaryColor}40 0%, transparent 70%)`, filter: 'blur(8px)' }} />
          <div style={{ width: 200, height: 395, background: 'linear-gradient(145deg, #2a2a3e, #1a1a2e)', borderRadius: 38, border: '2.5px solid #3a3a5e', overflow: 'hidden', boxShadow: `0 40px 90px rgba(0,0,0,0.85), 0 0 0 1px #4a4a6e, 0 0 60px ${primaryColor}30`, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 72, height: 22, background: '#000', borderRadius: 12, zIndex: 10 }} />
            {screenshotUrl ? (
              <Img src={screenshotUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: `linear-gradient(180deg, ${primaryColor}30 0%, #050510 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 36 }}>○</div>
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(0deg, rgba(10,10,20,0.9) 0%, transparent 100%)' }} />
          </div>
        </div>
      </AbsoluteFill>
    </DarkBg>
  );
}

function CursorDemo({ frame, fps, screenshotUrl, ctaText, primaryColor }) {
  const phoneP   = spr(frame, fps, 0, 13, 100);
  const cursorP  = spr(frame, fps, 40, 16, 100);
  const float    = Math.sin(frame * 0.04) * 6;
  const click    = frame > 110 && frame < 130;
  const clickScale = click ? lerp(frame, 110, 120, 1, 0.85) : lerp(frame, 120, 130, 0.85, 1);
  // Cursor se mueve hacia el botón
  const cursorX = lerp(frame, 50, 100, 30, 50);
  const cursorY = lerp(frame, 50, 100, 20, 72);

  return (
    <DarkBg color={primaryColor} particleCount={15}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ transform: `translateY(${(1 - phoneP) * 140 + float}px)`, opacity: phoneP, position: 'relative' }}>
          <div style={{ width: 200, height: 395, background: 'linear-gradient(145deg, #2a2a3e, #1a1a2e)', borderRadius: 38, border: '2.5px solid #3a3a5e', overflow: 'hidden', boxShadow: `0 30px 70px rgba(0,0,0,0.8), 0 0 50px ${primaryColor}25`, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 72, height: 22, background: '#000', borderRadius: 12, zIndex: 10 }} />
            {screenshotUrl ? (
              <Img src={screenshotUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: `linear-gradient(180deg, ${primaryColor}30 0%, #050510 100%)` }} />
            )}
          </div>

          {/* Cursor SVG animado */}
          {cursorP > 0.1 && (
            <div style={{
              position: 'absolute',
              left: `${cursorX}%`, top: `${cursorY}%`,
              opacity: cursorP,
              transform: `scale(${clickScale})`,
              zIndex: 20,
            }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M4 2L4 22L10 16L14 24L17 23L13 15L22 15L4 2Z" fill="white" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              {click && (
                <div style={{ position: 'absolute', top: -10, left: -10, width: 48, height: 48, borderRadius: '50%', border: `2px solid ${primaryColor}`, opacity: lerp(frame, 110, 130, 1, 0), transform: `scale(${lerp(frame, 110, 130, 0.5, 2)})` }} />
              )}
            </div>
          )}
        </div>
      </AbsoluteFill>
    </DarkBg>
  );
}

function DashboardBuild({ frame, fps, stats, primaryColor, siteName }) {
  const safeStats = (stats || []).slice(0, 3);
  const cardP = (i) => spr(frame, fps, i * 18, 14, 100);

  return (
    <DarkBg color={primaryColor} particleCount={12}>
      <AbsoluteFill style={{ padding: '30px 24px', justifyContent: 'center' }}>
        {/* Header dashboard */}
        <div style={{ opacity: cardP(0), transform: `translateY(${(1 - cardP(0)) * -20}px)`, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 16, height: 16, background: '#fff', borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{siteName}</div>
            <div style={{ marginLeft: 'auto', background: '#1a1a2e', border: '1px solid #333', borderRadius: 6, padding: '3px 10px' }}>
              <span style={{ color: primaryColor, fontSize: 11, fontWeight: 600 }}>● EN VIVO</span>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        {safeStats.map((stat, i) => {
          const p = cardP(i + 1);
          const numMatch = (stat || '').match(/[\d,.]+/);
          const numVal = numMatch ? parseFloat(numMatch[0].replace(/[,.]/g, '')) : (i + 1) * 1000;
          const progress2 = Math.min(Math.max((frame - (i + 1) * 18 - 10) / 40, 0), 1);
          const eased = 1 - Math.pow(1 - progress2, 3);
          const current = Math.floor(eased * numVal);

          return (
            <div key={i} style={{
              opacity: p, transform: `translateX(${(1 - p) * -30}px)`,
              background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.08)`,
              borderRadius: 14, padding: '16px 20px', marginBottom: 12,
              boxShadow: i === 1 ? `0 0 20px ${primaryColor}30` : 'none',
              borderColor: i === 1 ? `${primaryColor}40` : 'rgba(255,255,255,0.08)',
            }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
                {typeof stat === 'string' ? (stat.replace(/[\d,.]+/, '').trim() || `Métrica ${i + 1}`) : (stat?.label || `Métrica ${i + 1}`)}
              </div>
              <div style={{ fontSize: 36, fontWeight: 900, color: i === 1 ? primaryColor : '#fff', letterSpacing: -1 }}>
                {current.toLocaleString('es-AR')}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </DarkBg>
  );
}

function FlowDiagram({ frame, fps, steps, primaryColor }) {
  const safeSteps = (steps || ['Paso 1', 'Paso 2', 'Paso 3']).slice(0, 3);
  const lineP = lerp(frame, 20, 80, 0, 1);

  return (
    <DarkBg color={primaryColor} particleCount={10}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: '0 30px' }}>
        <div style={{ width: '100%' }}>
          {/* Título */}
          <div style={{ textAlign: 'center', marginBottom: 40, opacity: spr(frame, fps, 0, 16, 100) }}>
            <div style={{ fontSize: 13, color: primaryColor, letterSpacing: 4, fontWeight: 700, textTransform: 'uppercase' }}>CÓMO FUNCIONA</div>
          </div>

          {safeSteps.map((step, i) => {
            const p = spr(frame, fps, i * 22, 14, 100);
            return (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: p, transform: `translateX(${(1 - p) * -40}px)` }}>
                  {/* Número del paso */}
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}80)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 0 20px ${primaryColor}50`,
                    fontSize: 20, fontWeight: 900, color: '#fff',
                  }}>
                    {i + 1}
                  </div>
                  {/* Texto */}
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px 18px', border: `1px solid rgba(255,255,255,0.08)` }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{step}</div>
                  </div>
                </div>
                {/* Línea conectora */}
                {i < safeSteps.length - 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                    <div style={{ width: 2, height: 28, background: `linear-gradient(180deg, ${primaryColor}, ${primaryColor}20)`, opacity: lineP }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </DarkBg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BENEFITS ANIMATIONS
// ══════════════════════════════════════════════════════════════════════════════

function BenefitCardsStagger({ frame, fps, benefits, primaryColor }) {
  const safeBenefits = (benefits || []).slice(0, 4);
  const titleP = spr(frame, fps, 0, 16, 100);

  return (
    <DarkBg color={primaryColor} particleCount={8}>
      <AbsoluteFill style={{ padding: '30px 24px', justifyContent: 'center' }}>
        <div style={{ opacity: titleP, transform: `translateY(${(1 - titleP) * -15}px)`, marginBottom: 22 }}>
          <div style={{ fontSize: 11, color: primaryColor, letterSpacing: 4, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>POR QUÉ ELEGIRNOS</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>
            Todo lo que necesitás,{'\n'}<span style={{ color: primaryColor }}>en un solo lugar.</span>
          </div>
          <div style={{ width: 0, height: 2, background: primaryColor, marginTop: 10, width: `${50 * titleP}%`, borderRadius: 2 }} />
        </div>

        {safeBenefits.map((benefit, i) => {
          const p = spr(frame, fps, 15 + i * 18, 14, 100);
          const glowPulse = 0.5 + Math.sin(frame * 0.08 + i) * 0.5;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              opacity: p, transform: `translateX(${(1 - p) * -50}px)`,
              marginBottom: 12, background: 'rgba(255,255,255,0.04)',
              borderRadius: 14, padding: '12px 16px',
              border: `1px solid ${primaryColor}${Math.round(glowPulse * 30).toString(16).padStart(2,'0')}`,
              boxShadow: `0 0 ${glowPulse * 15}px ${primaryColor}20`,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${primaryColor}20`, border: `1px solid ${primaryColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <polyline points="2,9 7,14 16,4" stroke={primaryColor} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.9)', lineHeight: 1.4 }}>{benefit}</div>
            </div>
          );
        })}
      </AbsoluteFill>
    </DarkBg>
  );
}

function StatCounters({ frame, fps, stats, primaryColor }) {
  const safeStats = (stats || [{ value: 1000, label: 'usuarios' }]).slice(0, 4);
  const titleP = spr(frame, fps, 0, 16, 100);

  return (
    <DarkBg color={primaryColor} particleCount={20}>
      <AbsoluteFill style={{ padding: '30px 24px', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ opacity: titleP, marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: primaryColor, letterSpacing: 4, fontWeight: 800, textTransform: 'uppercase' }}>RESULTADOS REALES</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%' }}>
          {safeStats.map((stat, i) => {
            const p = spr(frame, fps, i * 15, 14, 100);
            const statObj = typeof stat === 'string' 
              ? { value: parseFloat(stat.replace(/[^0-9.]/g, '')) || 100, label: stat.replace(/[\d,.]+/, '').trim() }
              : (stat && typeof stat === 'object' ? { value: stat.value || 100, label: stat.label || '' } : { value: 100, label: String(stat) });
            const progress = Math.min(Math.max((frame - i * 15 - 10) / 45, 0), 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(eased * (statObj.value || 100));

            return (
              <div key={i} style={{
                opacity: p, transform: `scale(${0.7 + p * 0.3})`,
                background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: '20px 12px',
                border: `1px solid ${primaryColor}30`, textAlign: 'center',
                boxShadow: `0 0 ${20 + Math.sin(frame * 0.08 + i) * 10}px ${primaryColor}20`,
              }}>
                <div style={{ fontSize: 44, fontWeight: 900, color: primaryColor, letterSpacing: -2 }}>{current.toLocaleString('es-AR')}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontWeight: 600 }}>{statObj.label || `Métrica ${i + 1}`}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </DarkBg>
  );
}

function ComparisonTable({ frame, fps, before, after, primaryColor, siteName }) {
  const safeBefore = (before || ['Proceso lento', 'Errores frecuentes', 'Sin visibilidad']).slice(0, 3);
  const safeAfter  = (after  || ['Rápido y simple', 'Preciso siempre', 'Control total']).slice(0, 3);
  const titleP = spr(frame, fps, 0, 16, 100);

  return (
    <DarkBg color={primaryColor} particleCount={8}>
      <AbsoluteFill style={{ padding: '30px 20px', justifyContent: 'center' }}>
        <div style={{ opacity: titleP, marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>
            Sin {siteName} <span style={{ color: 'rgba(255,100,100,0.8)' }}>vs</span> Con {siteName}
          </div>
        </div>

        {/* Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,100,100,0.8)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>ANTES</div>
          <div style={{ textAlign: 'center', fontSize: 11, color: primaryColor, letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>AHORA</div>
        </div>

        {safeBefore.map((item, i) => {
          const p = spr(frame, fps, 15 + i * 20, 14, 100);
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8, opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>
              <div style={{ background: 'rgba(255,100,100,0.08)', border: '1px solid rgba(255,100,100,0.2)', borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,100,100,0.8)', fontSize: 14, fontWeight: 900 }}>✗</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{item}</span>
              </div>
              <div style={{ background: `${primaryColor}12`, border: `1px solid ${primaryColor}30`, borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: primaryColor, fontSize: 14, fontWeight: 900 }}>✓</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{safeAfter[i] || ''}</span>
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </DarkBg>
  );
}

function FloatingFeatureOrbs({ frame, fps, features, primaryColor, secondaryColor }) {
  const safeFeatures = (features || []).slice(0, 5);
  const centerP = spr(frame, fps, 0, 14, 100);

  return (
    <DarkBg color={primaryColor} particleCount={25}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        {/* Centro */}
        <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, boxShadow: `0 0 40px ${primaryColor}60`, transform: `scale(${centerP})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 30, height: 30, background: '#fff', borderRadius: '50%', opacity: 0.9 }} />
        </div>

        {/* Órbitas */}
        <svg style={{ position: 'absolute', width: 350, height: 350 }} viewBox="0 0 350 350">
          <circle cx="175" cy="175" r="130" fill="none" stroke={`${primaryColor}20`} strokeWidth="1" />
          <circle cx="175" cy="175" r="85" fill="none" stroke={`${primaryColor}15`} strokeWidth="1" />
        </svg>

        {/* Orbes de features */}
        {safeFeatures.map((feature, i) => {
          const angle = (frame * 0.5 + i * (360 / safeFeatures.length)) * Math.PI / 180;
          const r = i % 2 === 0 ? 130 : 85;
          const x = 175 + Math.cos(angle) * r - 175;
          const y = 175 + Math.sin(angle) * r - 175;
          const p = spr(frame, fps, i * 10, 16, 100);
          return (
            <div key={i} style={{
              position: 'absolute', opacity: p,
              transform: `translate(${x}px, ${y}px)`,
            }}>
              <div style={{ background: '#0d0d1a', border: `1.5px solid ${primaryColor}50`, borderRadius: 12, padding: '8px 10px', maxWidth: 100, textAlign: 'center', boxShadow: `0 0 15px ${primaryColor}25` }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600, lineHeight: 1.3 }}>{(feature || '').slice(0, 30)}</div>
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </DarkBg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CTA ANIMATIONS
// ══════════════════════════════════════════════════════════════════════════════

function LiquidButtonCTA({ frame, fps, cta, subtext, primaryColor, guarantee }) {
  const titleP   = spr(frame, fps, 0, 16, 100);
  const btnP     = spr(frame, fps, 25, 11, 100);
  const guarP    = spr(frame, fps, 45, 16, 100);
  const pulse    = 1 + Math.sin(frame * 0.12) * 0.03;
  const glow     = 25 + Math.sin(frame * 0.08) * 20;
  const glowHex  = Math.round((0.5 + Math.sin(frame * 0.08) * 0.5) * 99).toString(16).padStart(2,'0');
  const blobX    = Math.sin(frame * 0.05) * 10;
  const blobY    = Math.sin(frame * 0.07 + 1) * 8;

  return (
    <DarkBg color={primaryColor} particleCount={20}>
      {/* SVG blob líquido detrás del botón */}
      <svg style={{ position: 'absolute', bottom: '28%', left: '50%', transform: `translate(-50%, 50%) translate(${blobX}px, ${blobY}px)`, opacity: 0.2, width: 300, height: 120 }} viewBox="0 0 300 120">
        <ellipse cx="150" cy="60" rx={140 + Math.sin(frame * 0.06) * 15} ry={50 + Math.sin(frame * 0.04) * 10} fill={primaryColor} style={{ filter: 'blur(20px)' }} />
      </svg>

      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 80, flexDirection: 'column', gap: 16 }}>
        <div style={{ opacity: titleP, transform: `translateY(${(1 - titleP) * 30}px)`, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: primaryColor, letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>¿LISTO PARA EMPEZAR?</div>
          <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{subtext}</div>
        </div>

        <div style={{ opacity: btnP, transform: `scale(${btnP * pulse})` }}>
          <div style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`, borderRadius: 100, padding: '17px 38px', boxShadow: `0 0 ${glow}px ${primaryColor}${glowHex}, 0 20px 50px ${primaryColor}40`, cursor: 'pointer' }}>
            <span style={{ color: '#fff', fontSize: 19, fontWeight: 800, letterSpacing: -0.5 }}>{cta} →</span>
          </div>
        </div>

        {guarantee ? (
          <div style={{ opacity: guarP * 0.7 }}>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, textAlign: 'center' }}>✓ {guarantee}</div>
          </div>
        ) : null}
      </AbsoluteFill>
    </DarkBg>
  );
}

function ScreenshotZoomCTA({ frame, fps, screenshotUrl, cta, primaryColor, guarantee }) {
  const bgScale  = lerp(frame, 0, 210, 1.0, 1.12);
  const overlayP = spr(frame, fps, 0, 20, 80);
  const btnP     = spr(frame, fps, 35, 12, 100);
  const pulse    = 1 + Math.sin(frame * 0.12) * 0.03;
  const glow     = 25 + Math.sin(frame * 0.08) * 20;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {screenshotUrl ? (
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${bgScale})`, transformOrigin: 'center 30%' }}>
          <Img src={screenshotUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${primaryColor}40, #07070f)` }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.1) 100%)', opacity: overlayP }} />

      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 70, flexDirection: 'column', gap: 14 }}>
        <div style={{ opacity: btnP, transform: `scale(${btnP * pulse})` }}>
          <div style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}bb)`, borderRadius: 100, padding: '16px 36px', boxShadow: `0 0 ${glow}px ${primaryColor}80` }}>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>{cta} →</span>
          </div>
        </div>
        {guarantee ? <div style={{ opacity: btnP * 0.6, color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>✓ {guarantee}</div> : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function UrgencyCTA({ frame, fps, cta, guarantee, primaryColor, audience }) {
  const titleP = spr(frame, fps, 0, 16, 100);
  const dotP   = spr(frame, fps, 20, 14, 100);
  const btnP   = spr(frame, fps, 38, 11, 100);
  const pulse  = 1 + Math.sin(frame * 0.12) * 0.04;
  const dotBlink = frame % 30 < 20;
  const activeUsers = Math.floor(23 + Math.sin(frame * 0.02) * 3);

  return (
    <DarkBg color={primaryColor} particleCount={15}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: 36, gap: 20 }}>
        <div style={{ opacity: titleP, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: -1, lineHeight: 1.2, marginBottom: 8 }}>
            Cada día que esperás,<br />
            <span style={{ color: primaryColor }}>es un día perdido.</span>
          </div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)' }}>Únete a {audience || 'miles de profesionales'}</div>
        </div>

        {/* Usuarios activos */}
        <div style={{ opacity: dotP, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 100, padding: '8px 16px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', opacity: dotBlink ? 1 : 0.4 }} />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600 }}>{activeUsers} personas usando ahora</span>
        </div>

        <div style={{ opacity: btnP, transform: `scale(${pulse})` }}>
          <div style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`, borderRadius: 100, padding: '17px 40px', boxShadow: `0 0 40px ${primaryColor}70` }}>
            <span style={{ color: '#fff', fontSize: 19, fontWeight: 800 }}>{cta} →</span>
          </div>
        </div>
        {guarantee ? <div style={{ opacity: btnP * 0.6, color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>✓ {guarantee}</div> : null}
      </AbsoluteFill>
    </DarkBg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OUTRO ANIMATIONS
// ══════════════════════════════════════════════════════════════════════════════

function LogoParticleBurst({ frame, fps, siteName, primaryColor, secondaryColor }) {
  const p = spr(frame, fps, 0, 18, 100);
  const burst = frame > 30 && frame < 60;
  const glowPulse = 0.6 + Math.sin(frame * 0.1) * 0.4;

  return (
    <AbsoluteFill style={{ background: '#000', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${primaryColor}${Math.round(glowPulse * 30).toString(16).padStart(2,'0')} 0%, transparent 70%)` }} />

      {burst && Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const dist = (frame - 30) * 8;
        const op = Math.max(0, 1 - (frame - 30) / 30);
        return <div key={i} style={{ position: 'absolute', width: 5, height: 5, borderRadius: '50%', background: i % 2 === 0 ? primaryColor : secondaryColor, transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`, opacity: op }} />;
      })}

      <div style={{ transform: `scale(${p})`, opacity: p, textAlign: 'center', zIndex: 2 }}>
        <div style={{ fontSize: 64, fontWeight: 900, background: `linear-gradient(135deg, #fff, ${primaryColor}, ${secondaryColor})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -3 }}>
          {siteName}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: 5, textTransform: 'uppercase', marginTop: 8 }}>EMPEZÁ HOY</div>
      </div>
    </AbsoluteFill>
  );
}

function OrbitLogo({ frame, fps, siteName, primaryColor, secondaryColor }) {
  const p     = spr(frame, fps, 0, 18, 100);
  const angle = frame * 2;
  const glowP = 0.65 + Math.sin(frame * 0.1) * 0.35;

  return (
    <AbsoluteFill style={{ background: '#000', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', width: 520, height: 520, borderRadius: '50%', background: `radial-gradient(circle, ${primaryColor}${Math.round(glowP * 35).toString(16).padStart(2,'0')} 0%, transparent 70%)` }} />
      {[0,1,2,3,4,5].map(i => {
        const a = (angle + i * 60) * Math.PI / 180;
        const r = 100 + (i % 2) * 30;
        return <div key={i} style={{ position: 'absolute', width: 5+(i%3), height: 5+(i%3), borderRadius: '50%', background: i%2===0 ? primaryColor : secondaryColor, transform: `translate(${Math.cos(a)*r}px, ${Math.sin(a)*r}px)`, opacity: p * 0.75 }} />;
      })}
      <div style={{ transform: `scale(${p}) rotate(${(1-p)*-8}deg)`, opacity: p, textAlign: 'center', zIndex: 2 }}>
        <div style={{ fontSize: 64, fontWeight: 900, background: `linear-gradient(135deg, #fff, ${primaryColor}, ${secondaryColor})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -3 }}>{siteName}</div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: 5, textTransform: 'uppercase', marginTop: 8 }}>EMPEZÁ HOY</div>
      </div>
    </AbsoluteFill>
  );
}

function GradientTextOutro({ frame, fps, siteName, tagline, primaryColor, secondaryColor }) {
  const p = spr(frame, fps, 0, 18, 100);
  const gradientAngle = frame * 1.5;

  return (
    <AbsoluteFill style={{ background: '#000', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', padding: 36 }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 50%, ${primaryColor}15 0%, transparent 65%)` }} />
      <div style={{ transform: `scale(${p})`, opacity: p, textAlign: 'center', zIndex: 2 }}>
        <div style={{ fontSize: 60, fontWeight: 900, background: `linear-gradient(${gradientAngle}deg, ${primaryColor}, ${secondaryColor}, #fff, ${primaryColor})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -2.5, backgroundSize: '200% 200%' }}>
          {siteName}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: 500, marginTop: 12, lineHeight: 1.5 }}>{tagline}</div>
      </div>
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTER — mapea animation name → componente
// ══════════════════════════════════════════════════════════════════════════════

const ANIM_MAP = {
  // Hook
  liquid_title:          LiquidTitle,
  typewriter_glitch:     TypewriterGlitch,
  counter_explosion:     CounterExplosion,
  morphing_shapes:       MorphingShapes,
  reveal_swipe:          RevealSwipe,
  split_screen_problem:  SplitScreenProblem,
  word_split:            RevealSwipe,       // fallback
  particle_text:         MorphingShapes,    // fallback
  // Product
  iphone_rise:           IphoneRise,
  cursor_demo:           CursorDemo,
  browser_window:        IphoneRise,        // fallback
  dashboard_build:       DashboardBuild,
  flow_diagram:          FlowDiagram,
  phone_notification:    IphoneRise,        // fallback
  // Benefits
  benefit_cards_stagger: BenefitCardsStagger,
  stat_counters:         StatCounters,
  comparison_table:      ComparisonTable,
  timeline_scroll:       FlowDiagram,       // fallback
  floating_feature_orbs: FloatingFeatureOrbs,
  icon_draw_reveal:      BenefitCardsStagger, // fallback
  progress_bars:         StatCounters,      // fallback
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
  const Component = ANIM_MAP[animName];
  if (!Component) return <DarkBg color="#6366f1"><AbsoluteFill /></DarkBg>;
  return <Component frame={frame} fps={fps} {...params} />;
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

function Flash({ atFrame, dur = 6 }) {
  const frame = useCurrentFrame();
  const f = frame - atFrame;
  if (f < 0 || f > dur) return null;
  const op = Math.sin((f / dur) * Math.PI) * 0.35;
  return <div style={{ position: 'absolute', inset: 0, background: 'white', opacity: op, pointerEvents: 'none', zIndex: 999 }} />;
}

export const MarketingVideo = (props) => {
  const {
    siteName = 'Mi Sitio', headline = 'La solución que necesitás', subheadline = '',
    benefits = [], features = [], cta = 'Empezá gratis', problem = '', audience = '',
    numbers = [], guarantee = '', primaryColor = '#6366f1', secondaryColor = '#818cf8',
    screenshotUrl = null,
    // Selección de animaciones por Claude
    hookAnimation = 'reveal_swipe', hookParams = {},
    productAnimation = 'iphone_rise', productParams = {},
    benefitsAnimation = 'benefit_cards_stagger', benefitsParams = {},
    ctaAnimation = 'liquid_button_cta', ctaParams = {},
    outroAnimation = 'orbit_logo', outroParams = {},
  } = props;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Merge parámetros con datos de la página
  const merged = (params) => ({
    primaryColor, secondaryColor, siteName, headline, subheadline,
    benefits, features, cta, problem, audience, numbers, guarantee,
    screenshotUrl, steps: features,
    stats: numbers.length > 0 ? numbers : benefits,
    before: [problem, 'Sin control', 'Tiempo perdido'],
    after: benefits.slice(0, 3),
    words: headline?.split(' ') || [],
    tagline: subheadline || cta,
    line1: headline, line2: subheadline,
    title: siteName, subtitle: subheadline,
    label: 'usuarios satisfechos', prefix: '', suffix: '+',
    number: numbers[0] || '1000',
    problemText: problem, solutionText: benefits[0] || cta,
    ctaText: cta, url: siteName,
    notifications: benefits.slice(0, 3).map(b => ({ text: b })),
    ...params,
  });

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

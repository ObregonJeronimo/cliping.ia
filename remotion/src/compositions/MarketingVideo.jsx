import {
  AnimeStaggerCenter,
  AnimeStaggerGrid2D,
  AnimeStaggerIrregular,
  AnimeScrambleReveal,
  AnimeLetterByLetter,
  AnimeBlurWords,
  AnimeKineticTimeline,
  AnimeTrueFocus,
  AnimeSvgDraw,
  AnimeMorphBlob,
  AnimeKeyframeBounce,
  AnimeCinematicTimeline,
  AnimeAlternateComparison,
  AnimeRotatingWords,
  AnimeShinyButton,
  AnimeMagneticCTA,
  AnimeContextualCountdown,
  AnimeCounterCascade,
  AnimeGlassCards,
  AnimeTickerTape,
  AnimeSpectrumOutro,
  AnimeTypefaceFade,
  AnimeParticleForm,
} from './AnimeAnimations.jsx';

import {
  GsapPhysicsShatter,
  GsapMaskReveal,
  GsapCharsRotate,
  GsapWordsScramble,
  GsapDrawSvg,
  GsapMorphShapes,
  GsapMotionPath,
  GsapPhysicsRain,
  GsapLinesWave,
  GsapElasticCards,
  GsapFlipReveal,
  GsapPhysicsBurst,
} from './GsapAnimations.jsx';

import {
  AnimeStaggerCenter,
  AnimeStaggerGrid2D,
  AnimeStaggerIrregular,
  AnimeScrambleReveal,
  AnimeLetterByLetter,
  AnimeBlurWords,
  AnimeKineticTimeline,
  AnimeTrueFocus,
  AnimeSvgDraw,
  AnimeMorphBlob,
  AnimeKeyframeBounce,
  AnimeCinematicTimeline,
  AnimeAlternateComparison,
  AnimeRotatingWords,
  AnimeShinyButton,
  AnimeMagneticCTA,
  AnimeContextualCountdown,
  AnimeCounterCascade,
  AnimeGlassCards,
  AnimeTickerTape,
  AnimeSpectrumOutro,
  AnimeTypefaceFade,
  AnimeParticleForm,
} from './AnimeAnimations.jsx';

import {
  GsapPhysicsShatter,
  GsapMaskReveal,
  GsapCharsRotate,
  GsapWordsScramble,
  GsapDrawSvg,
  GsapMorphShapes,
  GsapMotionPath,
  GsapPhysicsRain,
  GsapLinesWave,
  GsapElasticCards,
  GsapFlipReveal,
  GsapPhysicsBurst,
} from './GsapAnimations.jsx';

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

const lerp = (f, a, b, from, to) => {
  // Garantizar que inputRange sea estrictamente creciente
  if (a === b) return from;
  if (a > b) return interpolate(f, [b, a], [to, from], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return interpolate(f, [a, b], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
};

const spr = (f, fps, delay = 0, damping = 14, stiffness = 120) =>
  spring({ frame: Math.max(0, f - delay), fps, config: { damping, stiffness, mass: 0.6 } });

const hex2rgb = (hex) => {
  if (!hex || typeof hex !== 'string') return '100,100,100';
  // Limpiar comentarios que Claude puede incluir en el color
  const cleanHex = hex.split(/\s+[—–-]\s+/)[0].trim();
  const h = cleanHex.replace('#', '');
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  return `${r},${g},${b}`;
};

// Detecta si un fondo es oscuro (para elegir color de texto)
// Genera fondo oscuro derivado del primaryColor del sitio (no negro genérico)
const darkBgFromColor = (primaryColor) => {
  if (!primaryColor || typeof primaryColor !== 'string') return 'linear-gradient(145deg, #07070f 0%, #0d0d1a 100%)';
  // Limpiar comentarios tipo "— verde bosque"
  const cleanColor = primaryColor.split(/\s+[—–-]\s+/)[0].trim();
  const h = cleanColor.replace('#','');
  const r = parseInt(h.slice(0,2),16) || 0;
  const g = parseInt(h.slice(2,4),16) || 0;
  const b = parseInt(h.slice(4,6),16) || 0;
  const mk = (rv,factor) => Math.min(255,Math.max(0,Math.round(rv*factor))).toString(16).padStart(2,'0');
  const c1 = `#${mk(r,0.06)}${mk(g,0.07)}${mk(b,0.06)}`;
  const c2 = `#${mk(r,0.10)}${mk(g,0.12)}${mk(b,0.10)}`;
  return `linear-gradient(145deg, ${c1} 0%, ${c2} 55%, ${c1} 100%)`;
};

const isDarkBg = (bg) => {
  if (!bg) return true;
  const b = bg.toLowerCase();
  return b.includes('0a') || b.includes('07') || b.includes('0d') ||
         b.includes('linear') || b.includes('gradient') ||
         b.includes('#0') || b.includes('#1') || b.includes('#2');
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

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCT ANIMATIONS
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// BENEFITS ANIMATIONS
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// CTA ANIMATIONS
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// OUTRO ANIMATIONS
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// ANIMACIONES ÉPICAS ADICIONALES
// ══════════════════════════════════════════════════════════════════════════════

// Icon Draw Reveal — íconos SVG que se dibujan progresivamente
// Kinetic Text — palabras que entran con física y peso
// Particle Reveal — texto que emerge de un campo de partículas
// Timeline Build — línea de tiempo que se construye de arriba a abajo
// Progress Bars — métricas con barras que se llenan animadas
// ══════════════════════════════════════════════════════════════════════════════
// ANIMACIONES VIRALES 2025 — SCRAMBLE, SPLIT, 3D FLIP, FREEZE FRAME, ZOOM PUNCH
// ══════════════════════════════════════════════════════════════════════════════

// SCRAMBLE DECODE — texto que se decodifica desde caracteres random (estilo hacker/tech)
// SPLIT CHARS — cada letra del titular entra desde posiciones distintas
// 3D CARD FLIP — cards de beneficios que dan vuelta en 3D
// ZOOM PUNCH CTA — zoom dramático hacia el CTA desde lejos
// FREEZE FRAME OUTRO — frame congelado con zoom y texto que aparece encima
// GRID REVEAL — contenido que aparece en celdas de una grilla animada
// TICKER TAPE — texto que corre horizontalmente tipo ticker de noticias
// SPOTLIGHT — foco de luz que recorre la pantalla revelando contenido
// ══════════════════════════════════════════════════════════════════════════════
// ANIMACIONES SIGNATURE — WATER DROP, CURSOR, LIQUID FILL, INK SPLASH
// ══════════════════════════════════════════════════════════════════════════════

// WATER DROP TITLE — una gota cae y al impactar "pinta" el título con ondas
// CURSOR CLICK REVEAL — cursor animado hace click en un botón y revela el producto
// LIQUID FILL TEXT — texto que se llena de líquido de abajo hacia arriba
// INK SPLASH TRANSITION — transición con salpicadura de tinta que llena la pantalla
// LIGHT SCENE — para páginas claras (fondo blanco/claro)
// ══════════════════════════════════════════════════════════════════════════════
// ANIMACIONES ÉPICAS — LIQUID, MORPHING, PAINT, GOOEY
// ══════════════════════════════════════════════════════════════════════════════

// LIQUID BLOB MORPH — formas orgánicas que se transforman con SVG filters
// PAINT BRUSH REVEAL — texto que aparece como si fuera pintado con un pincel
// WATER RIPPLE CTA — botón con efecto de ondas de agua al "aparecer"
// NEON SIGN — texto que se enciende como un letrero de neón
// MORPHING CARD — card que morphea su forma mientras muestra beneficios
// TYPEWRITER WITH CURSOR — text que se tipea con cursor parpadeante y fondo de terminal
// ══════════════════════════════════════════════════════════════════════════════
// NUEVA BIBLIOTECA — ANIMACIONES 2025/2026
// Categorías: Hook · Product · Benefits · CTA · Outro · Universal
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// ANIMACIONES MORPHING — border-radius fluido, blob, liquid button
// ══════════════════════════════════════════════════════════════════════════════

// Helper: interpola border-radius orgánico basado en el frame
// ══════════════════════════════════════════════════════════════════════════════
// ROUTER
// ══════════════════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════════════════
// BIBLIOTECA 2026 — ANIMACIONES DE CALIDAD
// Fuentes: Linear, Arc, Vercel, Apple, Spotify, Framer, Lottie trends
// Técnicas: kinetic typography, variable weight, geometric loops,
//           depth parallax, fluid physics, SVG path draw, spatial layers
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// BIBLIOTECA REACTBITS + ANIMEJS v4 + GSAP TECHNIQUES
// Implementadas nativamente con useCurrentFrame/spring de Remotion
// Fuente: reactbits.dev (MIT), animejs.com (MIT), gsap techniques
// ════════════════════════════════════════════════════════════════════════════

const ANIM_MAP = {
  // ── ANIME.JS v4 REAL ─────────────────────────────────────────────────────
  // Stagger
  anime_stagger_center:   AnimeStaggerCenter,
  anime_stagger_grid_2d:  AnimeStaggerGrid2D,
  anime_stagger_irregular:AnimeStaggerIrregular,
  // Text
  anime_scramble_reveal:  AnimeScrambleReveal,
  anime_letter_by_letter: AnimeLetterByLetter,
  anime_blur_words:       AnimeBlurWords,
  anime_kinetic_timeline: AnimeKineticTimeline,
  anime_true_focus:       AnimeTrueFocus,
  // SVG
  anime_svg_draw:         AnimeSvgDraw,
  anime_morph_blob:       AnimeMorphBlob,
  // Keyframes / Timeline
  anime_keyframe_bounce:  AnimeKeyframeBounce,
  anime_cinematic_tl:     AnimeCinematicTimeline,
  // Alternate / Loop
  anime_alternate_cmp:    AnimeAlternateComparison,
  anime_rotating_words:   AnimeRotatingWords,
  // CTA
  anime_shiny_button:     AnimeShinyButton,
  anime_magnetic_cta:     AnimeMagneticCTA,
  anime_countdown:        AnimeContextualCountdown,
  // Data / Product
  anime_counter_cascade:  AnimeCounterCascade,
  anime_glass_cards:      AnimeGlassCards,
  anime_ticker_tape:      AnimeTickerTape,
  // Outro
  anime_spectrum_outro:   AnimeSpectrumOutro,
  anime_typeface_fade:    AnimeTypefaceFade,
  anime_particle_form:    AnimeParticleForm,
  // ── GSAP 3.15 — Physics2D, SplitText, DrawSVG, MorphSVG, MotionPath ─────
  gsap_physics_shatter:   GsapPhysicsShatter,
  gsap_mask_reveal:       GsapMaskReveal,
  gsap_chars_rotate:      GsapCharsRotate,
  gsap_words_scramble:    GsapWordsScramble,
  gsap_draw_svg:          GsapDrawSvg,
  gsap_morph_shapes:      GsapMorphShapes,
  gsap_motion_path:       GsapMotionPath,
  gsap_physics_rain:      GsapPhysicsRain,
  gsap_lines_wave:        GsapLinesWave,
  gsap_elastic_cards:     GsapElasticCards,
  gsap_flip_reveal:       GsapFlipReveal,
  gsap_physics_burst:     GsapPhysicsBurst,
};

// Fallbacks por tipo de escena para no repetir visualmente
const SCENE_FALLBACKS = {
  hook_a:     'anime_stagger_center',
  hook_b:     'anime_blur_words',
  product_a:  'anime_cinematic_tl',
  product_b:  'anime_counter_cascade',
  benefits_a: 'anime_glass_cards',
  benefits_b: 'anime_stagger_grid_2d',
  benefits_c: 'anime_ticker_tape',
  cta_a:      'anime_magnetic_cta',
  cta_b:      'anime_shiny_button',
  outro:      'anime_spectrum_outro',
};

function SceneWrapper({ animName, params, frame, fps, sceneKey }) {
  const resolved = ANIM_MAP[animName]
    ? animName
    : (SCENE_FALLBACKS[sceneKey] || 'anime_stagger_center');
  if (!ANIM_MAP[animName]) {
    console.warn(`[SceneWrapper] '${animName}' no existe → fallback '${resolved}' para ${sceneKey}`);
  }
  const Component = ANIM_MAP[resolved] || ANIM_MAP['anime_stagger_center'];
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
  hook_a:      { from: 0,   dur: 70  },
  hook_b:      { from: 70,  dur: 80  },
  product_a:   { from: 150, dur: 110 },
  product_b:   { from: 260, dur: 100 },
  benefits_a:  { from: 360, dur: 90  },
  benefits_b:  { from: 450, dur: 90  },
  benefits_c:  { from: 540, dur: 90  },
  cta_a:       { from: 630, dur: 90  },
  cta_b:       { from: 720, dur: 120 },
  outro:       { from: 840, dur: 210 },
};

// Factor de escala: 1080 / 390 = 2.769
// Todo el JSX fue diseñado para 390px, escalamos al contenedor
const DESIGN_WIDTH = 390;
const RENDER_WIDTH = 1080;
const SCALE = RENDER_WIDTH / DESIGN_WIDTH; // ~2.769

export const MarketingVideo = (props) => {
  const {
    siteName = 'Mi Sitio', headline = 'La solución que necesitás',
    subheadline = '', benefits = [], features = [],
    cta = 'Empezá gratis', problem = '', audience = '',
    numbers = [], guarantee = '',
    primaryColor = '#6366f1', secondaryColor = '#818cf8',
    screenshotUrl = null,
    bg = null,  // fondo global calculado por el sistema
    // Hook: 2 sub-escenas
    hookAAnimation = 'anime_stagger_center', hookAParams = {},
    hookBAnimation = 'anime_blur_words',      hookBParams = {},
    // Product: 2 sub-escenas
    productAAnimation = 'anime_cinematic_tl',    productAParams = {},
    productBAnimation = 'anime_counter_cascade', productBParams = {},
    // Benefits: 3 sub-escenas (una por beneficio)
    benefitsAAnimation = 'anime_glass_cards', benefitsAParams = {},
    benefitsBAnimation = 'anime_stagger_grid_2d',      benefitsBParams = {},
    benefitsCAnimation = 'anime_ticker_tape',      benefitsCParams = {},
    // CTA: 2 sub-escenas
    ctaAAnimation = 'anime_magnetic_cta',  ctaAParams = {},
    ctaBAnimation = 'anime_shiny_button',  ctaBParams = {},
    // Outro
    outroAnimation = 'anime_spectrum_outro',        outroParams = {},
    brief = {},
  } = props;

  // Limpiar comentarios que Claude agrega (ej: "#00c853 — verde vibrante...")
  const cleanBriefVal = (v) => typeof v === 'string' ? v.split(/\s+[—–-]\s+/)[0].trim() : v;
  const brandBg     = cleanBriefVal(bg || brief?.paleta?.fondo) || darkBgFromColor(primaryColor);
  const brandAccent = cleanBriefVal(brief?.paleta?.acento) || primaryColor;
  const brandText   = brief?.paleta?.texto   || '#ffffff';

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Label contextual según audiencia — sin hardcodear "usuarios satisfechos"
  const contextLabel = audience
    ? `Para ${audience}`
    : numbers[1] ? String(numbers[1]).replace(/\d+/, '').trim() || 'satisfechos'
    : 'satisfechos';

  const base = {
    primaryColor: brandAccent || primaryColor,
    secondaryColor, siteName, headline, subheadline,
    benefits, features, cta, problem, audience, numbers, guarantee,
    screenshotUrl,
    bg: brandBg,
    brandBg, brandText, brief,
    steps: features.length > 0 ? features : benefits.slice(0, 4),
    stats: numbers.length > 0 ? numbers : benefits.slice(0, 4),
    before: [problem, 'Sin control', 'Tiempo perdido', 'Errores frecuentes'].slice(0, 4),
    after: benefits.slice(0, 4),
    words: (headline || '').split(' '),
    tagline: subheadline || headline,
    line1: headline, line2: subheadline,
    title: siteName, subtitle: subheadline,
    label: contextLabel, prefix: '', suffix: '',
    number: numbers[0] || '1000',
    problemText: problem,
    solutionText: benefits[0] || cta,
    ctaText: cta,
    subtext: subheadline || `Transformá ${audience || 'tu negocio'} hoy`,
  };

  const merged = (extra) => ({ ...base, bg: brandBg, ...extra });

  // Altura del wrapper: cuántos px de 390-world necesito para cubrir 1920px del canvas
  const WRAPPER_H = Math.ceil(1920 / SCALE); // ~692px en el espacio de diseño

  return (
    <AbsoluteFill style={{ background: brandBg || '#07070f', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: DESIGN_WIDTH, height: WRAPPER_H,
        transform: `scale(${SCALE})`, transformOrigin: 'top left',
        overflow: 'hidden',
      }}>

        {/* ── HOOK ─────────────────────────────────────── */}
        <Sequence from={T.hook_a.from} durationInFrames={T.hook_a.dur}>
          <SceneWrapper animName={hookAAnimation} params={merged(hookAParams)} frame={frame - T.hook_a.from} fps={fps} sceneKey="hook_a" />
        </Sequence>
        <Sequence from={T.hook_b.from} durationInFrames={T.hook_b.dur}>
          <SceneWrapper animName={hookBAnimation} params={merged(hookBParams)} frame={frame - T.hook_b.from} fps={fps} sceneKey="hook_b" />
        </Sequence>

        {/* ── PRODUCT ──────────────────────────────────── */}
        <Sequence from={T.product_a.from} durationInFrames={T.product_a.dur}>
          <SceneWrapper animName={productAAnimation} params={merged(productAParams)} frame={frame - T.product_a.from} fps={fps} sceneKey="product_a" />
        </Sequence>
        <Sequence from={T.product_b.from} durationInFrames={T.product_b.dur}>
          <SceneWrapper animName={productBAnimation} params={merged(productBParams)} frame={frame - T.product_b.from} fps={fps} sceneKey="product_b" />
        </Sequence>

        {/* ── BENEFITS ─────────────────────────────────── */}
        <Sequence from={T.benefits_a.from} durationInFrames={T.benefits_a.dur}>
          <SceneWrapper animName={benefitsAAnimation} params={merged(benefitsAParams)} frame={frame - T.benefits_a.from} fps={fps} sceneKey="benefits_a" />
        </Sequence>
        <Sequence from={T.benefits_b.from} durationInFrames={T.benefits_b.dur}>
          <SceneWrapper animName={benefitsBAnimation} params={merged(benefitsBParams)} frame={frame - T.benefits_b.from} fps={fps} sceneKey="benefits_b" />
        </Sequence>
        <Sequence from={T.benefits_c.from} durationInFrames={T.benefits_c.dur}>
          <SceneWrapper animName={benefitsCAnimation} params={merged(benefitsCParams)} frame={frame - T.benefits_c.from} fps={fps} sceneKey="benefits_c" />
        </Sequence>

        {/* ── CTA ──────────────────────────────────────── */}
        <Sequence from={T.cta_a.from} durationInFrames={T.cta_a.dur}>
          <SceneWrapper animName={ctaAAnimation} params={merged(ctaAParams)} frame={frame - T.cta_a.from} fps={fps} sceneKey="cta_a" />
        </Sequence>
        <Sequence from={T.cta_b.from} durationInFrames={T.cta_b.dur}>
          <SceneWrapper animName={ctaBAnimation} params={merged(ctaBParams)} frame={frame - T.cta_b.from} fps={fps} sceneKey="cta_b" />
        </Sequence>

        {/* ── OUTRO ────────────────────────────────────── */}
        <Sequence from={T.outro.from} durationInFrames={T.outro.dur}>
          <SceneWrapper animName={outroAnimation} params={merged(outroParams)} frame={frame - T.outro.from} fps={fps} sceneKey="outro" />
        </Sequence>

        {/* Flashes de transición */}
        <Flash atFrame={T.hook_b.from} />
        <Flash atFrame={T.product_a.from} />
        <Flash atFrame={T.product_b.from} />
        <Flash atFrame={T.benefits_a.from} />
        <Flash atFrame={T.benefits_b.from} />
        <Flash atFrame={T.benefits_c.from} />
        <Flash atFrame={T.cta_a.from} />
        <Flash atFrame={T.cta_b.from} />
        <Flash atFrame={T.outro.from} />
      </div>
    </AbsoluteFill>
  );
};

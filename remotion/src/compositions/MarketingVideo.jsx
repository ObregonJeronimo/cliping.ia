/**
 * MARKETING VIDEO — Sistema de Composición Generativa
 * Claude genera la composición completa con parámetros reales.
 * Cada video es único: timing, params, brief aplicado.
 */
import {
  AbsoluteFill, Sequence,
  useCurrentFrame, useVideoConfig, spring,
} from 'remotion';

// Anime.js v4
import {
  AnimeStaggerCenter, AnimeStaggerGrid2D, AnimeStaggerIrregular,
  AnimeScrambleReveal, AnimeLetterByLetter, AnimeBlurWords,
  AnimeKineticTimeline, AnimeTrueFocus,
  AnimeSvgDraw, AnimeMorphBlob,
  AnimeKeyframeBounce, AnimeCinematicTimeline,
  AnimeAlternateComparison, AnimeRotatingWords,
  AnimeShinyButton, AnimeMagneticCTA, AnimeContextualCountdown,
  AnimeCounterCascade, AnimeGlassCards, AnimeTickerTape,
  AnimeSpectrumOutro, AnimeTypefaceFade, AnimeParticleForm,
  h2r, bg0,
} from './AnimeAnimations.jsx';

// GSAP 3.15
import {
  GsapPhysicsShatter, GsapMaskReveal, GsapCharsRotate,
  GsapWordsScramble, GsapDrawSvg, GsapMorphShapes,
  GsapMotionPath, GsapPhysicsRain, GsapLinesWave,
  GsapElasticCards, GsapFlipReveal, GsapPhysicsBurst,
} from './GsapAnimations.jsx';

// ─── Mapa completo de animaciones por nombre de componente ───────────────────
const ANIM_MAP = {
  // Anime.js v4
  AnimeStaggerCenter, AnimeStaggerGrid2D, AnimeStaggerIrregular,
  AnimeScrambleReveal, AnimeLetterByLetter, AnimeBlurWords,
  AnimeKineticTimeline, AnimeTrueFocus,
  AnimeSvgDraw, AnimeMorphBlob,
  AnimeKeyframeBounce, AnimeCinematicTimeline,
  AnimeAlternateComparison, AnimeRotatingWords,
  AnimeShinyButton, AnimeMagneticCTA, AnimeContextualCountdown,
  AnimeCounterCascade, AnimeGlassCards, AnimeTickerTape,
  AnimeSpectrumOutro, AnimeTypefaceFade, AnimeParticleForm,
  // GSAP 3.15
  GsapPhysicsShatter, GsapMaskReveal, GsapCharsRotate,
  GsapWordsScramble, GsapDrawSvg, GsapMorphShapes,
  GsapMotionPath, GsapPhysicsRain, GsapLinesWave,
  GsapElasticCards, GsapFlipReveal, GsapPhysicsBurst,
  // Aliases snake_case → PascalCase para compatibilidad con el sistema viejo
  anime_stagger_center: AnimeStaggerCenter,
  anime_stagger_grid_2d: AnimeStaggerGrid2D,
  anime_stagger_irregular: AnimeStaggerIrregular,
  anime_scramble_reveal: AnimeScrambleReveal,
  anime_letter_by_letter: AnimeLetterByLetter,
  anime_blur_words: AnimeBlurWords,
  anime_kinetic_timeline: AnimeKineticTimeline,
  anime_true_focus: AnimeTrueFocus,
  anime_svg_draw: AnimeSvgDraw,
  anime_morph_blob: AnimeMorphBlob,
  anime_keyframe_bounce: AnimeKeyframeBounce,
  anime_cinematic_tl: AnimeCinematicTimeline,
  anime_alternate_cmp: AnimeAlternateComparison,
  anime_rotating_words: AnimeRotatingWords,
  anime_shiny_button: AnimeShinyButton,
  anime_magnetic_cta: AnimeMagneticCTA,
  anime_countdown: AnimeContextualCountdown,
  anime_counter_cascade: AnimeCounterCascade,
  anime_glass_cards: AnimeGlassCards,
  anime_ticker_tape: AnimeTickerTape,
  anime_spectrum_outro: AnimeSpectrumOutro,
  anime_typeface_fade: AnimeTypefaceFade,
  anime_particle_form: AnimeParticleForm,
  gsap_physics_shatter: GsapPhysicsShatter,
  gsap_mask_reveal: GsapMaskReveal,
  gsap_chars_rotate: GsapCharsRotate,
  gsap_words_scramble: GsapWordsScramble,
  gsap_draw_svg: GsapDrawSvg,
  gsap_morph_shapes: GsapMorphShapes,
  gsap_motion_path: GsapMotionPath,
  gsap_physics_rain: GsapPhysicsRain,
  gsap_lines_wave: GsapLinesWave,
  gsap_elastic_cards: GsapElasticCards,
  gsap_flip_reveal: GsapFlipReveal,
  gsap_physics_burst: GsapPhysicsBurst,
};

// ─── Fallbacks por slot ───────────────────────────────────────────────────────
const FALLBACKS = {
  hook_a:     'AnimeStaggerCenter',
  hook_b:     'AnimeBlurWords',
  product_a:  'AnimeCinematicTimeline',
  product_b:  'AnimeCounterCascade',
  benefits_a: 'AnimeGlassCards',
  benefits_b: 'AnimeStaggerGrid2D',
  benefits_c: 'AnimeTickerTape',
  cta_a:      'AnimeMagneticCTA',
  cta_b:      'AnimeShinyButton',
  outro:      'AnimeParticleForm',
};

// ─── Timing por defecto ───────────────────────────────────────────────────────
const DEFAULT_TIMING = {
  hook_a:     { from: 0,   dur: 75  },
  hook_b:     { from: 75,  dur: 75  },
  product_a:  { from: 150, dur: 110 },
  product_b:  { from: 260, dur: 100 },
  benefits_a: { from: 360, dur: 90  },
  benefits_b: { from: 450, dur: 90  },
  benefits_c: { from: 540, dur: 90  },
  cta_a:      { from: 630, dur: 90  },
  cta_b:      { from: 720, dur: 120 },
  outro:      { from: 840, dur: 150 },
};

// ─── SceneWrapper ─────────────────────────────────────────────────────────────
function SceneWrapper({ animName, params, frame, fps, sceneKey }) {
  const resolved = ANIM_MAP[animName]
    ? animName
    : (FALLBACKS[sceneKey] || 'AnimeStaggerCenter');
  if (!ANIM_MAP[animName]) {
    console.warn(`[SceneWrapper] '${animName}' → fallback '${resolved}'`);
  }
  const Component = ANIM_MAP[resolved] || AnimeStaggerCenter;
  return <Component frame={frame} fps={fps} {...params} />;
}

// ─── Flash de transición ──────────────────────────────────────────────────────
function Flash({ atFrame, dur = 7, intensity = 0.35 }) {
  const frame = useCurrentFrame();
  const f = frame - atFrame;
  if (f < 0 || f > dur) return null;
  const op = Math.sin((f / dur) * Math.PI) * intensity;
  return <div style={{ position:'absolute', inset:0, background:'white', opacity:op, pointerEvents:'none', zIndex:999 }} />;
}

// ─── Color helpers ────────────────────────────────────────────────────────────
function darkBgFromColor(c = '#6366f1') {
  const h = (c||'#6366f1').replace('#','').split(/[\s—]/)[0];
  try {
    const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
    const m=(v,f)=>Math.min(255,Math.max(0,Math.round(v*f))).toString(16).padStart(2,'0');
    return `linear-gradient(145deg,#${m(r,.06)}${m(g,.07)}${m(b,.06)} 0%,#${m(r,.11)}${m(g,.13)}${m(b,.11)} 55%,#${m(r,.06)}${m(g,.07)}${m(b,.06)} 100%)`;
  } catch { return '#07070f'; }
}

// ─── Composición principal ────────────────────────────────────────────────────
export const MarketingVideo = (props) => {
  const {
    siteName = 'Mi Sitio',
    headline = 'La solución que necesitás',
    subheadline = '',
    benefits = [], features = [],
    cta = 'Empezá ahora',
    problem = '', audience = '',
    numbers = [], guarantee = '',
    primaryColor = '#6366f1',
    secondaryColor = '#818cf8',
    screenshotUrl = null,
    bg = null,
    // Animaciones — acepta tanto PascalCase como snake_case
    hookAAnimation = 'AnimeStaggerCenter',     hookAParams = {},
    hookBAnimation = 'AnimeBlurWords',          hookBParams = {},
    productAAnimation = 'AnimeCinematicTimeline',   productAParams = {},
    productBAnimation = 'AnimeCounterCascade',      productBParams = {},
    benefitsAAnimation = 'AnimeGlassCards',         benefitsAParams = {},
    benefitsBAnimation = 'AnimeStaggerGrid2D',       benefitsBParams = {},
    benefitsCAnimation = 'AnimeTickerTape',          benefitsCParams = {},
    ctaAAnimation = 'AnimeMagneticCTA',          ctaAParams = {},
    ctaBAnimation = 'AnimeShinyButton',          ctaBParams = {},
    outroAnimation = 'AnimeParticleForm',        outroParams = {},
    brief = {},
    // Timing dinámico de la composición generativa
    __timing = null,
    __transitions = null,
  } = props;

  // Limpiar comentarios en colores
  const clean = (v) => typeof v === 'string' ? v.split(/\s+[—–-]\s+/)[0].trim() : v;
  const brandBg = clean(bg || brief?.paleta?.fondo) || darkBgFromColor(primaryColor);
  const brandAccent = clean(brief?.paleta?.acento) || primaryColor;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Usar timing dinámico si existe, sino el por defecto
  const T = __timing
    ? Object.fromEntries(
        Object.entries(__timing).map(([k, v]) => [k, { from: v.from, dur: v.dur || v.duration }])
      )
    : DEFAULT_TIMING;

  // Transiciones — dinámicas o calculadas del timing
  const transitions = __transitions || Object.values(T).map(t => ({
    at_frame: t.from, type: 'flash', intensity: 0.3
  })).filter(t => t.at_frame > 0);

  // Props base que se pasan a todas las escenas
  const base = {
    primaryColor: brandAccent,
    secondaryColor,
    siteName, headline, subheadline,
    benefits, features, cta,
    problem, audience, numbers, guarantee,
    screenshotUrl,
    bg: brandBg,
    brief,
    steps: features.length > 0 ? features : benefits.slice(0, 4),
    stats: numbers.length > 0
      ? numbers.map(n => typeof n === 'string' ? { value: n, label: '' } : n)
      : benefits.slice(0, 3).map(b => ({ value: typeof b === 'string' ? b : b?.title || '', label: '' })),
    options: benefits.slice(0, 4).map(b => typeof b === 'string' ? b : b?.title || ''),
    labels: ['Sin Yerco', 'Con Yerco'],
    line1: headline, line2: subheadline,
    title: siteName, subtitle: subheadline,
    subtext: subheadline || `Transformá tu ${audience || 'negocio'} hoy`,
    deliveryTime: numbers.find(n => String(n).includes('h') || String(n).includes('día')) || '24h',
  };

  // Merge params: base + params específicos de la escena (los específicos ganan)
  const merged = (extra = {}) => ({
    ...base,
    ...extra,
    bg: extra.bg || brandBg,
    primaryColor: extra.primaryColor || brandAccent,
  });

  const SCALE = 1080 / 390;
  const WRAPPER_H = Math.ceil(1920 / SCALE);

  return (
    <AbsoluteFill style={{ background: brandBg, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: 390, height: WRAPPER_H,
        transform: `scale(${SCALE})`, transformOrigin: 'top left',
        overflow: 'hidden',
      }}>

        {/* HOOK */}
        <Sequence from={T.hook_a?.from || 0} durationInFrames={T.hook_a?.dur || 75}>
          <SceneWrapper animName={hookAAnimation} params={merged(hookAParams)} frame={frame - (T.hook_a?.from || 0)} fps={fps} sceneKey="hook_a" />
        </Sequence>
        <Sequence from={T.hook_b?.from || 75} durationInFrames={T.hook_b?.dur || 75}>
          <SceneWrapper animName={hookBAnimation} params={merged(hookBParams)} frame={frame - (T.hook_b?.from || 75)} fps={fps} sceneKey="hook_b" />
        </Sequence>

        {/* PRODUCTO */}
        <Sequence from={T.product_a?.from || 150} durationInFrames={T.product_a?.dur || 110}>
          <SceneWrapper animName={productAAnimation} params={merged(productAParams)} frame={frame - (T.product_a?.from || 150)} fps={fps} sceneKey="product_a" />
        </Sequence>
        <Sequence from={T.product_b?.from || 260} durationInFrames={T.product_b?.dur || 100}>
          <SceneWrapper animName={productBAnimation} params={merged(productBParams)} frame={frame - (T.product_b?.from || 260)} fps={fps} sceneKey="product_b" />
        </Sequence>

        {/* BENEFICIOS */}
        <Sequence from={T.benefits_a?.from || 360} durationInFrames={T.benefits_a?.dur || 90}>
          <SceneWrapper animName={benefitsAAnimation} params={merged(benefitsAParams)} frame={frame - (T.benefits_a?.from || 360)} fps={fps} sceneKey="benefits_a" />
        </Sequence>
        <Sequence from={T.benefits_b?.from || 450} durationInFrames={T.benefits_b?.dur || 90}>
          <SceneWrapper animName={benefitsBAnimation} params={merged(benefitsBParams)} frame={frame - (T.benefits_b?.from || 450)} fps={fps} sceneKey="benefits_b" />
        </Sequence>
        <Sequence from={T.benefits_c?.from || 540} durationInFrames={T.benefits_c?.dur || 90}>
          <SceneWrapper animName={benefitsCAnimation} params={merged(benefitsCParams)} frame={frame - (T.benefits_c?.from || 540)} fps={fps} sceneKey="benefits_c" />
        </Sequence>

        {/* CTA */}
        <Sequence from={T.cta_a?.from || 630} durationInFrames={T.cta_a?.dur || 90}>
          <SceneWrapper animName={ctaAAnimation} params={merged(ctaAParams)} frame={frame - (T.cta_a?.from || 630)} fps={fps} sceneKey="cta_a" />
        </Sequence>
        <Sequence from={T.cta_b?.from || 720} durationInFrames={T.cta_b?.dur || 120}>
          <SceneWrapper animName={ctaBAnimation} params={merged(ctaBParams)} frame={frame - (T.cta_b?.from || 720)} fps={fps} sceneKey="cta_b" />
        </Sequence>

        {/* OUTRO */}
        <Sequence from={T.outro?.from || 840} durationInFrames={T.outro?.dur || 150}>
          <SceneWrapper animName={outroAnimation} params={merged(outroParams)} frame={frame - (T.outro?.from || 840)} fps={fps} sceneKey="outro" />
        </Sequence>

        {/* Transiciones dinámicas */}
        {transitions.map((tr, i) => (
          <Flash key={i} atFrame={tr.at_frame} intensity={tr.intensity || 0.3} dur={7} />
        ))}

      </div>
    </AbsoluteFill>
  );
};

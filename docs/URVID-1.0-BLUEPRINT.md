# 🗺️ URVID 1.0 — Blueprint del mapa de bibliotecas

> Rearquitectura: convertir el motor en un MAPA de bibliotecas de codigo categorizadas. Cada modulo = codigo PURO,
> PARAMETRIZADO (contenido/paleta/marca/tono/rubro/semilla), DETERMINISTA (mulberry32 sembrado + sub-seeds por eje,
> reloj CLK; cero Math.random/Date.now) y TESTEADO. Firma comun: `render(ctx, t, params, prng)` (o `derive(params, prng)`
> para las que solo producen tokens). El DIRECTOR (LLM) analiza la pagina y ELIGE un modulo de cada biblioteca y los
> ENSAMBLA (rompecabezas). Meta: tantas opciones (CIENTOS por categoria) que todo video sea unico → "Canva o mejor".
> NO se toca "Animaciones". Item nuevo en sidebar = "urvid 1.0" (mismo look), con el almacen de videos en el mismo lugar.
> Derivado de la investigacion `urvid-1.0-libraries-design` (8 dimensiones, 1 —audio— corto por limite de sesion).

## El CONTRATO de modulo (el pegamento — sin esto es codigo suelto)
1. Firma `render(ctx, t, params, prng)` | `derive(params, prng)`. `t` = frame/fps. `prng` = `mulberry32(seedFor(namespace))`.
2. **Determinista**: cero Math.random/Date.now. Mismo (params, seed) → mismo pixel siempre. `bg-check` 16/16.
3. **Parametrizado**: nunca hardcodea contenido/color (recibe `palette`, `content`, `tone`, `rubro`, `energy`).
4. **Registrado**: cada modulo declara `{id, categoria, tonos_compatibles, peso, firma(protagonismo), rubros_afines}`
   → el director filtra/elige por compatibilidad; crecer a cientos NO toca el motor.
5. **Testeado**: cada modulo entra con su prueba; el video ensamblado pasa los GATES (bounds, legibilidad, determinismo).
6. **Componible**: respeta el espacio logico 405x720, la paleta y el reloj CLK compartidos (para que encajen entre si).

## Conteo: **8 PILARES · ~33 BIBLIOTECAS · ~380 CATEGORIAS** (cada categoria → cientos de modulos)

### PILAR A · DIRECCION / INTELIGENCIA (el cerebro — no es render, es la decision)
- **perception/** (analisis REAL del sitio): text-extractors · brand-identity · color-analysis · photo-curation · fact-mining · message-mining · vision-readers · language-and-locale · confidence-and-merge · fingerprint-hash
- **strategy/** (foso de marketing curado): playbooks-rubro · brand-archetypes · audience-personas · copy-frameworks · hook-swipe-file · narrative-arcs · rubro-to-aesthetic · cta-library · pacing-rules · proof-strategy · objective-templates · anti-pattern-rules
- **brief/** (brief + prompt reforzado): brand-facts-prompt · creative-brief-prompt · director-system · output-schemas · few-shot-banks · context-budgeter · prompt-caching · constraint-injectors · user-request-priority
- **director/** (el SELECTOR que arma el rompecabezas): feature-axes · module-selectors · biased-distributions · coherence-guards · anti-sameness · hero-decision · structure-builder · normalize-and-coerce · rollback-and-fallback · rotation-memory · rating-bias
- **critique/** (QA adversarial): pre-render-llm-critic · honesty-checks · copy-quality · hook-strength · deterministic-probes · vision-audit · layout-qa · brand-fidelity · self-correct-loop · gate-thresholds
- **audience/** (publico + SERIEDAD/safety): persona-inference · persona-language · seriousness-axis · sensitive-topic-detection · tone-of-voice · pacing-by-audience · market-locale · claim-safety · inclusivity-and-bias · override-resolution

### PILAR B · FUNDAMENTO VISUAL (la capa 0)
- **backgrounds/**: gradient-fields · generative-art (flowfield/contours/voronoi/attractors) · geometric-graphic · atmospheric-organic · retro-print · tech-hud · broadcast-news · chrome-y2k · morph-protagonist · light-substrate-paper · spatial-depth
- **color/**: harmony-schemes · mood-grading · tone-systems · contrast-guards (WCAG) · brand-extraction (k-means) · rubro-palettes · named-palettes (banco curado) · color-temperature · **[OKLCH engine]**
- **typography/**: font-families · pairings · type-scale · weight-tracking-leading · variable-fonts · number-treatments · lockups · ornaments-type · script-emoji-i18n
- **substrates/**: grain-noise · print-trama · editorial-grid · fabric-material · glass-acrylic · topographic-organic · damage-distress · overlay-light
- **atmosphere/**: glow-bloom · vignette · light-rays · shadow-systems · color-grade · lens-fx · depth-haze · scrim-legibility

### PILAR C · CONTENIDO (lo que carga la info de la pagina)
- **typekit/** (tipografia cinetica): entradas-por-letra · por-palabra/linea · layout-tipografico · enfasis/acento · wordmarks · display-expresiva · kinetic-loops · salidas
- **photokit/** (foto real): encuadre/camara · mascaras/recortes · color-grade · halftone-sobre-foto · collage/multi-foto · integracion-foto+grafico · saliencia/seguridad
- **markkit/** (graficos/formas/iconos): iconos-por-rubro · iconos-animados · formas/morphs · marcos/contenedores · divisores/conectores · decoradores/acentos · sustratos/grillas
- **datakit/** (data-viz): numeros-animados · barras · anillos/radiales · series/tendencia · comparacion/proporcion · rating/prueba-social · numberStack · timeline/proceso

### PILAR D · ESCENA & COMPOSICION (el rompecabezas narrativo)
- **narrative/** (beats/arco): hook · value · proof · data · context · close · grammars/arc · grammars/pacing · rules/eligibility · rules/continuity
- **composition/** (sistema espacial abstracto — HOY las coords estan hardcodeadas, GAP): grids/structural · grids/golden · anchors v/h · balance sym/asym · regions/safe-area · zoning · flow/reading-order · negative-space · solvers/packing · tokens/spacing-scale
- **scene-layouts/** (plantillas): openers/hero · openers/hook · statements/editorial · lists/checklist · lists/comparison · data/single · data/multi · social/proof · media/photo · closers/outro · connectors/interstitial · spec/slots

### PILAR E · MOTION (el vocabulario de movimiento)
- **motion.easing**: penner · back · elastic · bounce · spring-as-curve · smoothstep · stepped · bezier · gain/bias · piecewise · loop-eases · modulators
- **motion.entrance-exit**: translate-in · scale-in · reveal-by-mask · blur/focus-pull · rotate/tilt · char/word/line-stagger · exit-mirror · POV · compound · attention · mask-shape
- **motion.choreography**: stagger-engines · sequencing · grouping · rhythm/tempo · FLIP · overlap/anticipation · cascade · focal-priority · reveal-direction · mask-march
- **motion.physics**: spring-1D/2D · critically-damped · bounce-floor · follow-through · trailing-chain · pendulum · drag/inertia · magnetic · jiggle/secondary · collision
- **motion.ambient**: breathing · float/drift · parallax · shimmer/sheen · noise-wander · rotation-idle · pulse-glow · ambient-morph · particle-idle · clock-harmonics
- **motion.kinetic-type**: per-char · draw-on · weight-wave · tracking · line-settle/typewriter · baseline-wave · count-up/odometer · highlight-sweep · split-reveal · emphasis-pop · text-on-path
- **motion.camera**: push/pull · pan · dolly/truck · ken-burns · sway/handheld · rack-focus · whip-pan · shake/impact · parallax-rig · orbit/arc · zoom-transition · energy-modulation

### PILAR F · TRANSICIONES (motor de escena-a-escena — requiere SCENE-BUFFERING, ver gaps)
- **transitions/** = motor (core: contract · scene-buffering OffscreenCanvas · compositor · window-policy · curves · seed-namespace · registry) + familias:
  cuts · wipes · slides · dissolves · glitch · whips · morph (anti-blob) · matchcut (continuidad) · framing (multi-panel)

### PILAR G · AUDIO (GAP #1 — el motor HOY es MUDO; un reel mudo pierde contra cualquiera)
- **audio/**: beat-grid (el corazon) · procedural-music · asset-music-library · sfx-stingers · voiceover (TTS) · mix-engine (ducking) · music-curve/energy-map · render-export (OfflineAudioContext)

### PILAR H · POST & ENTREGA (el acabado + lo que mueve la aguja en reels)
- **post/grade/**: LUTs procedurales · tone-curves · color-balance/split-tone · white-balance · channel-mixers · grade-por-seriedad · grade-contextual-a-la-foto · color-vignettes
- **post/fx/**: grano-film · bloom/halacion · aberracion-cromatica · glitch · scanlines/CRT · light-leaks/flares · optica/lente · time-based
- **post/overlays/ + captions/**: CAPTIONS animados (word-reveal/karaoke/highlight — **alto impacto, GAP**) · estilos-caption · lower-thirds/chyrons · marca-de-agua · progress/tiempo · frames/bordes · badges/stickers · CTA-persistente/end-screen · branding-kit
- **post/format/**: presets-aspect (9:16/1:1/16:9) · safe-areas-por-plataforma · reflow/reposicion · reframe-foto · pillar/letterbox · escalado-tipo+motion · densidad-overlays · batch-export
- **brand-kit/**: logo-lockups · color-system · type-system · cta-endcards · safe-areas · watermark · social-handles · consistency-guards
- **competitive-parity/** (cross-cutting QA): competitor-profiles · must-have-checks · uniqueness-scoring · rubric-by-vertical · platform-specs · scorecard

## GAPS DUROS para "Canva o mejor" (habilitadores — orden de impacto)
1. **AUDIO** (bloqueante): beat-grid + musica + sfx + mix. Sin esto perdemos en la demo contra todos.
2. **CAPTIONS animados** (word-pop/karaoke): es LA pieza que mas mueve la aguja en reels; hoy solo subtitulo estatico.
3. **SCENE-BUFFERING** (OffscreenCanvas saliente+entrante): habilita TODAS las transiciones reales (hoy el corte es overlay).
4. **COMPOSITION abstracta**: hoy las coordenadas viven hardcodeadas en cada renderer → extraer el sistema espacial.
5. **OKLCH** en vez de HSL: mezclas/rampas perceptualmente uniformes → separa "pro" de "auto-generado barato".
6. **SERIEDAD/SAFETY** como eje de 1ra clase: un consultorio medico NO puede salir cyber/y2k; el director debe respetarlo.
7. **ANALISIS REAL** (perception): no solo extraer texto — leer marca/colores/fotos/mensaje/publico con confianza y merge.

## Fusion con lo hecho (NO empezamos de cero absoluto)
Todo lo actual es el PRIMER RELLENO de su biblioteca: bg systems → backgrounds; particle-hero/morphs/15-formas → markkit/motion;
escenas → scene-layouts/narrative; transiciones actuales → transitions; copies/mock/director → strategy/brief/director;
style_engine/PROFILES → color/typography; GATES (bounds/legibilidad/bg-check) + herramientas (render/mp4/motionmap/bounds/legibility)
→ critique + el QA del nuevo motor. "Animaciones" queda intacta; urvid 1.0 nace al lado y reusa este codigo como semilla.

## Plan (la secuencia)
1. **[HECHO]** Mapa: pilares + bibliotecas + categorias (este doc).
2. **Contrato de modulo** + registro + el esqueleto del ensamblador (director → componer modulos) + el scaffold de urvid 1.0 (item sidebar, almacen de videos en el mismo lugar).
3. **1 agente por biblioteca** → recolecta/escribe modulos por categoria, SOLO codigo verificado (cada uno con test + gates).
4. Cuando haya MASA CRITICA (cientos por categoria) → director + ensamblaje → pruebas en urvid 1.0.

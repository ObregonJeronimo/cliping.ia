# Plan de upgrade del motor de video (Urvid/Animaciones) — tipografia + estilos + motion

> Fuente: investigacion multi-agente (video marketing 2026) + pedidos del usuario. Implementacion incremental,
> cada fase verificable con el visor (tools/render.mjs: `video`/`gif`, fuentes reales via tools/get-fonts.mjs),
> determinismo bg-check 16/16 SIEMPRE. Solo Canvas 2D determinista, NADA de IA generativa de imagen/video.

## Estado
- [x] **F0 Visor**: fuentes reales en Skia (tools/fonts/ via get-fonts.mjs), export **GIF** (`render.mjs gif`),
  strips densas (`render.mjs video <json> <name> <N>`). Antes el visor usaba fallback sans -> ahora muestra la tipo real.
- [x] **F1 Sistema de fuentes por estilo** (display/text/accent): style_catalog.STYLE_FONTS -> timeline ->
  engine `fontStr(weight,size,role)` rutea los 30 ctx.font. Cargadas en visor + index.html + TimelineVideo (MP4).
  Set por estilo (1.2): blueprint=SpaceGrotesk/IBMPlexMono/JetBrainsMono · swiss=Archivo/Inter/Archivo ·
  platinum=Fraunces/HankenGrotesk/SpaceMono · obsidian=Sora/InterTight/SpaceMono · meshflow=Outfit/PlusJakarta/SpaceGrotesk ·
  aurora=Bricolage/Onest/Caveat · handmade=Caveat/FamiljenGrotesk/Caveat · typographic=BigShouldersDisplay/Newsreader/SpaceMono ·
  riso=SpaceGrotesk/SpaceGrotesk/SpaceMono · retro70s=Caprasimo/DMSans/Righteous · brutalist=Anton/DarkerGrotesque/SpaceMono ·
  sport=Oswald/Barlow/BigShouldersDisplay.
- [ ] **F1b Auto por rubro** (pickFonts): RUBRO manda categoria base; el estilo da la voz. Lujo->serif editorial
  (Fraunces/Playfair); oferta/urgencia->condensed (Anton/Oswald); tech/datos->geometric+mono; calido/familiar->rounded/humanist
  serif; joven/viral->display/retro; corporativo->grotesque; cinematografico->wide display. **Mono SIEMPRE para precio ARS/m2.**
  Default RE/MAX = Grotesque+Geometric (PlusJakarta/Inter).
- [ ] **F3 Libreria de motion** (`shared`/engine): tecnicas f(t) puras. PRIORIDAD (alto impacto/bajo esfuerzo):
  1 idle-breath/drift en el hold (mata frame muerto: s=1+0.01*sin(2pi*t/2.5), dy=3*sin(2pi*t/4.25), periodos primos);
  2 stagger por palabra/letra (token i: p=eOutCubic((t-t0-i*stride)/dur), alpha=p, dy=16*(1-p)); 3 slide+overshoot (eOutBack, dx=80*(1-p));
  5 numeros count-up (val=round(target*eOutExpo(local)), re-measureText) -> precio ARS/m2/ambientes; 7 lineas draw-on (setLineDash + lineDashOffset).
- [ ] **F4 Motion de fondo**: 6 particulas PRNG sembrado (mulberry32, x=(x0+vx*t)%W, y=y0+sin(t*spd+ph)*amp) -> llena el vacio;
  8 grid parallax + sweep line (ox=(t*12)%gap; sweep sy=((t*0.25)%1)*H gradiente). Cablear a blueprint/obsidian/cyber/surveillanceHUD/meshflow.
- [ ] **F5 Transiciones**: 4 mask wipe (clip + barra-filo), 9 scale-punch + blur-in (filter blur en Chromium; fallback copias en Skia),
  10 exit coreografiado (no fade) + snap al beat (beat=0.5s). OJO: ctx.filter NO en napi-rs -> ramificar por renderer.
- [ ] **F6 Estilos nuevos (7)**: editorial(Fraunces/Newsreader, crema/tinta, hairlines+folio), surveillanceHUD(ArchivoExpanded/JetBrainsMono,
  negro+grid+corner-brackets+crosshair+KPI count-up), broadcast(Anton/Archivo, lower-third+ticker+EN VIVO), cyber(ChakraPetch/JetBrainsMono,
  grid perspectiva+scanlines+glitch RGB), corporate(PlusJakarta/Inter, claro+cards+mini-charts+KPI), organic(Fraunces/HankenGrotesk,
  terroso+formas organicas+grano calido), y2k(BagelFatOne/SpaceGrotesk, aqua->lila+blobs cromados+sparkles). Cubrir rubros: inversion/data,
  premium editorial, urgencia/news, tech/cyber, B2B, wellness/eco, joven/retail.
- [ ] **Logo** (proximo feature grande): site_capture.py YA extrae logo URL (apple-touch-icon/og:image/icon) pero NO se usa
  en el video (el motor dibuja monograma = inicial). APPROACH (clave: NO romper determinismo): el motor es sync, asi que la
  imagen del logo DEBE estar precargada ANTES de cualquier drawFrame (si algunos frames la tienen y otros no, el render
  paralelo de Remotion sale no-determinista). Pasos: (1) engine `setLogo(img|null)` + dibujar el logo (en outro y/o hero) si
  esta, con fallback al monograma; (2) cada renderer PRE-carga y luego setLogo: visor = `await loadImage(path)` antes del loop;
  live preview = cargar Image, setLogo, redibujar; Remotion = `delayRender` hasta que la imagen cargue. (3) director pasa
  `logo` (URL) al timeline desde site_capture. (4) validar calidad: si el logo es chico/feo (favicon 16px), preferir monograma.
  Necesita un logo real para testear en el visor. Es multi-archivo -> hacerlo en una pasada dedicada.

## Reglas duras (legibilidad 9:16)
- captions/bloques SOLO en Geometric/Grotesque/Rounded/Humanist. Display high-contrast (Fraunces/Playfair), condensed extremo,
  retro (Caprasimo), script (Caveat) y editorial = SOLO titular/hero/acento, NUNCA bloque largo. Script = 1-2 palabras.
- Max 2 familias por frame + 1 mono para numeros. Jerarquia por peso/escala, no por sumar familias.
- OJO handmade: display=Caveat se usa tambien en el STATEMENT (frase mas larga) -> verificar legibilidad; si molesta, rutear
  statements de estilos con display NO-caption-safe a una fuente legible (distinguir hero-wordmark vs statement, hoy ambos son rol 'd').

## Riesgos
- Carga de fuentes en 3 renderers (visor TTF / index.html / TimelineVideo MP4). MP4 sin verificar offline (paso del usuario).
- ctx.filter (blur) no garantizado en @napi-rs/canvas -> el visor y el MP4 (Remotion, con blur) no son pixel-identicos; el visor es preview.
- Variable fonts: Skia puede no aplicar ejes via CSS -> usar pesos estaticos discretos (ya se bajan asi).

---
## Batch FLUIDEZ + ANTI-PREDECIBILIDAD + bug fotos (sesion reciente)
Quejas del usuario (videos terminados): (a) predecibles/mismo molde, escenas vacias, mejorar TODAS las escenas;
(b) bug: Google Maps -> screenshot de su zona; (c) FALTA DE FLUIDEZ texto+fondo (micro-cortes/desync). Research
multi-agente confirmo las causas raiz en el codigo.

HECHO:
- **Bug fotos**: site_capture._JS_IMAGES con FILTRO de calidad (rechaza mapas/staticmap/tiles/sprites/iconos/ads/
  tracking + aspect extremo) -> no mas screenshots de Maps/basura.
- **FLUIDEZ (causas raiz confirmadas + fixes):** (F2) CAMARA COMPARTIDA con parallax -> drawBg(t,camX,camY,camZ)
  recibe el mismo vector que el contenido a ~32% profundidad + overscan 1.045 (fondo y texto se leen como UN plano);
  (F3) camara C1-continua: zoom de entrada smootherstep que asienta + pan CONTINUO compartido (se quito el
  Math.min(push,zout)=kink y el panX (i%2)=flip por escena); (F1 parcial) reloj de camara unico (_PHI con armonicos
  ENTEROS 1,2 -> sin beating breath/float/pan); (F6) drawImage redondeado (anti sub-pixel en Ken Burns).
- **Anti-predecibilidad (P3)**: BANCO DE TRANSICIONES (wipe/flash/blinds/curtain) elegido por SEED^i + sesgo por
  dureza del estilo -> el corte ya no es siempre el mismo wipe.

HECHO (continuacion):
- **F1 COMPLETO (reloj lento compartido)**: se agrego la constante `CLK=0.025` (rad/s) + helper `_harm(rnd,lo,hi)`
  en engineCore. Los DOS osciladores continuos por-video que batian (camara `_PHI` y los blobs del mesh `fx/fy`)
  ahora se snapean a ARMONICOS ENTEROS de CLK -> la diferencia entre dos armonicos es otro armonico, el campo de
  movimiento lento queda coherente y periodico (no wobble a la deriva). Tambien snapeadas las derivas lentas
  visibles por estilo (field/bands/aurora claro+oscuro, organic, y2k, marca de agua, flotantes). La sparkle rapida
  (twinkle/flap/pulse) queda libre (no bate perceptible). Mismos conteos de rnd() -> posiciones/colores intactos,
  determinismo 16/16. (commit 0bc3c64)
- **Checklist hold-life**: idle-breath ~3% en los marcadores circulares (check/number), fase por fila, en la grilla
  de CLK -> la lista no queda congelada tras revelarse (paralelo al glint del statement). (commit 1be7348)

PENDIENTE (siguiente batch, mejor DESPUES de que el usuario verifique la fluidez EN VIVO -frames no muestran motion-):
- FLUIDEZ F4 (no congelar en seco en animLen: settle-drift sub-pixel en fase con CLK usando _holdT), F5 (cross-fade
  sin valle de brillo: aOut=1-aIn sobre fondo opaco), F7 (motion-blur por stamping solo en tramos rapidos; OJO Skia).
- PREDECIBILIDAD P1 (gramatica generativa en el director: conteo de beats 3-7 variable, sin repetir, no esqueletos
  fijos), P2 (mas drawers: reveal/split/quote-card/ticker/numberStack/fullPhoto -> mas combinaciones), P4 (ritmo por
  compases). "TODAS las escenas mas fuertes": layouts mas ricos por tipo (no solo hero).

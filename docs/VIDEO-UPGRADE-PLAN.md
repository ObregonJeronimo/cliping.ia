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

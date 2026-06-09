# Traspaso a próximo chat — cliping.ia

> Documento para que el próximo Claude tenga TODO el contexto y continúe sin dudas. Está escrito
> para vos (el próximo Claude): leelo entero antes de tocar nada.

---

## 0. Quién es y cómo hablarle

- **Jero** (Jerónimo Obregón, GitHub: `ObregonJeronimo`). Dev full-stack, Córdoba / La Calera, Argentina.
- Hablá en **español rioplatense (voseo)**. Tono **directo, conciso, resultados primero**. Nada de
  vueltas ni relleno. Es técnico: podés ser preciso.
- Valida de forma iterativa con renders/capturas reales. Le gusta que las cosas queden "perfectas"
  sin necesidad de ajustar, pero entiende que lo visual necesita su ojo al final.

---

## 1. Qué es cliping.ia

Generador de **videos de marketing tipo motion-graphics** (reels) a partir de una URL + una
descripción. **NO usa IA generativa de video** (nada de Sora/Veo). El foso es: motion-graphics
**nativo de la marca**, determinista, legible, multi-formato y **barato** (~$0.05/video vs ~$2 de la
competencia). No competimos en foto-realismo; competimos en que el video se sienta de TU marca.

**Stack:**
- Frontend: **React + Vite**, desplegado en **Vercel** (Vercel despliega el front SOLO, automático al
  pushear `src/`).
- Backend: **FastAPI**, corre **local en la PC Windows de Jero** + **ngrok** para exponerlo. NO está en
  la nube. ⇒ **los cambios de backend y de Remotion requieren que Jero reinicie con `start.bat`** (no
  pasan por Vercel).
- Render: **Remotion 4.0.469**. Imágenes/logos: **Cloudinary**. Datos/estado: **Firestore**.
- **Thiago** es socio y dueño de la **landing page** → **NO tocar la landing**.

---

## 2. Cómo se hacen y pushean los cambios (workflow + token)

Trabajás con el repo clonado en el entorno: **`/home/claude/cliping.ia`**. Se pushea por **git sobre
HTTPS** usando un **Personal Access Token (PAT classic)** que **Jero te pasa en la conversación**.

Flujo de CADA cambio:
1. `git pull --quiet` (o `git pull --rebase`) antes de empezar → traer lo último.
2. Editar con las tools del entorno (`view` / `str_replace` / `create_file`).
3. **Validar** (ver sección 6 — QA sin Windows). No pushear sin validar.
4. `git add <archivos>` + `git commit` con mensaje **chico y descriptivo**.
5. `git pull --rebase origin main && git push origin main`.

**Regla de seguridad del token (importante):**
- El token **NUNCA** se escribe en respuestas, ni se commitea, ni se guarda en ningún archivo.
- En cualquier comando que pueda imprimir el remote o el token, **enmascaralo** agregando al final:
  `| sed 's/ghp_[A-Za-z0-9]*/ghp_***/g'`
- El PAT **no persiste entre chats**: para pushear, **pedile a Jero que te lo pegue** en tu
  conversación. No lo busques en el repo ni en este doc (no está, a propósito).
- **Sobre la exposición del token: Jero lo gestiona y lo revoca cuando terminan. No te preocupes por
  eso — es algo que él maneja.** (Él pidió explícitamente que te lo aclare.)

Nota: hay una `userPreference` de Jero sobre `push_files` y caracteres UTF-8 (si usás la **GitHub MCP**
en vez de git directo: para archivos con acentos/ñ/emojis usá `create_or_update_file`, NO `push_files`,
y siempre `get_file_contents` para el SHA antes de actualizar). **Acá usamos git directo desde el
entorno**, que escribe UTF-8 bien, así que la regla no aplica al flujo actual — pero tenela presente.

---

## 3. Arquitectura — Backend (archivos clave)

Todo en `backend/`.

- **`main.py`** (~660 líneas): rutas FastAPI. `_render_video_job` orquesta:
  `capture_all` (1 sola carga de Chromium: screenshot + texto) → **cache de análisis por URL**
  (ver abajo) → BrandDNA → `build_storyboard` (o spec pre-elegido si `req.spec`) → setea
  `spec.format`/theme → inyecta screenshot/logo/imágenes/accent → render Remotion → Cloudinary →
  Firestore. El doc del video guarda `format`, `tokens:{in,out,cache_w,cache_r,cost_usd,calls}`,
  `recipe`, `rating`.
  - `VideoGenRequest{url, desarrollo, proposito, theme, seconds, userId, idioma, formato,
    refreshBrand, spec}`. `formato` ∈ vertical|square|wide. `refreshBrand=True` ignora el cache.
  - Cache de análisis (Firestore `users/{uid}/brand_cache/{brandKey}`): `_get_brand_cache` /
    `_set_brand_cache`, TTL 14 días. Guarda `{dna, brand, ts}`. Solo cachea análisis **completos**
    (visión OK + hechos) → un fallo transitorio no queda pegado. Patrón gemelo al de `style_history`
    (rotación reciente, `_get_recent_profile` / `_push_recent_profile`).
- **`template_director.py`** (~1350 líneas): el "director".
  - `_client = AsyncAnthropic()`, `DIRECTOR_MODEL = "claude-sonnet-4-6"`.
  - **Brief partido en 2** (para el cache de costos): `_analyze_brand(url_data)` (HECHOS estables:
    INDUSTRIA/QUÉ VENDE/DIFERENCIAL/PRUEBAS/TONO → **cacheable por URL**) + `_creative_brief(brand,
    desarrollo, proposito)` (PÚBLICO/OBJETIVO/CONCEPTO/MOMENTO HÉROE/MENSAJES/HOOK/EVITAR → **fresco
    por pedido**). `_build_brief(...)` los combina y devuelve `(brief_txt, brand_block)`.
  - `build_storyboard(url, desarrollo, proposito, seconds, recent_profile, prefetched_site, idioma,
    rating_bias, usage, dna, cached_brand, brand_sink)`: arma el prompt con playbook + concepto/héroe +
    ALMA visual (dna) + energía; el pedido del usuario MANDA sobre todo; corre `_qa_spec`. Expone el
    `brand_block` vía `brand_sink` (lista) para que main.py lo cachee.
  - **`_qa_spec(spec)`**: QA determinista con autocorrección — escena pesada al inicio→swap, acento
    legible→autoaclarado, tiempo de lectura→bump de duración, duplicados, líneas largas, cierre. **NO
    toca el formato** (lo elige el usuario). Logea `[qa]`.
  - **`_sys_cached(text)`** + `_acc_usage` / `usage_cost`: prompt caching del system del director y
    contabilidad de costo (incluye tokens de cache: write 1.25x, read 0.1x).
  - `THEME_VIBES` (10 themes), `VALID_THEMES`, `HOOK_ARCHETYPES` (8), `NARRATIVE_ARCS` (7),
    `ART_PRESETS`, `DECORS`. Rotan (con `recent_profile` + sesgo por rating) para que dos videos no se
    repitan.
  - `build_video_files`: `FORMATS = {vertical:(1080,1920), square:(1080,1080), wide:(1920,1080)}`,
    `_ROOT_TEMPLATE` con `__WIDTH__`/`__HEIGHT__`.
- **`playbooks.py`**: 14 **rubros** (NO formatos): saas, ecommerce, restaurante, salud, belleza,
  fitness, inmobiliaria, fintech, educacion, agencia, servicio_local, evento, ong, lujo. Cada uno con
  tono/ritmo/energy/prueba/priorizar/evitar/cta/theme/do/dont + `AUDIENCE_MODS`. `pick(industria,
  publico)` → bloque de texto para el prompt. **DATA editable** (mejora sin tocar código). Es
  independiente del formato.
- **`brand_dna.py`**: lee el **ALMA visual** del sitio. `analyze_brand_dna(screenshot_path,
  theme_options, usage)` → lee el screenshot con modelo multimodal (`VISION_MODEL="claude-sonnet-4-6"`)
  → `{summary, mood[], energy, type_vibe, density, primary, accent, theme}` + paleta PIL de refuerzo +
  acento legible. **Best-effort total**: si falla, devuelve `{}` y el pipeline sigue con defaults.
  Helpers puros: `_hex_ok`, `contrast_ratio`, `lighten`, `ensure_visible_on_dark`,
  `palette_from_screenshot`. Logea `[dna]`.
- **`site_capture.py`**: `capture_all` (screenshot = PATH local PNG + texto en una sola carga de
  Chromium), extrae logo (apple-touch-icon/icon).

**Flujo de "entender la marca":** screenshot → `analyze_brand_dna` (alma visual) + `_analyze_brand`
(hechos) → ambos se cachean por URL. Lo creativo (`_creative_brief`) y el director corren **frescos**
siempre → el video sale **distinto** aunque el análisis esté cacheado.

---

## 4. Arquitectura — Remotion (`remotion/src/templates/`)

- **`VideoFromSpec.jsx`**: arma el video. `TransitionSeries` + transiciones (fade por defecto; **slide
  diseñado solo en energía alta**, en cortes alternados; timing fijo `TDUR=14` → el total de frames es
  exacto). `ContinuousBg` (fondo único continuo → sensación fusionada), `SceneShell` (zona segura
  SAFE_UP solo en vertical + salida sincronizada; **se deshabilita la salida fade cuando el corte
  siguiente es slide** para no doblar el movimiento). `CameraMotionBlur` (gated por `spec.motionBlur`),
  `SoundLayer` (audio ya scaffolded), `BrandMark` (logo real vía `spec.brandLogo`), `Backdrop`,
  `TactileLayer`, `FinishLayer`. `REGISTRY` de 16 escenas.
- **`layout.js`**: `fmt(useVideoConfig)` → `{W,H,aspect,vertical,square,wide,cx,cy,uiScale,padY}`.
  `uiScale`: wide 0.82 / square 0.92 / **vertical 1.0**. Las escenas escalan por `uiScale` para no
  pegarse a los bordes en cuadrado/horizontal; **en vertical quedan igual que siempre**.
- **`motion.js`**: sistema de movimiento. EASE (beziers curadas), SPRING, `prog`/`spr`/`stagger`/
  `enter`/`floatY`/`breathe`/`camera`/`parallax`. CAMERAS (7 viajes), ENTRANCES (rise/drop/slide/scale/
  zoom/tilt). **Intensidad por energía de marca**: `CAM_K`/`DIST_K`/`DUR_K` modulan cámara y entradas
  según `art.energy` (alto = más punch, bajo = más calmo). **En energía MEDIA = 1.0 EXACTO → cero
  regresión del vertical.** Lo lee vía `spec.art.energy` (lo setea `build_storyboard`).
- **`Particles.jsx`**: `SparkBurst` (estallido de chispas con overshoot, color de marca) + `AmbientMotes`
  (motas flotando). Determinista, aditivo, `pointerEvents:none`. Usado en StatReveal (cuando aterriza el
  número) y CtaOutro.
- **`Backdrop.jsx`**: `Backdrop` (motivos) + `ContinuousBg` (fondo continuo: glow base + 2 blobs de
  acento en distinta fase = gradient-mesh + **viñeta cinematográfica**; senoidales puras → loop sin
  salto).
- **Escenas (16)** en `scenes/`. Todas format-aware. La estrella: **`KineticStatement.jsx`** — texto
  cinético a **nivel CARÁCTER** (cada letra entra con posición+escala+rotación+opacidad y overshoot;
  stagger adaptativo que deja tiempo de lectura; rotación modulada por energía: 0 en marcas calmas).
  Variante `reveal:'type'` = typewriter. Otras: StatReveal, CtaOutro, FeatureList, IntegrationCluster,
  MockupShowcase, Comparison, Testimonial, SocialProof, LogoReveal, IllustrationScene, ProcessSteps,
  OfferPrice, MapLocation, ProductShowcase, IconTransform.

---

## 5. Qué se construyó (resumen de la última sesión)

Todo pusheado a `main`. En orden:
1. **Multi-formato** (vertical/square/wide): `layout.js` + FORMATS + selector en el front + galería
   adaptativa + fix de bug (el render fijaba 1080x1920) + calidad de encoding (crf 18, sin --width/
   --height por CLI) + márgenes/lectura.
2. **Cerebro backend** (`fb41ed5`): BrandDNA (alma visual) + playbooks por rubro + concepto/momento
   héroe + QA automático + brief ampliado + logging de tokens.
3. **Animación / Fase 3** (5 commits, `925a008`→`2ff78f5`): (1) movimiento por energía; (2) partículas
   + momento héroe; (3) fondo cinematográfico; (4) kinetic a nivel carácter; (5) transiciones diseñadas
   por energía. Todo no-regresivo (energía media = idéntico a hoy) y validado en render headless.
4. **Optimización de costos** (`58d3ba8`): cache de análisis por URL (ADN + hechos) + prompt caching
   del director. El video igual sale distinto.

Docs en el repo: `docs/PLAN_MAESTRO.md` (estrategia + roadmap por fases), `docs/PLAN_NUBE.md` (Lambda),
`docs/PLAN_CALIDAD.md` (calidad cinematográfica, 7 fases).

---

## 6. ⚠️ Cómo validar SIN Windows (método clave — usalo siempre)

No tenés acceso a la PC de Jero ni a Windows. Validás así:

- **Backend (Python):** `python3 -m py_compile <archivos>`. Para lógica pura podés `pip install
  anthropic pillow fastapi --break-system-packages` (la red permite pypi) e importar módulos para
  testear funciones (`playbooks.pick`, `brand_dna` helpers, `_qa_spec`, `_brief_field`, `usage_cost`).
  Las llamadas a la API NO se pueden testear (no hay API key) — por eso TODO es best-effort con
  fallback.
- **Remotion (escenas):** harness headless en `/tmp/qa2`:
  - `npm install esbuild@0.21.5 react@18 react-dom@18 --no-save`.
  - Bundle CJS con esbuild **externalizando** remotion/@remotion/* /react:
    `esbuild entry.jsx --bundle --format=cjs --jsx=automatic --tsconfig=tsconfig.json
    --external:remotion "--external:@remotion/*" --external:react "--external:react/*" --outfile=out.cjs`
  - Runner con `Module._load` override → `mockRemotion.cjs` (provee AbsoluteFill, Img, useCurrentFrame
    vía `global.__frame`, useVideoConfig). Para testear formatos no-verticales: Proxy sobre el mock que
    overridea `useVideoConfig` con un `CFG` variable. Render con `renderToStaticMarkup` por escena suelta
    + varios frames + 3 formatos → confirma que NO crashea (no valida el look visual).
  - **NO** se puede renderizar el VideoFromSpec completo headless (TransitionSeries/transitions están
    mockeadas) — solo bundlearlo (chequeo de sintaxis) + renderizar escenas sueltas.
- **Frontend:** `npx vite build` solo si tocaste `src/`.
- **Limpieza:** antes de commitear, si trabajaste en `remotion/`, asegurate de no dejar `node_modules`/
  `dist`/`package-lock.json` modificados.

Esto NO ve los frames → garantiza "compila + renderiza + no rompe", pero el **look final lo valida Jero
con su ojo**. Sé honesto con eso: no prometas "cero ajuste" en lo visual.

---

## 7. Estado actual y PENDIENTES

### ✅ HECHO: Fase 2 — auto-crítica del guion (commit `e2fd385`)
- Se agregó un **loop de auto-crítica**: después de que el director arma el borrador (y lo normaliza),
  un **director SENIOR** revisa y MEJORA el storyboard antes de renderizar. Rúbrica: pedido/objetivo,
  hook, copy genérico, anti-fórmula, momento héroe, coherencia, **honestidad** (no inventar datos) y
  reglas de forma. Si el guion ya es fuerte, lo deja igual (`verdict:"ok"`).
- **Dónde:** `template_director.py` → `CRITIC_SYSTEM`, `_critique_spec`, `_parse_critic`, y el loop
  dentro de `build_storyboard` (entre `_normalize` del borrador y la asignación de paleta). La salida
  del crítico **se re-normaliza** (red de seguridad: tipos válidos, honestidad de Stat/Offer/Testimonial,
  cap de listas) → aunque el crítico alucine un dato, `_normalize` lo saca.
- **Decisión de Jero respetada:** default = **Opus** (`claude-opus-4-8`). Toggles por env (para decidir
  con DATOS):
  - `CLIPING_CRITIC=0` → apaga la crítica (baseline, comportamiento previo).
  - `CLIPING_CRITIC_MODEL=claude-sonnet-4-6` → corre la crítica con Sonnet (comparar calidad/costo vs Opus).
  - `CLIPING_CRITIC_ROUNDS=2` → hasta 2 vueltas (default 1; corta antes si `verdict:"ok"`).
- **Medición:** el costo del crítico aparece en el log `[video] tokens: ... [critic: IN+OUT]` y se suma
  en `tokens.cost_usd` (Firestore). El log `[critic] rN <verdict>: <notas>` dice QUÉ mejoró. La receta
  guarda `criticModel` para poder correlacionar con el 👍/👎 más adelante.
- **OJO costo:** la crítica con Opus ~DUPLICA el costo por video (de ~$0.05 a ~$0.09). Con ~$0.18 de
  saldo alcanzan ~2 videos con crítica Opus. Es esperado (Jero lo sabía). Decidir Opus-vs-Sonnet
  comparando renders reales + los logs de costo.
- **PENDIENTE de Fase 2 (no hecho, decisión consciente para no sumar otra llamada paga):** un **paso de
  estrategia/concepto dedicado** (una llamada propia que razone la estrategia antes del director). Por
  ahora la estrategia/concepto vive en el `_creative_brief` (CONCEPTO/MOMENTO HÉROE) y el crítico la
  hace cumplir. Si Jero quiere el paso separado, es fácil de agregar (cuesta +1 llamada por video).

### 🧪 Antes que nada: TESTEAR (Jero no probó nada todavía)
Todo lo de las últimas sesiones está validado headless pero **Jero no vio ningún video renderizado aún**.
Lo que más vale mirar a ojo: el **kinetic a nivel carácter** (la escena estrella), las **transiciones
slide** en energía alta, y ahora **si la auto-crítica mejora de verdad el guion** (comparar un video con
`CLIPING_CRITIC=0` vs con Opus, mismo sitio). Sugerencia: generar un rubro de energía alta (gym) y uno de
energía baja (lujo/clínica); Yerco (energía media) queda igual a propósito. **Recordá: cambios de backend
→ Jero reinicia `start.bat`.**

### Otros pendientes (del roadmap)
- **Librería de ilustraciones SVG** (estilo unDraw, libres, comerciales) como 2ª fuente de objetos en la
  "forge", como elemento "héroe" estático con movimiento de cámara (no morphing). Iconify ya está
  integrado para íconos sueltos.
- **Fase 4 — música:** POSPUESTA. Bloqueada por **assets** (tracks libres de regalías con licencia
  comercial). El sistema en Remotion ya está scaffolded (`SoundLayer`, `spec.audio`). Jero elige cuándo
  conseguir tracks. (En esta sesión eligió la opción "c": dejarla para después.)
- **Fase 5 — nube:** migrar el render a **Remotion Lambda** (sacar el render de la PC Windows; es el
  cuello de botella real a escala, no los tokens). Plan en `docs/PLAN_NUBE.md`. + loop
  **rating→playbooks** (que los 👍/👎 retroalimenten los playbooks). Ya guardamos `criticModel` en la
  receta para que el feedback pueda comparar con/sin crítica.
- **`docs/PLAN_CALIDAD.md`**: 7 fases más de calidad cinematográfica.

---

## 8. Costos (para tener presente)

- Hoy, video de **URL nueva**: ~3 llamadas Sonnet (visión + hechos + creativo + director) ≈ **~$0.05**.
- Video **repetido del mismo sitio** (con cache + prompt caching en ráfaga): **~$0.025–0.03**.
- Sonnet 4.6 = $3 in / $15 out por millón. Opus 4.x = $5 / $25.
- El backend **loguea el costo exacto** por video: en consola vas a ver `[video] tokens: ...
  (~$...)` + logs `[cache]`, `[dna]`, `[director]`, `[qa]`. El primer video de cada URL paga el análisis
  completo; el ahorro aparece en los repetidos.
- **Saldo de Jero al cierre de la sesión: ~$0.18** en la API key del backend. **OJO: la charla con
  Claude (app) NO gasta esa API; solo gasta cuando se genera un video.** Con $0.18 alcanzan ~3-4 videos.
  Antes de meter cosas que generen mucho, tenelo en cuenta.

---

## 9. Reglas y convenciones (no las rompas)

- **No usar IA generativa** de video. Motion-graphics determinista.
- **No tocar la landing** (es de Thiago).
- **Música**: default silencioso. Fase 4 pospuesta.
- **morph eliminado** (no animar SVGs multi-path por morphing).
- Antes de crear/mejorar UI, landings o componentes, **leé `/mnt/skills/public/frontend-design/
  SKILL.md`** para no caer en diseños genéricos.
- **NO le recuerdes el token a Jero** ni se lo pidas de más; él lo provee y lo gestiona.
- Commits chicos y descriptivos. `git pull --rebase` antes de pushear. Enmascarar el token en logs.
- El **frontend lo despliega Vercel** solo (al pushear `src/`). El **backend/Remotion los corre Jero
  local** → avisale que reinicie con `start.bat` para ver cambios de backend o de render.
- Sé honesto sobre lo que podés garantizar (compila/renderiza/no-rompe) vs lo que necesita su ojo
  (el look visual). Y cuidá el costo: construir/testear lógica no gasta, generar videos sí.

---

## 10. Nota de Jero sobre este documento

Jero va a **borrar/revocar el token apenas terminen** — lo maneja él, no te preocupes por eso. Si en
algún momento querés actualizar este handoff, está en `docs/HANDOFF_PROXIMO_CHAT.md`.

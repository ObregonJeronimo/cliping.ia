Tengo lo que necesito verificado en código fuente. Dos confirmaciones clave de los audits que valido directamente:

1. **`wrap()` en `core/text.js:22-23`** confirma el bug del fitter: la cláusula `|| !cur` acepta una palabra inquebrable más ancha que `maxW` como línea válida, y el loop solo chequea `ls.length <= maxLines` — nunca verifica desborde por línea, así que cae a `clip()` (ellipsis). Verificado.
2. **`render.js:18`** confirma que `setScratchFactory` existe pero el path de buffer/crossfade depende de inyección externa; el comentario admite que Node pelado cae al fallback. Verificado.

Ahora sintetizo el reporte.

# Auditoría urvid 1.0 — síntesis honesta y roadmap

## 1. Veredicto honesto

urvid 1.0 es un motor de video deterministico **técnicamente excelente en su núcleo y estructuralmente incompleto como producto**. Lo difícil ya está resuelto y bien resuelto: determinismo por sub-seeds ortogonales (`core/prng.js`), legibilidad horneada con WCAG (`core/text.js`, `palette.js`), un director con fit-scorer real que produce variedad medible (53–67 fondos distintos en 200 seeds), y la única percepción multimodal en una llamada Sonnet. Pero **hoy no llega a "Canva o mejor", y por dos razones que no son de pulido sino de arquitectura**: (a) no hay solver de composición — cada escena hardcodea coordenadas absolutas en un lienzo de 405×720, así que el output es, casi siempre, un bloque de texto centrado en un cuadro ~60% vacío (un slideshow lindo, no un layout diseñado); y (b) **el usuario no puede sacar un archivo de video** — el studio es solo preview en canvas, el "MP4 via Remotion" del handoff pertenece al motor VIEJO (Animaciones), y no existe ningún path de export real para urvid 1.0. A eso se suman dos defectos amateur visibles en el demo (el fitter que elide "Automatiza…" en vez de achicar, y gráficos de barras con datos inventados) y un agujero de seguridad serio (SSRF en `page.goto`). La buena noticia: ninguno de estos es "el motor es malo". El motor es la parte fuerte; falta la capa de composición, la salida y la honestidad de datos.

## 2. Fortalezas reales (NO tocar)

- **Determinismo disciplinado.** `mulberry32` + `seedFor(seed, namespace)` da ejes ortogonales (iterar "color" no perturba "motion"), `stableSeed` hace URL→mismo video. La regla "cero `Math.random`/`Date.now`" se respeta de verdad en el core. Es el moat real frente a Veo/Sora (mismo brief = mismo video nítido) y la base del puente "Compartir con Claude". **No reescribir a Remotion-React**: la investigación confirma que ya seguís el patrón ganador (frame como función pura de `t`).
- **Contrato env/módulo limpio.** `render(ctx,t,env) | derive() | data` + `registry.js` register/query/get. Agregar un módulo es data pura, nunca toca el motor. Es el backbone correcto para escalar.
- **`fit.js` es un modelo de selección pensado**, no un sorteo: tres ejes soft (rubro/register/intensity), tono como único filtro duro, inferencia por tags como fallback. Produce variedad on-brand medible.
- **`strategy.js` (cerebro v2)** acopla contenido→estructura de verdad (`analyzeContent` → señales número/pregunta/lista/compare/proof → `buildArcSmart`/`sceneBias`).
- **Color/legibilidad correctos.** `palette.finalize` elige `onAccent` por contraste WCAG real (`legibleOn`), no por umbral HSL — arregla la banda muerta de hues luminosos. `text.js` hornea no-desborde (cuando funciona, ver §4).
- **Orden de capas correcto** en `render.js`: bg → sub → atm → garnish → contenido → post. El contenido siempre arriba de lo decorativo → texto legible por construcción.
- **Percepción de una sola llamada multimodal** con JSON robusto (`_extract_json` con conteo de llaves, `_normalize` con clamps, fallbacks en cascada color→themeColor→PIL). El brief se **usa** de verdad (`listFrom`/`statAt`/`proofFrom`). El service-account está correctamente gitignored (la preocupación del prompt es un no-issue).

## 3. Crítica por área

### Motor / Director
- **No hay solver de layout — el techo de calidad #1.** Las escenas hardcodean posiciones absolutas (`scene.hero.center` dibuja en `H*0.4`; `statement.editorial` en `ax=W*0.12`, claim en `H*0.46`). El grep muestra un reguero de fracciones mágicas (18× `H*0.42`, 11× `H*0.34`…) sin una sola constante de layout compartida. El director compone **capas**, nunca compone **espacio**. Resultado directo en `tools/out/urvid1-demo.png`: texto flotando en frame casi vacío en casi todos los beats.
- **El crossfade por buffer está sin verificar.** Confirmado en `render.js:18`: `setScratchFactory` no tiene **ningún caller** (ni tools, ni studio, ni Remotion). En Node pelado siempre cae al fallback sin crossfade (línea 93-99); en browser anda solo porque `OffscreenCanvas` es global. El chequeo de determinismo en `t=2.0` no cae en ventana de transición → el path de buffer no tiene cobertura.
- **Pacing no gobernado.** `buildArc` puede emitir hasta 3 body beats; el demo salió 14.9s para un promo corto. `_DUR` es una tabla plana sin presupuesto de duración global; `XF=0.4` es una constante única, no elegida por transición/personalidad.
- **`weightedPick` sesga por tamaño de pool, no solo por fit.** `checklist` domina como primer body beat en ~7/9 seeds: la diversidad de capas se ve sana pero la **diversidad estructural de body beats es más angosta** de lo que aparenta.
- **Garnish ciega.** Los iconos de esquina (`render.js:60`, TR/BR/BL) se colocan sin saber dónde está el contenido → en outro/social pueden quedar bajo texto vivo. No hay conciencia de colisión porque no hay modelo de layout.
- **Memoización mutante:** `render.js` estampa `video._motion/_typekit/...` sobre un objeto del caller. Determinista hoy, pero rompe si el video se congela/serializa (handoff a worker). Bajo riesgo.

### Bibliotecas (676 módulos)
- **Volumen sin composición = variedad de "piel", no de layout.** La calidad por módulo es alta y la variedad de skins es real y medida. Pero **más módulos no rompen el techo**: cada escena es un monolito full-frame; un arreglo a ritmo vertical/márgenes hay que aplicarlo a mano 73 veces.
- **El eje `intensity` está casi degenerado:** 355/676 (53%) son "medium" y `inferIntensity` defaultea a medium → `intensityFit` casi no discrimina. Uno de los tres ejes "ortogonales" es prácticamente una constante. La biblioteca está globalmente sesgada calm/neutral (loud share solo 1.4% serio vs 4.0% playful).
- **`markkit`/`datakit` desaprovechados:** 87 markkit existen pero solo se usa el icono de esquina al 20%; `datakit` (66) solo es alcanzable como escena full-frame **y se excluye justo cuando hay stats reales** (`assemble.js:106`). 153 módulos haciendo casi nada.
- **Metadata de rubro ruidosa:** 79% son `rubros:['*']` → `rubroAffinity` ≈ 1.0 para casi toda la biblioteca, apenas diferencia. Tipografía (23) está famélica vs color (141).
- **Hueco de cobertura estructural:** faltan los arquetipos que un aviso real necesita — layouts con región de imagen/media, split-screen, editorial asimétrico, product/price cards, before/after. El corte de `photokit` clausura la composición de aviso más común.

### Percepción
- **Fuga de fabricación (el problema de confianza #1).** La percepción es honesta (`stats:[]`, "no inventes"), **pero el motor inventa igual**: `statAt()` cae a `bigNumber(claim)` o "3x"/"100%" hardcodeados; la escena de datos sintetiza "+10..99"/"99%" desde el seed; `proofFrom()` recicla el claim como testimonio; checklists hardcodean mentiras de dominio ("3 ambientes · 80 m2 · Cochera"). Para salud/finanzas (alta seriedad) esto es un riesgo reputacional real, y contradice el pitch "fiel a la página".
- **SSRF.** `capture_all`/`extract_content` hacen `page.goto(url)` **sin validar scheme/host** detrás de un túnel ngrok público con CORS `*` y Chromium `--no-sandbox`. Cualquiera puede apuntar a `169.254.169.254`, `localhost`, RFC1918 o `file://` y exfiltrar vía screenshot/texto. **Severidad alta.**
- **Sin reparación/retry de JSON.** `max_tokens=750` + bullets ricos puede truncar; un near-miss colapsa a brief genérico indistinguible de falla total, sin log ni señal al usuario.
- **Cache in-memory no scopeada por user** (inconsistente con Firestore por-uid) y el **studio nunca expone refresh** (`PerceiveRequest.refresh` existe pero `analyze()` no lo manda) → brief malo pegado hasta 14 días.
- **Solo ve el hero.** Screenshot fijo 1280×900 del viewport superior + 12 headings/8 párrafos → en landings largas el modelo nunca ve pricing/stats/proof, que son justo los campos más ricos del brief.

### Calidad visual del output
- **Bug del fitter (lo más amateur del demo).** Confirmado en `core/text.js:22-23`: `wrap()` acepta una palabra inquebrable (la cláusula `|| !cur`) como línea válida porque solo chequea `ls.length <= maxLines`, nunca si la línea desborda `maxW` → cae a `clip()` y elide: "Automatiza…". Es bug en código compartido → arreglarlo levanta **todas** las escenas a la vez.
- **Datos fabricados visibles.** `scene.data.bars` inventa alturas con `mulberry32` y arma labels cortando el claim → barra "Hecha mano" de "Hecha a mano esta manana". Aun con un stat real (4.9) presente, se eligió una escena que fabrica.
- **Fondos ocupados/bajo contraste.** `bg.techhud.dataflow` con grid de nodos detrás de body text; `retroprint.checker` detrás del hero gastro. Lee como "fondo pegado", no art-directed.
- **Composición tímida.** Claims de 50px a media-frame con espacio muerto arriba y abajo; centrado-y-seguro en vez de póster/asimétrico.
- **Lado bueno:** el video belleza/light y el tech/Nodo sí pasan como templates Canva competentes — los defectos son **puntuales y de raíz**, no fealdad general.

### Studio / Producto
- **NO HAY EXPORT — el showstopper.** Cero referencias a mp4/download/MediaRecorder/toBlob/Remotion en `Urvid1Studio.jsx`. El usuario mira el canvas y no puede guardar/descargar/postear nada. Una herramienta de video-marketing de la que no podés sacar el video no es shippeable.
- **"Compartir con Claude" es infra de dev disfrazada de feature.** Escribe `tools/urvid-shared.json` para el asistente — un agente inmobiliario lo va a clickear esperando compartir con un cliente.
- **"Mis videos" es solo localStorage** (se pierde al limpiar cache; `user.uid` disponible pero no usado para storage; guarda brief+seed, no thumbnails).
- **Superficie de control mal calibrada.** "Otra variante" re-rollea toda la composición; el usuario SMB quiere arreglar **una** cosa (un typo, una escena). No hay lock-this-scene/reroll-the-rest, ni reorder, ni edición por escena.
- **Formato único 405×720.** Sin elección de aspect-ratio (feed 1:1, story/reel 9:16, 4:5) ni control de duración (`start||8` hardcodeado). Los agentes postean a feed, stories y estado de WhatsApp.
- **Sin brand-kit** (logo, fuentes guardadas), onboarding flaco (arranca con demo "Nodo" sin guía), errores con jerga de dev ("abrí start.bat", "localhost:8000").

## 4. Roadmap priorizado

### P0 — alto impacto, hacelo ya

| Qué | Por qué | Cómo (archivos) | Impacto | Esfuerzo |
|---|---|---|---|---|
| **Solver de composición (lib `layouts` + `core/layout.js`)** | El cambio que más sube el techo. Hoy el frame está ~60% vacío y el output lee abajo de Canva. | Helper puro determinista (grid greedy estilo GRIDS: packing sin overlap + alignment + grouping + pin-to-edge), seedeado por `env.seed`. Escenas piden **slots** (`title`/`kicker`/`media`/`mark`/`footnote`) en vez de `H*0.42`. El director elige 1 layout por video vía el mismo `fitWeight`. Migración incremental: slot default = coords actuales. **No** MILP/Cassowary salvo que el greedy no alcance. | Alto | Alto |
| **Path de export MP4 real** | El deliverable del producto no existe. | Más barato/seguro: endpoint backend `/api/urvid/render` que reusa el loop deterministico de `urvid1-test.mjs` → ffmpeg, alimentado por el **mismo {brief,seed,recipe}** que ya serializás para "Compartir". MVP instantáneo opcional: `canvas.captureStream(30)`→webm en browser. Botón "Exportar" en `Urvid1Studio.jsx` con barra de progreso. | Alto | Medio |
| **Frenar la fabricación de datos** | Mina la confianza; en salud/finanzas es riesgo legal/reputacional. Contradice el pitch. | `statAt` devuelve `null` (no número inventado) si `stats` vacío; `proofFrom` devuelve `''` (escena salteable); reemplazar strings de dominio hardcodeados por texto derivado de brand/claim. `assemble.js`/`strategy.js`: sesgar el arco **lejos** de beats de datos/proof cuando `stats:[]`/`proof:''`. Gatear con `allowSynthetic=false` cuando `seriousness>0.6`. Aplicar la regla de `datakit:106` también a `scene.data.bars/ring/compare`. | Alto | Medio |
| **Arreglar `wrap()` para achicar, no elidir** | "Automatiza…" grita "template roto". Bug de raíz en código compartido → levanta todo. | En `core/text.js:22-23`: que `at(s)` reporte si alguna línea aún desborda `maxW` (caso `!cur`); el loop acepta un tamaño solo si `ls.length<=maxLines` **Y** ninguna línea desborda. Bajar el min efectivo para claims de una palabra, o partir con guión suave antes de `clip()`. Fixture de tortura (`claim='Automatizacion'`) que asierta cero "…" en hero/statement. Debe quedar **determinista**. | Alto | Bajo |
| **Cerrar SSRF (allowlist de URL)** | Túnel público + `--no-sandbox` → metadata cloud/localhost/RFC1918 exfiltrables. | Guard en `main.py` antes de `site_capture`: exigir http/https, resolver host con `ipaddress` sobre `socket.getaddrinfo` y rechazar loopback/link-local/RFC1918/metadata; rechazar `file://` y puertos no estándar. Idealmente sacar `--no-sandbox`. | Alto | Bajo |

### P1 — importante, sigue

| Qué | Por qué | Cómo | Impacto | Esfuerzo |
|---|---|---|---|---|
| **Aspect-ratio múltiple (9:16 / 1:1 / 4:5)** | Table-stakes para un producto de ads (la investigación: el core de Creatopy es auto-resize). | Parametrizar W/H en `util.js`, segmented control en el panel. Las escenas dibujan en espacio normalizado; el trabajo es safe-area/letterbox en `render.js` + verificación por ratio. Habilita ya el solver de layout. | Alto | Medio |
| **Variantes rankeadas (3–5 comps, elegís)** | Es la UX ganadora de Canva (Template Variants) y AdCreative (scoring). Tus variantes son gratis y deterministas. | Reusar `tools/urvid1-variety.mjs`; ranker liviano extendiendo `fit.js`; grilla de N comps en el studio en vez de un video o reroll a ciegas. | Alto | Medio |
| **Wire `setScratchFactory` + test de transición** | El crossfade está silenciosamente apagado en Node. | Llamar `setScratchFactory((w,h)=>createCanvas(w,h))` en los tools y con `OffscreenCanvas` en el studio. Aserción de determinismo en un `t` dentro de `[B.start, B.start+XF)`. | Medio | Bajo |
| **Presupuesto de duración + pacing por personalidad** | 14.9s para un promo corto es emergente, no dirigido. | En `assemble.js`, tras `buildArcSmart`, ajustar beats a duración target (8–12s); `XF` y dur por beat función de la personalidad (snappy=más corto). Presets corto/medio/largo en el studio. | Medio | Bajo |
| **Persistir "Mis videos" + sacar "Compartir con Claude" de prod** | localStorage pierde trabajo; el botón dev confunde. | Firestore `users/{uid}/urvid_videos` (uid ya en scope); thumbnail real dibujando 1 frame offscreen. "Compartir con Claude" detrás de `import.meta.env.DEV`. | Medio | Medio |
| **Refresh de percepción + retry/repair + cache por-user** | Brief malo pegado 14 días; fallas silenciosas; cache cruza usuarios. | Botón "Re-analizar" que mande `refresh:true` (el backend ya lo honra); en `analyze_to_brief` log del raw + 1 retry con `max_tokens` ~1100 + señal `parse_ok:false`; key de `_urvid_brief_cache` con `userId`; rate-limit por uid/día. | Medio | Bajo |
| **Routear markkit/datakit a la composición** | 153 módulos casi muertos. | Con el solver, markkit (divisores/marcos) llena slots DECO; datakit ocupa una región MEDIA con stats **reales** (no fabricados) → ya no hay que excluirlo en `:106`. | Medio | Medio |

### P2 — cuando lo anterior esté

| Qué | Por qué | Cómo | Impacto | Esfuerzo |
|---|---|---|---|---|
| **Migrar color a OKLCH + agregar APCA junto a WCAG** | urvid corre dark por default, justo donde WCAG 2 falla ("near-black crush"). OKLCH elimina el special-casing y la "banda muerta" ya documentada en `palette.js`. | OKLCH en `derive/finalize/tonedBg/lighten/darken` + el hue-shift ±18..42° de `accent2`. `apcaLc()`/`legibleOnAPCA()` en `util.js` con WCAG≥4.5 como piso de compliance. Re-correr `urvid1-color-check.mjs` (1672 combos) como gate. | Medio | Medio |
| **Brand-kit (logo + perfil persistido)** | Logo de agencia/agente es table-stakes; brandColor solo no es una marca. | Upload de logo (dataURL en brief + perfil Firestore por uid), dibujado vía el path de garnish markkit. Persistir `{brandColor, logo, font}`. (El logo es distinto de "fotos reales" — sigue valiendo la decisión de no-fotos.) | Medio | Medio |
| **Tapar el eje intensity** | 53% medium + default inferido → `intensityFit` es casi un no-op. | Taggear intensidad explícita en los ~212 que dependen de inferencia; sembrar las puntas calm (57) y loud (34); re-correr la sonda loud-share (serio vs playful debería divergir mucho más que 1.4% vs 4.0%). | Medio | Medio |
| **Captions animados (antes que audio/VO)** | TODOS los competidores URL→video (Pictory/Revid/Vidyo) shipean audio+captions; es el mayor gap de calidad percibida. Captions "pegan fuerte" y no requieren VO. | Formalizar timing cinético en `core/typekit.js`: stagger por unidad ms→frames, ventana spread/overlap, ease selector distinto del recipe; invariante numérico "reveal llega a 1 con X seg de hold". Tratar audio/VO completo como el **siguiente** milestone, no el último. | Medio | Medio |
| **Normalizar rubros + rebalancear libs; pausar oleadas de volumen** | 79% `['*']` → rubro casi no diferencia; tipografía famélica. | Canonicalizar todos los rubros vía `canonRubro`; crecer pairings de tipografía hacia ~60; redirigir las oleadas de agentes de "más fondos" a layouts/media/intensidad. | Medio | Bajo |
| **Captura full-page + idioma de página** | El modelo solo ve el hero. | `full_page=True` (o 2-3 clips apilados) en `site_capture`; pasar `content.lang` a `_SYS`; capar `desarrollo` antes de interpolar (superficie de prompt-injection). | Medio | Medio |
| **Memoización no-mutante + normalización de pool en selección** | Robustez (frozen/worker) + diversidad estructural de body beats. | `WeakMap` keyed por video en `render.js`; en `fitWeight` normalizar por tamaño de pool o término de novedad. | Bajo | Bajo |

## 5. Las 3 apuestas más grandes

1. **Solver de composición (`core/layout.js` + lib `layouts`).** Es el cambio que más sube el techo, punto. **Cinco** de los siete audits convergen acá independientemente: el motor compone capas pero nunca espacio, y por eso el output lee abajo de Canva sin importar cuántos módulos sumes. Un solver greedy-grid puro y determinista convierte 73 escenas fijas en 73 templates × N layouts de variedad **compositiva** real, hace robusto el texto a largo variable, y de paso mata la garnish ciega y resucita markkit/datakit como slots. La investigación lo respalda (GRIDS/MILP como modelo, greedy como implementación de bajo riesgo). Razonamiento: el resto del motor ya es bueno; el cuello de botella es estructural, y este es exactamente ese cuello.

2. **Export real + multi-formato.** Sin archivo de salida no hay producto, y con un solo ratio no hay producto de ads. Juntas convierten un demo de motor impresionante en algo shippeable. El recipe+seed deterministico que ya serializás **de-risk-ea** el render backend (regenerás idéntico). Razonamiento: es la diferencia literal entre "Canva te deja irte con un archivo" y "esto no". Todo lo demás es secundario a esto.

3. **Honestidad de datos (matar la fabricación).** Es lo que protege el único posicionamiento defendible que tenés frente a Veo/Sora: "fiel a la página, no inventa". Hoy el motor desmiente ese pitch en render. Razonamiento: para inmobiliaria/salud/finanzas un testimonio falso o un gráfico inventado no es un bug cosmético, es una mentira con tu marca encima — y es barato de arreglar relativo a su impacto en confianza.

## 6. Qué aprender de la competencia/técnicas

- **Posicionate como "Remotion + un director de arte automático".** Remotion valida tu substrato (frame=función de t, render deterministico) pero exige que un humano autoree cada template y elija props. Tu director (`assemble.js`+`fit.js`) es justo la pieza que le falta a TODO el ecosistema de video programático. **No reescribas a Remotion-React** — ya tenés el patrón del "reloj virtual" bien hecho. Considerá exponer recipes como input-props tweakables para power users.
- **El cuadrante deterministico/brand-faithful/barato es exactamente el set de debilidades de Veo 3.1/Sora 2** (texto en pantalla poco confiable, drift de marca, clips de 8s, ~$0.40/seg, fabricación, no determinista). Liderá el mensaje con "mismo brief = mismo video nítido y on-brand, por centavos". No adoptes nada del enfoque difusión para ads; mantené la línea de no-fotos/no-imágenes generativas.
- **El gap real vs Canva no es el motor, es la capa de assets/brand-kit, la versatilidad de formato y el solver de layout.** Canva fakea el "un prompt → layout" con curación de templates humanos; vos lo generás. Pero su moat real es brand-governance + cobertura de formato. Por eso multi-ratio y brand-kit están altos en el roadmap.
- **La tendencia 2025 validada es "variación estructurada + scoring"** (Canva Template Variants, AdCreative Creative Scoring, Pencil). Tus variantes son deterministas y casi gratis → estás perfectamente posicionado: agregá un ranker liviano y serví 3–5 comps rankeadas para elegir, en vez de un video o un reroll a ciegas.
- **APCA + OKLCH** son la respuesta técnica directa a un síntoma que ya está hardcodeado en tu propio `palette.js` (el comentario de la "banda muerta" y el special-casing de verdes/amarillos luminosos en `accentAsText`). WCAG 2 es menos confiable justo en dark mode, que es tu default. Sumalos como gate perceptual encima del piso WCAG, no como reemplazo.
- **Captions antes que audio.** Todos los competidores URL→video (Pictory/Revid/Vidyo/Steve) shipean audio+captions como feature de portada; es probablemente el mayor gap de calidad percibida una vez que los visuales estén pulidos. Re-evaluá la decisión "audio al final": priorizá captions animados (no requieren VO) y tratá VO completo como el siguiente milestone, no el último.

**Una advertencia transversal honesta:** "676 módulos" es, en parte, **volumen por encima de calidad**. La variedad de skins es real y medida, pero la variedad de *layout* es nula porque no hay composición; el eje intensity está degenerado (53% medium); 79% de rubros son `['*']` (no diferencian); y 153 módulos (markkit+datakit) están prácticamente muertos en producción. Pausá las oleadas de "más fondos" y redirigí ese esfuerzo a layout, media-scenes, formato y export. El número grande de módulos hoy oculta que el lever de calidad real (composición) está sin tocar.
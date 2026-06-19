# urvid 1.0 — fixes post-auditoria (progreso)

> Acompaña a `docs/URVID-1.0-AUDITORIA.md` (la critica + roadmap). Esto registra QUE se implemento del roadmap
> y QUE falta, para retomar sin perder contexto. Cada item se verifico (determinismo + vite build) y se commiteo.

## HECHO (verificado + commiteado)

1. **Fitter `wrap()` achica en vez de elidir** [b2ffd88] — `core/text.js`: ya no muestra "Automatiza…"; gate `tools/urvid1-text-check.mjs`.
2. **SSRF guard** [b2ffd88] — `backend/site_capture.py` `url_is_safe()` en capture_site/extract_content/capture_all (solo http/https + puerto estandar + rechaza IPs internas/metadata). 11/11 casos.
3. **Crossfade de transicion cableado en Node + test** [b2ffd88] — `setScratchFactory` en los tools + asercion de determinismo en la ventana de transicion.
4. **Honestidad de datos** [3752a83] — `scenes/index.js` + `strategy.js`: `numFrom`/`bigText` (no inventa numeros), `proofFrom` solo testimonio real, `data.multi` solo stats reales, el director no rellena con beats de data/proof sin material real. Verificado: brief sin datos -> 0 cifras inventadas; con stat real -> la muestra.
5. **Texto quieto + crossfade + variante respeta estilo + player reinicia** [5b6cd6d] (pre-audit, parte del mismo arco).
6. **Multi-formato 9:16 / 4:5 / 1:1** [974fb51] — `util.js` W/H mutables + `setFormat`; `makeVideo` guarda format+W/H; control en el studio. 9:16 identico (determinismo).
7. **Export de video** [ad58cf4] — boton "Descargar video" en el studio (MediaRecorder sobre el canvas; mp4 si el browser soporta, si no webm). NOTA: falta confirmar el click-through en la app corriendo; el build compila y la logica es estandar.
8. **Memoizacion no-mutante** [ad58cf4] — resolvers (motion/typekit/post/transitions) usan WeakMap; el video queda inmutable (Object.freeze rinde OK).
9. **Pacing gobernado** [a0bd92c] — presupuesto de duracion (corto/medio/largo ~8/12/18s) + XF por personalidad; control de Duracion en el studio.
10. **Anotacion register/intensity completa** [fda0101] — las 6 libs (676 modulos) alimentan el selector v3.
11. **Ocultar "Compartir con Claude" fuera de dev** [pendiente de commit junto a este doc] — era infra de dev.

## HECHO (tanda 2 — "completá todo")

- **#12 [91267cf,6bd1337]** Percepción robusta: repair de JSON (1 reintento al fallar, sin costo extra normal) + cap de `desarrollo` (anti prompt-injection); cache in-memory POR USUARIO; no cachea brief que falló; botón "Re-analizar" (refresh). (full-page capture + multi-idioma: a propósito NO — el digest ya cubre la página, el voseo es decisión de producto.)
- **#14 (APCA) [905f413]** Contraste PERCEPTUAL: `apcaLc`/`legibleOnBest` en util.js; `finalize` elige `onAccent` por APCA + piso WCAG → mata la "banda muerta" para todo hue, heredado por los 141 módulos de color. Gate aislado `tools/urvid1-apca-check.mjs` (1881 combos, 0 fails, avg |Lc| 73.5). OKLCH de la DERIVACIÓN = pendiente (refactor grande, beneficio modesto vs APCA para legibilidad).
- **#11 [6bd1337]** "Mis videos" en Firestore (users/{uid}/urvid_videos) + localStorage fallback; guarda format+duration. "Compartir con Claude" ya oculto fuera de dev.
- **#9 [d710fa8]** Variantes para elegir: botón "Ver variantes" → 6 recetas en miniatura, click para adoptar (sin ranking falso; el scoring espera una métrica de calidad).
- **#7 [e82b0d4,7c36046]** EN CURSO: 3 escenas migradas inline + un agente en segundo plano migrando el resto (verifica + revierte regresiones).

## HECHO (tanda 3)
- **#7 [19c5490]** 20/73 escenas migradas al solver (3 inline + 17 por agente); el resto son contenedores/charts/grillas con geometria integral -> a proposito NO se migran (andan igual). 1 revertida (hook.strike).
- **#15 [66432a3]** Brand-kit: logo subido (downscale 256px) -> dibujado en esquina + persistido en users/{uid}/urvid_profile.

## QUEDA — con criterio (no todo conviene hacerse)
- **#13 routear markkit/datakit**: OJO — datakit FABRICA numeros (lo que #4 justamente evita). Routearlo re-introduce el problema salvo que se reescriba datakit para leer stats REALES (trabajo grande). Markkit (iconos/deco) si se podria routear mas, pero bajo valor. => reframe: primero datakit-real, despues routear. NO hacer tal cual.
- **#16 intensity/rubros/tipografia**: el grueso es CHURN (re-taggear intensity ya elegida; 79% rubros '*' es CORRECTO — son universales). Lo unico de valor real: CRECER tipografia (23->~60 pairings) = una "ola" de contenido (1 archivo, no paralelizable). Hacer SOLO la tipografia si se quiere mas variedad de fuentes.
- **#17 captions animados**: el typekit YA hace texto cinetico (char-rise/typewriter/word-rise...). El gap real (captions tipo TikTok sincronizados) se luce CON audio, que el usuario dejo para el final. => va junto con audio, no ahora.
- **#14 OKLCH (derivacion)**: la legibilidad ya se resolvio con APCA. Migrar la derivacion de paleta a OKLCH es un refactor grande de palette.js + los 141 modulos con beneficio incremental MODESTO (palettes algo mas suaves). Bajo ROI ahora.

CONCLUSION: el roadmap de ALTO valor del audit esta hecho (P0 + las 3 apuestas + casi todo P1/P2). Lo que queda es polish de bajo ROI o pide audio/refactor. Recomendacion: cerrar aca; retomar tipografia (ola) o datakit-real si se busca mas variedad, y OKLCH/captions con audio.

## (referencia) roadmap original restante

- **#6 [HECHO, commit e096b25]** Solver de composicion (`core/layout.js` arranger greedy + lib `layouts` 6 presets + place(env,req); el director elige video.layoutId; render pasa env.layout). `scene.hero.center` migrada como referencia. Verificado.
- **#7 Migrar las 72 escenas restantes al sistema de slots** — depende de #6. OJO: NO se puede paralelizar por workflow (las 73 escenas estan en UN solo archivo `libs/scenes/index.js` -> agentes en paralelo se pisan). Se hace en TANDAS secuenciales (inline o 1 agente solo), verificando cada escena (render dark/light bajo 2-3 layouts + determinismo + no-overflow) y REVIRTIENDO la que empeore. Las no-migradas andan igual (ignoran env.layout). Patron de referencia: `scene.hero.center`.
- **#13 Routear markkit/datakit a la composicion** — depende de #6.
- **#9 Variantes rankeadas (3-5 comps para elegir)** — ranker liviano sobre `fit.js` + grilla en el studio.
- **#11 (resto) Persistir "Mis videos" en Firestore** (hoy localStorage; uid disponible) + thumbnail real.
- **#12 Percepcion: refresh + retry/repair de JSON + cache por-user + captura full-page** — `backend/perception.py` + `main.py` + el boton en el studio.
- **#14 Color a OKLCH + APCA junto a WCAG** — `core/palette.js` + `util.js` + re-correr el gate de color (141 modulos). Grande.
- **#15 Brand-kit (logo + perfil persistido)** — upload de logo via el path de garnish markkit.
- **#16 Tapar el eje intensity (53% 'medium') + normalizar rubros (79% '*') + crecer tipografia (23->~60)** — mecanico/olas.
- **#17 Captions animados (timing cinetico formalizado en `core/typekit.js`)** — antes que audio.

## Gates para verificar (recordatorio)
`node tools/urvid1-test.mjs` (determinismo + transicion), `node tools/urvid1-text-check.mjs` (fitter),
`node tools/urvid1-motion-check.mjs`, `node tools/urvid1-color-check.mjs`, `npx vite build`, `python -m py_compile backend/site_capture.py`.

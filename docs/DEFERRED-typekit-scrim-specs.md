# Specs vetadas (DIFERIDAS) -- typekit-all-display + scrim-bbox

> Disenadas + auditadas adversarialmente por workflow (greenlight: needs-mitigation). DIFERIDAS porque su valor es
> VISUAL (texto cinetico / legibilidad del scrim) y los gates de `npm run gates` NO lo miden -- las auditorias mismas
> piden inspeccion visual de movimiento y muestreo manual de contraste. Implementar en una sesion con preview/
> contact-sheet (node tools/urvid1-shot.mjs '{brief}'). Cada cambio DEBE pasar `npm run gates`.

---

## Enrutar TODO el texto display por el typekit (no solo ~6 de ~92 draws) (`typekit-all-display`)

- verdict: **needs-mitigation** - effort: M - greenlight: true

### Cambios propuestos

**src/urvid/libs/scenes/index.js** -- _Cabecera del modulo, justo despues de const _DTK = defaultTypekit() (linea ~19)_

```
Agregar dos helpers locales que centralizan el ruteo por typekit, replicando el patron de las 5 escenas que ya usan TK. CODIGO NUEVO:
// DISPLAY -> typekit. dWrap/dDraw enrutan el texto DISPLAY por env.typekit (mismo fitting/medicion que core: el
// typekit fitea con fitFont/wrap/clip y, con reveal>=1 o sin reveal, delega a drawWrapped/drawText IDENTICO).
// REGLA DURA: NO usar dentro de un ctx.scale/translate de entrada de la escena (el efecto se sumaria); ahi pasar
// SIN reveal (== core, sin efecto) o seguir con drawText. NO usar para body/parrafos (fonts.text) ni deco.
function dWrap(env, ctx, str, x, y, opts = {}) { return (env.typekit || _DTK).drawWrapped(ctx, str, x, y, opts) }
function dDraw(env, ctx, str, x, y, opts = {}) { return (env.typekit || _DTK).draw(ctx, str, x, y, opts) }
```

**src/urvid/libs/scenes/index.js** -- _scene.hero.center, tagline-NO; titulo brand esta dentro de ctx.scale(sc) (lineas 142-144) -> NO enrutar con reveal. Linea 143_

```
DEJAR como drawText (esta dentro de ctx.scale del wordmark). Opcional contrato: drawText(...) -> dDraw(env, ctx, content.brand||'Marca', 0,0, {... SIN reveal ...}). Recomendado: NO tocar (riesgo>beneficio, el brand ya tiene su spring).
```

**src/urvid/libs/scenes/index.js** -- _scene.statement.editorial, claim (linea 169). Esta dentro de ctx.globalAlpha+ctx.translate de slide-in (linea 168)_

```
El claim ya tiene slide-in por translate; enrutar SIN reveal para sumarlo al contrato sin doble-animar: drawWrapped(ctx, content.claim||content.tagline||'Un mensaje claro', c.cx, c.cy, {...}) -> dWrap(env, ctx, content.claim||content.tagline||'Un mensaje claro', c.cx, c.cy, {... mismas opts, sin reveal ...}). Alternativa de mayor vida (recomendada): MOVER el slide-in al typekit -> quitar el ctx.translate de la linea 168 y llamar dWrap(... reveal: inv(t,0.15,0.85) ...) usando el efecto line-slide. Solo si se valida visual; el cambio minimo es sin reveal.
```

**src/urvid/libs/scenes/index.js** -- _scene.hook.bignum, contexto subtitulo (linea 315) -> fonts.text, NO display. numero (308) dentro de scale -> NO_

```
NO enrutar (subtitulo es fonts.text/body; numero esta en ctx.scale).
```

**src/urvid/libs/scenes/index.js** -- _scene.hero.stacked, claim (linea 226). Dentro de ctx.translate rise (linea 225)_

```
Enrutar sin reveal (vida ya dada por el rise translate): drawWrapped(ctx, claimSrc, c.cx, c.cy, {...}) -> dWrap(env, ctx, claimSrc, c.cx, c.cy, {... mismas opts, sin reveal ...}). El kicker (222) es fonts.accent y va aparte (ver abajo).
```

**src/urvid/libs/scenes/index.js** -- _scene.statement.quoted, claim (linea 339). Dentro de ctx.translate (linea 338)_

```
dWrap(env, ctx, claimSrc, c.cx, c.cy, {... mismas opts, sin reveal ...}). (Patron identico a hero.stacked.)
```

**src/urvid/libs/scenes/index.js** -- _Patron de SITIOS PLANOS (sin transform de entrada) = aplicar dWrap/dDraw CON reveal. Ejemplos reales por linea_

```
Convertir estos drawWrapped/drawText de copy-display (NO numeros, NO dentro de scale) a dWrap/dDraw con reveal=inv(t, a, b) usando el inv del alpha que ya tienen: L816 (drawWrapped hook tagline) reveal:inv(t,0.0,0.7); L1070 claim editorial-izq reveal:inv(t, slideStart, slideEnd); L1124/1134 bad/good frase reveal:inv del propio inv; L1161 tagline display; L1188 claim; L1359 claim; L1550 claim; L1578 tagline; L1824 claim; L1850 claim; L2008 claim; L2061 tagline; L2380 brand(display); L2465(no, es fonts.text). REGLA por sitio: si el draw ya esta envuelto en ctx.translate/scale -> pasar SIN reveal; si es plano (solo globalAlpha) -> pasar reveal con el mismo inv que su alpha. Para cada uno: drawWrapped(ctx, STR, X, Y, OPTS) -> dWrap(env, ctx, STR, X, Y, { ...OPTS, reveal: inv(t, A, B) }).
```

**src/urvid/libs/scenes/index.js** -- _NO ENRUTAR (lista de exclusiones explicitas para no romper gates/QA)_

```
Dejar drawText/drawWrapped tal cual en: (1) todo lo con family: fonts.text o fonts.accent (body, captions, kickers, labels, footers); (2) numeros gigantes (num/idx/price) que ya viven dentro de ctx.scale spring (L308,488,517,573,604,691,798,997,1154,1306,1394,1428,1460,1486,1524,1583,1754,1798,2241,2363,2423,2462,2496,2518) -> char-pop sobre un scale spring se ve mal y no aporta; (3) signos deco ('?','“','”', inicial de avatar); (4) items de LISTA via fitUniform (L398,425,1220,1691,2183) -> el typekit por-glifo desincronizaria el tamano uniforme/QA listas parejas; (5) cualquier TK.* ya existente (L282,364,547,859,2320) -> ya estan, no duplicar.
```

**src/urvid/core/text.js** -- _SIN CAMBIOS_

```
No tocar. drawText/drawWrapped/wrap/fitFont/clip permanecen identicos. El ruteo no altera medicion porque el typekit reusa estas mismas funciones.
```

**src/urvid/core/typekit.js** -- _SIN CAMBIOS_

```
No tocar. defaultTypekit() ya delega a drawText/drawWrapped; resolveTypekit() ya memoiza. El contrato draw/drawWrapped(reveal) es el que se generaliza.
```

**src/urvid/core/render.js** -- _SIN CAMBIOS_

```
No tocar. paintScene ya pasa env.typekit a TODAS las escenas (linea 55). El typekit ya llega a cada escena; el gap era que las escenas no lo usaban, no el cableado.
```

### Mitigaciones de la auditoria (OBLIGATORIAS)

- [low] **Gate de medicion (text-check / prefit-check): falso miedo a overflow nuevo** -- npm run gates igual (verificacion, no mitigacion). Si se prende text/prefit, la causa NO es la medicion -> revisar si se enruto por error un num en scale o un item fitUniform.
- [low] **QA timing gate (A y B juntos en transicion)** -- Aceptable para greenlight (gate no se prende). Si se quiere mantener cobertura, enrutar SIN reveal en sitios de copy-display visibles en transicion, o anotar que la cobertura de B-en-transicion baja. No bloqueante.
- [med] **Clasificacion 'PLANO vs dentro-de-transform' del diseno (la unica regla de regresion visual)** -- Adoptar la sub-opcion PASO-1 del propio diseno: enrutar TODO el copy-display por dWrap/dDraw SIN reveal en ningun lado (== drawText, efecto cero, cumple el contrato 'todo pasa por el typekit', cero riesgo de gate Y cero riesgo visual). Encender reveal es PASO 2 separado, validado por inspeccion visual de tools/out (urvid1-shot/textstill), no por gates (los gates no ven mid-reveal).
- [low] **scene.hook.strike (L1124 bad / L1134 good) — la escena del incidente de 10 ellipsis del LESSON** -- Enrutar hook.strike SIN reveal (o dejarlo en drawWrapped). No encender char-pop/char-rise aca.
- [low] **Determinismo (urvid1-test) y APCA (urvid1-apca-check)** -- Ninguno. Verificacion trivial con npm run gates.

### Verificar

- npm run gates (los 5: urvid1-text-check, urvid1-prefit-check, urvid1-apca-check, urvid1-qa, urvid1-test) DESPUES de implementar — deben quedar todos verdes
- Confirmar que NINGUN draw enrutado quedo dentro de un ctx.scale spring de numero (lista de exclusiones L308/488/.../2518) ni en items fitUniform (L398/425/1220/1691/2183): son las dos causas mas probables de que se prenda text/qa
- Implementar PASO 1 (todo copy-display por dWrap/dDraw SIN reveal) y correr gates ANTES de encender cualquier reveal — desacopla riesgo-gate de riesgo-visual
- Para los sitios donde SI se encienda reveal: inspeccion visual de tools/out (urvid1-shot / urvid1-textstill) en hook.strike, statement.editorial/quoted, hero.stacked — los gates NO muestrean mid-reveal, asi que la doble-animacion solo se ve a ojo
- Verificar a ojo que el typekitId elegido por seedFor NO sea char-pop sobre los sitios 'planos' que comparten frame con un enter-pop fuerte (render.js L54), porque ahi el efecto se compone

---

## Scrim consciente del bbox real del texto (no franja central fija) (`scrim-bbox`)

- verdict: **needs-mitigation** - effort: M - greenlight: true

### Cambios propuestos

**src/urvid/core/layout.js** -- _arrange() -> return; nueva export blockBox(request, preset)_

```
arrange() ya produce out._block = {x:sideM, y, w:availW, h:blockH} (L45) que es el bbox EXACTO del stack de slots y depende solo de W/H+preset+KIND (sin measureText, deterministico). NUEVO: export function blockBox(layout, request){ const a = (layout&&layout.arrange?layout:defaultLayout()).arrange(request); return a._block } para obtener SOLO la caja sin pintar. Esto da el bbox barato y puro que el scrim necesita.
```

**src/urvid/core/assemble.js** -- _makeVideo, dentro del scenes.push de cada beat (aprox L266-268) y en el return (L272-287)_

```
Por cada escena empujada agregar sc.scrimBox = un bbox conservador del texto de esa escena, calculado deterministico SIN render: tomar el layout del video (resolveLayout sobre el objeto en construccion, o blockBox(defaultLayout()/layMod.make(), [{id:'t',kind:'title'}])) -> {x,y,w,h} en espacio logico W/H del formato. Guardarlo normalizado a fracciones (x/W,y/H,w/W,h/H) para que sea independiente del formato al re-pintar (setFormat puede cambiar W/H). Justificacion: las escenas NO declaran sus slots afuera de mod.render, asi que se usa el caso dominante (un 'title' que llena el area segura del layout elegido) -> el scrim cubre el peor caso de texto de esa escena = legibilidad garantizada, sin la suposicion fragil de medir cada slot.
```

**src/urvid/core/render.js** -- _drawFrame: (1) quitar el scrim de los fondos NO se toca aqui; (2) nueva capa scrim entre las capas atm y la escena. Insertar despues de L106 (anims) y antes del bloque de transicion L107+. Pasar scrimBox a paintScene/escena._

```
NUEVO helper drawScrim(ctx, box, pal): pinta un gradiente RADIAL/elIPTICO alineado al bbox (centro = box.cx,cy; clear-radius proporcional a box; strength tone-aware = light 0.22 / dark 0.42, los mismos numeros del helper scrim actual para preservar contraste). Determinar la escena activa (misma logica que actAnim L96 o el bloque act L143-145) y su box: const act = escena activa; const box = act && act.scrimBox ? denormalize(act.scrimBox, W, H) : centerFallback. En transicion, interpolar entre A.scrimBox y B.scrimBox por p (lerp de x/y/w/h) -> el scrim sigue al texto que entra. Llamar drawScrim ANTES de paintScene. IMPORTANTE: el scrim va SOBRE bg/sub/atm pero DEBAJO del contenido (texto siempre encima -> legible).
```

**src/urvid/libs/backgrounds/index.js** -- _helper scrim() L606-612 y sus 52 call-sites + vinetas radiales inline (L42-45, L128-130, L294-296, etc.)_

```
OPCION A (minima, recomendada para primera entrega): NO tocar los fondos; el nuevo scrim de render.js se SUMA encima. Riesgo: doble oscurecido en fondos que ya traen vineta -> podria pasarse de contraste/verse oscuro. OPCION B (correcta, mas trabajo): neutralizar el scrim interno de los fondos (que el helper scrim() y las vinetas centrales pasen a no-op o a una vineta de BORDE muy tenue solo-estetica) y dejar que la legibilidad la garantice la capa nueva bbox-aware. Recomiendo B por etapas: convertir scrim() en un no-op detras de un flag y migrar; o que scrim() lea env.scrimBox si se le pasa (pero los fondos no reciben la escena -> vuelve al problema). La via limpia es B: scrim de legibilidad SALE de backgrounds y pasa a ser responsabilidad de la capa de render.js.
```

**src/urvid/core/util.js** -- _sin cambios obligatorios_

```
inv/clamp/lerp/rgba/setFormat ya existen (L11-16,61) -> el scrim nuevo se arma con primitivas existentes. Sin dependencias nuevas.
```

### Mitigaciones de la auditoria (OBLIGATORIAS)

- [high] **APCA/contraste (premisa del diseno) + r-gastronomia/r-tech/r-salud/r-inmobiliaria** -- (1) Corregir la premisa: el contraste scrim+ink NO esta cubierto por ningun gate automatico -> agregar un check de render real (samplear pal.ink sobre el pixel resultante bg+scrim en el centro del bbox, dark+light, 6 layouts) ANTES de declarar 'legibilidad garantizada', o aceptar que es verificacion ocular. (2) No asumir strength uniforme: auditar los strengths reales por call-site (rg grep 'scrim(' -> 114 ocurrencias en 5 archivos) antes de Opcion B; al neutralizar el scrim de fondos hay que preservar el piso por-fondo, no un 0.22/0.42 global.
- [med] **Determinismo (urvid1-test) — alcance real del gate** -- Precomputar sc.scrimBox en makeVideo (build-time, ya determinista) y SOLO denormalizar+lerp en render.js (operaciones puras), tal como dice el diseno — pero NO confiar en urvid1-test para validar la mejora visual; ese gate no compara contra golden. La validacion de que el scrim sigue al texto es ocular (contact sheet) o un check nuevo.
- [med] **QA / transicion (NUNCA A y B juntos) — interpolacion de scrimBox** -- Alinear el scrim al MISMO esquema secuenciado del contenido: en p<0.5 usar A.scrimBox; en p>=0.5 usar B.scrimBox (o lerp solo dentro de cada media-ventana). No un lerp lineal A->B sobre toda la ventana. Asi el scrim sigue exactamente a la escena que se esta viendo. Verificar con npm run qa que no aparezca doble-oscurecido ni desfase.
- [low] **Fitting de texto (urvid1-text/prefit) — bbox conservador vs slots reales** -- Aceptar explicitamente que es 80/20 (sigue el ANCHOR del layout, no el bbox por-escena). NO intentar la version exacta por-slot en esta entrega (exigiria exportar mod.slots() en ~20 escenas -> alto riesgo en urvid1-text/qa, la LECCION del brief). Mantener intactos los slot-lists y el contrato de place().

### Verificar

- npm run gates (los 6: urvid1-test, text-check, apca-check, qa, prefit-check, vite build) verdes ANTES y DESPUES
- CONFIRMAR manualmente (ningun gate lo hace): contraste pal.ink sobre el pixel resultante bg+scrim en el centro del bbox, en dark Y light, para los layouts no-centrados (anchored.bottom, poster.top) — el caso que mas cambia respecto a la franja central H*0.46
- Inspeccionar el contact sheet de urvid1-test (tools/out/urvid1-demo.png) y el mp4: que el scrim siga al texto y NO haya doble-oscurecido (Opcion A suma sobre el scrim que ya traen los fondos)
- En la ventana de transicion: que NO se vea desfase scrim/texto — el scrim debe seguir el esquema SECUENCIADO de render.js (A en p<0.5, B en p>=0.5), no un lerp lineal continuo A->B
- Auditar los strengths reales por call-site antes de Opcion B (rg 'scrim\(' / 'g_scrim\(' en libs/backgrounds: 114 ocurrencias, 5 archivos, valores heterogeneos 0.16-0.42) — NO asumir 0.22/0.42 uniforme
- Confirmar que sc.scrimBox se precomputa en makeVideo (build-time) y en render.js solo se denormaliza+lerp (puro), sin recalcular layout por-frame ni mutar el objeto video (WeakMap _cache en layout.js)

---

## Cohesion del gradiente de fondo (`bg-cohesion`) — DIFERIDO / RECORTAR ALCANCE

- verdict: **needs-mitigation** — pero la auditoria lo objeto con **3 breakers de likelihood HIGH** -> NO se implemento.

La idea era canonizar el par de fondos en `core/palette.js finalize()` (bg0=claro, bg1=profundo, paso de luminancia FIJO, hue unico). La auditoria adversarial encontro:

1. **[high] Premisa parcialmente FALSA**: la "direccion inconsistente del gradiente" que el item asumia no existe en la data; el unico cambio real seria (a) paso de luminancia fijo y (b) hue unico. Si solo se buscaba "direccion", es un no-op.
2. **[high] Aplana 199 grades cinematograficos de doble-hue** (`grade.js`): forzar `out1 = hslToHex(s0.h, ...)` (hue de bg0) sobre bg1 mata el dual-hue deliberado (teal-orange, split-tone, etc.). Mitigacion seria preservar el hue de bg1 (`s1.h`) y normalizar solo luminancia — pero aun asi un paso FIJO override-ea la variedad intencional de profundidad de gradiente.
3. **[high] Cambia el color del 88% de los esquemas** (1647/1881): superficie gigante que **los gates NO pueden verificar** (determinismo/texto/APCA no miden si el gradiente "se ve mejor"); exige revision visual de contact-sheet de `named.js` (curadas) + grades dual-hue + opt-out para named/grade.

**Decision**: no shippear una transformacion de color a 88% de los esquemas basada en una premisa parcialmente falsa, que arriesga regresar 199 grades cinematograficos + esquemas curados, sin verificacion de gates. Si se retoma: alcance MINIMO = solo el paso de luminancia parejo en el path procedural `tonedBg` (NO named, NO grade), preservando `s1.h` de cada bg, con revision ocular de contact-sheet antes de merge.

---

## Optical sizing dinamico (`optical-sizing`) — NO-CODIGO (infeasible en canvas)

- verdict: **safe** pero **feasible: FALSE** -> sin cambio de codigo, solo nota.

`core/util.js fontStr()` emite SOLO el shorthand CSS `font` ('weight px family'); el spec de canvas IGNORA `font-variation-settings`/`opsz` (algunos motores tiran el set entero como invalido -> texto en fallback). El gate (`@napi-rs/canvas`/Skia) renderea TTFs estaticos instanciados sin eje opsz en runtime. Un opsz aplicado solo en el browser (DOM `font-optical-sizing:auto`) **divergeria** de `measureText` del gate -> rompe la garantia de fit (prefit verde, browser desborda) y el determinismo app-vs-render.

**Decision**: mantener `fontStr` como UNICA fuente de `ctx.font` (mismo corte estatico en ambos paths). El browser ya carga las variables con eje opsz para el DOM (landing CSS) via `index.html`; eso NO afecta el canvas del motor y esta bien asi. Si en el futuro se quisiera un corte display dedicado, habria que bajar la instancia (no el eje runtime) y re-correr TODO el gate con la fuente nueva en sync (`get-fonts.mjs` + `index.html`).

---

## Migrar el motor de color de HSL a OKLCH (`oklch-migration`) — DIFERIDO (all-or-nothing, gates no verifican)

- verdict: **needs-mitigation** — greenlight: **false** (fase 11, wbmaxg3p0).

OKLCH daria balance perceptual (el amarillo no quema, el azul no se apaga) para cualquier marca. PERO el audit lo evaluo como **cambio masivo todo-o-nada**:

1. **~40 esquemas hand-tuned en HSL-L** across 6 archivos (`libs/color/harmony.js, temp.js, tone.js, grade.js, named.js, index.js`) — cada `derive()` ajusta L (0.62-0.70 dark / 0.22-0.34 light) y clamps de S a mano. Migrar a OKLCH cambiaria TODAS las paletas.
2. **APCA NO verifica la mejora perceptual** — el gate solo chequea legibilidad (ink≥4.5, onAccent≥3) + determinismo; un cambio de color masivo pasa verde este o feo (la **lección bg-cohesion**: cambiar 88% de esquemas a ciegas = regresion visual que ningun gate caza). Requeriria re-vetar 100+ combos a ojo en contact-sheet.
3. **Sub-cambio seguro** (lo unico greenlight-able): migrar SOLO `clampGamut` a un soft-knee de CHROMA OKLCH (preserva L/h, mismo guard de onAccent → APCA garantizado). PERO: el chroma OKLCH es otra escala que S-HSL → CK/CMAX deben elegirse EMPIRICAMENTE del contact-sheet (no traducir 0.82/0.92); y el valor es **marginal** (el clampGamut HSL ya doma el neon bien — verificado e2e en Ramp #c8f000 / Mailchimp #ffe01b). No vale el tuning + verify-visual.

**Decision**: NO migrar (ni el full ni el sub-cambio clampGamut-OKLCH). El sistema de color HSL actual + clampGamut + brandAccent + achromatic-fix ya da resultados sobrios y APCA-seguros en marcas reales (validado e2e en ~30 paginas). Retomar OKLCH solo en una sesion dedicada con revision visual sistematica de los ~40 esquemas. (Nota: la migracion tocaria `core/util.js` srgb↔oklch + los 6 archivos `libs/color/`, NO "~100 modulos" — ese conteo del plan era stale.)

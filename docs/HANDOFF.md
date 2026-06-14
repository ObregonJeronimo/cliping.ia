# HANDOFF — Motor de video Urvid (cliping.ia): 12 estilos + fondos contextuales

> Brief autocontenido para retomar el trabajo en un chat nuevo sin perder hilo. Continuá el LOOP de
> test+corrección con el visor de frames (abajo). Honestidad total: distinguir "compila" vs "renderiza"
> vs "se ve lindo". Determinismo SIEMPRE (bg-check 16/16).

## Quién sos / convenciones
- Repo `ObregonJeronimo/cliping.ia` en `C:/Users/Usuario/Documents/cliping.ia`. Rama `main`.
- Commits: ASCII puro, imperativo corto. `git fetch origin && git rebase origin/main` antes de pushear.
  Nunca push forzado. Trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Nunca commitear tokens.
- Usuario: Jerónimo (rioplatense/voseo). Cálido, pide loop continuo de mejora + que yo mismo testee y corrija.

## Qué es
Genera reels verticales 9:16 de marketing a partir de un URL + descripción, con MOTION GRAPHICS
DETERMINISTAS en Canvas 2D. NO usa IA generativa de video ni de imagen. Determinista de verdad:
nada de `Math.random()`/`Date.now()` (rompen el render paralelo de Remotion) -> PRNG sembrado
(`mulberry32`) o `random(seed)`. NO tocar la landing (es de Thiago).

## Arquitectura — HAY DOS sistemas de video (clave)
1. **Animaciones** (DONDE VIVE TODO EL TRABAJO DE ESTILOS):
   - Motor: `src/pages/Animaciones/engineCore.js` — Canvas 2D puro, `drawFrame(ctx, t, timeline)` en
     espacio lógico 405x720. Mismo núcleo que el preview en vivo y el render Remotion (TimelineVideo).
   - Director producción (LLM): `backend/timeline_director.py`. Endpoint: `/api/timeline/generate`.
   - UI usuario: `src/pages/Animaciones/TimelineStudio.jsx` (ya tiene el selector de estilos).
   - Director MOCK (impersona al LLM, offline, $0): `backend/mock_director.py` -> es lo que renderizo para testear.
2. **Cinematicas** (OTRO renderer, NO tiene el sistema de estilos):
   - `backend/template_director.py` (escenas tipo LogoReveal/CtaOutro/MockupShowcase). Endpoint
     `/api/video/generate`. UI `src/pages/Cinematicas/VideoStudio.jsx`.
   - DECISIÓN PENDIENTE del usuario: ¿el producto va por Animaciones (12 estilos listos) o se portan los
     estilos a Cinematicas? (recomendación: Animaciones, ya está hecho).

## Catálogo de estilos — `backend/style_catalog.py` (FUENTE ÚNICA DE VERDAD)
12 estilos elegibles, ordenados seguro->audaz:
`blueprint, swiss, platinum, obsidian, meshflow, aurora, handmade, typographic, riso, retro70s, brutalist, sport`.
Cada estilo = dirección de arte completa: `{bg, light_p, shadow(soft/hard), tex, comps, stmt, list, grid_p,
outro, rhythm, structs}`. Helpers: `recommend_style(rubro, rnd)`, `style_fields(styleId, tone)` (campos de
timeline que el motor lee), `catalog_for_ui()` (lista para el selector).
- ORTOGONAL: el ESTILO da el tratamiento; el RUBRO da color (style_engine) + el MOTIVO del fondo.
- `mock_director.py` RE-IMPORTA este catálogo (`from style_catalog import STYLE_PRESETS, STYLE_ORDER,
  RUBRO_STYLE_BIAS`) para no desincronizarse. **Cambiá los estilos SÓLO en style_catalog.py.**

## Campos de timeline que lee el motor (nivel video)
- `bgStyle`: mesh|field|spotlight|bands|aurora|blueprint|brutalist|sunburst|speedlines|halftone (cada uno = `_bg*()` en engineCore).
- `tone`: dark|light (INK/DIM se invierten; `_accentInk()` = acento legible según tono).
- `shadowMode`: soft (glow) | hard (sombra sólida desplazada = brutalist; el switch `shadowBlur 0`).
- `texture`: grain|grain2|grid|lines|none. `bgEnergy`: velocidad del fondo.
- `motif`: el rubro -> `_drawMotif()` dibuja escena vectorial tenue CONTEXTUAL: inmobiliaria=skyline,
  finanzas/tech/educacion=sparkline, fitness=heartbeat(persistente+blip), gastronomia=vapor,
  belleza/salud=botánico, moda=líneas. Color con CONTRASTE (`_accentInk`), no mismo-hue.
- Watermark de contenido = INICIAL de la marca (monograma tenue), NO figura geométrica.
- Composiciones de hero TYPE-LED (la tipografía lidera; NO hay `emblem`): typeStack/typeOnly/typeTop/
  typeLower/typeSlam (nombre gigante + acento mínimo)/cornerAnchor (acento chico)/sideLeft/diagonal/
  shapeBehind (forma ORGÁNICA tenue, sólo aurora). Anclaje vertical varía por estilo.
- Statements: centered/left/quote/panel/editorial (titular grande + última palabra en acento + reveal por máscara).
- End-cards (outro): center/left/bar/bigtype/diagonal/ctaOnly (varían por estilo; coherencia espacial: hero izq -> cierre izq).

## CÓMO TESTEAR (el loop, sin gastar API de Claude) — VISOR DE FRAMES
Desde `C:/Users/Usuario/Documents/cliping.ia`:
```
python backend/mock_director.py --out tools/brands   # 12 marcas de prueba (showcase: 1 estilo c/u). Imprime estilo/comp.
node tools/bg-check.mjs                               # DETERMINISMO -> debe dar "16 pass, 0 fail" SIEMPRE
node tools/render.mjs gallery tools/brands            # galeria de los 12 -> tools/out/brands-gallery.png
for f in tools/brands/*.json; do b=$(basename "$f" .json); node tools/render.mjs video "$f" "brand-$b"; done  # tiras de 12 frames
node tools/render.mjs window tools/brands/05-forja.json w 2 5   # VENTANA DENSA (12 frames en t=2..5) para motion fino
npx vite build                                        # confirma que engineCore compila
```
**Abrí los PNG de `tools/out/` con la tool Read** (así "veo" los frames). Cuantos más frames/ventanas mires,
más fino corregís. Loop: render -> mirar -> corregir -> bg-check -> commit. Marcas: Verdo(gastro) Nimbus(tech)
Sonrisa(salud) Trama(moda) Altos del Sur(inmob) Forja(fitness) Aula Viva(educacion) Capitalia(finanzas)
Aura(belleza) Vibra(default) DataFlow(tech) Raiz(default).

## Arco de calidad (paneles de agentes "director de marketing 2026", honestos)
Motor base 5.5 -> 7.0 -> 7.8 -> 8.2/10 "profesional/no-plantilla". Luego (pedido del usuario): fondos
contextuales por rubro + 12 estilos elegibles + todo type-led. El director marcó: "la variedad real viene
de la COMPOSICIÓN, no del color" y "el fondo debe HABLAR del rubro" -> ambos atacados.

## PENDIENTES / cómo seguir
1. **Seguir el loop de test+corrección** (lo que vengo haciendo): ventanas densas por estilo, mirar frames,
   corregir legibilidad/contraste/motion/transiciones/motivos, commit por fix, bg-check 16/16.
2. **Mismatches del SHOWCASE** (NO bugs de producción): el banco fuerza 1 estilo por marca para mostrar los
   12 -> combos raros (heartbeat rojo sobre aurora roja, blueprint sobre comida). En producción se recomienda
   estilo por rubro y se evita. Opción pendiente: cambiar mock `__main__` para usar estilos recomendados
   (galería realista) en vez del ciclo forzado.
3. **Producción**: `/api/timeline/generate` acepta `styleId` -> `dna['styleId']` -> timeline_director aplica
   el estilo vía style_catalog + setea `motif`. Selector en TimelineStudio.jsx ("Estilo": 12 + Auto). FALTA
   verificar el render REAL en la app viva (LLM + URL) — paso del usuario (skill `run-autoleads`). Riesgo no
   verificado offline: tono claro en escenas que compone el LLM.
4. **Decisión arquitectura** (usuario): producto por Animaciones vs portar estilos a Cinematicas.
5. **Mejora profunda futura**: composición por estilo también en escenas de CONTENIDO (no solo hero);
   más variedad/cobertura de motivos contextuales.

## Commits recientes (orden)
e4b9d0d catálogo compartido + producción · 24d8dbb selector UI end-to-end · a4a4028 sport/retro/dedupe ·
7ef26c9 sin emblem (todo type-led) · b5de66f motivos legibles + heartbeat persistente. (Y antes, todo el
arco del motor: estilos de fondo, tono claro/oscuro, typeSlam, end-cards, etc.)

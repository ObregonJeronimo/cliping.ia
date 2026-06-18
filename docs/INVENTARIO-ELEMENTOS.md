# 🧩 INVENTARIO DE ELEMENTOS — todo lo que el motor puede usar en un video

> Catalogo COMPLETO (leido de engineCore.js, no de memoria) de cada pieza disponible, por categoria.
> Sirve para PROBAR UNA POR UNA y corregir bugs de cada elemento. Marcar el estado al testear:
> ✅ ok · ⚠️ bug menor · ❌ bug · 🔎 a revisar en vivo (motion). Metodo de prueba: docs/ANALISIS-VIDEO.md.

## CAT 1 — Tipos de TEXTO (roles)
Cada rol se dibuja distinto (tamano, peso, color, posicion). Probar legibilidad + que NUNCA desborde (clip/fitWrap ya puesto).
- **Titulo / display** (hero wordmark, statement, reveal) — el mas grande
- **Subtitulo / bajada** (bajo el titulo/hero)
- **Kicker / eyebrow** (etiqueta chica arriba, mayusculas, acento)
- **CTA** (call-to-action del outro/split; texto + chevron, sin caja)
- **Wordmark de marca** (nombre, outro/hero, con gradiente de acento)
- **Numero grande** (bigStat / numberStack, con conteo animado)
- **Label de dato** (frase bajo el numero)
- **Item de lista** (checklist)
- **Cita / quote** (cuerpo del testimonio, entre comillas)
- **Autor** (— Nombre, bajo la cita)

## CAT 2 — Tratamientos de texto (como entra/se dibuja)
- **kinetic** (entrada con scale+fade+overshoot)
- **draw-on** (clip-wipe letra por letra, ~40% display)
- **weight-wave** (el peso ondula al entrar, ~40%)
- **tracking-open / line-settle** (nace ancho y cierra el espaciado, ~45%)
- **fit / clip / fitWrap** (auto-ajuste de tamano + ellipsis + wrap a 2 lineas)
- **gradiente de acento** (wordmark/numero)
- **halo / sombra tone-aware** (contraste sobre fondos ocupados)

## CAT 3 — Tipos de ESCENA (+ variantes)
- **hero / scene** — comps: emblem · sideLeft · typeHero · shapeBehind · topAnchor · cornerAnchor · diagonal · typeSlam · typeStack · typeOnly · typeTop · typeLower (12) · heroResource: photo · type · morph · particles (4)
- **statement** — estilos: centered · left · quote · panel · editorial (5)
- **checklist** — layouts: rows · grid · chips (3) · markers: check · dash · number · bar (4) · anchor: left · center
- **reveal** — gancho corto + kicker + (kinetic strip / marquesina opcional) · align L/C/R
- **numberStack** — orientacion: columna · heroRow (item focal) · 2-3 datos
- **quote** — cita + estrellas (rating) + autor · align
- **split** — foto a un lado + titulo/sub/cta · side L/R
- **bigStat** — layouts: bar · ring (solo %) · plain (3) · kicker + label
- **outro** — comps: center · left · bar · bigtype · diagonal · ctaOnly (6) · wordmark + cta + accentBar
- (legacy, fuera de uso: paintTitle · deliver)

## CAT 4 — Elementos GRAFICOS
- **Formas / morph** (15): circle · ring · square · diamond · triangle · pentagon · hexagon · star · plus · heart · leaf · drop · flower · shield · blob
- **Particulas** (nube que ensambla la marca / burst)
- **Orbita** (satelites que giran el centro)
- **Estrellas** (rating vectorial, _drawStarRow)
- **Barras / reglas de acento** · **subrayados** · **chevron** (›)
- **Iconos** (_drawIcon: box, check, dot, leaf, star, house, etc.) · **svgicon**

## CAT 5 — FONDOS (bg systems, ~18)
field · spotlight · bands · aurora · blueprint · brutalist · sunburst · speedlines · halftone · flowfield · fluid · morphfield · mesh · broadcast · cyber · hud · y2k · (typo/paper/editorial/corporate/organic = variantes que en oscuro caen a field)

## CAT 6 — SUSTRATOS / texturas (sobre el lienzo, 6)
none · scanlines · contour · dotgrid · crosshatch · editorialgrid

## CAT 7 — MOTIVOS contextuales (por rubro, 10)
inmobiliaria (skyline) · finanzas (sparkline) · tech (circuito) · educacion · gastronomia (plato/vapor) · fitness (pulso/EKG) · belleza · salud · moda · default

## CAT 8 — TRANSICIONES (entre escenas, 8)
wipe · curtain · flash · blinds · glyphwipe · pushband · colgrid (split-flap) · rgbsplit (aberracion cromatica)

## CAT 9 — FOTOS (cuando el sitio aporta imagenes)
cover-fit + clip · Ken Burns (zoom/pan sembrado) · duotono al acento · scrim de legibilidad · modos: a sangre (hero) · banda · split
- Deuda conocida: defensa contra imagenes feas (screenshot de la home) — gate de calidad + scrim garantizado (pendiente).

---

## PLAN DE PRUEBA (una por una)
Por cada categoria: armar fixture(s) que AISLEN cada miembro (copy NORMAL, no largo — el desborde ya se cubre con la
torture-fixture), renderizar a sheet/galeria, revisar miembro por miembro, anotar bug, arreglar la CLASE, re-render para
confirmar. Orden sugerido: CAT 3 escenas (contienen los roles de CAT 1-2) → CAT 4 graficos → CAT 5 fondos → CAT 6 sustratos
→ CAT 7 motivos → CAT 8 transiciones (motion, vivo) → CAT 9 fotos. Estado de cada item se tilda arriba.

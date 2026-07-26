# ELEMENTOS REALES — el video se hace con los objetos de la página

## Por qué existe

El motor Director sabía componer, animar y encadenar escenas, pero **lo que animaba salía de un
catálogo propio**: 16 figuras dibujadas (un escudo, una ventana, una tarjeta, una taza) teñidas con la
paleta medida de la página. El resultado era prolijo y genérico — dos marcas del mismo rubro daban
videos que se parecían entre sí más de lo que cada uno se parecía a *su* página.

Con este subsistema, los objetos que entran y salen del cuadro son **el logo real, la tarjeta real y
el botón real** del sitio. El motor no cambió: una capa no distingue entre un escudo dibujado y un PNG
recortado de la página.

## Por qué por DOM y no por visión

Segmentar un screenshot con un modelo cuesta plata por video y se equivoca en los bordes. El navegador
ya sabe dónde empieza y termina cada objeto — es el layout que él mismo calculó. Playwright recorta el
nodo, hace scroll solo y sale exacto, a **$0**.

**No se vectoriza.** Un PNG recortado ya cubre trasladar, escalar, rotar, revelar y hacer match-cut,
que es todo lo que la timeline sabe animar. Vectorizar solo agregaría deformación de trazo, que ningún
gesto del motor usa hoy.

## El camino completo

```
site_capture.capture_all()          misma sesión de Chromium, después del screenshot y ANTES del peek
  └─ element_extract.extraer_elementos(page)
       ├─ pase 1 (JS en la página)  elige candidatos por ROL: logo, cta, tarjeta, hero, foto
       ├─ pase 2 (por elemento)     apaga fondos de ancestros + oculta fixed/sticky -> recorta
       └─ pase 3 (PIL)              recorta márgenes, mide tinta/textura/color, deduplica
  └─ element_extract.publicar_elementos()   guarda en disco + sube (best-effort)
pagemodel.build_pagemodel()         -> assets.elementos[]  (espejo en schema.js)
composer.composeStoryboard()        el objeto dibujado CEDE al objeto real
render/draw.js::capaElemento        proporción propia, sin clip, sombra opcional
```

`elementos=False` en `capture_all` lo saltea: son ~10 screenshots extra por captura.

## Reglas que el subsistema garantiza

| Regla | Por qué |
|---|---|
| **Se ve o no se usa** | Un recorte trae los colores de *su* página; el look del video no es la página. Un logo negro sobre el fondo oscuro que eligió el look simplemente no está. Umbral 2.2 y no 4.5: esto no es texto que haya que leer, es una forma que hay que distinguir. |
| **No se deforma** | La caja del compositor es un *espacio disponible*, no un destino. El objeto entra completo, centrado, con su proporción. Estirar el logo de una marca es el defecto que su dueño ve antes que ninguno. |
| **Una pieza ancha sangra** | Una página se diseña apaisada: una tarjeta de 1216×340 dentro de los márgenes de un 9:16 mide el 13% del alto — una estampilla. De borde a borde se lee como una banda. |
| **Sin imagen no se dibuja nada** | Un placeholder gris con forma de logo es peor que la ausencia. Se reporta en `rep.faltantes` y el estudio espera ese reporte antes de exportar. |
| **Aditivo** | Una página que bloquea al bot, o una captura sin credenciales de hosting, no dan recortes — y el motor compone exactamente como antes. Lo verifica el gate en cada corrida. |

## Los defectos que solo aparecieron mirando los recortes

Ninguno se ve leyendo código. Todos salieron de la hoja de contacto sobre damero
(`tools/elementos-sheet.mjs`), que muestra dónde hay alfa 0 de verdad.

1. **`clip` por coordenadas fallaba en todo lo que estaba debajo del fold.** Se pasa a recorte por
   locator, que hace scroll solo.
2. **Transparencia falsa.** `omit_background` vuelve transparente el fondo *por defecto*, pero
   cualquier ancestro que pinte color entra igual en el recorte.
3. **El hero se comía a los botones.** El hero suele ser un div gigante que *contiene* al CTA; al
   elegirse primero bloqueaba a sus hijos y la página devolvía el hero sin sus dos botones
   principales. El orden ahora va de lo específico a lo general y el hero no bloquea.
4. **Un botón sin fondo propio recortaba lo que había detrás.** El hermano que pinta el fondo no es
   ancestro, así que apagar ancestros no lo saca.
5. **Duplicados.** Una página devolvía *seis copias idénticas* de la misma imagen de carrusel.
6. **30 segundos de timeout por elemento fantasma.** Una SPA vuelve a renderizar entre que se marcan
   los candidatos y se los fotografía, y el locator esperaba un nodo que ya no existía.
7. **El botón de cookies ganaba como CTA.** Es grande, pintado y está arriba de todo. Un video que
   abre con "Aceptar cookies" es un chiste.

### Dos señales para los duplicados, no una

Filtrar por huella perceptual sola se llevaba puestas **cuatro de las seis tarjetas buenas** de una
página: una grilla de features son seis tarjetas blancas con un ícono arriba y dos renglones, y a 8×8
son indistinguibles aunque digan cosas distintas. Por texto solo tampoco: dos banners de un carrusel
no tienen texto en el DOM. **Es duplicado si se parece *y además* dice lo mismo.**

### Una métrica que mentía

`detalle` prometía detectar el objeto que no sobrevive a la escala de un reel — un muro de testimonios
en letra de 10px. No lo hacía: una foto aérea daba 0.14 y una captura de dashboard llena de texto
diminuto daba 0.05, porque la UI es casi toda panel liso. Ordenar por ese número hundía las fotos
buenas y premiaba justo lo ilegible. Ahora se llama **`textura`**, que es lo que mide de verdad
(superficie fotográfica vs gráfico plano), y la legibilidad la da **`minPx`** — el texto más chico que
el elemento trae adentro, medido en el navegador, exacto. Para un `<img>` no se puede saber y no se
finge que sí.

## Gate

`tools/director-elementos-check.mjs` — 7 páginas reales × 3 seeds, con los recortes **en disco** (los
gates de este repo corren sin red: un gate que dependa del hosting falla el día que se cae el hosting,
que no es el día en que el motor se rompió).

`E-ELEM-DEFORMA` · `E-ELEM-OOB` · `E-ELEM-INVISIBLE` · `E-ELEM-FALTA` · `E-EMPTY-FRAME` · `E-DET` ·
aditividad.

### Dos veces que el gate estuvo mal antes que el motor

- **Midiendo píxeles acusaba deformación del 16% en objetos perfectos.** Un logo de 16px de alto tiene
  más error de redondeo que la tolerancia, y el antialias del borde entra o no según el umbral de alfa
  que uno elija. Ahora el renderer **declara** el rectángulo que pintó (`rep.elementos`) y el gate
  audita eso; los píxeles se siguen mirando, pero para lo que sí saben responder.
- **La comprobación de faltantes estaba vacía.** Miraba un solo instante — la mitad del video — donde
  casi nunca hay una capa de elemento viva: la aserción era `0 >= 0`. Se descubrió borrando a propósito
  el reporte del renderer para ver si el gate lo cazaba; seguía en verde. Ahora mide en cinco
  instantes y **falla si no llegó a auditar ni un elemento vivo**, para que no pueda volver a vaciarse
  en silencio.

## Herramientas

```bash
python backend/cosecha_elementos.py              # recorta las 8 páginas de referencia
node tools/elementos-sheet.mjs stripe-com        # hoja de contacto de los RECORTES (damero)
node tools/director-fixture-elementos.mjs        # arma los fixtures con elementos
node tools/director-elementos-shot.mjs           # hoja de contacto de los VIDEOS
```

Los gates prueban que el objeto no se deforma, que entra en su caja y que contrasta contra el fondo.
Ninguna de las tres cosas dice si el video **se ve como la marca**, que es el único motivo por el que
el extractor existe. Para eso hay que mirarlo.

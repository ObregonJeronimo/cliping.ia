# Director · reporte de calidad

Generado por `node tools/director-loop.mjs`. NO es un gate: mide DISTRIBUCIONES.
Los gates contestan si un video esta roto; esto contesta si los videos se parecen entre si,
que es el problema que un motor generativo tiene despues de dejar de estar roto.
Esta commiteado a proposito: `git diff` sobre este archivo muestra que le hizo un cambio del
motor a la variedad de la salida.

**Matriz**: 19 paginas x 15 seeds = **285 videos** / 1277 escenas.
**Contrato**: 0 storyboards o timelines invalidos.

## Montaje
- recetas de corte: morph-punto 216 (22%) · gather 211 (21%) · dip-solapado 179 (18%) · flash-cut 102 (10%) · mask-swap 99 (10%) · stagger-pop 90 (9%) · impact 48 (5%) · trace 35 (4%) · push-reveal 5 (1%) · zoom-out-card 4 (0%) · carry 3 (0%)
- corte de CIERRE: gather 211 (74%) · dip-solapado 34 (12%) · flash-cut 21 (7%) · morph-punto 19 (7%)
- recetas que NUNCA salen: **crossfade-parallax**

## Guion
- gramaticas: clasica 100 (35%) · producto-primero 64 (22%) · dato-primero 31 (11%) · rafaga-primero 29 (10%) · editorial 27 (9%) · social-primero 19 (7%) · oferta-primero 8 (3%) · howto-primero 7 (2%)
- escenas del catalogo en uso: 15/15
- escenas que NUNCA salen: ninguna
- duracion: mediana 12.1s (min 8.3 · max 16.9)
- escenas por video: mediana 5 (min 3 · max 6)

## Direccion de arte
- placas: tinta 76 (27%) · noir 76 (27%) · carbon 49 (17%) · crema 48 (17%) · papel 36 (13%)
- placas que NUNCA salen: ninguna
- tipografia display: Archivo 57 (20%) · Sora 40 (14%) · Space Grotesk 35 (12%) · Familjen Grotesk 27 (9%) · Bricolage Grotesque 26 (9%) · Anton 24 (8%) · Unbounded 22 (8%) · Big Shoulders Display 21 (7%) · Oswald 18 (6%) · Noto Sans JP 15 (5%)
- objetos heroe: shield 149 (17%) · chart 140 (16%) · card 126 (15%) · window 103 (12%) · capsule 91 (11%) · ticket 77 (9%) · book 56 (7%) · tag 30 (4%) · cup 29 (3%) · bag 28 (3%) · house 10 (1%) · bottle 9 (1%) · plate 7 (1%)

## Composicion
- eje del foco: center 866 (68%) · left 411 (32%)
- videos con TODAS las escenas centradas: **50/285 (18%)** — "todo centrado siempre" es el delator numero uno de pieza hecha por una maquina
- tinta del PEOR cuadro de cada video: mediana 2.3% (min 0.79%)

## Anti-huella por pagina
Cuantas variantes distintas produce CADA pagina al mover el seed. Si una pagina da siempre la
misma estructura o la misma placa, sus videos se van a parecer entre si aunque cada uno pase.

| pagina | estructuras | escenas disponibles | placas | tipografias |
|---|---|---|---|---|
| saas | 13/15 | 11/15 | 3 | 7 |
| resto | 8/15 | 8/15 | 5 | 8 |
| tienda | 7/15 | 8/15 | 5 | 7 |
| evento | 5/15 | 7/15 | 5 | 6 |
| educacion | 11/15 | 9/15 | 5 | 7 |
| pobre | 2/15 | 4/15 | 5 | 8 |
| fix:404 | 2/15 | 4/15 | 5 | 6 |
| fix:awwwards-com | 11/15 | 9/15 | 5 | 6 |
| fix:basecamp-com | 13/15 | 10/15 | 4 | 9 |
| fix:botwall | 2/15 | 4/15 | 5 | 7 |
| fix:cliping-ia-vercel-app | 12/15 | 10/15 | 5 | 6 |
| fix:ghost-org | 13/15 | 10/15 | 5 | 7 |
| fix:linear-app | 9/15 | 8/15 | 4 | 7 |
| fix:mercadolibre-com-ar | 12/15 | 10/15 | 5 | 7 |
| fix:no-latina | 9/15 | 8/15 | 5 | 1 |
| fix:spa-sin-html | 4/15 | 5/15 | 5 | 6 |
| fix:stripe-com | 12/15 | 9/15 | 5 | 6 |
| fix:tailwindcss-com | 10/15 | 7/15 | 4 | 8 |
| fix:vacia | 2/15 | 4/15 | 4 | 7 |

**Ninguna pagina monotona.**

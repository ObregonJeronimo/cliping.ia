# Director · reporte de calidad

Generado por `node tools/director-loop.mjs`. NO es un gate: mide DISTRIBUCIONES.
Los gates contestan si un video esta roto; esto contesta si los videos se parecen entre si,
que es el problema que un motor generativo tiene despues de dejar de estar roto.
Esta commiteado a proposito: `git diff` sobre este archivo muestra que le hizo un cambio del
motor a la variedad de la salida.

**Matriz**: 11 paginas x 15 seeds = **165 videos** / 684 escenas.
**Contrato**: 0 storyboards o timelines invalidos.

## Montaje
- recetas de corte: gather 132 (25%) · morph-punto 123 (24%) · dip-solapado 91 (18%) · mask-swap 45 (9%) · stagger-pop 37 (7%) · flash-cut 35 (7%) · impact 26 (5%) · trace 23 (4%) · push-reveal 3 (1%) · zoom-out-card 2 (0%) · carry 2 (0%)
- corte de CIERRE: gather 132 (80%) · dip-solapado 18 (11%) · flash-cut 8 (5%) · morph-punto 7 (4%)
- recetas que NUNCA salen: **crossfade-parallax**

## Guion
- gramaticas: clasica 69 (42%) · producto-primero 38 (23%) · editorial 19 (12%) · dato-primero 14 (8%) · rafaga-primero 11 (7%) · social-primero 6 (4%) · howto-primero 5 (3%) · oferta-primero 3 (2%)
- escenas del catalogo en uso: 15/15
- escenas que NUNCA salen: ninguna
- duracion: mediana 11.2s (min 8.3 · max 16.7)
- escenas por video: mediana 4 (min 3 · max 6)

## Direccion de arte
- placas: tinta 50 (30%) · carbon 34 (21%) · noir 33 (20%) · papel 27 (16%) · crema 21 (13%)
- placas que NUNCA salen: ninguna
- tipografia display: Sora 48 (29%) · Space Grotesk 36 (22%) · Familjen Grotesk 34 (21%) · Archivo 32 (19%) · Noto Sans JP 15 (9%)
- objetos heroe: shield 86 (17%) · ticket 77 (16%) · chart 68 (14%) · window 61 (12%) · book 56 (11%) · tag 30 (6%) · cup 29 (6%) · bag 28 (6%) · card 26 (5%) · capsule 18 (4%) · bottle 9 (2%) · plate 7 (1%)

## Composicion
- eje del foco: center 486 (71%) · left 198 (29%)
- videos con TODAS las escenas centradas: **42/165 (25%)** — "todo centrado siempre" es el delator numero uno de pieza hecha por una maquina
- tinta del PEOR cuadro de cada video: mediana 1.9% (min 0.70%)

## Anti-huella por pagina
Cuantas variantes distintas produce CADA pagina al mover el seed. Si una pagina da siempre la
misma estructura o la misma placa, sus videos se van a parecer entre si aunque cada uno pase.

| pagina | estructuras | escenas disponibles | placas | tipografias |
|---|---|---|---|---|
| saas | 13/15 | 11/15 | 3 | 4 |
| resto | 8/15 | 8/15 | 5 | 4 |
| tienda | 7/15 | 8/15 | 5 | 4 |
| evento | 5/15 | 7/15 | 5 | 4 |
| educacion | 11/15 | 9/15 | 5 | 4 |
| pobre | 2/15 | 4/15 | 5 | 4 |
| fix:404 | 2/15 | 4/15 | 5 | 4 |
| fix:botwall | 2/15 | 4/15 | 5 | 3 |
| fix:no-latina | 9/15 | 8/15 | 5 | 1 |
| fix:spa-sin-html | 4/15 | 5/15 | 5 | 4 |
| fix:vacia | 2/15 | 4/15 | 4 | 4 |

**Ninguna pagina monotona.**

# PIEZA-K — dónde quedó y cómo se sigue

Recreación de un aviso SaaS de 33 s contra una referencia medida. El guion completo de 28 tiempos está
en [PIEZA-K-GUION.md](PIEZA-K-GUION.md); esto es el estado de la construcción.

## Qué está hecho

| | |
|---|---|
| **55 recursos PNG** | `tools/ae/recursos-k/*.mjs` → `C:/ae-probe/recursos-k/`. Seis módulos, deterministas (dos corridas = mismo hash). Teléfono, ventana de app, tarjetas, carpeta, barra, confeti, chispa, logo, fondo en capas. |
| **La cadena verificada** | `sondas/cadena-k.jsx` + `mascara-check` → **0,000%** de diferencia AE vs motor, en 3D, 2D, girado, cámara adentro, fuera de foco y en movimiento. |
| **Acto I** (0-300) | suelo en capas con paralaje y grano que cicla · tipografía con **relevo de foco** funcionando |
| **Acto II** (208-330) | **el túnel de seis teléfonos** con la cámara adentro, anillo cerrado |

**37 capas de las ~120 previstas. El documento exporta completo: nada queda afuera.**

## Compuertas ahora

```
marco     OK
colision  1 choque   (aparecio al mover el decorado; ver abajo)
foco      2 capas
escena    4 capas
lectura   6 imagenes estiradas
```

## Lo que falta construir

Los tiempos 330-990 del guion: barra de progreso 95→100, confeti y tilde, tarjetas de video, la
ventana de la app revelándose, las tarjetas que se abren hacia las esquinas, el botón que se aprieta,
la chispa, y la placa final. **Todos los recursos ya existen** — es autoría, no generación.

## Las tres cosas que hay que saber para seguir

### 1. El límite de 24 px de desenfoque manda sobre la profundidad del decorado

El motor dibuja liso hasta 24 px de círculo de confusión. Con la apertura que el relevo de foco
necesita (78), **nada puede vivir más allá de z=719** sin pasarse:

```
coc = apertura · |d − enfoque| / d        d ≤ enfoque / (1 − 24/apertura)
```

Por eso el fondo bajó de z=5200 a z=700. Se pierde recorrido de paralaje; se conserva el mecanismo
central de la pieza. **Cuando haya que elegir entre los dos, gana el mecanismo.**

### 2. La apertura se anima, y tiene que bajar ANTES de que entre el túnel

Con la cámara adentro del anillo, una apertura de tipografía pide **210 px**. Las claves están en
`apertura`: 78 hasta el cuadro 186, 2 desde el 206 (el túnel arranca en el 210).

### 3. Ninguna capa 3D puede pasar detrás de la cámara

Se proyecta invertida, pide un círculo de confusión enorme (crece con 1/d) y `marco-check` la cuenta
como miles de px fuera de cuadro. Ya pasó dos veces acá: el túnel y el titular `All In One Platform`.
**Cada capa que vuela hacia la cámara necesita su `outPoint` calculado.**

## Los defectos que quedan, con su arreglo

| compuerta | qué | arreglo |
|---|---|---|
| `lectura` Q2 | 6 imágenes a 0,81x–0,94x: el chasis del teléfono y las pantallas cuando el túnel pasa cerca | regenerar `tel-chasis` y las capturas con **k=4** en vez de k=2 (`telefono.mjs`). Es una línea por recurso y una corrida. |
| `colision` | 1 choque, apareció al acercar el decorado | correr `colision-check --porque` para ver el par; probablemente dos titulares del túnel |
| `foco` | 2 capas | correr `foco-check` y leer qué capa y en qué cuadro; el patrón siempre es una capa demasiado cerca o demasiado lejos del plano de foco |
| `escena` | 4 capas | los teléfonos del anillo se tapan entre sí. Cada uno cuelga de **su propio** nulo `brazo-tel-N`, así que la exención de cuerpo rígido de `escena-check` no los alcanza. Colgarlos todos de `eje-tunel` directamente los eximiría, pero rompe la construcción del anillo — decidir cuál importa más. |

## Cómo se retoma

```bash
node tools/ae/recursos-k/fondo.mjs && node tools/ae/recursos-k/telefono.mjs && node tools/ae/recursos-k/app.mjs && node tools/ae/recursos-k/tarjetas.mjs && node tools/ae/recursos-k/piezas.mjs && node tools/ae/recursos-k/efectos.mjs
node tools/ae/es3-check.mjs tools/ae/sondas/pieza-k.jsx && node tools/ae/llamar.mjs tools/ae/sondas/pieza-k.jsx
printf 'PIEZA-K' > C:/ae-probe/exportar-comp.txt && node tools/ae/llamar.mjs tools/ae/sondas/exportar.jsx && node tools/ae/comp.mjs --json C:/ae-probe/pieza-k.json
node tools/ae/cuadro-ae.mjs PIEZA-K 96,276
```

**Y mirar cuadros intercalado, no al final.** En la PIEZA-J los defectos que importaban aparecieron en
los nueve cuadros que se miraron al final, después de ocho vueltas persiguiendo métricas. Acá los tres
defectos del acto I —fondo que no cubría, palabras pegadas, marca de agua con el nombre de otro
estudio— salieron todos de abrir un cuadro, y ninguno lo dijo una compuerta.

---
name: pieza-ae
description: >-
  Usar para AUTORAR o CORREGIR una pieza de motion graphics construida en After Effects por script y
  reproducida por el motor web propio (three.js), sin que AE participe del render. Triggers: pieza,
  PIEZA-A/B/C, autorar en AE, tools/ae/sondas/*.jsx, exportar.jsx, comp3d.html, comp.json, ritmo.mjs,
  escena-check, obturador, tapa/revelado, nube de paneles, catalogo AE, "el video quedo muerto",
  "falta animacion", dirección de arte de una pieza. Cubre el procedimiento obligatorio (arte antes
  que coreografia), las compuertas que se corren sin renderizar y las leyes del motor que ya costaron
  renders enteros.
---

# Autorar una pieza en After Effects para el motor web

**AE autora. El navegador renderiza.** AE nunca participa del video final: se usa para construir la
composición, `exportar.jsx` la vuelca a `comp.json`, y `tools/ae/motor/comp3d.html` la dibuja en un
navegador sin ventana. Toda la fidelidad está medida contra AE (0,01–0,03 de 255).

## Qué salió mal las tres veces anteriores

Leer esto antes de escribir una línea. Son los tres modos de fallo reales, en orden de aparición:

1. **PIEZA-A / PIEZA-B — coreografía muerta.** Se animó la cámara y nada más. La métrica de entonces
   medía el promedio de movimiento y aprobó una pieza que el usuario describió como "muerta, sin beat,
   muy lenta". Lo arregla `ritmo.mjs`.
2. **PIEZA-C, primera pasada — gestos que nadie ve.** La fila entera de tarjetas caía fuera del
   encuadre y una tapa de revelado tapaba media pantalla. Se descubrió renderizando, dos veces. Lo
   arregla `escena-check.mjs`.
3. **PIEZA-C, versión final — 7/7 en ritmo y "una decepción total".** Las dos compuertas tenían razón
   y ninguna medía dirección de arte. Lo arregla el **PASO 1** de abajo, que es obligatorio.
4. **PIEZA-H — sólida, y con el movimiento del texto copiado mal, por DOS errores encadenados.**
   El usuario: *"aparecen, pasa unos milisegundos y de la nada se hacen más grandes como que avanzan
   hacia adelante… de un salto"*.
   **El primero fue de cadencia:** estudié la referencia con cuadros a **2 por segundo**, y a esa
   cadencia un corte duro y un acercamiento de medio segundo **se ven idénticos**. Elegí una hipótesis
   que mi evidencia no podía distinguir. Medida a 30 fps, la referencia no salta nunca.
   **El segundo estaba debajo y es peor:** apliqué el gesto grande de escala a **los once** titulares.
   Medido después sobre ocho avisos, un rótulo entra entre **1,00× y 1,30×** y el gesto grande pasa una
   a tres veces **en toda la pieza**. Tomé la excepción por norma porque la había medido en un solo
   video — y encima en el más extremo del grupo.
   Lo arreglan `reference/gramatica-del-genero.md` (las magnitudes) y `reference/movimiento-medido.md`
   (la forma de la curva).

5. **PIEZA-I — tres paneles cortados por arriba, un conmutador que no conmuta y un anillo pelado.**
   La pieza pasó lectura, escena y colisión en verde. El usuario abrió la previsualización y encontró
   los tres defectos en cinco segundos.
   **Los tres paneles tenían UNA causa y era una línea:** `addCamera(nombre, [960, 540])` **no pone la
   cámara ahí** — ese argumento es el **punto de interés**. La posición queda en `[0, 0, -zoom]`. Con
   la cámara a la altura del borde superior mirando al centro, la vista queda inclinada **17,1° hacia
   abajo** y todo lo que vive en z>0 sube ~240 px en el cuadro.
   **Y lo que hizo que durara: yo le había puesto claves a X y a Z.** Esas claves pisaron el valor
   equivocado en dos ejes, o sea que arreglaron dos tercios del defecto sin querer y escondieron el
   tercio restante. **El único eje que quedó roto fue el único que no animé.**
   Lo arregla `marco-check.mjs`, que además **nombra la causa** en vez del síntoma.
   **Y el detalle que más enseña: las OTRAS CINCO piezas lo resolvían.** `pieza-b` fija la posición;
   `pieza-c`, `d` y `g` apagan la auto-orientación y le ponen claves a Y; `pieza-h` le pone claves a Y.
   PIEZA-I es la única que no hace ninguna de las dos — y no es casualidad: **es la única que se
   escribió de cero desde la gramática medida en vez de adaptando la anterior.** El arreglo vivía
   solamente en el archivo previo, así que se heredaba copiándolo. Reescribir desde principios tiró
   todos los arreglos acumulados que no estaban en ningún otro lado.
   *(Lo primero que dije fue que el defecto estaba en seis piezas. Falso: salió de un grep que sólo
   miraba tres líneas después de `addCamera` buscando un `setValue`, y no veía a las que lo resuelven
   con claves en Y. Instrumento nuevo, sin control negativo, resultado creído.)*
   **El conmutador no era un problema de coreografía sino del RECURSO:** el PNG tenía la pastilla
   horneada sobre "Vista", así que el estado final existía desde el primer cuadro y ninguna animación
   podía cambiarlo. Lo arregla `gesto-check.mjs` y la regla de partir el recurso en piezas móviles.

---

## LA CAUSA DE FONDO, que es una sola y explica más que las cinco de arriba

**Una limitación escrita como comentario al lado del código no llega a la próxima pieza.** Tres casos
en una sola sesión, y el patrón es idéntico en los tres:

| dónde estaba escrito | qué decía | qué pasó después |
|---|---|---|
| `sondas/camara.jsx:103` | "`addCamera` la deja en (0,0,-zoom): DESCENTRADA. **La cámara se centra a mano, y no es un detalle de comodidad**" | cinco piezas lo resolvían copiándose entre sí; la primera escrita de cero lo perdió |
| `motor/comp3d.html` | "son diecisiete muestras en dos anillos… **el uso medido es la entrada por foco, no el fondo completamente fuera de foco**" | PIEZA-I puso su panel a 32 px de círculo de confusión |
| `sondas/exportar.jsx` | el recorte por matte **rechaza por nombre** el caso no coplanar | **no falló nunca** |

El tercero es el que enseña. No falló porque yo tuviera más cuidado: falló distinto porque **estaba
escrito como un rechazo de máquina y no como prosa**. La prosa la lee quien ya abrió ese archivo; el
rechazo lo choca quien no sabía que existía.

> **LA REGLA: una limitación que no es una compuerta no existe.** Cuando descubras que una función del
> motor sólo sirve hasta cierto punto, no lo anotes: escribí la compuerta, o hacé que el exportador lo
> rechace con nombre y motivo. Si no hay tiempo para eso, no está terminado.

De ahí salieron `marco-check.mjs`, `foco-check.mjs` y `gesto-check.mjs`, que son la versión de máquina
de tres cosas que antes eran comentarios.

---

**La lección que ordena todo lo demás: la coreografía no salva elementos que no vale la pena mirar.**
**Y las dos que ordenan el paso de estudiar una referencia: preguntarse a qué cadencia la observé, y
no derivar una regla de una sola muestra.**

---

## LA BIBLIOTECA `gesto` — autorar con ella, no a mano

```javascript
#include "C:/Users/Thiago/Documents/cliping.ia/tools/ae/gesto/gesto.jsx"

G.iniciar({ nombre: "MI-PIEZA", cuadros: 240, recursos: "C:/ae-probe/recursos-x" });
// ... construir con G / Gt / Gf / Ge / Gx / Gc / Gd ...
G.cerrar();
```

| | | |
|---|---|---|
| `G` | núcleo | claves, curvas, rebote, cámara, recursos, tipografía, y **todas las negativas** |
| `Gt` | texto | T01–T14 · escalonados, tecleo, interletra, ondulación, relevos |
| `Gf` | formas | F01–F14 · barras, anillos, ecualizador, squash, extruido, nine-slice |
| `Ge` | entradas | E01–E12 · deslizamientos, sobrepasos, anticipación, salidas |
| `Gx` | transiciones | X01–X12 · tapas, latigazo, volteo, atravesar, destello, match cut |
| `Gc` | espacio | C00–C14 · cámara, multiplano, profundidad, sombra de contacto |
| `Gd` | detalle | D01–D12 · acuse, arrastre, solapamiento, peso, estela, sombra desfasada |

**11.153 líneas · 139 funciones · las 79 técnicas del catálogo.**

### Por qué existe, y no es para escribir menos

El mismo día que se escribió acá *"las claves que alimentan un rebote van lineales"*, se autoró una
pieza entera con Easy Ease en exactamente esas claves. El sobrepaso medido dio **0,11 px** —el rebote
no existía— y no lo cazó ninguna compuerta: lo dijo el usuario, mirando el video.

> **Un documento lo lee quien ya sabía que existía. Una función que se niega a construir no se puede
> desobedecer por distracción.**

Cada ley cara aparece adentro como una de tres cosas, **nunca** como un comentario suelto:

- **(a) un valor por defecto que ya es el correcto** — obturador apagado, 8 bits, cámara sin auto-orientar
- **(b) un paso obligatorio imposible de saltear** — `G.colgar()` pone la orientación en cero
- **(c) un `throw` con el número medido en el mensaje** — el rebote sin velocidad, la clave a mitad de cuadro

### Lo que se verificó, y en qué orden

1. **Control negativo del núcleo** (`_prueba-nucleo.jsx`): construye a propósito cada defecto prohibido
   y exige que tire, más casos positivos. **17 de 17.** Y la fórmula del sobrepaso reproduce los
   **42,4 px medidos** en el proyecto del usuario (dio 42,5).
2. **Integración en AE** (`_prueba-integracion.jsx`): los siete objetos cargan, 139 funciones, y una
   función representativa de cada familia **construye capas de verdad**. **20 de 20.**
3. **El documento viaja**: `exportar.jsx` + `comp.mjs` sobre la comp de integración →
   **DOCUMENTO COMPLETO**. No alcanza con que arme en AE; el motor tiene que poder dibujarlo.

### Los mensajes son la mitad del valor

No acusan: **calculan la salida**. Ejemplos reales de la corrida de integración:

```
conRebote en lento: el sobrepaso daria 0.9 unidades y el piso es 4. El gesto es demasiado LENTO:
recorre 60 unidades en 60 cuadros (30 u/s). Con 14 cuadros o menos llega al piso.

C01 empuje: el recorrido = 380, y la banda es 0.03 a 0.14. El catalogo mide 5-12% de la distancia
para un empuje que acompana.

C10 deriva: la duracion = 180, y la banda es 90 a 150. La deriva cubre un plano entero.
```

### Y lo que la biblioteca declara IMPOSIBLE, con reemplazo

Ninguna técnica se aprueba a medias. Cuando algo no se puede, la función **tira** y nombra el
reemplazo. Las principales: el **selector de expresión** de AE (reemplazo: N capas con el `inPoint`
corrido), el **selector ondulado** (reemplazo: claves horneadas con un seno determinista), el **orden
aleatorio** del selector, el **texto de origen con claves**, y **T11 con tapas** — que el propio plan
recetaba y es geométricamente imposible, porque una tapa que borra la mitad sobrante de una copia borra
la mitad útil de la otra.

---

## LO QUE FALTA CUANDO YA NO FALTA NADA TÉCNICO: el CONTENIDO

Dicho por el usuario sobre la PIEZA-M, que pasó las seis compuertas estructurales, el documento
completo, cinco de siete métricas de ritmo, y catorce cuadros revisados de a uno:

> *"no está tan mal el video, pero no sé, el video es medio **pobre en cuanto a contenido**, aparece un
> texto que dice 'tu web es un video ahora' y después otro texto tirado que dice **'100%' sin ningún
> sentido**, imágenes que no aportan mucho… **me gustó el beat y animaciones**, esas no están mal."*

Es la cuarta vez que el veredicto es "la coreografía está bien y la pieza no dice nada", y las cuatro
tienen la misma forma: **el oficio de mover se resolvió y el de decir no se empezó.** PIEZA-A y B eran
lentas, PIEZA-C fue "una decepción total" con 7/7 en ritmo, PIEZA-J pasó todo y salió vacía, PIEZA-M
tiene beat y no tiene qué contar.

### La regla: NINGÚN DATO SE INVENTA, Y UN DATO SIN SUJETO NO ES UN DATO

Un "100%" flotando en pantalla no es una cifra: es la forma de una cifra. El espectador pregunta
*¿100% de qué?* y no hay respuesta, así que lo que aprende no es un dato sino que el video es de
relleno. Lo mismo con una barra que se llena hasta el final sin nombrar qué mide.

- **Cada número lleva su rótulo pegado**, en la misma entrada y con la misma vida: `"100%"` solo es
  ruido; `"100% de tu web"` o `"38 s"` + `"en armarlo"` es información.
- **Si el número no sale de ningún lado, no va.** Antes de poner una cifra hay que poder contestar de
  qué medición viene. Si la pieza no tiene de dónde sacarla, el hueco se llena con una FRASE, no con
  un número falso.
- Y lo mismo para las etiquetas de relleno: una tarjeta con líneas grises que hacen de párrafo es
  vocabulario de maqueta. Sirve como fondo, nunca como el sujeto de un plano.

### Y LOS RECURSOS INVENTADOS SON PLACEHOLDERS, aunque estén bien dibujados

En la PIEZA-M la web del cliente es una página falsa dibujada por código
(`tools/ae/recursos-m/interfaz.mjs`, ~500 líneas) y los cuatro pedazos son recortes de esa falsa. Está
bien hecha —convence como sitio— y **no aporta**, porque no es de nadie. El usuario lo dijo así:
*"supongo que pueden servir más como placeholder que otra cosa"*.

> **Un recurso dibujado por código es andamio para probar el motor, no material de la pieza.** El
> destino es que ese lugar lo ocupe la página real del cliente. Mientras se autora con andamios, hay
> que decirlo al entregar, con esas palabras, y no dejar que el usuario lo descubra mirando.

### El costo, que también es parte del oficio

La PIEZA-M tardó **tres horas y media**. El usuario lo dejó anotado sin llamarlo problema. Dónde se
fue, medido y no supuesto: la mayor parte no fue autorar sino **arreglar la biblioteca mientras se
autoraba** — ocho defectos reales encontrados al construir (tramos con tipos mezclados que el
exportador rechazaba, `cajaDe` midiendo en el cuadro equivocado, cuatro funciones cuyas capas vivían
las 600 cuadros de la comp). Esos arreglos ya están hechos y no se vuelven a pagar. Lo que sí se
vuelve a pagar, y hay que presupuestarlo, es el bucle de mirar cuadros: **catorce cuadros abiertos de a
uno encontraron cinco defectos que ninguna compuerta ve.** Ese bucle no es opcional y no es gratis.

## ENLACES · seis leyes medidas contra AE, y cinco no dan síntoma

Salieron de `tools/ae/sondas/enlaces.jsx`, que le pregunta a AE en vez de confiar en la documentación.
Están construidas dentro de `G.expresion`, `G.control`, `G.enlazar` y `G.seguir` — pero conviene
saberlas, porque explican por qué esas funciones son así.

**1 · Una expresión rota NO TIRA: AE la DESHABILITA y devuelve el valor de abajo.** Medido: un enlace a
una capa inexistente dejó la propiedad en su valor estático y siguió. El síntoma es *"esa capa no se
mueve"*, sin una línea de error en ningún lado. Por eso `G.expresion` es el único camino para escribir
una expresión: relee `prop.expressionError` y tira con el mensaje de AE.

**2 · Una referencia CIRCULAR no da error y no cuelga: devuelve un valor por defecto en silencio.**
A→B→A dio opacidad 100 en las dos capas, con `expressionError` vacío en las dos. AE no va a avisar
nunca, así que el ciclo hay que impedirlo **antes de escribir** — `G.enlazar` mantiene un registro de
dependencias y camina la cadena hacia arriba.

**3 · `addProperty` devuelve una referencia que se INVALIDA al agregar el efecto siguiente.** Guardarla
y usarla después da *"El objeto no es válido"*. Se agregan todos y recién ahí se piden por índice.

**4 · El deslizador se llama distinto en cada idioma, y en este AE ni siquiera es "Deslizador".** Es
**"Control del deslizador"**; el `matchName` es `ADBE Slider Control`. `effect("Slider")` falla con *"el
efecto denominado Slider falta o no existe"*. Desde una expresión se lee **siempre por índice**:
`effect(1)(1)`. Es el mismo bug de los 41 errores del proyecto descargado.

**5 · Enlazar a `posX/posY/posZ` exige que el LÍDER tenga las dimensiones separadas.**
`transform.xPosition` no existe si la posición del líder no está separada, y el fallo cae en la ley 1:
expresión deshabilitada, valor de abajo, cero errores. `G.enlazar` separa el líder por las suyas.

**6 · Las sondas dejan expresiones rotas A PROPÓSITO, y hay que sacarlas.** Los controles negativos
tienen que escribir expresiones malas para comprobar que AE avisa. Quedan en el proyecto, AE las cuenta
en la barra naranja de arriba, y quien lo abre no puede saber que son de una prueba. Peor: enseñan a
ignorar esa barra, que es justo la que tiene que avisar cuando se rompe algo de verdad.

```bash
node tools/ae/llamar.mjs tools/ae/sondas/limpiar-pruebas.jsx   # borra SONDA-* y PRUEBA-*, y recuenta
node tools/ae/llamar.mjs tools/ae/sondas/errores-expresion.jsx # que expresiones estan rotas y donde
```

### Y lo que los enlaces cambian al autorar

El escalonado deja de ser trabajo. Antes una cascada de cuatro capas eran cuatro juegos de claves y
cambiar el retardo era editar cuatro números; ahora `G.seguir({ capa, lider, retardo: 4 })` y listo. Un
`G.control` con deslizadores pone el pulso, la energía y el acento en un solo lugar del que cuelga toda
la pieza.

**Y todo esto sobrevive al motor web**, porque el exportador hornea cualquier expresión cuadro a cuadro:
verificado sobre un seguidor con 6 cuadros de retardo — en el cuadro 30 el seguidor tiene el valor que
el líder tenía en el 24, exacto.

## El procedimiento

Copiar esta lista en la respuesta y marcarla a medida que se avanza. **No saltear el paso 1.**

```
PIEZA:
- [ ] 0. SI HAY REFERENCIA: medirla a 30 fps antes de copiarle nada (ver Paso 0)
- [ ] 1. FICHA DE ARTE escrita en el .jsx (familia, paleta, luz, forma, tipografia, profundidad, simbolo)
- [ ] 2. VOCABULARIO elegido del catalogo: >= 6 tecnicas por su id (T/F/E/X/C/D), y al menos 2 de FORMAS
- [ ] 3. GUION en tabla: cuadro, duracion, capa, tecnica (id), curva (C1..C8)
- [ ] 4. CONSTRUIR en AE           node tools/ae/llamar.mjs tools/ae/sondas/<pieza>.jsx
- [ ] 5. EXPORTAR                  printf '<COMP>' > C:/ae-probe/exportar-comp.txt && exportar.jsx && comp.mjs
- [ ] 6. RITMO 7/7                 node tools/ae/ritmo.mjs
- [ ] 7. ESCENA OK                 node tools/ae/escena-check.mjs
- [ ] 7b. LECTURA OK               node tools/ae/lectura-check.mjs
- [ ] 7c. COLISION OK              node tools/ae/colision-check.mjs
- [ ] 7d. REPRODUCTOR OK           node tools/ae/reproductor-check.mjs   (si se toco comp3d.html/comp.html)
- [ ] 8. LISTA DE ARTE completa    reference/direccion-de-arte.md
- [ ] 9. RENDER RAPIDO             node tools/ae/pieza.mjs <COMP> --rapido --mp4 <ruta> --tira
- [ ] 10. MOSTRAR AL USUARIO cuadros COMPLETOS, no la tira reescalada
- [ ] 11. Recien con su OK: obturador real (16x mas caro, ~35 min)
```

### Paso 0 — Si hay una referencia, MEDIRLA antes de copiarla

Sólo cuando el pedido nombra un video de referencia. **Es el paso más barato de todos y el que más caro
sale saltearse**, porque un comportamiento mal leído se propaga a la pieza *y a esta skill*.

```bash
python -m yt_dlp -f "bestvideo[height<=1080][ext=mp4]" --no-playlist -o "C:/ae-probe/ref/v.%(ext)s" <url>
ffmpeg -i C:/ae-probe/ref/v.mp4 -vf "select='between(n,A,B)'" -vsync 0 -frame_pts 1 C:/ae-probe/ref/f/n%04d.png
node tools/ae/medir-titular.mjs C:/ae-probe/ref/f 100     # alto de tinta cuadro a cuadro
```

Dos cadencias, dos preguntas distintas, y **no son intercambiables**:

| a 2 fps (hoja de contacto) | a 30 fps (cuadro a cuadro) |
|---|---|
| el mapa de escenas: qué pasa y en qué orden | **cómo** se mueve cada cosa |
| cuántos tiempos y cada cuántos cuadros | curvas, duraciones, si hay salto o rampa |
| composición y paleta | todo lo que dure menos de un segundo |

**A 2 fps, un corte duro y un acercamiento de medio segundo son indistinguibles.** Cualquier conclusión
sobre una transición sacada de ahí es una hipótesis elegida a dedo. Lo medido a 30 fps sobre una
referencia está en **`reference/movimiento-medido.md`**.

**Y UNA REFERENCIA NO ALCANZA PARA DERIVAR UNA REGLA.** Con una sola muestra, "así se hace en este
género" y "así lo hizo este aviso" dan exactamente el mismo dato. Ya está corrido el barrido de ocho
avisos y sus conclusiones están en **`reference/gramatica-del-genero.md`** — leerlo antes de decidir
cualquier MAGNITUD. Para agregar referencias nuevas:

```bash
bash tools/ae/bajar-refs.sh                    # bajar (edita la lista de ids adentro)
bash tools/ae/barrer-refs.sh                   # extraer en gris a 320 px y medir las que haya
```

Da cambios abruptos por segundo, cadencia pisada por bloque, energía, y la curva de tamaño de los
rótulos con mediana **y p90** — las dos, porque la mediana dice cómo es el rótulo típico y el p90 dice
si el aviso usa gestos grandes aunque sea una vez. Son preguntas distintas y ya me escondieron la señal
tres veces en una sesión.

### Paso 1 — La ficha de arte, antes de la primera clave

**MANDATORIO.** Leer `reference/direccion-de-arte.md` y escribir la ficha arriba del `.jsx`. Sin
ficha, la pieza converge a gris sobre negro con rectángulos rectos — está medido, es lo que pasó.

### Paso 2 — Elegir del catálogo, por id

El catálogo vive en `docs/AE-MCP/catalogo/` (354 KB, 7 familias). **Está prohibido autorar sin abrir
la familia que corresponde.** Índice:

| archivo | familia | leer cuando |
|---|---|---|
| `01-texto.md` | **T** texto | hay una palabra que tiene que hacer algo |
| `02-formas.md` | **F** formas y objetos | **siempre** — F14 nine-slice y F06 ecualizador son obligatorios de leer |
| `03-transiciones.md` | **X** transiciones | hay más de un plano |
| `04-espacio-3d.md` | **C** espacio y cámara | hay cámara |
| `05-revelados.md` | **E** entradas y salidas | algo entra o se va (siempre) |
| `07-detalle-fino.md` | **D** detalle de segundo orden | siempre — D01 acuse y D06 jerarquía |
| `09-PLAN.md` | el plan, con 3 piezas gesto por gesto | antes de escribir el guion |

`09-PLAN.md` tiene la **Parte 1** con el catálogo completo (líneas 64–637) y la **Parte 4** con tres
piezas escritas cuadro por cuadro. Se leen las dos. *La Parte 1 es la que me salteé y por eso usé cero
técnicas de formas.*

### Paso 3 — El guion, en tabla y sobre la grilla

Beat de 15 cuadros a 120 bpm; grilla fina de 8. Reglas duras (salen de `06-oficio-y-beat.md` y de
`ritmo.mjs`):

- **Un gesto cada 8–16 cuadros. Ningún hueco de más de 20.**
- **La salida dura el 60% de la entrada.** Invertirlo es la causa más común de que se sienta lenta.
- **Gesto estándar: 10–14 cuadros.** Los grandes, hasta 18.
- **Los gestos que mandan caen en múltiplos de 120** (donde coinciden las dos grillas).
- **Cada gesto lleva 1–2 acompañamientos** en otras capas, del 20–40% de su magnitud, repartidos a lo
  largo de TODO el gesto (`acompana`, no `acuse`: un acuse se agota en 3 cuadros).
- **La cámara aporta ≤20% de la energía.** Tres planos con corte (clave HOLD), deriva lenta, un
  contragolpe. Nunca la cámara como gesto principal.
- **~~Nunca Easy Ease (33/33)~~ — ESTA REGLA ERA FALSA Y LA REFUTÓ UNA MEDICIÓN.** Sobre 282
  influencias de seis proyectos reales, la mediana es **16,667** (lineal, sin ease), el **57,8%** está
  en ese defecto exacto y el **p75 es 33,3 — o sea Easy Ease.** Lo que es raro en la práctica es lo que
  esta skill mandaba usar siempre: sólo el **11%** pasa de 70, y las ocho curvas de abajo viven todas
  entre 70 y 92.
  **La regla nueva:** por defecto lineal o Easy Ease, y el carácter lo pone una **expresión**. Las ocho
  curvas quedan para lo que de verdad las pide — un latigazo, un golpe, un asentamiento declarado.
  Por su id: C1 entrada 20/85, C2 pesada 10/92, C3 salida 90/15, C4 latigazo 85/85, C5 deriva lineal,
  C6 traslado 70/70, C7 golpe 0,1/80, C8 asentamiento 70/20.
  *(De dónde salía la regla vieja: de que Easy Ease aplicado a TODO se siente blando y genérico. Eso es
  cierto. La conclusión equivocada fue prohibirlo en vez de notar que lo que faltaba era el sobrepaso,
  que ninguna Bézier puede dar.)*

### Pasos 6–8 — Las compuertas, y qué hacer cuando fallan

Se corren **sin renderizar**, en segundos. Bucle: correr → corregir → repetir. **No se renderiza con
una compuerta en rojo.**

```bash
node tools/ae/ritmo.mjs --gestos      # M1..M7 + el listado de gestos detectados
node tools/ae/escena-check.mjs        # gestos que nadie ve
node tools/ae/es3-check.mjs tools/ae/sondas/<pieza>.jsx   # antes de llamar a AE
```

| falla | qué significa | qué se corrige |
|---|---|---|
| M1 gestos/s | huecos largos sin que arranque nada | agregar gestos, no acuses (un acuse no supera su propio umbral) |
| M2 cresta | todo se mueve un poquito todo el tiempo | quietud real entre gestos |
| M3 dominancia >0,85 | una sola cosa moviéndose | acompañamientos; contra una imagen de pantalla completa, **sólo el fondo puede** (paralaje) |
| M3 dominancia <0,45 | papilla: todo junto, nada se lee | escalonar |
| M4 grilla | los gestos no caen en el beat | mover a múltiplos de 8; los macro a múltiplos de 120 |
| M5 cámara | la cámara se lleva la pieza | bajar deriva, cortar en vez de viajar |
| M6 silencios | no hay respiración, o hay un hueco >20 | acortar gestos, agregar uno en el hueco |
| M7 empates | dos capas a <1 unidad de profundidad, pisándose | separar en Z, o emparentar la etiqueta a su panel |
| ESCENA | una capa se mueve sin verse | mirar el motivo que informa: fuera de cuadro, o tapada |

**Y `ritmo` ES CIEGO A DOS DE LAS FORMAS NUEVAS DE CAMBIAR.** Una entrada **por foco** cambia el
desenfoque sin mover la capa, y un **revelado por máscara** mueve una capa que está recortada, o sea
invisible. La métrica sólo mira geometría proyectada, así que las dos cuentan como silencio: en la
PIEZA-I los dos huecos más largos que reportó M6 —0-66 y 428-494— son exactamente esos dos tiempos, y
los dos tienen movimiento de sobra en pantalla. Al agrandar el motor se abrió un agujero en el
instrumento; hasta que se cierre, **contrastar cada hueco de M6 contra qué técnica vive ahí antes de
tocar la pieza.**
| LECTURA Q11 | un texto no llega al 5,2% del alto | subir el cuerpo, o declararlo `deco-` si de verdad es decorativo |
| LECTURA Q2 | una imagen se dibuja más grande que sus píxeles | regenerar el recurso con multiplicador `k`, y dividir la escala de la capa por el mismo `k` |
| COLISION texto sobre texto | dos rótulos legibles en el mismo lugar | **cortar en seco** entre uno y otro; nunca cruzarlos |
| COLISION titular sobre contenido | el rótulo cayó sobre la parte ocupada de un panel | atenuar el panel al 55-72 %, o repartir en altura (panel arriba, titular abajo) |

**`colision-check` es la que nació del defecto que apareció en TODAS las piezas** y que ninguna otra
caza, porque las dos capas son legibles *por separado*. Mira adentro del PNG: calcula una grilla de
ocupación por recurso y proyecta la caja del titular a coordenadas del panel con bilineal inversa, así
que una etiqueta sobre su píldora (plana por dentro) no dispara y un titular sobre un documento sí.
Exime lo que está en tránsito —dos letras de una palabra que se desarma se están cruzando, no
pisando— y por eso **las capas por carácter tienen que llamarse `letra-<i>-<c>`**: esa convención es
la declaración del autor.

```bash
node tools/ae/colision-check.mjs --inyectar    # control negativo: fabrica el defecto y exige que falle
node tools/ae/colision-check.mjs --porque      # por que NO disparo cada par que llego a mirarse
```

**Y una compuerta que reprueba por el ESTILO puede seguir teniendo razón sobre un caso concreto.** En
la PIEZA-H, M6 reprueba de entrada porque la pieza tiene un tiempo cada ~60 cuadros y M6 pide uno cada
20 — pero los tres huecos que nombró eran defectos de verdad: un estallido hecho al revés y dos paneles
que aterrizaban y se clavaban. **Hay que mirar QUÉ señala, no sólo si pasa.** Por eso `ritmo` ahora
imprime *dónde* caen los tres huecos más largos: "peor hueco 88 cuadros" sin ubicación manda a buscar a
ciegas por toda la pieza.

### Las seis compuertas nuevas (correr SIEMPRE, son baratas y no renderizan)

```bash
node tools/ae/marco-check.mjs C:/ae-probe/<pieza>.json    # encuadre + cámara torcida
node tools/ae/foco-check.mjs  C:/ae-probe/<pieza>.json    # desenfoque que el motor no dibuja liso
node tools/ae/gesto-check.mjs C:/ae-probe/<pieza>.json    # interacción sin consecuencia
node tools/ae/selector-check.mjs                          # la cuenta del animador contra AE
node tools/ae/animador-check.mjs <doc.json>               # el motor contra AE, cuadro a cuadro
node tools/ae/cuadro-ae.mjs <COMP> 0,20,40               # AE escribe cuadros sueltos: la VERDAD
node tools/ae/mascara-check.mjs <doc.json> <dir> 0,20,40 # AE contra el motor, pixel a pixel
```

| compuerta | la pregunta | por qué no la contestaba ninguna otra |
|---|---|---|
| `marco` | ¿hay algo **quieto, visible y cortado** por el borde? Y: ¿la cámara mira derecho? | `escena-check.mjs:115` sólo marca por debajo del **25% visible**; un panel cortado al 40% queda 60% visible y sale por esa línea. Y `escena-check.mjs:86` mide contra `min(área de la capa, área del cuadro)`, lo que vuelve "100% encuadrada" a cualquier capa más grande que el cuadro |
| `foco` | ¿alguna capa pide más círculo de confusión del que el motor dibuja liso (24 px)? | ninguna miraba la cámara. El límite son **dos puntos medidos**, no un barrido: a 32 px el grano se ve, a 5–20 px no |
| `gesto` | ¿algún puntero **acciona** algo que después no cambia? | las otras preguntan por propiedades de **la imagen**, y esto es una propiedad de la **relación entre dos capas a lo largo del tiempo**. Cada cuadro suelto está perfecto |
| `selector` | ¿la cuenta del animador de texto que hace el motor coincide con la de AE? | no existían animadores. Compara **51 configuraciones medidas en AE** contra `tools/ae/selector.mjs`. Toda reimplementación de una cuenta ajena diverge en silencio, y este repo ya lo pagó con la proyección de la cámara |
| `animador` | ¿el motor DIBUJA el animador donde AE dice? Compara `sourceRectAtTime` contra la tinta del motor, cuadro a cuadro | `selector` verifica el FACTOR; esto verifica la **disposición**. Un factor correcto sobre letras mal colocadas da otro cuadro. Y saltea con nombre las capas con rechazos declarados: un `Text Blur` rechazado hacía 23,2 px de caja que AE cuenta y el motor no |
| `mascara` | ¿el cuadro del motor es el cuadro de AE? Compara los **píxeles**, alfa incluido | es la primera que no compara un número sino una imagen. Hizo falta porque `sourceRectAtTime` **no refleja las máscaras** — medido: un sólido de 400×300 sigue midiendo 400×300 con la máscara puesta, invertida, con calado y en todos los modos |

Las seis tienen `--inyectar` (control negativo) y las seis se vieron fallar. **No las pases por un pipe:**
`| head` devuelve el código de salida de `head`.

### Paso 9 — Mirar la pieza uno mismo, ANTES de mostrarla

```bash
python tools/ae/motor/capturar-comp.py --con-fondo --obturador 1 --cuadros 22,70,130,200,...
node tools/ae/tira.mjs --de C:/ae-probe/render/MOTOR --cuadros 12 --cols 3 --ancho 620 --a <salida>.png
```

Doce cuadros elegidos, no mil ochocientos. Dos cosas que hay que saber o no se ve nada:

- **`--con-fondo` no es opcional para MIRAR.** Sin él la captura sale con `omit_background`, que existe
  para *medir* (el lector pesa por alfa y un fondo opaco haría que el fondo sume masa) y devuelve un
  cuadro **blanco de punta a punta**. Se perdió una vuelta entera diagnosticando "el reproductor no
  dibuja" cuando dibujaba perfecto.
- **La tira ordena los archivos alfabéticamente**, así que `f1020` va antes que `f560`. Las etiquetas
  dicen el cuadro real; el orden de la grilla no es el orden del tiempo.

**Lo que representa contenido GENERADO tiene que verse generarse.** Una tarjeta de sugerencia, una
respuesta, un documento, un comentario: si la pieza dice "pedile que escriba" y el resultado aparece ya
escrito, la pieza **muestra el después sin el durante** y se contradice sola. Lo cazó el usuario en la
PIEZA-H: *"se supone que tendría que estar escribiendo algo ahí, pero en vez de eso se muestra y listo"*.
En la referencia el documento se escribe solo, y **la porción recién llegada va teñida con el color de
acento** y se asienta a tinta un cuadro después — eso último es la mitad del efecto. Detalle y receta en
`reference/movimiento-medido.md`.

**El defecto que aparece siempre y es UNO SOLO: el titular cae encima del texto del panel.** Apareció
cuatro veces en la PIEZA-H (cuadros 490, 650, 1510, 1775) y ninguna compuerta lo caza, porque las dos
capas son legibles *por separado*. Se arregla de tres formas, en este orden: **cortar en seco** entre
titular y titular (nunca cruzarlos), **atenuar el panel** al 55-72% cuando comparte tiempo con un
rótulo, y **repartir en altura** — panel arriba, titular abajo — cuando los dos tienen que estar.

### Paso 10 — Cómo se le muestra al usuario

**Cuadros completos, de a uno, a resolución nativa.** Una tira a 1:3 sirve para comparar composición y
**destruye** el detalle donde viven los defectos. Decir cuántos cuadros se abrieron y cuáles. **Nunca
decir "lo revisé cuadro por cuadro" si no se hizo** (regla de CLAUDE.md, y ya costó confianza una vez).

---

## LEY · After Effects se infla al exportar, y después ya no hace falta

Medido durante el render de la PIEZA-L: AE estaba en 4,4 GB, se exportó la composición, y en el paso
siguiente —cuando el navegador ya estaba renderizando y **AE no participa más**— tenía **7,6 GB** y la
máquina había quedado con **1,07 GB libres**. Ahí es donde esta máquina se colgó dos veces.

`app.purge(PurgeTarget.ALL_CACHES)` lo bajó a 2,5 GB: **de 1,07 a 6,07 GB libres, sin cerrar nada ni
perder trabajo.**

> **`pieza.mjs` usa AE sólo en el paso 1.** Los pasos 3 y 4 son el navegador y ffmpeg. Purgar la caché
> de AE justo después de exportar tiene que ser parte del encadenado, no algo que alguien mire y
> arregle a mano cuando ve el número en rojo.

```javascript
// al final del paso de exportacion
try { app.purge(PurgeTarget.ALL_CACHES); } catch (exP) {}
```

Y una advertencia sobre el aviso previo: **medir la RAM antes de largar no alcanza.** Antes de este
render había 4,66 GB libres, que parecía holgado; el problema apareció *durante*, porque el propio paso
1 se comió 3 GB más. La cuenta honesta suma lo que la tarea va a pedir **mientras corre**, no sólo lo
que hay al arrancar.

---

## LEY · una expresión que nombra una propiedad se rompe al cambiar de idioma

Al abrir `increment_expression.aep` —hecho en un AE en inglés— este AE en español levantó una barra
amarilla: **"este proyecto contiene errores de expresión: error 1 de 41"**. Los 41 son el mismo:

```
La propiedad o el método denominado "Slider" de la clase "Effect" falta o no existe.
```

Las expresiones dicen `effect("increment_z")("Slider")`. En un AE en español esa propiedad **no se llama
`Slider`, se llama `Deslizador`** — lo confirma el volcado del disector: `ADBE Slider Control-0001
(Deslizador)`. El nombre de la propiedad está **localizado**; el matchName no.

### Por qué es peor que un error normal

**Una expresión con error NO se apaga sola.** `expressionEnabled` sigue en `true` y `value` devuelve el
valor **sin** la expresión. O sea que una propiedad rota se ve exactamente como una propiedad quieta:
cero síntoma en el cuadro, y la coreografía entera simplemente no ocurre. En este proyecto son las once
capas del túnel: se ve **un** objeto plano donde debería desplegarse un túnel de 8000 unidades.

Y arrastra a la medición: cualquier "así se ve este proyecto" leído en esta máquina habría sido falso.
Lo que sí sobrevive es la lectura del **cuerpo** de la expresión y de las claves, que es de donde salen
las leyes — el disector lee el código, no el resultado.

### La regla

> **Dentro de una expresión, nunca referenciar una propiedad por su nombre. Siempre por ÍNDICE.**

```javascript
effect("increment_z")(1)          // anda en cualquier idioma
effect("increment_z")("Slider")   // se rompe fuera del inglés
```

El **nombre del efecto** (`"increment_z"`) sí es seguro: lo puso el autor y no se traduce. Lo que se
traduce es el nombre de la **propiedad** que está adentro.

Vale igual para `thisComp.layer("main").transform.position` — `transform` y `position` son del lenguaje
de expresiones, no de la interfaz, así que ésos no se traducen. El peligro son los parámetros de
**efectos** y los **estilos de capa** (`Estilos de capas > Sombra paralela > Opacidad` en el volcado).

### Y cómo se detecta sin abrir AE a mano

```bash
node tools/ae/llamar.mjs tools/ae/sondas/errores-expresion.jsx
```

Recorre todas las comps y devuelve cada `expressionError` con su comp, su capa, su ruta de propiedad y
el cuerpo que falló. AE los muestra de a uno con flechitas; esto los da todos juntos y contados
(`41 con error · 106 sanas`).

**Correrlo después de importar cualquier proyecto ajeno, antes de medir nada de él.**

---

## CATORCE LEYES LEÍDAS DE SEIS PROYECTOS REALES

Salen de `sondas/disector.jsx` sobre seis `.aep` —cinco bajados y uno del usuario— y **cada una trae la
evidencia numérica que la sostiene**. Están ordenadas por cuánto cambian la forma de autorar.

### 1 · El obturador está MAL encendido, y el 180/−90 no es la decisión de nadie

**Las 77 capas de los cuatro proyectos medidos traen `mb 0`. El 100%.** Y hay velocidades que lo
pedirían a gritos: 2748 px/s en el ancho de una píldora, 2060 px/s en un círculo, saltos de escala ×3
en 3 cuadros. Nadie lo encendió: **la nitidez del salto ES el efecto.**

El `obturador 180 grados fase −90` que declara toda comp es **el defecto de AE**, no una elección.
Importarlo y prender el obturador global produce una pieza que el original no tiene, y cuesta 4 renders
por cuadro.

> **El obturador pasa a apagado por defecto y a opt-in por pieza, con motivo escrito.**

### 2 · Tres defectos del rebote que NO dan síntoma

- **Falta el corrimiento `frameDuration/10`** → la velocidad se lee *en* la parada, vale 0, y el rebote
  no existe. Sin error.
- **Se normaliza el vector `v`** → el alto de la píldora rebota. En el original la velocidad de llegada
  es `(2748 ; 0)`: el ancho sobrepasa 82 px y el alto no se mueve un píxel, **gratis**, porque la
  multiplicación es componente a componente.
- **Se realimenta el valor ya rebotado** → diverge. `velocityAtTime` devuelve la velocidad
  **pre-expresión**.

Compuerta barata sobre el horneado: si una propiedad declara rebote y su pico horneado es igual al valor
de la clave, está rota.

### 3 · La cola del rebote es parte del gesto, y el guion no la declaraba

El círculo del proyecto tiene **dos claves con el mismo valor separadas 45 cuadros**. A ojo del guion es
una espera muerta; adentro corren 42,4 px de sobrepaso, después −10,6 y después +2,6. Que no se note es
una calibración exacta: con `decay 5` la cola necesita ~0,7 s y la espera dura 0,75.

> **La cola dura ~1,4/decay segundos y tiene que morir antes de la clave siguiente.** Una clave dentro
> de la cola la corta de cuajo, con salto visible.

### 4 · Dos pistas simultáneas llevan curvas DISTINTAS

En el túnel, la cámara y el despliegue empiezan y terminan en el mismo cuadro y no comparten curva:
64,187/86,109 contra 66/89. En la versión siguiente está invertido. **Se lo tanteó a mano.**

Dos a cinco puntos de influencia alcanzan. Hoy el autor por script le pone la misma curva a todo lo que
cae en el mismo par de cuadros, y el ojo lee un único bloque que congela de golpe.

### 5 · Todas las claves caen en cuadro entero

Los tiempos del túnel a 25 fps dan 27, 30, 32, 63, 99, 100 y 245 — **ni una entre cuadros**. La duración
"rara" de 3,96 s es exactamente 99 cuadros.

Compuerta de dos líneas: `tiempo · fps` tiene que dar entero. Importa el doble con cuantización
temporal, donde una clave a mitad de cuadro se redondea impredeciblemente.

### 6 · Para cambiar de ASPECTO no se aplica un efecto: se cambia de plano

`Outlines`: **cinco capas de texto con claves idénticas byte a byte** y rangos encadenados
(0-0.2, 0.2-0.32, 0.32-0.52, 0.52-0.76, 0.76-fin). Dos son contorno y tres rellenas, así que la palabra
alterna relleno/contorno en los mismos saltos en que cambia de tamaño. **La animación se escribió una
vez.**

Le da al motor una salida para todo lo que no sabe dibujar —contornos, otro material, otro color— sin
un solo efecto: se hornean N texturas y se relevan en el tiempo. Y el ritmo de las poses es **irregular
a propósito** (5-3-5-6 cuadros): es lo que lo salva de sonar a metrónomo.

### 7 · Los golpes se hacen con HOLD y con lineal, no con ease

`Outlines` es **enteramente HOLD**: cinco poses en 19 cuadros con saltos de ×2,79 / ×0,179 / ×3,0, y
después 167 cuadros quieta. Y el único tramo LINEAL de un proyecto lleno de Béziers es el golpe de
sombra — que **arranca 3 cuadros ANTES de que la bola entre en cuadro**: el mundo reacciona antes de que
aparezca el sujeto.

### 8 · El revelado se hace con la MÁSCARA QUIETA y el contenido en movimiento

La comp `Reveal` tiene un matte alfa **sin una sola clave**. Toda la animación vive en el desplazamiento
del contenido. El resultado —letras que emergen desde debajo de la línea base— es idéntico a animar la
máscara y cuesta **cero claves en el matte**. Casi todo el mundo anima la máscara; no hace falta.

### 9 · La cámara no se anima: se anima un nulo padre

`Camera 1` tiene cero claves y cuelga de un nulo con dos claves (z 0 → 10444). Y el sujeto final está en
**z = 10443,537**: 0,463 unidades de diferencia sobre 10444.

Compuerta aritmética barata: el último Z de la cámara y el Z del sujeto final tienen que coincidir, o el
vuelo termina en el vacío.

### 10 · Una coreografía entera vive en cuatro números, y el gesto empieza en CERO

Once capas idénticas **sin ningún parenting**, ligadas por un offset proporcional al índice respecto de
una maestra, con tres incrementos animados **en la maestra** de 0 a 800 / 0 a 20° / 0 a −5.

En el cuadro 0 las once están superpuestas y se ve **un** objeto; a los 4 s hay un túnel de 8000
unidades. **No hay una sola clave de opacidad ni una máscara de aparición en todo el proyecto: la
entrada la resuelve el incremento arrancando en cero.**

Cambia la narrativa y el costo a la vez: en vez de *"entra un túnel"*, la pieza dice *"un objeto se abre
y resulta que era un túnel"*.

```javascript
ref = thisComp.layer("main").transform.position;
inc = thisComp.layer("main").effect("increment_z")("Slider");
ref + [0, 0, (index - thisComp.layer("main").index) * inc]
```

Cuidado con la escala: con −10 la última copia se anula y con **−11 se invierte y el plano se da vuelta**.

### 11 · Fase lineal perpetua: `time*360/8`

Loop perfecto sin una sola clave. **El 360 no se toca** —es una vuelta entera y es lo que garantiza que
el cuadro en t=P sea idéntico al de t=0—; el 8 es el período en segundos y es el único mando.

Regla de horneado que sale de acá: si el campo está congelado y sólo gira la paleta, **se hornean sólo
los cuadros de un período y el plano los repite para siempre**. 200 cuadros reutilizables en vez de 255
irrepetibles.

### 12 · La píldora que se estira NO se hace con un plano

Un rectángulo animado de 342 a 1533 de ancho **por geometría** mantiene las esquinas; un plano con
textura estirado ×4,48 las aplasta y se ve al primer cuadro. Hornear no sirve: harían falta 18 texturas.

**Reemplazo:** tres planos — dos tapas semicirculares que se separan y un plano central liso cuya escala
en X va de 0 a 1191, con las tapas emparentadas a los extremos. **Y el rebote va sobre la SEPARACIÓN de
las tapas, no sobre la escala del conjunto**, o el sobrepaso de 82 px vuelve a deformar.

### 13 · Un plano por glifo — el hueco de herramienta que bloquea la tipografía cinética

Si una línea de texto es UN plano con textura, no hay por dónde meter un valor distinto por carácter, y
ni el selector de rango ni el escalonado por `textIndex` existen.

**Y hay una trampa de horneado que ya está escrita antes de pisarla:** un selector de expresión se
evalúa **una vez por carácter**, así que muestrear esa propiedad como si fuera escalar devuelve un solo
carácter y tira los otros doce. Por eso el exportador lo rechaza con nombre en vez de hornearlo mal.

### 14 · Lo que el disector NO trae, y que ningún reemplazo cubre

No trae los colores de una rampa de Colorama, ni los trazados de las capas de forma, ni qué propiedad
anima un animador de texto, ni el anclaje de una capa. **Reproducir esas piezas exige ir a leerlos a AE
o capturar un cuadro; darlos por deducidos es publicar un dato falso con cara de medición.**

*(Y una que ya se arregló: el disector escribía `ADBE Slider Control-0001` para los cuatro deslizadores
de una misma capa, así que veinte claves de la capa maestra del túnel salían con la misma etiqueta.
Ahora acumula la RUTA — `Efectos > increment_z > ...` — y desambigua. Era un dato falso del lado de esta
herramienta, no de AE.)*

---

## LAS EXPRESIONES YA VIAJAN — y eran la mitad del oficio que faltaba

Hasta esta sesión, cualquier expresión producía `NOSOP` y dejaba el documento incompleto. El comentario
del propio exportador decía qué había que hacer y no se hacía: *"una expresión no es un dato, es un
programa. No se convierte: **se hornea** o se reescribe."*

**Ahora se hornea.** `volcarProp` muestrea `valueAtTime` una vez por cuadro y emite una línea
`HORNEADO`, exactamente como ya se hacía con los trazados de máscara y por el mismo motivo: AE devuelve
el valor **ya evaluado**, así que el motor no necesita interpretar `nearestKey`, `velocityAtTime`,
`textIndex` ni el resto del lenguaje. Nada de escribir un intérprete de ExtendScript en el navegador.

**Verificado de punta a punta: 0,000% de diferencia AE contra motor** en los tres cuadros comparados de
`sondas/expresion-k.jsx`, con un rebote inercial y un seguimiento con retardo.

### La precedencia, que no es obvia

**Una expresión PISA los keyframes.** Si una propiedad tiene las dos cosas, lo que se ve es la
expresión. `comp.mjs` reproduce esa precedencia: si hay `horneado`, gana sobre `pistas` y sobre
`estatico`. Sin eso, el motor dibujaría lo que el autor escribió *antes* de ponerle la expresión encima.

### Y el error de muestreo se MIDE, no se supone

Una expresión es una función continua y una muestra por cuadro no siempre alcanza. El exportador compara
el valor real a mitad de cuadro contra la interpolación lineal entre las dos muestras vecinas y manda el
peor caso en `EXPRERROR`. Medido con el rebote real: **1,37 px en el peor cuadro**, sobre una comp de
1280. Un `wiggle` rápido daría mucho más y hay que enterarse antes de mirar el video, no después.

---

## LA MEDICIÓN QUE CONTRADICE LAS OCHO CURVAS

282 influencias de ease, leídas de **seis proyectos reales de After Effects** con `sondas/disector.jsx`:

| | |
|---|---|
| mediana | **16,667** — el defecto de AE, o sea SIN ease |
| en el defecto exacto | **57,8%** |
| p75 | 33,3 |
| p90 | 72,4 |
| por encima de 70 | **11%** |

**Las ocho curvas C1..C8 de este repo viven todas entre 70 y 92.** O sea que se venía aplicando a *cada*
gesto una curva que en la práctica real aparece en el 11% de los casos. Y en el proyecto del usuario
—el que él describió como *"muy simple, bien bien smooth"*— **todas las claves de la forma que se
estira están en 16,667, o sea lineales**.

> **La suavidad no viene de la curva. Viene de la expresión.** Una Bézier termina con velocidad cero y
> no sobrepasa nunca; un rebote inercial lee la velocidad con la que la propiedad llegaba y le suma un
> seno amortiguado. Son dos cosas distintas, y la segunda es la que se siente física.

**Qué cambia en la práctica:** claves livianas (16,667 a 33) como opción por defecto, y el carácter
puesto con expresiones. C1..C8 quedan para lo que de verdad las necesita —un latigazo, un golpe— y no
para todo.

---

## LEY · un rebote sobre claves con EASE no existe, y no avisa

La ley "claves livianas" tiene una consecuencia que no es de gusto sino **aritmética**, y que se me pasó
en la primera versión de la PIEZA-L a pesar de haber escrito la ley dos horas antes.

El rebote inercial hace `velocityAtTime(key(n).time − frameDuration/10)`. **Una curva con ease de
ENTRADA llega a su clave final con velocidad cero.** Así que el rebote multiplica por cero y no pasa
nada — y no pasa *nada* de nada: la animación se ve prolija, entra bien, para bien, y simplemente le
falta el remate. Ninguna compuerta lo dice.

**Medido sobre el horneado**, que es donde se puede ver sin renderizar:

| | con Easy Ease (33/33) | con claves LINEALES |
|---|---|---|
| píldora que se abre | **0,11 px** | **17,9 px** |
| letra que cae | — | 11,0 px |
| placa del abanico | — | 3,2 a 9,7 px |

> **Si una propiedad lleva rebote, sus claves van LINEALES.** El ease y el rebote son dos formas de
> resolver lo mismo y no se suman: se anulan.

### Y la velocidad la da la distancia sobre el tiempo

Un gesto lento tampoco rebota aunque sea lineal, porque `v` es chica. La fórmula completa:

```
sobrepaso = v · amp · exp(−decay / (4·freq))          v = distancia / tiempo, en unidades/segundo
```

Para 320 px con `amp 0,06 · freq 1,8 · decay 5`:

```
36 cuadros ->  267 u/s ->  8,0 px       22 cuadros ->  436 u/s -> 13,1 px
14 cuadros ->  686 u/s -> 20,5 px
```

**Los tramos se acortan para que HAYA rebote, no para que vaya más rápido.** Es la diferencia entre
elegir una duración y despejarla.

### El regalo: el rebote sale proporcional solo

En el abanico de la PIEZA-L las seis placas tienen la misma expresión y los mismos números. La que
viaja 396 px rebota **9,7**; la que viaja 132 px rebota **3,2**. Nadie las calibró por separado: la
velocidad de llegada lo resuelve. **Ninguna curva Bézier puede hacer eso** — con una curva, las seis
llegarían con el mismo carácter y habría que animar seis veces.

### Compuerta que falta y que es barata

Sobre el horneado, sin renderizar: **si una propiedad declara rebote y su valor extremo posterior a la
clave es igual al valor de la clave, está rota.** Tres causas conocidas, las tres sin síntoma: falta el
corrimiento `frameDuration/10`, las claves tienen ease, o el gesto es demasiado lento.

---

## LEY · "el gesto empieza en cero" sólo funciona si el objeto YA ESTÁ en escena

El usuario, viendo la PIEZA-L: *"esos cuadrados que aparecen al fondo son raros, no salen de algún
lado, simplemente aparecen"*.

Tenía razón y el defecto era mío: las seis placas entraban en el cuadro 118 y **recién después** se
abrían. O sea seis capas prendiéndose de la nada. La idea de que "el despliegue ES la entrada" es
buena, pero exige que el objeto esté **vivo y visible antes de moverse**.

**El arreglo son dos números:** entran en el cuadro 56 —cuando la píldora ya se abrió— exactamente
superpuestas. Como la de adelante es opaca y está arriba en la pila, **no se ve ninguna de las otras
cinco**: en el cuadro 100 hay UNA placa en pantalla. En el 120 se abren y parecen salir de abajo de la
que ya estaba, que es exactamente de dónde salen.

> Un objeto que aparece se lee como un error de armado. Un objeto que **sale de otro que ya estaba** se
> lee como una decisión. Y cuesta lo mismo.

---

## LAS TRES EXPRESIONES QUE VALE LA PENA TENER A MANO

Salen del proyecto propio del usuario, no de un tutorial. Se escriben con `lineas([...])` porque **un
salto de línea crudo dentro de una cadena de ExtendScript es un error de análisis** y mata el archivo
entero:

```javascript
var NL = String.fromCharCode(10);
function lineas(arr) { return arr.join(NL); }
```

### 1 · REBOTE INERCIAL — después de la última clave

```javascript
n = 0;
if (numKeys > 0) { n = nearestKey(time).index; if (key(n).time > time) { n--; } }
t = (n == 0) ? 0 : time - key(n).time;
if (n > 0) {
  v = velocityAtTime(key(n).time - thisComp.frameDuration / 10);
  amp = 0.06; freq = 1.8; decay = 5;
  value + v * amp * Math.sin(freq * t * 2 * Math.PI) / Math.exp(decay * t);
} else { value; }
```

**`amp` NO ES EL SOBREPASO**, y decirlo así —como estaba escrito acá antes— manda a calibrar a ojo un
número que no significa lo que parece. El pico cae en `t = 1/(4·freq)` y ahí el amortiguamiento ya se
comió la mitad:

```
sobrepaso_real = v · amp · exp(−decay / (4·freq))
```

Con 0,06 / 1,8 / 5 eso da `v · 0,030`: el **3% de la velocidad de llegada**, y `v` está en unidades por
segundo. Con los 1416,9 px/s medidos en el proyecto del usuario son **42,4 px** sobre un cuadro de 2061.
**Se elige cuántos píxeles se quiere sobrepasar y se despeja `amp`.**

Los otros dos: **`freq`** es sólo la velocidad del coleteo (1,8 → período 0,556 s) y no toca cuánto
sobrepasa. **`decay`** es el número acoplado al montaje: con 5, cada oscilación vale un cuarto de la
anterior y la cola muere a los ~0,7 s.

Va sobre **posición, escala o tamaño**, y funciona con claves LINEALES: no hace falta ease.

### 2 · ESCALONADO POR CARÁCTER — una cascada, no un barrido

```javascript
delay = 0.05;
t = time - inPoint - textIndex*delay;
if (t < 0) value
else { a = 150; f = 2.1; d = 8; a*Math.cos(f*t*2*Math.PI)/Math.exp(d*t); }
```

**Va en un SELECTOR DE EXPRESIÓN, que es un tipo de selector aparte** — `ADBE Text Expressible
Selector`, con la expresión en `ADBE Text Expressible Amount`. No es un selector de rango con otra
configuración: un rango da un **barrido** y esto da una **cascada de rebotes independientes**, porque
la expresión se evalúa una vez por carácter con `textIndex` disponible.

**TODAVÍA NO VIAJA** — el exportador lo rechaza con nombre (`selector de texto no soportado`). El
reemplazo que sí viaja: **una capa por carácter** (convención `letra-<i>-<c>`) con el rebote de arriba
en su posición y el `inPoint` corrido `i * delay`. Da lo mismo y hornea perfecto.

### 3 · SEGUIMIENTO CON RETARDO — el secundario, gratis

```javascript
thisComp.layer("A-rebote").transform.position.valueAtTime(time - 0.1)
```

Un segundo elemento que copia al primero un décimo de segundo tarde. Es la forma más barata que existe
de tener animación secundaria: cero claves.

---

## DOS NOMBRES DE PROPIEDAD QUE NO EXISTEN Y MATAN EL SCRIPT

`addProperty` con un matchName inválido **tira**, y `property()` con uno inválido devuelve **null**: las
dos cosas matan el archivo entero, no la línea. Comprobados en esta sesión:

- **`ADBE Text Scale`** — no existe con ese nombre
- **`ADBE Text Selector Max Amount`** — no existe; el nivel de un selector de expresión es
  `ADBE Text Expressible Amount`

La forma de averiguarlo sin adivinar es **leer un proyecto que ya lo tenga**: `sondas/disector.jsx` abre
cualquier `.aep` y vuelca matchNames reales.

---

## EL DISECTOR: leer proyectos ajenos es la única forma de salir de los propios puntos ciegos

```bash
printf '<ruta al .aep>' > C:/ae-probe/disector-proyecto.txt
node tools/ae/llamar.mjs tools/ae/sondas/disector.jsx
```

Vuelca comps, capas, texto, efectos **con sus parámetros**, expresiones **con su cuerpo** y claves **con
sus influencias y velocidades**. No guarda nada: abre para leer y descarta.

**Por qué importa:** todo lo que este repo sabía de AE salía de sondas escritas acá mismo, o sea que los
puntos ciegos propios se propagaban a las mediciones. El selector de expresión, la precedencia de las
expresiones sobre las claves y la distribución real de influencias son tres cosas que **no se le habrían
ocurrido a nadie ir a buscar**. Aparecieron leyendo proyectos de otra gente.

Tipos de interpolación en el volcado: **6612 LINEAL · 6613 BEZIER · 6614 HOLD**. Una influencia de
**16,667 es el defecto**: si casi todas las claves la tienen, la suavidad viene de otro lado y hay que
buscar de dónde.

---

## LEY · la tipografía pasa por TRES manos y las tres fallan calladas

Una pieza de este motor pide la misma familia tres veces, a tres motores distintos, y **ninguno avisa
cuando no la tiene**: dibuja con la sustituta y sigue.

| quién | para qué | cómo falla |
|---|---|---|
| **AE** | componer y medir con `sourceRectAtTime` | sustituye y sigue |
| **Chromium** | dibujar el texto vivo del motor | `comp3d.html:610` cae a `sans-serif`, callado |
| **Skia** (`@napi-rs/canvas`) | **hornear los PNG de recursos** | `g.font` acepta cualquier cadena |

El daño no es "sale otra tipografía": es que **sale otra en la mitad de la pieza**. Una captura de app
horneada con la sustituta al lado de un titular vivo con la buena no se distingue en una tira
reescalada — se distingue cuando el usuario abre el video.

**Cómo se comprueba, midiendo:** se pide una familia que seguro no existe y se anota el ancho — esa es
la sustituta. Después se mide cada candidata: si da **exactamente** ese ancho, no está.
`tools/ae/fuentes-skia.mjs` lo hace, y lleva **control negativo** (dos nombres imposibles tienen que
medir lo mismo, o el método no separa nada y aborta).

```bash
node tools/ae/fuentes-skia.mjs
```

Medido en esta máquina, 15 de 26 familias existen en Skia. Los tres hallazgos que importan:

- **`"Century Gothic"` existe (892,13 px) y `"CenturyGothic"` NO (841,89 = la sustituta).** Es la misma
  fuente: AE la pide por su nombre PostScript, sin espacio, y Skia por el nombre de familia, con
  espacio. **Copiar la constante del `.jsx` al generador es exactamente el error**, y no da ningún
  síntoma.
- **`"Segoe UI Light"` y `"Arial Black"` no existen** en Skia: son **pesos**, no familias. Van como
  `g.font = 'bold 72px "Segoe UI"'`.
- **Poppins, Inter, Montserrat, Futura y Avenir Next no están.** La geométrica que hay es Century
  Gothic, y ya estaba medida en AE con 0,20% de desvío — el mejor de once.

`recursos-k/lib.mjs` no confía en esto: `pedirFuente()` mide contra la sustituta y **tira** en vez de
devolver un PNG con la tipografía equivocada. Una limitación que no es una compuerta no existe.

---

## El veredicto de la PIEZA-J: "no está mal, pero esperaba más calidad"

Las siete compuertas en verde y el usuario, al ver el video: *"me hubiera gustado ver más dinamismo y además
ver algún objeto 3D como un celular, una tablet o una laptop. Está como muy vacío el video también, el
fondo es demasiado simple."*

Tres cosas distintas, y ninguna la mide ninguna compuerta:

1. **VACÍO.** La PIEZA-J tiene, en el cuadro típico, **un objeto y un texto**. Los avisos del género
   tienen una capa de fondo con textura o profundidad, el objeto principal, elementos de apoyo y el
   texto. `ritmo` cuenta gestos y `escena` cuenta visibilidad; **ninguna cuenta CUÁNTAS COSAS HAY.**
2. **FONDO DEMASIADO SIMPLE.** Un color plano con tres líneas al 34% no es un fondo, es un vacío teñido.
   Y viene de una decisión defendible —"papel y tinta, nada brilla"— llevada hasta dejar la pantalla
   sin nada que mirar. *Austero* y *vacío* se escriben parecido en una ficha de arte.
3. **OBJETOS 3D DE VERDAD: un teléfono, una tablet, una laptop.** No un rectángulo con canto: **un
   objeto reconocible**. La tarjeta de la PIEZA-J es geométricamente 3D y semánticamente nada.

**La lección, que es la misma que ya está tres veces en este archivo con otra ropa:** las compuertas
verifican que lo que hay esté bien puesto. **No verifican que haya suficiente.** Una pieza correcta y
pobre pasa las siete.

> **Antes de dar una pieza por lista, contar el cuadro típico.** ¿Cuántos elementos distintos hay en
> pantalla en el segundo 10? Si la respuesta es dos, no está lista por más verde que esté todo.

Y una advertencia de método sobre *esta* sesión: pasé la mayor parte del trabajo persiguiendo métricas
—ocho vueltas sobre `ritmo`— y **los defectos que importaban aparecieron los nueve cuadros que miré al
final**: el titular desbordado, la ficha encima del texto, la tira de perfil, el texto sobre la parte
oscura. Ninguno lo dijo una compuerta. **Mirar cuadros no va al final: va intercalado.**

---

## Leyes que salieron de la PIEZA-I

**L21 · `addCamera(nombre, [x, y])` NO pone la cámara en (x, y): ese argumento es el PUNTO DE INTERÉS.**
La posición queda en `[0, 0, -zoom]`. Siempre, sin excepción:

```javascript
var cam = comp.layers.addCamera("camara", [ANCHO / 2, ALTO / 2]);
pos(cam).setValue([ANCHO / 2, ALTO / 2, -1900]);   // ANTES de separar dimensiones
var ejCam = ejes(cam);
```

Medido en `sondas/ejes-prueba.jsx` (`JUN|4-camara-recien-creada|0,0,-2666.6666666`). Separar dimensiones
**sí** conserva los valores: `ejes()` está limpio, el problema es de dónde parte.

**L22 · El eje que no animás es el que queda roto.** Corolario de L21 y vale para cualquier propiedad:
si una propiedad arranca con un valor equivocado y le ponés claves a dos de sus tres componentes, esas
claves **tapan el error donde tocaste** y lo dejan vivo donde no. El síntoma queda reducido a un tercio,
que es justo lo suficiente para parecer "algo raro" en vez de "esto está mal".

**L23 · Un PNG plano tiene UN estado.** Cualquier cosa que deba cambiar —un conmutador, una casilla,
una pestaña, una barra que se llena— tiene que salir del generador **partida en las piezas que se
mueven**. Si el estado activo es un píxel horneado, ninguna animación puede cambiarlo y el defecto es
del recurso, no de la coreografía. En `recursos-h.mjs`, las piezas que se superponen se dibujan en
**lienzos del mismo tamaño y en las mismas coordenadas**: así alinearlas en AE no es una cuenta que se
pueda errar sino la misma posición y la misma escala.

**L24 · Los objetos de uniform se crean ANTES de `onBeforeCompile`, nunca adentro.** three llama a ese
gancho en el **primer dibujo** del material, no al crearlo; con los uniforms creados adentro, el bucle
que los escribe se saltea en el primer cuadro y el shader arranca con sus valores iniciales. Síntoma:
**sólo el primer cuadro de cada tanda sale mal**, en silencio. Rendericé `555,530` y el 555 salió con el
arco entero y sin nada de desenfoque; renderizados al revés, el que fallaba era el otro. Casi arreglo la
función equivocada por eso.

**L25 · La tira a 1:3 sirve para composición y MIENTE sobre el detalle.** Escondió tres paneles cortados
y un desenfoque con fantasmas triples. Después de la tira, abrir **uno o dos cuadros a resolución
nativa**, y si hace falta recortar la zona en cuestión. `Read` de un PNG de 1920 lo reescala.

**L26 · Un control negativo que no dispara, o que dispara por otra rama, no prueba nada.** Los dos casos
me pasaron el mismo día en `gesto-check`: congelé una capa y la compuerta siguió verde con razón (otra
capa aún reaccionaba); congelé todas y disparó por "el click cae sobre el vacío" en vez de por "nada
cambió". Un control tiene que apagar **todas** las salidas del caso y disparar **por la rama que se
quiere probar**.

**L27 · Un anillo de progreso sin su cama no es un anillo: es un círculo roto.** El llenado sólo
significa algo contra la referencia de lo que falta. El mínimo del género son cuatro capas: cama al
16%, llenado, un aro fino exterior girando al revés (por **desfase del recorte**, no por rotación de la
capa: una capa que rota entera delata su costura) y una cabeza de luz en modo Añadir pegada a la punta.
Para que la cabeza vaya clavada, **el llenado va lineal** — emparejar una bezier exigiría resolverla en
ES3; y además un progreso lineal es lo correcto, la aceleración la ponen la entrada y el remate.

**L28 · El foco sigue al sujeto.** La distancia de enfoque es `z de la capa + |z de la cámara|` en ese
cuadro, y hay que **animarla por tiempo**. Dejarla fija dejó los tres paneles de la PIEZA-I fuera de
foco, cada uno siendo el sujeto del suyo, y eso no se lee como "está desenfocado" sino como "se ve raro".
`foco-check.mjs` da los números sin renderizar.

---

## AE PUEDE ESCRIBIR CUADROS SUELTOS, y eso cambia cómo se verifica

`comp.saveFrameToPng(tiempo, archivo)` **existe y anda**. Es **asíncrona** —la llamada vuelve enseguida
y el archivo aparece después, igual que `AfterFX.exe -r`— y escribe con **alfa real**: fuera de la
máscara `a=0`.

**No contradice la arquitectura.** AE sigue sin renderizar el video: renderiza un cuadro para **medir**,
que es la misma categoría que `valueAtTime`. Y cuesta poco: cuatro cuadros en 0,5 s.

Hizo falta porque con las máscaras se acabó el camino de siempre. Está medido en `sondas/mascara.jsx`:
**`sourceRectAtTime` NO refleja las máscaras** — un sólido de 400×300 sigue midiendo 400×300 con la
máscara puesta, invertida, con calado, con expansión, con opacidad y con varias máscaras en los seis
modos. Sin un número que dependa de la máscara no hay compuerta; con píxeles, sí.

`tools/ae/cuadro-ae.mjs` la maneja y **espera los archivos**, incluso a que dejen de crecer: AE crea el
PNG y después lo llena, así que uno a medio escribir se lee corrupto o —peor— entero y con la mitad en
negro.

## Las máscaras: alfa por píxel en coordenadas de CAPA

**La decisión de diseño, y por qué esa.** La máscara de AE no es un volumen ni un recorte geométrico:
es un **alfa por píxel en el espacio de la capa**. El modelo fiel es entonces una **textura de alfa en
ese mismo espacio**, multiplicada en el fragmento. Descartadas con motivo:

- **planos de recorte** — sólo sirven para polígonos convexos, y un rombo restado no lo es
- **stencil** — obliga a limpiar y dibujar por capa **y por submuestra**, y el obturador hace hasta 16
- **triangular el trazado** — no sabe hacer calado, que es la mitad del efecto

Este repo ya pagó caro haber modelado el matte de pista como un prisma **en el espacio equivocado**.

**Y el trazado animado viaja MUESTREADO, un cuadro por vez.** AE no interpola trazados de forma
reproducible: medido, entre un triángulo de 3 vértices y un cuadrado de 4 devuelve **4**, con el
vértice insertado en el **42% del lado**, no en el medio; con 4 contra 6 devuelve 6. Hay una heurística
de emparejamiento sin documentar. Pero `valueAtTime` **sí** devuelve el trazado ya interpolado en
cualquier instante, así que el exportador no reproduce la interpolación: **la muestrea**. Exacto por
construcción. Y se rasteriza **una vez por cuadro, no por submuestra**: entre las 16 submuestras el
trazado no cambia.

**Lo que se midió y no se deduce:**

- los vértices vienen en **coordenadas de capa** y las **tangentes son RELATIVAS al vértice** — una
  elipse de radio 110 devuelve tangentes de 60,753, que es 110 × 0,5523. Sumarlas como absolutas
  dibuja una maraña alrededor del origen, y no da error
- el átomo tiene exactamente cuatro hijas: trazado, calado, opacidad y expansión
- el **modo y la inversión son atributos del objeto**, no propiedades: **no se animan**
- el enum va de **6812** (ninguno) a **6818** (diferencia)

**Rechazado por nombre:** rotobezier (AE calcula las tangentes solo, con otra curva, así que los valores
que devuelve el trazado no describen la forma que se ve) y el calado variable por vértice.

## LEY · la ORIENTACIÓN va encima de las rotaciones, y AE la pone sola al emparentar

```
M = T(pos) · Orientación(XYZ) · Rx · Ry · Rz · S · T(−anclaje)
```

**AE le asigna una orientación sola a cualquier capa que se emparenta**, para conservar su orientación
en el mundo — el mismo mecanismo que ya hace con la posición. Un hijo al que sólo le pusiste
`rotacionY = 45` termina con `orientacion = [300,36 · 8,42 · 300,36]` que nadie escribió.

El motor la componía al revés (`Rx·Ry·Rz · Ori`) y **eso sólo se nota cuando las dos son distintas de
cero** — con una sola, los dos órdenes dan idéntico. Medido: 30,3 y 39,8 px de error contra 1,4 y 1,2.
Un hijo emparentado y rotado se desviaba hasta **388% de área**.

*El comentario del código decía "fórmula medida, probando los seis candidatos". Estaba medida y estaba
mal: esa medición nunca puso las dos a la vez.*

### Y como AUTOR: después de emparentar, poné la rotación Y LA ORIENTACIÓN en cero

La regla que ya estaba escrita es *"el padre primero, la posición después"*. **No alcanza.** AE
reescribe los valores del hijo para conservar su transformación en el mundo, y eso **incluye los
ángulos**: si el padre tiene `ry = −104` en el momento en que colgás al hijo, AE le escribe `+104` al
hijo para compensar.

En la PIEZA-J la tira de seis escenas quedó **girada 104°** — de perfil, 17 px de ancho en vez de 155,
y 330 unidades detrás de la tarjeta. Sin ningún error: la tira estaba ahí y se movía.

```javascript
capa.parent = eje;                                            // 1 · el padre
tr(capa).property("ADBE Orientation").setValue([0, 0, 0]);    // 2 · la orientación
tr(capa).property("ADBE Rotate X").setValue(0);               //     y las tres rotaciones
tr(capa).property("ADBE Rotate Y").setValue(0);
tr(capa).property("ADBE Rotate Z").setValue(0);
pos(capa).setValue([x, y, z]);                                // 3 · recién ahora la posición
```

**Lo que más enseña: las caras de la tarjeta no lo sufrían, y yo no sabía por qué.** `cara()` fija
`rotacionX` y `rotacionY` después de emparentar — no para arreglar esto, sino porque cada cara necesita
su ángulo. Era lo único que las salvaba. El nulo de la tira no llevaba ángulo propio, así que nadie
pisó lo que AE había inventado. **Un arreglo que funciona por casualidad protege sólo al archivo donde
está.**

Y el síntoma que llega no nombra la causa: `escena-check` informa *"66 cuadros: se mueve sin verse
(tapada)"*. "Tapada" es su hipótesis por descarte, no una medición de rotación.

---

## Las compuertas eran per-capa, y ahora las piezas son OBJETOS de varias capas

Cuatro errores distintos, todos de la misma familia, todos encontrados autorando la PIEZA-J. **Las
métricas se escribieron cuando cada capa era una cosa; el catálogo ahora pide armar objetos con
planos** (F13, X13, X10), y un objeto es un grupo de capas colgadas de un nulo.

| dónde | qué informaba | por qué era falso | qué se hizo |
|---|---|---|---|
| `ritmo` energía | un volteo de tarjeta de 180° medía **cero** | los cuatro términos eran centroide, escala declarada, rotación **Z** y opacidad. Un giro en Y sobre el propio centro no toca ninguno | término nuevo `dForma`: cuánto se movieron las esquinas **después de sacarles la traslación**. Ve el giro 3D, el acercamiento en Z y el escorzo. **Reemplaza** a `dEsc`, no se le suma: medían lo mismo en dos unidades |
| `ritmo` M7 | 149 cuadros de "empate de profundidad" | la cara y el dorso de una tarjeta están a la **misma distancia** cuando está de perfil, y eso pasa en **todo** volteo — la transición que 8 de 8 avisos usan | se eximen dos capas con el **mismo padre**: su orden lo fija la construcción |
| `escena-check` | 5 barras "se mueven sin verse", tapadas por una tarjeta que en pantalla está **detrás** | la oclusión se decidía sólo por profundidad, y una capa 2D no tiene: queda en z=0, así que cualquier sólido 3D con z negativo la tapaba | una capa 3D no puede tapar a una 2D |
| `escena-check` | 7 caras "gastan movimiento sin verse" (el dorso 90 cuadros) | el dorso de un objeto sólido está atrás. Es la definición de sólido | misma exención de padre común |

**Las cuatro se verificaron contra las PIEZAS B, C, D e I antes de aceptarlas: veredicto idéntico en
las cuatro, antes y después.** Un cambio de métrica que sólo mejora la pieza propia es sospechoso, y
esa comprobación es barata — los documentos ya están en `C:/ae-probe/`.

```bash
for p in pieza-b-doc pieza-c-doc pieza-d-doc pieza-i; do node tools/ae/ritmo.mjs C:/ae-probe/$p.json | grep -oE "RITMO (OK|NO PASA).*"; done
```

### Lo que sigue abierto, con número

`ritmo` **no ve los animadores de texto ni los revelados por máscara** — ya estaba anotado, y la
PIEZA-J lo confirmó tres veces más: el tecleo (92-130), la ondulación (296-356) y la interletra
(474-528) son los tres huecos más largos que informa M6, y en los tres hay movimiento en pantalla.
Un animador no mueve la caja de la capa y una máscara no mueve la capa. **Hasta que se cierre,
contrastá cada hueco de M6 contra qué técnica vive ahí antes de tocar la pieza.**

Y uno nuevo, medido: **el umbral de arranque es el 25% del pico DE LA PROPIA CAPA**, así que el gesto
más grande de una capa esconde a todos sus gestos chicos. La tira hacía cuatro clics de 176 unidades y
ninguno contaba, porque su desvanecido de entrada de 12 cuadros daba 1,29e-3 por cuadro contra 2,95e-4
de un clic — 4,4 veces más. Alargando ese fundido a 24 cuadros los clics pasan al 45% y aparecen.
**Doce cuadros de diferencia deciden si cuatro gestos existen o no.**

---

## Un gesto grande de 3x a 25x, no de 375.000x

La PIEZA-J mandaba la tarjeta a `z = −1750` con la cámara en −1960: **la atravesaba**. Medido, ese
gesto dio **374 de energía contra una mediana de 0,001**. Con eso, `ritmo` encontraba **dos cuadros con
energía en toda la pieza** y las otras seis métricas medían ruido.

Es el error de la PIEZA-H otra vez, con otra cara: tomar el extremo por norma. El barrido de ocho
avisos dice **3x a 25x, una a tres veces por pieza**. Bajado a un empuje de **2,08x** (`z = −1030`), la
cresta cayó de 360.000 a 383 y aparecieron 56 cuadros con energía en vez de 2.

**Y el tope de un empuje no lo pone el gusto: lo pone el cuadro.** A 2,46x una tarjeta de 760×470 mide
1824×1128 en un cuadro de 1080 de alto, y sus cantos se van de pantalla ocho cuadros — justo cuando el
gesto pide que la miren. 2,08x entra entera.

---

## Crema sobre crema no es una paleta

La PIEZA-J se escribió "papel y tinta": fondo hueso `#f2efe9`, tarjeta `#e5e0d8`, rueda `#d4cec6`.
Leído suena a dirección de arte. `escena-check` lo desarmó en un renglón: **1,14:1 entre la tarjeta y
el fondo**, con un piso de 1,8:1, y **treinta pares por debajo**. El objeto que sostiene los 24
segundos era casi invisible contra su fondo.

Arreglarlo produjo la mejor idea de la pieza: **el suelo pasó a papel tostado y la tarjeta quedó blanca
de un lado y tinta del otro**, así que cada volteo cambia el mundo entero de claro a oscuro —X18,
gratis, sin una capa más— y el texto elige su color según qué cara esté mirando. **La restricción
produjo la idea; sin la medición me quedaba con la versión bonita e ilegible.**

Dos cuentas para no volver a caer:

- **El rango útil se cierra rápido.** Si el suelo tiene luminancia relativa L, todo lo que caiga sobre
  él necesita `L' ≥ 1,8·(L+0,05) − 0,05` o `L' ≤ (L+0,05)/1,8 − 0,05`. Con un suelo medio (L≈0,44) los
  tonos intermedios **no existen**: hay que irse a claro o a oscuro.
- **Y a veces no hay solución y hay que cambiar la figura.** La rueda de seis paneles necesitaba seis
  tonos distinguibles de a pares que además se distinguieran de la cara de la tarjeta, y en el rango
  útil (L de 0 a 0,51) **no entran seis escalones de 1,8:1**. Pasó a ser una **tira**, que no se pisa
  nunca — y es la misma técnica, X10 se llama "tira / carrusel". No era falta de paciencia.

---

## Los recortes de trazado NO VIAJAN al motor

F01 (crecer desde el borde) y F02 (barra que se llena) están escritos en el catálogo como recorte de
trazado sobre una capa de forma. **El exportador los rechaza, por nombre y con motivo:**

```
LO QUE NO VIAJA:
  capa 3: el CONTENIDO de la forma esta animado y la rasterizacion lo congela
DOCUMENTO INCOMPLETO — 4 cosa(s) quedaron afuera.
```

Las formas viajan **rasterizadas**, así que un recorte animado llegaría congelado: el rectángulo entero
desde el cuadro 0. Lo que sí viaja es la **transformación**.

**Una barra que crece es ESCALA DESDE EL ANCLA**, no un recorte:

```javascript
tr(s).property("ADBE Anchor Point").setValue([0, grosor / 2]);   // el ancla en la punta que NO se mueve
pos(s).setValue([xIzquierdo, y]);
claves(esc(s), [[c0, [0, 100], "C2"], [c1, [100, 100], "C1"]]);
```

Y para un contorno que se dibuja, **cuatro barras en secuencia** en vez de un recorte sobre un trazado
cerrado — que además se ve mejor, porque se ve la punta viajando por el rectángulo.

*Esto es el rechazo con nombre funcionando exactamente como la skill pide: no me enteré leyendo un
comentario, me lo dijo la máquina cuando intenté hacerlo.*

---

## Los objetos 3D se arman con PLANOS, no con el motor Cinema 4D

`comp.renderer = "ADBE Ernst"` se acepta, expone extrusión y materiales, y la API dice que no se apaga
nada — pero **al renderizar tira `Cinema 4D: Error de procesamiento (5070 :: 0)`**. Es la razón por la
que hay que mirar el píxel: una función puede seguir declarada y dejar de dibujarse.

Lo que el género usa de verdad son planos armados en el espacio, y eso ya funciona:

| figura | cómo se arma | desvío contra AE |
|---|---|---|
| caja | 6 planos colgados de un nulo | 0,20% – 2,26% |
| tarjeta con peso | cara + dorso + 4 cantos finos | 0,34% – 0,39% |
| carrusel | rueda de paneles mirando afuera | 2,47% – 7,21% *(afectado por el defecto de arriba)* |

**Y el padre va PRIMERO, la posición después.** AE, al emparentar, recalcula los valores del hijo para
conservar su posición en el mundo: si ponés la posición pensándola relativa al padre y después
emparentás, las capas terminan alrededor del origen de la composición. Me costó dos mediciones
buscando un defecto de orden de dibujo que no existía.

## El calado: AE lo mide como RADIO, y la rampa va centrada en el trazado

Medido con seis calados y un cuadro de AE (`sondas/calado.jsx`), no elegido:

| calado | 8 | 16 | 26 | 40 | 64 |
|---|---|---|---|---|---|
| ancho total de la rampa | 17 | 33 | 54 | 82 | 130 |
| rampa de 5% a 95% | 13 | 23 | 37 | 55 | 87 |

El ancho total es **2 × calado** y el cruce del 50% **no se mueve** en ninguno de los seis: el calado es
el radio y la rampa está centrada en el trazado. La rampa de 5-95% mide **1,40 × calado**, que para una
gaussiana es 3,29 σ → **σ = 0,426 × calado**. `blur()` de CSS toma la desviación estándar, así que va
directo. Yo usaba 0,5 y el borde salía más blando: 20 px de rampa donde AE hace 15.

**Y el lienzo de la máscara lleva margen, o el calado se come a sí mismo.** Rasterizar justo en la caja
de la capa mete un **borde falso**: el desenfoque chupa transparencia desde el filo del lienzo. Con
calado 64 sobre una capa de 90 px de alto, la rampa pasó de 87 px (AE) a **671** — el alfa no saturaba
en ningún lado. Con calado 26 no se veía. El margen es `(calado + |expansión|) × 1,6`.

Residual honesto tras el arreglo: entre 2,7% y 6,9% de ancho de rampa en los calados medios y 15% en el
de 8 (que son 2 px). Es una gaussiana aproximando un perfil que no lo es.

## Probé los modos que implementé — y estaba mal

La primera sonda de máscaras ejercitó **suma, suma+resta y calado**, y la compuerta dio 0,007%. Eso
probó lo que programé, no la función. `mascara3.jsx` cubre los doce casos, y de ahí salieron dos cosas:

- **un `calado + expansión` juntos fallaba al 1,770%** — nadie lo había tocado
- y quedó medido lo que yo había supuesto: una primera máscara en **restar** o **intersecar** **sí** se
  siembra con la capa entera (8200 y 36000 píxeles, exactamente los números geométricos)

Después del arreglo, los doce entre 0,000% y 0,049%.

**Y una carpeta por composición para los cuadros de AE.** Con una sola carpeta y los cuadros nombrados
por número, dos composiciones se pisan: correr la compuerta sobre A y después sobre B compara los
cuadros de AE de A contra los del motor de B. Acá lo cazó la diferencia de tamaño — con dos
composiciones **del mismo tamaño habría dado verde sobre piezas distintas**.

## El trazo que se dibuja, y el morphing

Segundo caso de forma que viaja **vectorial** en vez de rasterizada, y éste sí generaliza: un trazado
libre con trazo y/o relleno, y opcionalmente *recortar trazados*. Es el subrayado que crece, la flecha
que se dibuja, el contorno que aparece y el morphing.

**Se acota a propósito.** Un grupo, y adentro sólo trazados libres, trazo, relleno y recorte. Cualquier
otra cosa —repetidores, fusionar trazados, degradados, grupos anidados, formas paramétricas, guiones—
sigue rasterizándose. Y **el vector le gana al raster**: el exportador manda las dos cosas, y sin un
`&& !capa.forma` en la rama del raster, ésa agarraba la capa primero y la del vector no corría nunca.
Las seis figuras salieron en negro, sin un solo error. *Un `else if` de más arriba se come al de más
abajo y no lo dice nadie.*

**La semántica del recorte, medida con cuadros de AE** (`sondas/trazo.jsx`), no leída:

| medido | resultado |
|---|---|
| recta de 300 px, recorte 0-50 | **150 px** → por longitud de arco |
| ELE de 300+100, recorte 0-50 | **200 px del tramo horizontal y nada del vertical** → la longitud corre sobre el trazado entero, no por segmento |
| desfase 25 sobre un trazado de 400 | corrió **28 px** = 25/360 × 400 → **el desfase está en GRADOS** |
| dos subtrazados de 140, recorte 0-50 | 0..69 y 180..249 → **cada uno por su lado** |
| remate redondo, grosor 24 | sobresale **12 px** = medio grosor |

El desfase en grados es la trampa: nadie la deduce, y con ella mal el trazo arranca en el lugar
equivocado sin que nada falle.

Verificado contra AE: **0,003% de alfa · 0,056% de color.**

## Una sección de DIAGNÓSTICO no puede matar a la sonda que diagnostica

`sondas/trazo.jsx` tenía al final un volcado de estructura —puro diagnóstico, para ver los matchName— y
falló dos veces por motivos distintos: pedirle `.value` a un grupo, y usar una referencia que quedó
inválida al agregarle otra propiedad al grupo (la misma trampa del selector de texto). Cada vez mató la
sonda **entera**, justo antes de crear la cámara. Sin cámara, el capturador elige el reproductor 2D,
que no dibuja formas vectoriales, **y todo salía en negro**.

Dos vueltas perdidas diagnosticando el motor por culpa del diagnóstico. **El volcado va al final y en
su propio `try`**, y si falla se informa como `ESTRUCTURA_FALLO` en vez de llevarse la sonda puesta.

## El tecleo se hace con un ANIMADOR, no con una capa por letra

**Es la ley que más baja el costo de una pieza.** La escritura por carácter aparece en **8 de 8**
referencias del género; hasta ahora se falseaba con un rótulo por letra, y ese costo es la razón de
fondo por la que las piezas salían ralas — mientras cada gesto cuesta una capa, nadie escribe una pieza
densa. La frase del cometa de PIEZA-I pasó de **18 capas a 1**, y la pieza de 54 a 40.

El motor los reproduce, medido contra AE: `selector-check` (88 configuraciones, desvío 4,9e-5) y
`animador-check` (cuadro a cuadro contra `sourceRectAtTime`, peor 0,73%). La especificación completa
está en [reference/animador-de-texto.md](reference/animador-de-texto.md).

**Dos cosas que hay que saber o no es un tecleo:**

- **`ADBE Text Selector Smoothness` viene en 100 y hay que ponerla en 0.** A 100 cada letra se cubre a
  lo largo de un paso entero: es una cortina, no un tecleo. El corte seco **no** sale de fábrica.
- **Se anima el INICIO del rango, no el final.** Con `[inicio, 100]` en opacidad 0, subir el inicio
  descubre de izquierda a derecha. Animando el final se descubre al revés.

Y una ventaja que no es de costo: **la cabeza del cometa sale del mismo número que descubre las
letras**, así que van clavadas por construcción en vez de por coincidencia de dos mediciones.

**Lo que NO viaja**, rechazado por nombre en el exportador: orden aleatorio (el PRNG de AE), selector de
expresión, base distinta de caracteres, y toda propiedad de animador fuera de posición, escala,
rotación, opacidad, color de relleno, interletra y ancla.

**Y el reproductor 2D (`comp.html`) no los aplica, y lo declara.** `capturar-comp.py` lo elige cuando no
hay cámara ni capas 3D — o sea que la trampa caía justo en las composiciones más simples: el texto
salía puesto y quieto, que es *parecido*, que es peor que fallar.

## Leyes del motor — no son estilo, son fidelidad

Cada una costó al menos un render o una investigación. Detalle y medición en
`docs/AE-MCP/00-CUADERNO.md` (partes XIII a XVI, notas 80–95).

1. **La profundidad la decide el EJE de la cámara**, no la distancia al ojo ni el apilado. Medido
   contra AE con un caso que separa las tres hipótesis. Un rótulo 6 unidades delante de su tarjeta pero
   más abajo en el cuadro está más *lejos del ojo*: ordenando por distancia, desaparece detrás de ella.
2. **Ninguna capa 3D cruza a otra en Z**, y dos que se pisan nunca quedan a menos de 1 unidad.
3. **Una tapa de revelado va delante de su texto y DETRÁS de todo lo demás.** Si el texto está al
   frente, su tapa tiene que estar más al frente todavía — y entonces tapa el resto del cuadro. La
   salida es mandar el texto atrás, no achicar la tapa.
4. **Una tapa vive lo que dura su revelado.** Con punto de entrada y de salida. Una tapa que sobrevive
   a su gesto es un rectángulo opaco esperando a tapar algo.
5. **Una tapa se mide contra la TINTA, no contra el cuerpo de la fuente.** Once píxeles de texto
   asomando desde el cuadro 0 salen de este error.
6. **El punto de salida de AE es EXCLUSIVO**: una capa que sale en 4,80 s no se ve en el cuadro 144.
7. **El fondo es un sólido real** (el fondo de la composición no existe hasta la codificación), y si la
   pieza usa resplandor, ese sólido va en **3D y lejos**.
8. **Antes de su primera clave, una propiedad vale lo que diga esa clave.** Lo que no tiene que verse
   todavía se saca de escena con `inPoint`, no se confía en que su animación lo esconda.
9. **Las formas se rasterizan en t=0**: toda capa de forma entra en 0 y se esconde con opacidad.
10. **Dimensiones separadas siempre** en posiciones animadas: evita que AE le invente curvatura al
    camino (tangentes espaciales, que no se pueden portar). **Y también en la cámara.**
11. **El índice de una clave se pregunta por tiempo** (`nearestKeyIndex`), no se deduce de la posición
    en la lista: una segunda llamada que agrega claves anteriores corre todos los índices.
12. **La banda visible se calcula**: `540 * (|camZ| + z) / zoom` a cada lado de donde mira la cámara.
    Suponerla dejó una fila entera de tarjetas fuera del cuadro sus 144 cuadros.
13. **Poner una influencia PROMUEVE la clave a bezier de los dos lados**, y eso pisa el tipo del tramo
    anterior. `setTemporalEaseAtKey` no toca sólo la influencia: le devuelve la entrada a bezier a una
    clave que un tramo `C5` acababa de dejar en lineal, y el exportador la rechaza con "tipos
    mezclados". En la PIEZA-H fueron **64 tramos de golpe**. Los tipos se fijan **después** de las
    influencias, no antes — fijarlos antes es escribir algo que la línea siguiente borra, sin error y
    sin síntoma hasta que alguien exporta.
14. **Todas las claves de una propiedad en UNA sola llamada.** Es la única forma de que cada *tramo*
    quede con el mismo tipo en sus dos extremos. Una segunda llamada sobre la misma propiedad deja un
    tramo con salida lineal y entrada bezier.
15. **El centinela de `llamar.mjs` es la cadena literal `--- fin ---`.** Escribir "OK" hace que la
    llamada corra bien, construya todo y después espere cinco minutos una firma que no va a llegar.
    Va también en el `catch`, o un fallo se informa como cuelgue.
16. **Una capa de texto es UNA línea.** `limpio()` (`exportar.jsx:50-58`) convierte `\n` en **espacio** y
    el reproductor hace un único `fillText`. Un párrafo escrito como una capa multilínea sale
    `completo: true`, con todas las compuertas en verde, y en el video las líneas van corridas una atrás
    de otra. Un párrafo son N capas con la Y calculada a mano — `texto.interlinea` viaja y no lo lee
    nadie.
17. **Brillo y tapa son incompatibles.** Durante la pasada de resplandor sólo existen las capas de ese
    grupo (`comp3d.html:533`), y el resultado se suma aditivamente al final: **una capa con `brillo`
    escondida detrás de una tapa opaca brilla a través de ella.** Sin error, sin `NOSOP`, sin compuerta
    que lo mire.
18. **Si tocaste un reproductor, corré `reproductor-check.mjs` antes de renderizar.** Los dos son HTML
    con un `<script type="module">` adentro y nada los revisaba: `node --check` no lee HTML y el
    navegador recién se queja cuando ya se pagó una captura. En un solo día rompí la sintaxis **tres
    veces** —un salto de línea real dentro de comillas simples (dos veces) y un comentario con
    `backticks` adentro de un literal de plantilla— y las tres se manifestaron mal: render **negro de
    punta a punta** sin error visible, y `missing ) after argument list` cuarenta líneas más abajo. La
    compuerta corre en milisegundos y no abre un navegador.
19. **Una capa de texto que va a llevar interletra o cursiva NO está verificada visualmente todavía.**
    El tracking movía el origen 8,6 px (el navegador cuenta un espaciado de más después del último
    carácter y el punto de alineación sale de ahí; AE centra la tinta). Está compensado y **falta un
    cuadro para confirmarlo** — el ancho queda exacto al 0,10 %, así que ninguna compuerta lo ve.
20. **Cada modo nuevo hay que agregarlo a la guarda que protege el disco.** `capturar-comp.py` borraba
    la carpeta de salida mirando sólo `--solo-cajas`; al agregar `--cuadros` sin tocar esa guarda,
    pedir doce cuadros para mirar borraba un render entero. Una guarda escrita para dos modos no
    protege del tercero, y el que agrega el tercero es el que ya leyó la advertencia.

**Lo que el motor todavía NO sabe hacer** —fusión aditiva, recorte real, interletra bien medida, peso
variable, profundidad de campo— y cuánto costaría cada cosa, está en `reference/vocabulario-pendiente.md`,
separando lo verificado de lo propuesto.

### ExtendScript es ES3

Sin `let`/`const`/arrow/`map`/`JSON`. **`"" + error` es fatal** — usar `texto(x)`. La compuerta
`es3-check.mjs` se corre antes de cada llamada a AE. Los acentos van por `String.fromCharCode`: el
`.jsx` se guarda en UTF-8 y ExtendScript no garantiza leerlo así.

### Texto letra por letra sin perder el kerning

Medir **prefijos acumulados** con `sourceRectAtTime`: la diferencia entre "MI" y "M" es el avance de la
"I" con su par de kerning ya aplicado. **El espacio no tiene tinta**, así que su ancho se mide aparte
(`ancho("n n") − ancho("nn")`) y se le suma sólo al carácter que le sigue. Sin eso, "MISMO CUADRO" sale
"MISMOC UADRO".

---

## Llamar a AE

```bash
node tools/ae/llamar.mjs tools/ae/sondas/<pieza>.jsx     # ruta relativa OK, se resuelve a absoluta
```

- `AfterFX.exe -r` es **asíncrono** (~1015 ms de transporte, 2 ms de ejecución): conviene agrupar el
  trabajo en una llamada, no encadenar muchas.
- El buzón sale del nombre del script: `<pieza>.jsx` escribe en `C:/ae-probe/<pieza>.txt`.
- Si AE va a quedar solo un rato, dejar el vigilante de carteles corriendo (`tools/ae/guardian.ps1`) y
  **apagarlo al terminar**.
- AE acumula caché: después de una sesión larga puede tener 11 GB. `C:/ae-probe/purgar.jsx` los suelta.

## Aviso antes de trabajo pesado

Rige CLAUDE.md. Un render de 450 cuadros a 1 muestra es ~5 min de ventiladores; **con obturador real
(16 muestras) son 7200 capturas, ~35 min**, y eso se avisa y se espera el OK. Medir RAM y aplicaciones
abiertas antes, no suponerlas.

## Archivos

**Dirección de arte** (leer en el paso 1): `reference/direccion-de-arte.md`
**Cómo se mueve un titular** (leer antes de animar texto): `reference/movimiento-medido.md` — medido a
30 fps sobre la referencia, más los números de cascada (desfasaje, ventana, la razón desfasaje/duración)
**Lo que el motor no sabe hacer, y cuánto cuesta**: `reference/vocabulario-pendiente.md`
**Catálogo de técnicas**: `docs/AE-MCP/catalogo/` — ver la tabla del paso 2
**Todo lo medido, con el defecto que lo produjo**: `docs/AE-MCP/00-CUADERNO.md`
**Compuertas**: `tools/ae/ritmo.mjs` · `tools/ae/escena-check.mjs` · `tools/ae/lectura-check.mjs` · `tools/ae/colision-check.mjs` · `tools/ae/es3-check.mjs` · `tools/ae/comp-check.mjs` · `tools/ae/reproductor-check.mjs`
**Medir un género**: `tools/ae/bajar-refs.sh` + `tools/ae/barrer-refs.sh` + `tools/ae/medir-referencia.mjs`
**Medir una referencia**: `tools/ae/medir-titular.mjs` (alto de tinta cuadro a cuadro)
**Piezas de referencia**: `tools/ae/sondas/pieza-c.jsx` (la más completa; 7/7 en ritmo y floja de arte)
· `tools/ae/sondas/pieza-h.jsx` (34 tiempos, 60 s; sólida y con el movimiento del texto mal copiado —
ver el modo de fallo 4)

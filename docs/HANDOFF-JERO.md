# Contexto para seguir la auditoria del MOTOR 3D

Escrito el 2026-07-31 al final de una sesion larga con Thiago. Si estas leyendo esto en tu chat,
esto es lo que hay que saber para seguir sin repetir trabajo ni volver a cometer los errores que ya
se cometieron.

---

## 1. Donde estan los pendientes

**`docs/AUDITORIA-MOTOR.md`** — es el unico lugar. Cada hallazgo trae:

- **Sintoma** — que se ve, con el numero medido.
- **Lo dispara** — que contenido o que semilla lo hace aparecer.
- **Compuerta** — cual deberia haberlo cazado y por que no lo hizo.
- La linea de codigo, textual.

**Como se cuenta, y no es un detalle:** una fila `- [ ] **archivo:linea**` es UN hallazgo y se
cuenta. Una fila que empieza con `- SEGUIMIENTO` NO es un hallazgo — es una nota sobre el estado de
otro — y no se cuenta. Esa distincion existe porque el contador ya mintio: se tildaron 6 casillas
para 5 trabajos porque una nota de seguimiento tenia el mismo formato que un hallazgo. Thiago lo
noto y por eso el encabezado del documento ahora lo dice explicito.

**EL NUMERO NO SE ESCRIBE ACA, SE CALCULA.** Estaba a mano y quedo diciendo '36 abiertos / 64
cerrados' cuando ya eran 29 / 74: dos copias de un numero son dos numeros distintos en cuanto alguien
cierra un hallazgo. Es la segunda vez que el contador de esta auditoria miente, y la primera esta
contada en el encabezado del propio documento.

```
node tools/auditoria-conteo.mjs
```

Y lo importante es el DESGLOSE, no el total: de los abiertos, mas de la mitad no son defectos del
motor sino objeciones de los criticos al plan, compuertas que habria que escribir, y los dos temas
EXTRA. Al 2026-08-04 los defectos reales son **12**.

Estan agrupados por gravedad: *Rompen la pieza*, *Se notan*, *Menores*. Y al final hay dos secciones
que NO son hallazgos:

- **`EXTRA — para charlar despues, NO hacer ahora`**: dos temas que Thiago quiere discutir cuando la
  lista este terminada (que hacer cuando una pagina nos bloquea, y poder elegir a mano las imagenes
  de los heroes). **No empezar ninguno de los dos sin hablarlo con el.**
- Las objeciones de los criticos al plan de la auditoria, que son opiniones sobre el plan y no
  defectos del motor.

---

## 2. Lo que hay que leer antes de tocar nada

**`CLAUDE.md`** en la raiz. Es corto y es obligatorio. Resume:

- **Nunca decir "mire el video cuadro por cuadro" si no se hizo.** Decir cuantos cuadros se abrieron
  y cuales. Esto esta escrito porque se rompio la confianza en una frase.
- Un video de 25 s son 750 cuadros: se **miden los 750 por programa** (`tools/auditar-video.py`) y
  despues se abren **10 a 15**, a resolucion completa y de a uno. Nunca en una tira `hstack`
  reescalada, que destruye justo el detalle donde vive el defecto.
- Antes de sacar una imagen, preguntarse si el defecto se puede cazar **al construir**. Casi siempre
  sale mas barato: un recorte pixelado se mide comparando pixeles reales contra tamano dibujado, sin
  renderizar nada.
- **Diagnosticar antes de acusar.** Verlo en el cuadro completo, confirmar que ninguna linea lo pidio
  a proposito, y leer el dato de la clave correcta.

---

## 3. Las compuertas

**Las 10 rapidas (~12 s), en cada cambio del motor:**

```
node render3d/demo/verificar.mjs
node tools/encuadre-check.mjs
node tools/guion-check.mjs
node tools/adn-check.mjs
node tools/tira-check.mjs
node tools/heroes-check.mjs
node tools/eco-check.mjs
python tools/placeholder-check.py
python tools/captura-check.py
python tools/testimonios-check.py
```

**El guard completo (~30 min), solo antes de pushear:** `npm run gates:guard`. Tiene que dar 35 OK /
0 FAIL. **Nunca correr dos guards a la vez.**

**Lo que las compuertas NO pueden ver, y hay que tenerlo presente siempre:**

- **Corren en Node y nunca compilan GLSL.** Verde ahi no prueba NADA sobre un shader. Dos errores de
  integracion llegaron a produccion exactamente por esto.
- `encuadre-check` pregunta si la caja **cruza** el cuadro, no si entra entera. La contencion solo se
  exige a las mallas que declaran `userData.encaja`, que son 16 de 799.
- Ninguna compuerta mide **repeticion de contenido**: dos escenas pueden estar perfectamente
  compuestas y contar lo mismo. Asi paso el defecto de la imagen repetida que Thiago vio. Sigue siendo
  cierto en general; la unica grieta tapada es `heroes-check`, y solo por el lado del CUPO — comprueba
  que un hero que reparte imagenes no se ofrezca sin material suficiente, no que lo que muestra sea
  distinto de lo que mostro la escena anterior.

---

## 4. Como se cierra un hallazgo (el metodo que funciono)

1. **Intentar refutarlo primero.** El documento puede estar equivocado y ya se comprobo: de 13
   hallazgos revisados por agentes, **2 se cayeron** — `contraste.js:58` (el `encaje` local no tapa
   al del kit porque el modulo ni lo importa) y `kit.js:147` (el fallback de `topeNitido` devuelve
   7.875 pero los tres llamadores lo pasan por un `Math.min` contra un tope mas chico). Un
   `real=false` bien fundado vale tanto como un parche.
2. **Medir ANTES y DESPUES**, construyendo la escena de verdad. El arnes esta listo: copiar el
   bootstrap de `tools/encuadre-check.mjs` (lineas 36-100 y el ctx de 174-183).
3. **Correr el instrumento contra el codigo VIEJO.** Si no ve el defecto, su verde no significa nada.
   Se hace con `git stash` o `git checkout <commit>~1 -- <archivo>`. Esto atrapo un caso real: una
   medicion con cajas envolventes decia "se sale" y era artefacto de la caja de un toro rotado; con
   medicion vertice a vertice los numeros dieron 1.327 -> 0.933.
4. **Derivar los numeros, no elegirlos.** Cada tope que se puso salio de algo que la escena ya tenia
   declarado: el radio del anillo de `cierre`, el exponente del bucle de `ventana`, el techo de 2.00
   que `destello` se habia puesto a si misma. Un numero elegido a ojo no se puede defender despues.
5. **Si no se puede demostrar, se saca.** Se intento contar en el cupo la frase que bebe el hero y el
   plan salio identico (mismos numeros con y sin el cambio sobre 180 guiones). Se quito y el hallazgo
   quedo abierto con la medicion escrita. Un arreglo que no mueve la medicion no se deja puesto.

---

## 5. Trampas de este repo que ya mordieron mas de una vez

- **`nivel(x)` interpola FONDO -> TINTA, no claro -> oscuro.** Un valor fijo hace que el objeto
  desaparezca en una de las dos polaridades. Cayeron ahi el gancho, la columnata y el indicador de
  toque. Cinco de cada siete paginas reales dan mundo CLARO.
- **Los shaders escritos a mano NO aplican la matriz de textura** (`repeat`/`offset`). Los materiales
  propios de three si. Es una FAMILIA de defectos, no un caso: aparecio en `materialMascara` y en
  `heroes/portatil.js`.
- **Un backtick dentro de un template literal cierra la cadena.** Paso 8 veces. `E-SHADER-ENTERO`
  (verificar.mjs:631) lo caza.
- **`encaje()` (kit.js:968) achica sin piso.** Es el patron detras de media docena de hallazgos: el
  cuerpo tipografico termina siendo una funcion inversa del largo del copy. Y ojo: ponerle piso sube
  el ancho en la misma proporcion, asi que un piso sin techo de ancho cambia "ilegible" por "cortado
  a los costados", que es peor.
- **Escribir `\n` desde un script de Python a un archivo JS** puede dejar un salto de linea REAL y
  partir la cadena. Usar `String.fromCharCode(10)`, que es lo que el repo ya hace.

---

## 6. La regla que no se negocia

**ANTI-INVENCION.** El motor NUNCA inventa lo que la pieza dice: ni cifras, ni copy, ni CTA, ni
testimonios. Sin material, la escena devuelve `vacia: true` y `main.js` la saltea sin avanzar el
beat, o sea que la pieza sale mas corta en vez de tener aire muerto. Una cita fabricada es la mentira
mas cara del motor.

Y dos operativas: **nunca subir `backend/.env` al repo ni pegar secrets en el chat**, y **no poner
logos** en las atribuciones.

---

## 7. Donde vive el motor

`render3d/demo/` (escenas, heroes, kit.js, guion.js, datos.js, main.js) + `backend/motor.py` y
`backend/render3d.py`. **No es `src/urvid`** (canvas 2D) **ni `remotion/`**.

Para renderizar y mirar:

```
python backend/motor.py https://stripe.com --dur 20 --seed 31 --salida tools/out/motor/prueba.mp4
python tools/auditar-video.py tools/out/motor/prueba.mp4
```

El segundo mide los 600 cuadros y escribe los sospechosos a resolucion completa en
`tools/out/motor/auditoria/`.

**Cuidado con las capturas cacheadas:** de las 7 que hay en `tools/out/motor/`, DOS estan podridas
— `www-sweetgreen-com` es una pantalla de error de CloudFront (0 frases) y `www-sothebysrealty-com`
capturo una verificacion anti-bot (su marca es "HUMAN VERIFICA"). El log del render lo canta
(`0 frases - 0 cifras - cta NINGUNO`) y aun asi se construyo un video de 20 s sobre una de ellas.
Es un hallazgo abierto.

---

## 8. Por donde seguir

De los abiertos, los mas tratables (un tope, un umbral, un filtro; se hacen y se verifican en
minutos):

- ~~`heroes/portatil.js:122`~~ — **CERRADO 2026-08-03**, y dejo una leccion que conviene tener a mano
  para los que siguen: arreglar la escala DESTAPO un segundo defecto que estaba escondido detras
  (el recorrido del scroll se media sobre la tira entera, asi que al achicar la ventana a la mitad cada
  salto paso a mover 1.97 pantallas — el mismo defecto que `ventana.js:388`). Un arreglo que corrige un
  numero puede empeorar el que depende de el; hay que medir los dos. Salio de ahi la compuerta
  `tools/tira-check.mjs`, que ya es una de las rapidas.
- `kit.js:805` — `marco()` calcula el rectangulo util del aire y lo devuelve, y ninguna escena lo lee.
- `datos.js:196-206` — el mostrador de frases.
- `verificar.mjs:410` y `verificar.mjs:530` — dos heuristicos con huecos medidos.
- `tools/encuadre-check.mjs:84`, `:311` — cobertura de la compuerta.

Los pesados, que conviene hablar antes de empezar: `kit.js:968` (el `encaje` sin piso, toca seis
escenas), las tres compuertas nuevas propuestas (`E-CONTENCION-TOTAL`, `E-CUERPO-MINIMO`, y la que
EJECUTA el shader), y `tools/adn-check.mjs:78`.

**Sobre `adn-check.mjs:78`:** el parche esta medido y es correcto, y esta DIFERIDO A PROPOSITO. Deja
la compuerta en ROJO con 88 combinaciones reales — no son falsos positivos. Aplicarlo sin cerrar
antes esas 88 rompe una de las 5 rapidas para todos, y una compuerta roja que se aprende a ignorar es
peor que una que mide mal. El orden correcto es al reves: primero las 88, despues se afila.

Y dos hallazgos abiertos que NO tienen causa identificada, o sea que empiezan por diagnostico y no
por parche:

- **`heroes/cubo.js` — las caras salen VACIAS.** Se ve en un render real de stripe.com. NO se
  reproduce en el arnes: construido en Node con fixture sintetico da 6 laminas de 4 imagenes
  distintas y 2-3 visibles por cuadro, que es lo correcto. La cara azul oscura del video es el
  NUCLEO, o sea que las laminas no se dibujan encima en vez de faltar. Hace falta el material REAL,
  porque el veto de `esLamina` inspecciona pixeles y con recortes sinteticos no dispara nunca.
- **`escenas/mesa.js` — el respaldo del recorte deja el tercio de arriba 63-70% vacio.** Aparecio al
  arreglar otra cosa: `mesa` ahora cede la tira a `pantalla` y compone con un recorte, un camino que
  antes casi no se recorria. La escena esta calibrada para un sujeto ALTO (la tira mide 720x8192).

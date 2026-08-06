# Auditoría de escenas con render — estado y qué creer de cada número

```bash
npm run pesado -- python tools/escenas-render.py
```

Renderiza 16 piezas (12 de 20 s y 4 de 30 s) y mide **cada tramo por separado**, sobre píxeles. Es lo
que faltaba: `imagen-check.py` mide la **pieza** —cuánto se congela y cuánta ocupación tiene en
total— y eso deja pasar el caso que importa, una escena floja dentro de una pieza sana. Un video de
20 s lleva seis escenas y un solo héroe.

No cuesta render extra: el `plan.json` dice dónde empieza y termina cada tramo.

## Estado: las 18 escenas ACTIVAS medidas, cero defectos

(Las otras 2 del catálogo están dormidas a propósito — ver abajo.)

| escena | veces | movimiento | tinta |
|---|---|---|---|
| `bandera` | 2 | 0,644 | **0,036** |
| `cita` | 10 | 0,767 | 0,222 |
| `sello` | 4 | 0,784 | 0,169 |
| `lista` | 4 | 0,914 | 0,258 |
| `marquesina` | 2 | 1,052 | 0,420 |
| `hero` | 13 | 1,257 | 0,355 |
| `gancho` | 10 | 1,441 | 0,152 |
| `titular` | 5 | 1,577 | 0,390 |
| `cierre` | 16 | 1,635 | 0,221 |
| `apertura` | 11 | 2,370 | 0,252 |
| `rafaga` | 4 | 2,815 | 0,205 |
| `mesa` | 7 | 2,957 | 0,502 |
| `tarjetas` | 3 | 3,147 | 0,378 |
| `toro` | 7 | 4,271 | 0,246 |
| `tipografia` | 4 | 8,915 | 0,228 |
| `destello` | 7 | 10,524 | 0,093 |
| `pantalla` | 4 | 12,779 | 0,267 |

Referencias medidas en este repo: **0,005** es el ruido del códec sobre una imagen congelada y
**0,370** la escena más quieta. El movimiento más bajo de la tabla (0,644) es 128× el ruido.

## Mirar la columna `veces` antes de concluir

Pasó **dos veces en dos horas**, y las dos veces saqué una conclusión de un promedio de una muestra:

| escena | con n=1 | con más muestras |
|---|---|---|
| `rafaga` | 0,060 → marcada | **0,250** con n=3 → no queda |
| `sello` | 0,051 → marcada | **0,169** con n=4 → no queda |

Un promedio de una muestra no es un promedio.

## Las que van a quedar bajo el piso para siempre, y por qué

No las vuelvas a investigar: las tres son diseño declarado en su propia cabecera.

- **`bandera`** (0,036) — *"un campo de color liso ocupando el cuadro entero, el nombre calado
  adentro. Sin marco, sin HUD, sin contador."* Un campo liso hace que la tinta sea baja por
  definición: casi todo el cuadro es el mismo color.
- **`sello`** — *"un emblema chico y tres cuartos de cuadro sin nada."* Registrado en 0,042 de
  ocupación.
- **`gancho`** — es una placa de texto que hay que poder **leer**, así que su quietud es inherente.

**Límite estructural que esto revela:** la métrica de tinta penaliza a las escenas que componen con
campos lisos, y eso es una decisión de arte válida. La herramienta dice **dónde mirar**; la cabecera
de la escena dice si eso estaba buscado.

## El defecto que encontró: `pantalla` cortaba el texto del cliente

Se llegó por un camino que conviene repetir: se abrió un cuadro de la escena con **más movimiento**
(12,78) sospechando que se leyera como caos. No era eso — el defecto estaba quieto en el cuadro.

Medido en basecamp.com, cuadro 412 de 600: se leía *"ver 2.7 billion comments"* donde dice **"Over"**
y *"decade"* donde dice **"decades"**. El texto de la página cortado por los dos costados.

La causa era una constante, y **la regla ya estaba escrita en otro archivo del repo**: `mosaico` usa
1.06 y explica por qué — *"un recorte de página lleva su contenido adentro y sangrarlo se lo come"*.
`rafaga` usa lo mismo por lo mismo. `pantalla` usaba **1.10**, y es la escena que más texto de la
página muestra.

Con 1.06 se lee *"Over 2.7 billion comments have been posted."* y *"that spans decades."* completos.
La imagen sigue tocando los dos bordes: **a sangre quiere decir que la imagen llega al borde, no que
las palabras se corten.**

### Y se barrió el patrón entero

`pantalla` era el único caso. Los demás multiplicadores sobre 1.06 son ornamentos o campos de color
—`bandera` 1.25, `marquesina` 1.3, `destello` 1.20, `sello` 1.2, `partida` 1.2— y ninguno lleva
textura de página. `titular` usa **1.02** para su foto, que es correcto.

## Lo que falta

**`columna` y `contraste` están DORMIDAS a propósito** — registradas, verdes en las compuertas y fuera
del sorteo por decisión de producto, con la cita que la motivó en el Set `DORMIDAS` de `guion.js`. No
son material sin auditar: son material apagado. La herramienta ahora las informa aparte.

**`partida` ya está auditada.** Cayó al ampliar el barrido a 22 piezas con páginas que nunca se habían
probado (`pentagram.com`, `theverge.com`) y semillas nuevas. Mide **movimiento 0,933 y tinta 0,837 —
la más alta de las 18**, o sea el cuadro más lleno del catálogo. Ninguna señal de defecto.

**Con la salvedad de que tiene n=1**, y en este mismo documento hay dos casos de conclusiones sacadas
de una sola muestra que se cayeron con más datos. Su lectura es preliminar hasta que aparezca en más
piezas.

### Cómo NO buscarla, que costó dos renders

Antes de ampliar el barrido se intentó **predecir** una semilla que la produjera, corriendo `guionDe`
fuera del motor. Falló dos veces, y las dos por la misma razón de fondo: **el simulador no reproducía
al motor**.

| intento | qué se usó | por qué falló |
|---|---|---|
| 1º | el fixture `tools/fixtures/director/elementos/*.json` | el motor usa `tools/out/motor/*/datos.json`, que sale de la captura y trae otras frases |
| 2º | los datos reales, pero con una tabla de bpm **inventada** | `lujo` declara **bpm 76** y el render usó **78**; se simuló con **85** |

Las dos veces la predicción decía que `partida` entraba y el plan real salió sin ella. **El "10,8% de
las veces" que se reportó en un commit anterior sale de ese mismo simulador y no es un dato
confiable.** Lo que funcionó fue lo caro y honesto: **renderizar de verdad y mirar el plan.**

## Los 11 aires, comparados entre sí — `tools/aires-render.py`

```bash
npm run pesado -- python tools/aires-render.py
```

Renderiza la **misma página con la misma semilla** en los once aires. Las compuertas los barren
*rotando* (cada escena ve uno distinto), lo que da cobertura pero **no comparación**: si un aire
compusiera peor que los otros diez, quedaría diluido en el promedio.

Había motivo para sospechar: el dolly va de **0,4 (`bienestar`) a 1,55 (`inmobiliario`)**, casi 4×, y
ese rango ya produjo defectos reales — `toro` se salía del cuadro **sólo** con dolly 1,55.

**Resultado: los once sanos, ninguno por debajo de los pisos.**

| aire | bpm | escenas | movimiento | tinta |
|---|---|---|---|---|
| `editorial` | 114 | 6 | 0,899 | 0,347 |
| `artesanal` | 114 | 6 | 0,955 | 0,328 |
| `corporativo` | 114 | 6 | 1,081 | 0,338 |
| `gastronomico` | 114 | 6 | 1,142 | 0,325 |
| `bienestar` | 96 | 5 | 1,184 | 0,282 |
| `inmobiliario` | 108 | 6 | 2,099 | 0,327 |
| `deportivo` | 150 | 8 | 2,780 | 0,337 |
| `tecnico` | 132 | 7 | 3,354 | 0,311 |
| `nocturno` | 144 | 8 | 4,787 | 0,279 |
| `jugueton` | 132 | 7 | 9,033 | 0,350 |
| `lujo` | 84 | 5 | 11,157 | 0,591 |

### El tempo NO predice el movimiento

Es lo contrario de lo que se esperaría: **`lujo`, el aire más lento del catálogo (bpm declarado 76),
produce la pieza que más se mueve (11,157)**, y `editorial` la más quieta con bpm efectivo 114.

La razón es que **el aire cambia el guion, no sólo la cámara**: con otra semilla-aire entra otro
conjunto de escenas, y el movimiento de una pieza depende mucho más de *qué escenas la componen* que
del tempo. Comparar aires por movimiento sin mirar su plan lleva a la conclusión inversa a la real.

### El bpm efectivo no es el declarado, y es diseño

Los once corren más rápido de lo que declaran, con ratios distintos (5,6% a 14%):

| | declara | usa |
|---|---|---|
| `editorial` | 100 | 114 |
| `lujo` | 76 | 84 |
| `deportivo` | 140 | 150 |

No es un factor fijo: es el **ajuste de tempo para que el guion calce en la duración pedida**, que
`guion-check` ya declara (`ajusteDe`, `TOPE_AJUSTE`). Conviene saberlo antes de comparar contra el
número del archivo del aire — como pasó al intentar predecir semillas, donde simular con el bpm
declarado dio planes que el motor nunca produjo.

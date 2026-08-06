# Auditoría de escenas con render — estado y qué creer de cada número

```bash
npm run pesado -- python tools/escenas-render.py
```

Renderiza 16 piezas (12 de 20 s y 4 de 30 s) y mide **cada tramo por separado**, sobre píxeles. Es lo
que faltaba: `imagen-check.py` mide la **pieza** —cuánto se congela y cuánta ocupación tiene en
total— y eso deja pasar el caso que importa, una escena floja dentro de una pieza sana. Un video de
20 s lleva seis escenas y un solo héroe.

No cuesta render extra: el `plan.json` dice dónde empieza y termina cada tramo.

## Estado: 17 de 20 escenas medidas, cero defectos

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

**3 de 20 escenas sin ver**: `columna`, `contraste`, `partida`. No es falta de material —ninguna
declara `necesita` en su meta—, el guion las elige poco por su propia lógica. Para cubrirlas haría
falta más barrido o un modo que fuerce una escena, **que hoy no existe**.

Un intento que falló y no conviene repetir igual: se barrieron 160 guiones para medir cada cuánto
sale cada escena y devolvió **0** — `guionDe` necesita datos configurados que no se le pasaron. Un
cero del instrumento, no un dato.

// EL SELECTOR DE RANGO DEL ANIMADOR DE TEXTO DE AE, en JavaScript.
//
// Esta es LA cuenta que el reproductor necesita para dejar de falsear la escritura por caracter con una
// capa por letra. La especificacion, con como se midio y que quedo afuera, esta en
// `.claude/skills/pieza-ae/reference/animador-de-texto.md`. Todo sale de medir AE 26.3 con
// `tools/ae/sondas/animador{,2,3,4,5}.jsx`, no de la documentacion.
//
// Vive aparte del reproductor por un motivo concreto: asi la misma cuenta la usa el motor Y la usa
// `selector-check.mjs`, que la compara contra AE. Dos implementaciones de la misma cuenta divergen en
// silencio — este repo ya lo pago con la proyeccion de la camara.
//
// ================================================================ EL MODELO, Y POR QUE ES UNO SOLO
//
// La primera version de este archivo tenia SEIS formas, dos de ellas como tablas de 40 muestras porque
// no les encontraba formula cerrada. Estaba mal planteado. Las seis formas son TRES BASES mas LA MISMA
// BEZIER que manejan Ease High y Ease Low:
//
//     redonda = triangulo con ease(bajo=-50, alto=+50)
//     suave   = triangulo con ease(bajo=+50, alto=+50)
//
// No es una interpretacion elegante: contrastado contra 40 muestras por forma medidas en AE, cierra con
// un desvio maximo de 4,8e-6 — la resolucion de la medicion. Y de paso el mismo mapeo de Bezier explica
// el ease NEGATIVO, que yo habia dado por irresoluble y rechazado.
//
// La pista vino de una revision en paralelo que ajusto la Bezier por busqueda en grilla sobre otro
// juego de datos; se verifico despues contra estas mediciones, que son mas finas.
//
// ================================================================ EL ORDEN IMPORTA
//     base(forma) -> ease(bezier) -> suavidad (solo cuadrada) -> cantidad maxima

export const UNIDADES = { porcentaje: 1, indice: 2 }
export const MODO = { suma: 1, resta: 2, interseccion: 3, minimo: 4, maximo: 5, diferencia: 6 }
export const FORMA = { cuadrada: 1, rampaArriba: 2, rampaAbajo: 3, triangulo: 4, redonda: 5, suave: 6 }

// ---------------------------------------------------------------- la bezier del ease
//
// P0=(0,0), P3=(1,1). Los positivos mueven la X del punto de control hacia adentro; LOS NEGATIVOS
// MUEVEN LA Y. Esa asimetria es lo que yo no habia visto: con la regla "los negativos son la X mas
// alla del borde" la prediccion daba 0,5502 donde AE mide 0,6464. Con esta, los ocho casos negativos
// cierran a 5e-6.
function curvaEase(bajo, alto) {
  let x1 = 0, y1 = 0, x2 = 1, y2 = 1
  if (bajo > 0) x1 = bajo / 100; else y1 = -bajo / 100
  if (alto > 0) x2 = 1 - alto / 100; else y2 = 1 + alto / 100
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let lo = 0, hi = 1, s = 0.5
    for (let i = 0; i < 40; i++) {
      s = (lo + hi) / 2
      const xx = 3 * (1 - s) * (1 - s) * s * x1 + 3 * (1 - s) * s * s * x2 + s * s * s
      if (xx < x) lo = s; else hi = s
    }
    return 3 * (1 - s) * (1 - s) * s * y1 + 3 * (1 - s) * s * s * y2 + s * s * s
  }
}
const EASE_REDONDA = curvaEase(-50, 50)
const EASE_SUAVE = curvaEase(50, 50)

// ---------------------------------------------------------------- la funcion
//
// sel = { unidades, forma, inicio, fin, desplazamiento, easeAlto, easeBajo, suavidad,
//         cantidadMaxima, modo }
export function factorDe(sel, k, n) {
  if (n <= 0) return 0

  // TODO EN UNIDADES DE CARACTER. En porcentaje, el 100% son n caracteres.
  const esc = sel.unidades === UNIDADES.indice ? 1 : n / 100
  let s = ((sel.inicio ?? (sel.unidades === UNIDADES.indice ? 0 : 0)) + (sel.desplazamiento ?? 0)) * esc
  let e = ((sel.fin ?? (sel.unidades === UNIDADES.indice ? n : 100)) + (sel.desplazamiento ?? 0)) * esc
  if (s > e) { const t = s; s = e; e = t }

  const forma = sel.forma ?? FORMA.cuadrada
  let f

  if (forma === FORMA.cuadrada) {
    // COBERTURA DE CELDA, NO MUESTREO DEL CENTRO. Medido: con el rango terminando a medio caracter el
    // factor da 0,50, y el muestreo del centro solo puede dar 0 o 1. La diferencia ES el caso de uso
    // principal: un tecleo mueve el final del rango con el tiempo, o sea pasa por todos los valores
    // fraccionarios, y con muestreo del centro cada letra aparece de golpe en vez de cubrirse.
    f = Math.max(0, Math.min(1, Math.min(e, k + 1) - Math.max(s, k)))
  } else {
    // las otras tres bases miran el CENTRO del caracter
    const p = k + 0.5
    const ancho = e - s
    let u
    if (Math.abs(ancho) < 1e-12) u = p >= e ? Infinity : -Infinity
    else u = (p - s) / ancho

    if (forma === FORMA.rampaArriba) {
      // FUERA DEL RANGO SOLO LAS RAMPAS SOSTIENEN SU VALOR: pasando el final vale 1, no 0. Asumir cero
      // de los dos lados deja sin animar a todos los caracteres posteriores, o sea media frase.
      f = u <= 0 ? 0 : (u >= 1 ? 1 : u)
    } else if (forma === FORMA.rampaAbajo) {
      f = u <= 0 ? 1 : (u >= 1 ? 0 : 1 - u)
    } else {
      f = (u < 0 || u > 1) ? 0 : 1 - Math.abs(2 * u - 1)
    }
  }

  // el ease. Las dos formas "curvas" SON el triangulo con un ease fijo.
  if (forma === FORMA.redonda) f = EASE_REDONDA(f)
  else if (forma === FORMA.suave) f = EASE_SUAVE(f)
  else {
    const alto = sel.easeAlto ?? 0, bajo = sel.easeBajo ?? 0
    if (alto !== 0 || bajo !== 0) f = curvaEase(bajo, alto)(f)
  }

  // LA SUAVIDAD EXISTE SOLO PARA LA CUADRADA — con cualquier otra forma AE oculta la propiedad y
  // `setValue` falla. Y viene en 100 POR DEFECTO, que es la identidad: el corte seco del tecleo NO es
  // lo que sale de fabrica, hay que pedir suavidad 0.
  if (forma === FORMA.cuadrada) {
    const sv = sel.suavidad ?? 100
    if (sv !== 100) {
      const sm = sv / 100
      if (sm <= 0) {
        // SUAVIDAD CERO ES UN ESCALON EXACTO EN 0,5, Y HAY QUE ESCRIBIRLO ASI.
        //
        // La primera version usaba `sm || 1e-8` para no dividir por cero, y con eso el umbral daba
        // 0,49999999 en vez de 0,5: una cobertura de exactamente 0,5 quedaba por ENCIMA del umbral y
        // el factor salia 1 donde AE mide 0. Lo cazo la compuerta en dos de las 88 configuraciones, y
        // las dos eran del tecleo — o sea el caso de uso principal, roto por un epsilon.
        f = f > 0.5 ? 1 : 0
      } else {
        const umbral = 0.5 - sm * 0.5
        f = f <= umbral ? 0 : Math.min((f - umbral) / sm, 1)
      }
    }
  }

  return f * ((sel.cantidadMaxima ?? 100) / 100)
}

// ---------------------------------------------------------------- varios selectores
//
// El modo lo trae CADA selector y dice como se compone con lo acumulado. El primero se toma tal cual.
// Enum medido con dos selectores: 1=suma 2=resta 3=interseccion 4=minimo 5=maximo 6=diferencia.
export function factorCompuesto(selectores, k, n) {
  if (!selectores || !selectores.length) return 1
  let acc = factorDe(selectores[0], k, n)
  for (let i = 1; i < selectores.length; i++) {
    const f = factorDe(selectores[i], k, n)
    switch (selectores[i].modo ?? MODO.suma) {
      case MODO.suma: acc = Math.min(1, acc + f); break
      case MODO.resta: acc = Math.max(0, acc - f); break
      case MODO.interseccion: acc = acc * f; break
      case MODO.minimo: acc = Math.min(acc, f); break
      case MODO.maximo: acc = Math.max(acc, f); break
      case MODO.diferencia: acc = Math.abs(acc - f); break
      default: acc = Math.min(1, acc + f)
    }
  }
  return acc
}

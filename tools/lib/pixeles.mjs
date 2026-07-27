// Lee los píxeles de un lienzo SIN la fuga de `getImageData`.
//
// POR QUÉ EXISTE
// `@napi-rs/canvas` no libera nunca la memoria nativa que reserva `getImageData`, y V8 ni se entera —
// como no la contabiliza, tampoco dispara el recolector. Medido en esta máquina, a 540×960:
//
//     getImageData        602 llamadas  ->  +1201 MB     (~2 MB por llamada, jamás vuelven)
//     getImageData + global.gc()        ->  idéntico     (el gc explícito NO ayuda)
//     canvas.data()      3000 llamadas  ->  +7 MB
//
// Los gates de este repo llaman a `getImageData` una vez por frame: `director-editor-check` recorre
// 44.104 frames, o sea ~88 GB pedidos y nunca devueltos. En una máquina de 15 GB eso no es una fuga
// lenta: es la PC congelándose y teniendo que apagarse a la fuerza. Pasó tres veces en un día.
// Actualizar la librería no sirve — la versión nueva tiene el mismo comportamiento.
//
// LA TRAMPA, Y POR QUÉ ESTO COPIA POR DEFECTO
// `canvas.data()` NO devuelve una copia: devuelve una VISTA VIVA del lienzo. Comprobado —
//
//     dibujar rojo · const a = cv.data() · dibujar verde · a[1] pasó de 0 a 255
//
// O sea que reemplazar `getImageData` por `data()` a secas rompería, EN SILENCIO, todos los gates que
// guardan un frame para compararlo con el siguiente: los de determinismo, seek-safe, aire muerto y
// salto de capa. Dos frames distintos se leerían como idénticos y el gate pasaría en verde
// justamente cuando el motor está roto.
//
// Por eso el default es COPIAR. La copia vive en el heap de V8, que sí la recolecta: es memoria que
// sube y baja, no memoria que se pierde. Quien sólo va a recorrer el buffer y descartarlo puede pedir
// la vista con `{ copia: false }` y ahorrarse hasta eso.

/** Devuelve los píxeles RGBA del lienzo entero. `cv` puede ser el canvas o su contexto 2D. */
export function pixeles(cv, { copia = true } = {}) {
  const lienzo = cv && cv.canvas ? cv.canvas : cv
  if (lienzo && typeof lienzo.data === 'function') {
    const d = lienzo.data()
    return copia ? Uint8ClampedArray.from(d) : d
  }
  // Camino del navegador (o de una implementación sin `.data()`): ahí `getImageData` no gotea.
  const ctx = cv && cv.getContext ? cv.getContext('2d') : cv
  return ctx.getImageData(0, 0, lienzo.width, lienzo.height).data
}

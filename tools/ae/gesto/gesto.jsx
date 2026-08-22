// ================================================================================================
// GESTO · la biblioteca entera en una linea
// ================================================================================================
//
// Una pieza incluye ESTE archivo y tiene todo:
//
//     #include "C:/Users/Thiago/Documents/cliping.ia/tools/ae/gesto/gesto.jsx"
//
//     G.iniciar({ nombre: "MI-PIEZA", cuadros: 240, recursos: "C:/ae-probe/recursos-x" });
//     ... construir con G / Gt / Gf / Ge / Gx / Gc / Gd ...
//     G.cerrar();
//
// ================================================================================================
// LOS SIETE OBJETOS
// ================================================================================================
//
//   G    nucleo       claves, curvas, rebote, camara, recursos, tipografia, y TODAS las negativas
//   Gt   texto        T01..T14   escalonados, tecleo, interletra, ondulacion, relevos
//   Gf   formas       F01..F14   barras, anillos, ecualizador, squash, extruido, nine-slice
//   Ge   entradas     E01..E12   deslizamientos, sobrepasos, anticipacion, salidas
//   Gx   transiciones X01..X12   tapas, latigazo, volteo, atravesar, destello, match cut
//   Gc   espacio      C00..C14   camara, multiplano, profundidad, sombra de contacto
//   Gd   detalle      D01..D12   acuse, arrastre, solapamiento, peso, estela, sombra desfasada
//
// ================================================================================================
// POR QUE EXISTE, Y NO ES PARA ESCRIBIR MENOS
// ================================================================================================
//
// Las leyes de este proyecto estan escritas, medidas y fechadas en la skill. Y aun asi, el mismo dia
// que se escribio "las claves que alimentan un rebote van lineales", se autoro una pieza entera con
// Easy Ease en exactamente esas claves: el sobrepaso medido dio 0,11 px — el rebote NO EXISTIA — y no
// lo cazo ninguna compuerta. Lo dijo el usuario, mirando el video.
//
// Un documento lo lee quien ya sabia que existia. Una funcion que SE NIEGA A CONSTRUIR no se puede
// desobedecer por distraccion. Esa es toda la tesis.
//
// Cada ley cara aparece adentro como una de tres cosas, nunca como un comentario suelto:
//   (a) un valor por defecto que ya es el correcto      obturador apagado, 8 bits, camara sin auto-orientar
//   (b) un paso obligatorio imposible de saltear        G.colgar() pone la orientacion en cero
//   (c) un throw con el numero medido en el mensaje     el rebote sin velocidad, la clave a mitad de cuadro
//
// ================================================================================================
// EL CONTROL NEGATIVO
// ================================================================================================
//
//     node tools/ae/llamar.mjs tools/ae/gesto/_prueba-nucleo.jsx
//
// Construye a proposito cada defecto que la biblioteca prohibe y exige que TIRE, mas casos positivos
// que tienen que pasar. Una biblioteca cuyas compuertas no saltan es peor que no tenerla: da una
// sensacion de seguridad que no existe.
//
// ================================================================================================

#include "C:/Users/Thiago/Documents/cliping.ia/tools/ae/gesto/nucleo.jsx"
#include "C:/Users/Thiago/Documents/cliping.ia/tools/ae/gesto/texto.jsx"
#include "C:/Users/Thiago/Documents/cliping.ia/tools/ae/gesto/formas.jsx"
#include "C:/Users/Thiago/Documents/cliping.ia/tools/ae/gesto/entradas.jsx"
#include "C:/Users/Thiago/Documents/cliping.ia/tools/ae/gesto/transiciones.jsx"
#include "C:/Users/Thiago/Documents/cliping.ia/tools/ae/gesto/espacio.jsx"
#include "C:/Users/Thiago/Documents/cliping.ia/tools/ae/gesto/detalle.jsx"

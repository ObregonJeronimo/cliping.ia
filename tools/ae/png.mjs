// LECTOR DE PNG SIN DEPENDENCIAS. Decodifica con node:zlib, que ya viene con Node.
//
// POR QUE NO USAR @napi-rs/canvas PARA LEER, si esta instalado.
//
// Dos razones, y la primera es historia de esta maquina. El 26 de julio de 2026 una fuga de
// `getImageData` llego a 28 GB en una PC de 15 y la colgo; Windows lo dejo anotado (evento 2004,
// node.exe pidiendo 47 GB). Cargar 155 imagenes de 1920x1080 por esa via es meterse justo en esa
// familia de problema para leer cuatro numeros por archivo.
//
// La segunda es que dibujar una imagen en un lienzo para despues leerla NO ES UNA LECTURA: es una
// composicion. Pasa por el estado del contexto, por el suavizado al escalar y por como el lienzo
// interpreta el alfa (premultiplicado o no). Cualquiera de esas tres cosas mueve un centroide medido
// en subpixeles, que es exactamente lo que hay que medir bien. Inflar el IDAT y deshacer los filtros
// devuelve los bytes que AE escribio, sin intermediarios.
//
// Y NO, ESTO NO DUPLICA `tools/lib/pixeles.mjs`. Aquel es el lector canonico del repo y hay que usarlo
// siempre que se lean pixeles DE UN LIENZO — existe justamente porque `getImageData` de @napi-rs/canvas
// no libera memoria nativa (602 llamadas = 1201 MB que no vuelven, medido en su cabecera). Pero recibe
// un canvas, no un archivo: para leer un PNG de disco el patron del repo es `loadImage` -> `drawImage`
// -> `pixeles(ctx)`, o sea pasar por el lienzo. Eso es lo que aca hay que evitar, por lo de arriba.
//
// LO QUE SOPORTA, dicho para que nadie confie de mas: 8 bits por canal, sin entrelazado, tipos de
// color 0 (gris), 2 (RGB), 4 (gris+alfa) y 6 (RGBA). Es exactamente lo que escribe saveFrameToPng —
// medido, no supuesto: los PNG de AE salieron RGBA de 8 bits con los trozos IHDR/IDAT/IEND y ningun
// perfil de color. Cualquier otra cosa tira un error claro en vez de devolver pixeles equivocados.

import { readFileSync, existsSync, statSync, openSync, readSync, closeSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

const FIRMA = [137, 80, 78, 71, 13, 10, 26, 10]

const CANALES = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }

// El predictor de Paeth: de tres vecinos elige el que menos se aparta de su estimacion lineal.
function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

// ---------------------------------------------------------------- esperar a que el archivo ESTE
//
// POR QUE HACE FALTA ESTO, que parece paranoia y no lo es.
//
// After Effects escribe los cuadros de forma diferida. Esta medido: la sonda llamo a saveFrameToPng
// cuatro veces y despues pregunto por los archivos — File.exists devolvio false para los cuatro, y los
// cuatro estaban en disco un segundo despues. Y cuando la carpeta destino no existia, la llamada no
// tiro excepcion: devolvio normal y el aviso salio como dialogo modal MAS TARDE.
//
// O sea que del lado de AE NO HAY forma de saber si el cuadro se escribio. La verificacion tiene que
// pasar afuera, y tiene que mirar el CONTENIDO: un archivo a medio escribir existe, tiene tamano, y
// se lee como un PNG roto. Lo que prueba que esta entero es el trozo IEND al final, que es lo ultimo
// que se escribe.
export function pngCompleto(ruta) {
  if (!existsSync(ruta)) return false
  let tam
  try { tam = statSync(ruta).size } catch { return false }
  if (tam < 45) return false                    // ni siquiera entra un PNG minimo
  const fd = openSync(ruta, 'r')
  try {
    const cabeza = Buffer.alloc(8)
    readSync(fd, cabeza, 0, 8, 0)
    for (let i = 0; i < 8; i++) if (cabeza[i] !== FIRMA[i]) return false
    const cola = Buffer.alloc(12)
    readSync(fd, cola, 0, 12, tam - 12)
    return cola.toString('ascii', 4, 8) === 'IEND'
  } catch {
    return false
  } finally {
    closeSync(fd)
  }
}

export async function esperarPNGs(rutas, msMax = 60000, aviso = null) {
  const t0 = Date.now()
  let faltan = rutas.slice()
  while (faltan.length && Date.now() - t0 < msMax) {
    faltan = faltan.filter(r => !pngCompleto(r))
    if (!faltan.length) break
    if (aviso) aviso(rutas.length - faltan.length, rutas.length)
    await new Promise(r => setTimeout(r, 120))
  }
  return { listos: rutas.length - faltan.length, faltan, ms: Date.now() - t0 }
}

export function leerPNG(ruta) {
  const buf = readFileSync(ruta)
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== FIRMA[i]) throw new Error(`${ruta}: no es un PNG (firma incorrecta)`)
  }

  let ancho = 0, alto = 0, bits = 0, tipo = 0, entrelazado = 0
  const pedazos = []
  let i = 8
  while (i < buf.length - 8) {
    const largo = buf.readUInt32BE(i)
    const nombre = buf.toString('ascii', i + 4, i + 8)
    const cuerpo = buf.subarray(i + 8, i + 8 + largo)
    if (nombre === 'IHDR') {
      ancho = cuerpo.readUInt32BE(0)
      alto = cuerpo.readUInt32BE(4)
      bits = cuerpo[8]
      tipo = cuerpo[9]
      entrelazado = cuerpo[12]
    } else if (nombre === 'IDAT') {
      pedazos.push(cuerpo)
    } else if (nombre === 'IEND') break
    i += 12 + largo
  }

  if (bits !== 8) throw new Error(`${ruta}: ${bits} bits por canal; este lector solo hace 8`)
  if (entrelazado !== 0) throw new Error(`${ruta}: entrelazado Adam7, no soportado`)
  const canales = CANALES[tipo]
  if (!canales) throw new Error(`${ruta}: tipo de color ${tipo} desconocido`)
  if (tipo === 3) throw new Error(`${ruta}: con paleta; este lector no lee PLTE`)

  const crudo = inflateSync(Buffer.concat(pedazos))
  const bpp = canales                       // 8 bits por canal => un byte por canal
  const porFila = ancho * bpp
  const datos = Buffer.alloc(alto * porFila)

  // DESHACER LOS FILTROS. Cada fila viene precedida por un byte que dice con que se predijo, y la
  // prediccion es siempre contra la fila YA RECONSTRUIDA de arriba — por eso esto no se puede hacer
  // en paralelo ni saltear filas.
  let src = 0
  for (let y = 0; y < alto; y++) {
    const filtro = crudo[src++]
    const fila = y * porFila
    const arriba = fila - porFila
    for (let x = 0; x < porFila; x++) {
      const bruto = crudo[src++]
      const a = x >= bpp ? datos[fila + x - bpp] : 0          // el pixel de la izquierda
      const b = y > 0 ? datos[arriba + x] : 0                 // el de arriba
      const c = (x >= bpp && y > 0) ? datos[arriba + x - bpp] : 0   // el de arriba-izquierda
      let v
      switch (filtro) {
        case 0: v = bruto; break
        case 1: v = bruto + a; break
        case 2: v = bruto + b; break
        case 3: v = bruto + ((a + b) >> 1); break
        case 4: v = bruto + paeth(a, b, c); break
        default: throw new Error(`${ruta}: filtro ${filtro} desconocido en la fila ${y}`)
      }
      datos[fila + x] = v & 0xff
    }
  }

  return { ancho, alto, canales, tipo, datos }
}

// ---------------------------------------------------------------- mediciones sobre la huella
//
// EL PESO ES EL ALFA, Y ESO NO ES UN DETALLE. Un rectangulo que cae en una posicion fraccionaria deja
// los pixeles del borde a medio pintar. Si se contaran los pixeles con un umbral ("alfa > 128 cuenta,
// si no no"), la posicion medida saltaria de a un pixel entero y no se podria distinguir un error de
// medio pixel de la conversion de curvas del redondeo del instrumento. Pesando por alfa, ese borde a
// medias aporta a medias y el centroide sale con precision de subpixel — que es la unica forma de que
// un umbral de "menos de 1 pixel" signifique algo.

function pesos(img) {
  const { ancho, alto, canales, datos } = img
  // el alfa si lo hay; si no, la luminancia, para que esto sirva tambien sobre PNG sin transparencia
  const desplazamiento = canales === 4 ? 3 : (canales === 2 ? 1 : -1)
  const w = new Float64Array(ancho * alto)
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const p = (y * ancho + x) * canales
      w[y * ancho + x] = desplazamiento >= 0
        ? datos[p + desplazamiento]
        : (canales === 3 ? (datos[p] * 0.2126 + datos[p + 1] * 0.7152 + datos[p + 2] * 0.0722) : datos[p])
    }
  }
  return w
}

export function medirHuella(img) {
  const { ancho, alto } = img
  const w = pesos(img)
  let masa = 0, sx = 0, sy = 0
  const porColumna = new Float64Array(ancho)
  const porFila = new Float64Array(alto)
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const p = w[y * ancho + x]
      if (p === 0) continue
      masa += p
      sx += p * (x + 0.5)      // +0.5 = el CENTRO del pixel. Sin esto todo sale corrido medio pixel.
      sy += p * (y + 0.5)
      porColumna[x] += p
      porFila[y] += p
    }
  }
  if (masa === 0) return { vacia: true, masa: 0, x: NaN, y: NaN, lado: 0, ancho, alto, tocaBorde: false }

  // ANCHO Y ALTO POR SEPARADO, no sqrt(area).
  // Para un rectangulo alineado a ejes, una columna que cruza el interior suma exactamente alto*255, y
  // una fila que lo cruza suma ancho*255. Asi que los maximos de los dos perfiles dan cada lado por su
  // cuenta. sqrt(area) promedia los dos ejes POR CONSTRUCCION: con eso, una escala que anima X e Y con
  // curvas distintas —un squash and stretch, lo mas normal del mundo— es invisible.
  let maxCol = 0, maxFila = 0
  for (let x = 0; x < ancho; x++) if (porColumna[x] > maxCol) maxCol = porColumna[x]
  for (let y = 0; y < alto; y++) if (porFila[y] > maxFila) maxFila = porFila[y]

  // TOCAR EL BORDE INVALIDA EL CENTROIDE, y en silencio: si el objeto se sale de cuadro, lo que se mide
  // no es su centro sino el de su parte visible, corrido hacia adentro. Eso se leeria como "la
  // conversion falla en la entrada", que es un diagnostico falso y de los caros.
  let tocaBorde = false
  for (let x = 0; x < ancho && !tocaBorde; x++) {
    if (w[x] > 0 || w[(alto - 1) * ancho + x] > 0) tocaBorde = true
  }
  for (let y = 0; y < alto && !tocaBorde; y++) {
    if (w[y * ancho] > 0 || w[y * ancho + ancho - 1] > 0) tocaBorde = true
  }

  // LA CAJA DE LA HUELLA, que hace falta cuando lo que se mide ya no es un rectangulo.
  // Para distinguir DOS ORDENES DE ROTACION distintos, el area y el centroide no alcanzan: dos
  // composiciones diferentes pueden dar la misma area y el mismo centro y verse completamente
  // distintas. La caja agrega dos numeros independientes (donde empieza y donde termina en cada eje) y
  // se predice exacto proyectando las cuatro esquinas. Con area + centroide + caja son siete numeros
  // por muestra: suficiente para que sobreviva un solo candidato.
  let x0 = ancho, x1 = -1, y0 = alto, y1 = -1
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      if (w[y * ancho + x] === 0) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }

  const area = masa / 255
  return {
    vacia: false, masa, area, ancho, alto, tocaBorde,
    x: sx / masa, y: sy / masa,
    lado: Math.sqrt(area),
    anchoHuella: maxFila / 255,
    altoHuella: maxCol / 255,
    caja: { x0, y0, x1: x1 + 1, y1: y1 + 1 },
  }
}

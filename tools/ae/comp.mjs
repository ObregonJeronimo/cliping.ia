// EL LECTOR DEL EXPORTADOR: del volcado de After Effects al documento que consume la web.
//
// `tools/ae/sondas/exportar.jsx` recorre una composicion y escribe un volcado plano, una linea por
// registro. Este archivo lo convierte en el DOCUMENTO DE ESCENA: capas con sus tramos de animacion,
// cada curva ya resuelta a un cubic-bezier, sin una sola referencia a After Effects adentro.
//
// LA PIEZA CENTRAL NO ES LA CONVERSION: ES EL INVENTARIO DE LO QUE NO VIAJA.
//
// Un exportador que se saltea lo que no entiende produce un documento que se reproduce y sale
// PARECIDO. Y "parecido" no se puede señalar con el dedo, ni discutir con un cliente, ni encontrar en
// una tabla de errores. Por eso:
//
//   · cada linea NOSOP del volcado llega al documento y lo marca `incompleto`
//   · un tramo con trayectoria curva o tipos mezclados sale `rechazado` con motivo, no aproximado
//   · el CLI sale con codigo distinto de cero si hay algo sin soportar
//
// Negarse es barato. Una animacion que se siente distinta cuesta el trabajo entero.
//
// USO
//   node tools/ae/comp.mjs                      lee C:/ae-probe/exportar.txt y resume
//   node tools/ae/comp.mjs --json salida.json   ademas escribe el documento
//   import { leerComp, documentoDe } from './comp.mjs'

import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { segmentos } from './escena.mjs'

const RUTA = 'C:/ae-probe/exportar.txt'

const lista = (s) => (s === '' || s === undefined ? [] : s.split(';').map(Number))
const lee = (s) => { const [v, i] = s.split(';').map(Number); return { velocidad: v, influencia: i } }
const nums = (s) => (s === 'na' || s === '' || s === undefined ? null : s.split(';').map(Number))

// AE entrega los colores en 0..1. Se pasan a hex de 8 bits, que es lo que entiende la web.
// OJO: esto asume que el valor de AE ya es sRGB, que es el caso de un proyecto de 8 bits sin gestion
// de color. Si el proyecto la tuviera activada, el numero podria estar en lineal y el color saldria
// distinto — no se corrige a ciegas: lo va a delatar la comparacion de pixeles contra el render de AE,
// que es el unico juez honesto. La misma trampa que `THREE.Color` en el motor 3D.
const hex = (c) => c && c.length >= 3
  ? '#' + c.slice(0, 3).map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('')
  : null

// DEL NOMBRE POSTSCRIPT DE AE A UNA FAMILIA QUE ENTIENDA CSS.
//
// AE guarda la tipografia por su nombre PostScript: `Arial-BoldMT`, `TimesNewRomanPSMT`. CSS espera un
// nombre de FAMILIA y un peso aparte: `Arial` + `font-weight: 700`. Pasarle el nombre PostScript
// directo funciona a veces y falla en silencio el resto: el navegador no encuentra la fuente, cae en
// la que tenga a mano, y el texto mide otra cosa. No hay error — hay un ancho distinto, que es
// exactamente lo que rompe una composicion que depende de donde termina una linea.
//
// El nombre PostScript se manda IGUAL y primero en la lista: si el navegador lo resuelve, mejor, que
// es la coincidencia exacta. La familia deducida va detras como red.
export function tipografia(nombrePS) {
  const s = String(nombrePS || '')
  const guion = s.indexOf('-')
  const base = guion >= 0 ? s.slice(0, guion) : s
  const sufijo = guion >= 0 ? s.slice(guion + 1) : ''
  // MT y PSMT son marcas de la fundicion (Monotype, PostScript), no parte del nombre de la familia
  const limpio = base.replace(/(PSMT|PS|MT)$/, '')
  const familia = limpio.replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim()
  const donde = sufijo + ' ' + base
  const peso = /Black|Heavy/i.test(donde) ? 900
    : /Semibold|Demi/i.test(donde) ? 600
    : /Bold/i.test(donde) ? 700
    : /Medium/i.test(donde) ? 500
    : /Light|Thin/i.test(donde) ? 300
    : 400
  return { ps: s, familia, peso, cursiva: /Italic|Oblique/i.test(donde) }
}

export function leerComp(ruta = RUTA) {
  if (!existsSync(ruta)) throw new Error(`No existe ${ruta}. Corre la sonda tools/ae/sondas/exportar.jsx`)
  const lineas = readFileSync(ruta, 'utf8').split('\n').map(l => l.replace(/\r$/, '')).filter(Boolean)
  if (!lineas.includes('--- fin ---')) throw new Error('el volcado no tiene centinela: la sonda murio a mitad de camino')

  const doc = { version: '?', enums: {}, comp: null, capas: [], noSoportado: [], avisos: [], notas: [], error: null }
  const porIndice = new Map()
  const capaDe = (i) => {
    if (!porIndice.has(i)) {
      const c = { indice: i, props: new Map() }
      porIndice.set(i, c)
      doc.capas.push(c)
    }
    return porIndice.get(i)
  }

  for (const linea of lineas) {
    const f = linea.split('|')
    switch (f[0]) {
      case 'VERSION': doc.version = f[1]; break
      // EL CANAL DE AVISOS ESTABA MUERTO. El exportador emite NOTA cuando algo no salio como se pidio
      // —por contrato eso pone el veredicto en rojo— y aca no habia `case` ni `default`, asi que las
      // notas se evaporaban y `comp.mjs` decia DOCUMENTO COMPLETO igual. Un canal de avisos que nadie
      // lee es peor que no tenerlo: da la sensacion de que hay una red.
      case 'NOTA': doc.notas.push({ capa: +f[1], que: f[2], dato: f[3] ?? '' }); break
      case 'ARCO': {
        // un arco no se rasteriza: viaja como numeros y el reproductor lo dibuja exacto a cualquier escala
        const c = capaDe(+f[1])
        c.arco = { ancho: +f[2], alto: +f[3], grosor: +f[4], color: hex(lista(f[5])) }
        break
      }
      case 'MATTE': {
        // el recorte se guarda en la capa RECORTADA, y la que hace de matte queda marcada para que el
        // reproductor no la dibuje. En AE la matte tampoco se dibuja: se usa y desaparece.
        const c = capaDe(+f[1])
        c.matte = { de: +f[2], tipo: f[3] }
        capaDe(+f[2]).esMatte = true
        break
      }
      case 'ENUM':
        for (let i = 1; i < f.length; i += 2) doc.enums[f[i]] = +f[i + 1]
        break
      case 'ERROR': doc.error = `${f[1]} (${f[2]})`; break
      case 'COMP':
        doc.comp = {
          nombre: f[1], ancho: +f[2], alto: +f[3], fps: +f[4], duracion: +f[5],
          fondo: hex(lista(f[6])), capas: +f[7], aspecto: +f[8], comienzo: +f[9],
        }
        break
      case 'OBTURADOR':
        doc.obturador = {
          activo: f[1] === '1', angulo: +f[2], fase: +f[3],
          muestras: +f[4], limite: +f[5],
        }
        break
      case 'MOVBLUR': capaDe(+f[1]).desenfoque = f[2] === '1'; break
      // INFO no es NOSOP: son cosas que el reproductor tiene que SABER, no cosas que no viajan. Una
      // camara de dos nodos es lo normal; marcarla como problema pondria en rojo toda composicion con
      // camara, y una compuerta que se pone roja por lo normal se aprende a ignorar.
      case 'INFO': doc.avisos.push({ capa: f[1], que: f[2] }); break
      case 'CAMARA': {
        const c = capaDe(+f[1])
        c.camara = {
          zoom: +f[2], enfoque: +f[3], apertura: +f[4],
          // con la profundidad de campo apagada, enfoque y apertura existen igual y no significan nada
          // f[5] es autoOrient y f[6]/f[7] son los DOS enums que lo acompanan: los campos nuevos
          // arrancan en f[8]. Leerlos en f[7] daba conProfundidad=false y difusion=1 — o sea la
          // profundidad de campo apagada y el desenfoque al 1%, las dos cosas en silencio.
          conProfundidad: f[8] === '1', difusion: f[9] === undefined ? 100 : +f[9],
          // EL APUNTADO DE UNA CAMARA DE DOS NODOS NO ESTA EN SUS ROTACIONES: informan cero y la camara
          // igual mira al punto de interes. Leerlas devuelve cero SIN ERROR y la camara del reproductor
          // queda apuntando a cualquier lado. Este booleano es lo que le dice al motor que calcule el
          // look-at en vez de leerlo.
          apuntaAlPunto: +f[5] === +f[6],
        }
        break
      }
      case 'NOSOP':
        doc.noSoportado.push({ capa: f[1], que: f[2], detalle: f.slice(3).join('|') })
        break
      case 'CAPA': {
        const c = capaDe(+f[1])
        Object.assign(c, {
          nombre: f[2], tipo: f[3], visible: f[4] === '1',
          entra: +f[5], sale: +f[6], comienzo: +f[7], estirado: +f[8],
          padre: +f[9] || null, fusion: +f[10], es3D: f[11] === '1',
          // LA IDENTIDAD ESTABLE. El indice describe una foto; el id describe una capa. Una plantilla
          // se vuelve a exportar despues de que alguien la toco, y ahi el indice ya no significa lo
          // mismo. Es la leccion del `ind` de Lottie, y AE lo tiene nativo.
          id: +f[12] || null,
        })
        break
      }
      // ---------------------------------------------------------------- los parametros editables
      // PARAMETRO|<idCapa>|<ruta>|<nombrePublico>|<tipo>
      case 'PARAMETRO': {
        doc.parametros = doc.parametros || []
        doc.parametros.push({ capa: +f[1] || null, ruta: f[2], nombre: f[3], tipo: f[4] })
        break
      }
      case 'CONTROLES': { doc.controles = { cantidad: +f[1], nombres: [] }; break }
      case 'CONTROL': {
        doc.controles = doc.controles || { cantidad: 0, nombres: [] }
        doc.controles.nombres[+f[1]] = f[2]
        break
      }
      case 'SOLIDO': {
        const c = capaDe(+f[1])
        c.solido = { color: hex(lista(f[2])), ancho: +f[3], alto: +f[4] }
        break
      }
      case 'ORIGEN': {
        const c = capaDe(+f[1])
        // `copiado` es el nombre del archivo YA puesto al lado del documento. Un documento que apunta
        // a donde estaba el original no es un documento: es un documento mas esa maquina.
        c.origen = { nombre: f[2], archivo: f[3] || null, ancho: +f[4], alto: +f[5], copiado: f[6] || null }
        break
      }
      case 'COMENTARIO': {
        const c = capaDe(+f[1])
        c.comentario = f.slice(2).join('|')
        // LA DECLARACION DE RESPLANDOR VIVE EN EL COMENTARIO DE LA CAPA, y no en los parametros del
        // efecto Glow de AE, porque los nombres de propiedades de efecto estan TRADUCIDOS — igual que
        // los de menu, donde buscar "Easy Ease" devolvia 0 y el que existia era "Aceleracion suave".
        // Un exportador que busque "Glow Intensity" anda en ingles y falla mudo en español.
        //
        //   brillo <fuerza> <radio> <umbral>     ej.  brillo 1.4 0.7 0.55
        //
        // Y esto NO es portar el efecto: es portar la INTENCION. Los efectos de AE se calculan sobre el
        // raster 2D antes de la transformacion 3D y el bloom de un motor web es post-proceso en espacio
        // de pantalla — dos lugares distintos del pipeline. Perseguir identidad de pixel ahi es
        // perseguir algo que no existe; lo honesto es declararlo y que el reproductor lo resuelva bien.
        const m = /(?:^|\s)brillo\s+([\d.]+)(?:\s+([\d.]+))?(?:\s+([\d.]+))?/i.exec(c.comentario)
        if (m) c.brillo = { fuerza: +m[1], radio: m[2] ? +m[2] : 0.6, umbral: m[3] ? +m[3] : 0.5 }
        break
      }
      case 'RASTER': {
        const c = capaDe(+f[1])
        // LA FORMA VIAJA COMO IMAGEN. Se pierde la editabilidad del trazado y se conserva el aspecto
        // EXACTO — el intercambio correcto, porque el aspecto no se puede aproximar y a nadie le hace
        // falta editar los vertices de un rectangulo redondeado desde la web.
        //
        // La caja es la extension medida de la forma EN COORDENADAS DE LA CAPA. Con eso el reproductor
        // sabe donde poner el plano: el raster no esta centrado en el origen de la capa, esta centrado
        // en el centro de la forma, que casi nunca es lo mismo.
        c.raster = {
          archivo: f[2],
          caja: { x: +f[3], y: +f[4], ancho: +f[5], alto: +f[6] },
          margen: +f[7], ancho: +f[8], alto: +f[9],
        }
        break
      }
      case 'ALFA': {
        const c = capaDe(+f[1])
        // El modo de alfa no se adivina: PREMULTIPLICADO y DIRECTO se ven identicos sobre fondo oscuro
        // y distintos sobre claro — el borde queda con orla. Los valores del enum vienen en la misma
        // linea para no hardcodearlos.
        const v = +f[2]
        c.alfa = v === +f[3] ? 'directo' : v === +f[4] ? 'premultiplicado' : v === +f[5] ? 'sin-alfa' : 'desconocido'
        break
      }
      case 'TEXTO': {
        const c = capaDe(+f[1])
        const al = +f[10]
        c.texto = {
          contenido: f[2], fuente: f[3], tipografia: tipografia(f[3]), tamano: +f[4],
          relleno: f[5] === '1' ? hex(lista(f[6])) : null,
          trazo: f[7] === '1' ? hex(lista(f[8])) : null,
          interletra: +f[9],
          alineacion: al === doc.enums.CENTRO ? 'centro' : al === doc.enums.DER ? 'derecha' : 'izquierda',
          interlinea: +f[11],
        }
        break
      }
      case 'CAJA': {
        const c = capaDe(+f[1])
        c.caja = { x: +f[2], y: +f[3], ancho: +f[4], alto: +f[5] }
        break
      }
      // ---------------------------------------------------------------- LOS ANIMADORES DE TEXTO
      //
      // Viajan como una LISTA DECLARATIVA: cada animador trae sus selectores y las propiedades que el
      // autor agrego. Los valores animables no van aca sino en las lineas PROP/KEY normales, bajo
      // etiquetas con espacio de nombres (`anim1sel1.fin`, `anim1.val.ADBE Text Opacity`), asi que
      // reusan el mismo conversor de curvas que todo lo demas. Un canal nuevo para las curvas de los
      // animadores seria una segunda implementacion de la misma cuenta, y esas divergen en silencio.
      case 'ANIMADOR': {
        const c = capaDe(+f[1])
        if (!c.animadores) c.animadores = []
        c.animadores.push({ indice: +f[2], nombre: f[3], selectores: [], propiedades: [] })
        break
      }
      case 'ANIMSEL': {
        const c = capaDe(+f[1])
        const A = (c.animadores || []).find(x => x.indice === +f[2]); if (!A) break
        A.selectores.push({
          indice: +f[3], unidades: +f[4], forma: +f[5], modo: +f[6],
          base: +f[7], suavidad: +f[8], aleatorio: f[9] === '1',
        })
        break
      }
      case 'ANIMPROP': {
        const c = capaDe(+f[1])
        const A = (c.animadores || []).find(x => x.indice === +f[2]); if (!A) break
        A.propiedades.push({ nombre: f[3], dims: +f[4] })
        break
      }
      // ---------------------------------------------------------------- LAS MASCARAS
      //
      // El modo y la inversion son ATRIBUTOS del objeto en AE, no propiedades: no se animan, asi que
      // viajan en la linea de cabecera. El calado, la opacidad y la expansion SI se animan y viajan por
      // las lineas PROP/KEY de siempre, bajo `mascaraN.calado` y compania.
      //
      // Y EL TRAZADO VIAJA MUESTREADO CUANDO ESTA ANIMADO, un cuadro por vez, con `cuadro = -1` para el
      // caso fijo. AE no interpola trazados de forma reproducible —entre un triangulo de 3 vertices y
      // un cuadrado de 4 devuelve 4, con el vertice insertado en el 42% del lado, no en el medio— asi
      // que el exportador no reproduce la interpolacion: la muestrea. Exacto por construccion.
      // ---------------------------------------------------------------- LA FORMA VECTORIAL
      //
      // El segundo caso de forma que NO se rasteriza. Igual que las mascaras, el trazado animado viaja
      // MUESTREADO: AE no interpola trazados de forma reproducible pero `valueAtTime` los entrega ya
      // interpolados, asi que el exportador muestrea en vez de reproducir.
      case 'FORMAV': { capaDe(+f[1]).forma = { partes: [] }; break }
      case 'FORMATZ': {
        const c = capaDe(+f[1]); if (!c.forma) break
        c.forma.partes.push({ tipo: 'trazado', orden: +f[2], animado: f[3] === '1', trazados: new Map() })
        break
      }
      case 'FORMAV_TZ': {
        const c = capaDe(+f[1]); if (!c.forma) break
        const P = c.forma.partes.find(x => x.tipo === 'trazado' && x.orden === +f[2]); if (!P) break
        const pts = (s) => s === '' ? [] : s.split(';').map(q => q.split(',').map(Number))
        P.trazados.set(+f[3], { cerrado: f[4] === '1', v: pts(f[5]), ent: pts(f[6]), sal: pts(f[7]) })
        break
      }
      case 'FORMATRAZO': {
        const c = capaDe(+f[1]); if (!c.forma) break
        c.forma.partes.push({ tipo: 'trazo', orden: +f[2], color: hex(lista(f[3])),
                              cap: +f[4], union: +f[5], inglete: +f[6] })
        break
      }
      case 'FORMARELLENO': {
        const c = capaDe(+f[1]); if (!c.forma) break
        c.forma.partes.push({ tipo: 'relleno', orden: +f[2], color: hex(lista(f[3])), regla: +f[4] })
        break
      }
      case 'FORMARECORTE': {
        const c = capaDe(+f[1]); if (!c.forma) break
        c.forma.partes.push({ tipo: 'recorte', orden: +f[2], modo: +f[3] })
        break
      }
      case 'MASCARA': {
        const c = capaDe(+f[1])
        if (!c.mascaras) c.mascaras = []
        c.mascaras.push({
          indice: +f[2], modo: +f[3], invertida: f[4] === '1', nombre: f[5],
          animada: f[6] === '1', trazados: new Map(),
        })
        break
      }
      case 'MASCARAV': {
        const c = capaDe(+f[1])
        const M = (c.mascaras || []).find(x => x.indice === +f[2]); if (!M) break
        const pts = (s) => s === '' ? [] : s.split(';').map(q => q.split(',').map(Number))
        M.trazados.set(+f[3], { cerrado: f[4] === '1', v: pts(f[6]), ent: pts(f[7]), sal: pts(f[8]) })
        break
      }
      case 'SEPARADAS': capaDe(+f[1]).separadas = f[2] === '1'; break
      case 'PROP': {
        const c = capaDe(+f[1])
        c.props.set(f[2], {
          nombre: f[2], animada: f[3] === '1', dims: +f[4],
          estatico: lista(f[5]), expresion: f[6] === 'SI', keys: [],
          horneado: null, expr: null, exprError: null,
        })
        break
      }
      // ---------------------------------------------------------------- la expresion, ya horneada
      // El exportador no manda el programa para que alguien lo interprete: manda el RESULTADO, una
      // muestra por cuadro, igual que con los trazados de mascara. `EXPR` es el cuerpo (informativo, va
      // al documento para poder leer despues por que una capa se mueve como se mueve) y `EXPRERROR` es
      // el peor desvio entre el valor real a mitad de cuadro y la interpolacion lineal entre muestras.
      case 'EXPR': {
        const p = capaDe(+f[1]).props.get(f[2]); if (!p) break
        p.expr = f[3]
        break
      }
      case 'EXPRERROR': {
        const p = capaDe(+f[1]).props.get(f[2]); if (!p) break
        p.exprError = { peor: +f[3], cuadro: +f[4] }
        break
      }
      case 'HORNEADO': {
        const p = capaDe(+f[1]).props.get(f[2]); if (!p) break
        if (!p.horneado) p.horneado = []
        p.horneado[+f[3]] = lista(f[4])
        break
      }
      case 'KEY': {
        const p = capaDe(+f[1]).props.get(f[2]); if (!p) break
        const n = +f[6]
        p.keys.push({
          indice: +f[3], t: +f[4], valor: lista(f[5]),
          entrada: f.slice(7, 7 + n).map(lee),
          salida: f.slice(7 + n, 7 + 2 * n).map(lee),
        })
        break
      }
      case 'TIPO': {
        const k = capaDe(+f[1]).props.get(f[2])?.keys.find(q => q.indice === +f[3]); if (!k) break
        k.tipoEntrada = +f[4]; k.tipoSalida = +f[5]
        k.roving = f[6] === 'SI'; k.continuo = f[7] === 'SI'; k.autoTemporal = f[8] === 'SI'
        break
      }
      case 'ESPACIAL': {
        const k = capaDe(+f[1]).props.get(f[2])?.keys.find(q => q.indice === +f[3]); if (!k) break
        k.tangenteEntrada = nums(f[4]); k.tangenteSalida = nums(f[5]); k.autoEspacial = f[6] === 'SI'
        break
      }
    }
  }
  // AE numera la capa 1 como la de ARRIBA. Se conserva ese orden y se dice, porque el reproductor
  // tiene que dibujar de la ultima a la primera y equivocarse ahi da una composicion dada vuelta.
  doc.capas.sort((a, b) => a.indice - b.indice)
  return doc
}

// ---------------------------------------------------------------- a documento de escena
export function documentoDe(crudo) {
  const enums = crudo.enums
  const capas = crudo.capas.map(c => {
    const transformacion = {}
    for (const [nombre, p] of c.props) {
      // UNA PROPIEDAD CON EXPRESION VIAJA HORNEADA Y GANA A TODO LO DEMAS. En AE la expresion PISA los
      // keyframes: si una propiedad tiene las dos cosas, lo que se ve es la expresion. Reproducir esa
      // precedencia acá es la diferencia entre dibujar lo que AE muestra y dibujar lo que el autor
      // escribió antes de agregarle la expresión encima.
      if (p.horneado) {
        transformacion[nombre] = {
          horneado: p.horneado, base: p.estatico,
          expr: p.expr, exprError: p.exprError,
        }
        continue
      }
      if (!p.animada) { transformacion[nombre] = { estatico: p.estatico }; continue }
      // una pista por componente: posicion tiene tres, opacidad una. La cantidad sale del dato.
      const pistas = []
      for (let comp = 0; comp < Math.max(1, p.dims); comp++) {
        pistas.push({ componente: comp, tramos: segmentos({ keys: p.keys }, enums, comp) })
      }
      transformacion[nombre] = { pistas, base: p.estatico }
    }
    // LA FUSION Y LA IDENTIDAD SE PARSEABAN Y SE TIRABAN. Estaban leidas mas arriba (`fusion: +f[10]`,
    // `id: +f[12]`) y este objeto —el que de verdad viaja— no las copiaba, asi que no llegaban a
    // comp.json. Yo mismo afirme que el documento "ya transportaba fusion"; se parseaba y se
    // descartaba, que a efectos practicos es no transportarla.
    //
    // La fusion viaja como NOMBRE, no como el numero de AE: el reproductor no tiene por que conocer
    // los codigos de Adobe, y un numero magico que cambie de version rompe en silencio.
    const nombreFusion = !Number.isFinite(c.fusion) || c.fusion === enums.NORMAL ? 'normal'
      : c.fusion === enums.SUMA ? 'suma'
      : 'otra'
    return {
      indice: c.indice, nombre: c.nombre, tipo: c.tipo, visible: c.visible,
      id: c.id ?? null, fusion: nombreFusion,
      matte: c.matte || null, esMatte: !!c.esMatte,
      arco: c.arco || null,
      entra: c.entra, sale: c.sale, padre: c.padre, es3D: c.es3D,
      texto: c.texto || null, solido: c.solido || null, origen: c.origen || null,
      alfa: c.alfa || null, brillo: c.brillo || null, comentario: c.comentario || null,
      raster: c.raster || null,
      caja: c.caja || null, separadas: !!c.separadas, desenfoque: !!c.desenfoque,
      animadores: c.animadores || null,
      // los Map no sobreviven a JSON.stringify: el trazado viaja como lista de pares [cuadro, trazado]
      forma: c.forma
        ? { partes: c.forma.partes
              .sort((x, y) => x.orden - y.orden)
              .map(P => P.trazados
                ? { ...P, trazados: [...P.trazados].sort((a2, b2) => a2[0] - b2[0]) }
                : P) }
        : null,
      mascaras: c.mascaras
        ? c.mascaras.map(m => ({ ...m, trazados: [...m.trazados].sort((a2, b2) => a2[0] - b2[0]) }))
        : null,
      camara: c.camara || null,
      transformacion,
    }
  })

  const rechazos = []
  for (const c of capas) {
    for (const [nombre, t] of Object.entries(c.transformacion)) {
      for (const pista of t.pistas || []) {
        for (const tr of pista.tramos) {
          if (tr.tipo === 'rechazado') rechazos.push({ capa: c.indice, prop: nombre, motivo: tr.motivo })
        }
      }
    }
  }

  return {
    version: crudo.version, comp: crudo.comp, capas,
    obturador: crudo.obturador || { activo: false, angulo: 180, fase: -90, muestras: 16, limite: 128 },
    // LOS PARAMETROS SON PARTE DEL DOCUMENTO, no de la lectura cruda. Es lo que convierte una pieza en
    // una plantilla: el motor web reproduce las capas, y el producto le ofrece al usuario EXACTAMENTE
    // esta lista para rellenar. Sin esto el documento describe un video; con esto describe un molde.
    parametros: crudo.parametros || [],
    controles: crudo.controles || { cantidad: 0, nombres: [] },
    noSoportado: crudo.noSoportado, avisos: crudo.avisos || [], rechazos,
    completo: crudo.noSoportado.length === 0 && rechazos.length === 0 && !crudo.error,
  }
}

// ---------------------------------------------------------------- CLI
if (process.argv[1]?.endsWith('comp.mjs')) {
  const crudo = leerComp()
  const doc = documentoDe(crudo)

  console.log(`${doc.version} · composicion "${doc.comp.nombre}" ${doc.comp.ancho}x${doc.comp.alto} ` +
    `@ ${doc.comp.fps}fps · ${doc.comp.duracion}s · fondo ${doc.comp.fondo}`)
  console.log(`${doc.capas.length} capas (la 1 es la de ARRIBA)\n`)

  console.log('  #  tipo     nombre                que trae')
  console.log('  ' + '-'.repeat(74))
  for (const c of doc.capas) {
    const animadas = Object.entries(c.transformacion).filter(([, t]) => t.pistas).map(([n]) => n)
    const extra = []
    if (c.texto) extra.push(`"${c.texto.contenido.slice(0, 18)}" ${c.texto.tamano}px ${c.texto.relleno} ${c.texto.alineacion}`)
    if (c.solido) extra.push(`solido ${c.solido.color} ${c.solido.ancho}x${c.solido.alto}`)
    if (c.padre) extra.push(`hijo de ${c.padre}`)
    if (c.caja) extra.push(`caja medida ${c.caja.ancho.toFixed(0)}x${c.caja.alto.toFixed(0)}`)
    console.log(`  ${String(c.indice).padStart(2)}  ${c.tipo.padEnd(8)} ${c.nombre.slice(0, 20).padEnd(21)} ` +
      (animadas.length ? `anima: ${animadas.join(', ')}` : 'quieta'))
    if (extra.length) console.log(`      ${extra.join(' · ')}`)
  }

  // ---------------------------------------------------------------- los parametros de la plantilla
  // Y LAS DOS FUENTES SE COMPARAN. El manifiesto del comentario dice a QUE propiedad corresponde cada
  // parametro; la lista de Graficos Esenciales de AE dice que nombres publicos existen de verdad. Si
  // divergen, alguien toco una y no la otra — y una plantilla que promete un parametro que no esta es
  // exactamente la clase de mentira que este repo persigue.
  const par = doc.parametros || []
  const ctl = doc.controles || { cantidad: 0, nombres: [] }
  if (par.length || ctl.cantidad) {
    console.log('\n  PARAMETROS EDITABLES:')
    if (!par.length) {
      console.log(`    AE declara ${ctl.cantidad} control(es) y el manifiesto esta vacio:`)
      console.log('    la composicion tiene Graficos Esenciales pero nadie anoto a que propiedad va cada uno.')
    }
    for (const p of par) {
      const enAE = ctl.nombres.includes(p.nombre)
      console.log(`    ${enAE ? 'ok  ' : 'SOLO'} ${String(p.nombre).padEnd(24)} ${String(p.tipo).padEnd(10)} capa ${p.capa} · ${p.ruta}`)
    }
    const huerfanos = ctl.nombres.filter(n => n && !par.some(p => p.nombre === n))
    for (const h of huerfanos) console.log(`    SOLO ${String(h).padEnd(24)} (esta en AE y no en el manifiesto)`)
    const coincide = par.length === ctl.cantidad && par.every(p => ctl.nombres.includes(p.nombre))
    doc.parametrosCoinciden = coincide
    console.log(coincide
      ? `    ${par.length} parametro(s), y el manifiesto coincide con la lista de AE`
      : `    NO COINCIDEN: ${par.length} en el manifiesto contra ${ctl.cantidad} en AE`)
  }

  console.log('\n  LO QUE NO VIAJA:')
  if (!doc.noSoportado.length && !doc.rechazos.length) {
    console.log('    nada — la composicion entra entera en el documento')
  } else {
    for (const n of doc.noSoportado) console.log(`    capa ${n.capa}: ${n.que}${n.detalle && n.detalle !== '-' ? ` (${n.detalle})` : ''}`)
    for (const r of doc.rechazos) console.log(`    capa ${r.capa} ${r.prop}: ${r.motivo}`)
  }

  const i = process.argv.indexOf('--json')
  if (i > 0 && process.argv[i + 1]) {
    writeFileSync(process.argv[i + 1], JSON.stringify(doc, null, 1))
    console.log(`\n  documento -> ${process.argv[i + 1]}`)
  }

  if (crudo.error) { console.error(`\nLA SONDA INFORMO UN ERROR: ${crudo.error}`); process.exit(2) }
  console.log(doc.completo
    ? '\nDOCUMENTO COMPLETO — todo lo que hay en la composicion viaja.'
    : `\nDOCUMENTO INCOMPLETO — ${doc.noSoportado.length + doc.rechazos.length} cosa(s) quedaron afuera. ` +
      `Reproducir esto daria algo PARECIDO, que es peor que fallar.`)
  process.exit(doc.completo ? 0 : 1)
}

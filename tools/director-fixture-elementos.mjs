// Arma los fixtures CON elementos reales: toma un fixture existente y le inyecta los recortes que el
// extractor dejo en tools/out/elementos/<host>/.
//
// Los fixtures con elementos van SEPARADOS de los normales a proposito. Los de siempre representan el
// caso "la pagina no dio recortes" — bloqueada, sin credenciales de hosting, un sitio que no tiene un
// solo objeto capturable — y ese caso tiene que seguir dando un video entero. Si les metiera elementos
// a todos, el motor perderia su unico test de que sabe componer sin ellos.
//
// El `url` de cada elemento es el nombre del PNG, no una URL: el gate los carga de disco. Los gates
// corren sin red por decision del repo, y un gate que dependa de Cloudinary falla el dia que se caiga
// Cloudinary — que no es el dia en que el motor se rompio.
//
// Uso:  node tools/director-fixture-elementos.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createCanvas, loadImage } from '@napi-rs/canvas'

// Los recortes de una pagina real pesan hasta 1.2MB cada uno y las siete paginas juntas daban 9MB de
// fixtures. Se reescalan a 600px de lado mayor: el gate mide geometria, proporcion y alfa, y ninguna
// de las tres cambia con la escala. La resolucion completa solo hace falta en el video de verdad.
const LADO_FIX = 600
async function achicar(src, dst) {
  const img = await loadImage(src)
  const k = Math.min(1, LADO_FIX / Math.max(img.width, img.height))
  if (k >= 1) { fs.copyFileSync(src, dst); return }
  const cv = createCanvas(Math.round(img.width * k), Math.round(img.height * k))
  const c = cv.getContext('2d')
  c.drawImage(img, 0, 0, cv.width, cv.height)
  fs.writeFileSync(dst, cv.toBuffer('image/png'))
}

const SRC = path.join('tools', 'out', 'elementos')
const FIX = path.join('tools', 'fixtures', 'director')
const DST = path.join(FIX, 'elementos')

// Cada pagina lleva SUS elementos sobre SU pagemodel. Cruzarlos (los recortes de una marca sobre el
// texto y la paleta de otra) daria un fixture que no puede existir en produccion, y un gate que
// aprueba una situacion imposible no prueba nada.
const PARES = [
  ['stripe-com', 'stripe-com'],                        // landing SaaS clasica: tarjetas + CTA pintado
  ['linear-app', 'linear-app'],                        // logo con alfa sobre fondo oscuro: el caso de contraste
  ['www-mercadolibre-com-ar', 'mercadolibre-com-ar'],  // marketplace denso en español, sin logo capturable
  ['ghost-org', 'ghost-org'],                          // logo + CTA + capturas de producto
  ['tailwindcss-com', 'tailwindcss-com'],              // pagina casi sin <img>: el caso pobre en elementos
  ['basecamp-com', 'basecamp-com'],                    // pocas piezas y grandes
  ['cliping-ia-vercel-app', 'cliping-ia-vercel-app'],  // la nuestra
]

if (!fs.existsSync(SRC)) {
  console.error(`falta ${SRC}: corre primero la cosecha de elementos`)
  process.exit(1)
}
fs.mkdirSync(DST, { recursive: true })
let n = 0
for (const [host, fixture] of PARES) {
  const dir = path.join(SRC, host)
  const fx = path.join(FIX, `${fixture}.json`)
  if (!fs.existsSync(path.join(dir, 'meta.json')) || !fs.existsSync(fx)) {
    console.log(`  salteo ${host} -> ${fixture} (falta la cosecha o el fixture)`)
    continue
  }
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'))
  const pm = JSON.parse(fs.readFileSync(fx, 'utf8'))
  const els = []
  for (const m of meta) {
    const destino = `${fixture}__${m.file}`
    await achicar(path.join(dir, m.file), path.join(DST, destino))
    els.push({
      id: m.id, rol: m.rol, url: destino, w: m.w, h: m.h,
      ar: Math.round((m.w / m.h) * 1000) / 1000,
      alfa: !!m.alfa, textura: m.textura, color: m.color, lum: m.lum,
      minPx: m.minPx || 0, texto: m.texto || '',
    })
  }
  pm.assets = { ...(pm.assets || {}), elementos: els }
  fs.writeFileSync(path.join(DST, `${fixture}.json`), JSON.stringify(pm, null, 2) + '\n')
  console.log(`  ${fixture}: ${els.length} elementos (${[...new Set(els.map(e => e.rol))].join(', ')})`)
  n++
}
console.log(`${n} fixtures con elementos -> ${DST}/`)

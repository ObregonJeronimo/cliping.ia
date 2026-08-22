import http from 'node:http'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
const HERE = process.cwd()
const port = 8973
http.createServer((req, res) => {
  let p = req.url === '/' ? '/nova.html' : req.url.split('?')[0]
  try {
    const buf = readFileSync(join(HERE, p))
    res.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html' : 'application/octet-stream' })
    res.end(buf)
  } catch { res.writeHead(404); res.end('nf') }
}).listen(port, () => console.log('serve http://localhost:' + port))

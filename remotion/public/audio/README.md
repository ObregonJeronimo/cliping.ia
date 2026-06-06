# Audio (Fase 3) — cama musical + sfx

La parte técnica ya está cableada en `remotion/src/templates/SoundLayer.jsx`.
Para activar el sonido SOLO falta tirar archivos acá. Sin archivos, no suena nada
(el render no se rompe).

## Dónde van los archivos
- `music/<nombre>.mp3` — camas musicales (una por mood). Ej: `music/calm.mp3`,
  `music/energetic.mp3`. Tienen que ser **royalty-free / con licencia comercial**.
- `sfx/whoosh.mp3` — barrido corto para los cortes/transiciones.
- `sfx/tick.mp3` — tick sutil para entradas/acentos (opcional, aún no cableado).

## Cómo se activa (desde el spec del director)
```jsonc
"audio": {
  "music": "energetic",   // nombre del archivo en audio/music/ sin extensión
  "musicVolume": 0.18,    // 0..1 (default 0.18, con fade-in/out automático)
  "whooshVolume": 0.5     // los whooshAt se calculan solos en los cortes
}
```
`whooshAt` (frames de los cortes) se completa automáticamente en `VideoFromSpec`
a partir de las duraciones de escena, así que no hace falta pasarlo a mano.

## Pendiente
- Conseguir la música royalty-free (requisito legal, no técnico).
- Cuando esté: que el director elija `music` por mood y, si querés, cortes al beat
  (bpm -> frames por beat para alinear duraciones de escena).

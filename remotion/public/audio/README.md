# Audio (Fase 3) — cama musical + sfx

La parte técnica ya está cableada en `remotion/src/templates/SoundLayer.jsx`.
Para activar el sonido SOLO falta tirar archivos acá. Sin archivos, no suena nada
(el render no se rompe).

## Dónde van los archivos
- `music/<nombre>.mp3` — camas musicales (una por mood). Tienen que ser
  **royalty-free / con licencia comercial**. El director elige el track según el mood:
  - `music/energetic.mp3`  (mood "enérgico y rápido")
  - `music/calm.mp3`       (mood "calmo y premium")  ← también es el fallback
  - `music/confident.mp3`  (mood "confiable y claro")
  - `music/bold.mp3`       (mood "moderno y audaz")
- `sfx/whoosh.mp3` — barrido corto para los cortes/transiciones.
- `sfx/tick.mp3` — tick sutil para entradas/acentos (opcional, aún no cableado).

## Cómo se activa
Una vez que los archivos de `music/` están cargados, prendé la env flag y el director
suma la cama por mood automáticamente:

```bash
CLIPING_AUDIO=1   # en backend/.env o en el entorno del backend
```

Sin la flag (o sin archivos), no se setea `spec.audio` y no suena nada (no rompe el render).
También podés setear `spec.audio` a mano:

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
- Conseguir la música royalty-free (requisito legal, no técnico) y dejarla en `music/`.
- Opcional: cortes al beat (bpm -> frames por beat para alinear duraciones de escena).

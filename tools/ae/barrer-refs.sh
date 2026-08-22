#!/usr/bin/env bash
# EL BARRIDO: extrae los cuadros de cada referencia y los mide.
#
# EN GRIS Y A 320 DE ANCHO. Las metricas son de MOVIMIENTO, CORTES y CAJA DE TINTA: ninguna necesita
# color ni resolucion. A 1080 en color el barrido serian ~9 GB y media hora; asi son ~120 MB y unos
# minutos, y da exactamente los mismos numeros.
#
# LA CADENCIA SE LEE DEL ARCHIVO, no se supone: las siete corren a cadencias distintas (23,976 · 24 ·
# 29,97 · 30 · 60) y todo el informe sale en segundos.
set -u
D=C:/ae-probe/refs
F=$D/f
mkdir -p "$F"

for v in "$D"/*.mp4; do
  n=$(basename "$v" .mp4)
  fps=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$v")
  num=${fps%%/*}; den=${fps##*/}
  fpsdec=$(awk -v a="$num" -v b="$den" 'BEGIN{printf "%.4f", a/b}')
  if [ ! -d "$F/$n" ] || [ -z "$(ls -A "$F/$n" 2>/dev/null)" ]; then
    mkdir -p "$F/$n"
    echo "  extrayendo $n ($fpsdec fps)..."
    ffmpeg -v error -i "$v" -vf "scale=320:-2,format=gray" -vsync 0 "$F/$n/n%05d.png"
  fi
  node tools/ae/medir-referencia.mjs "$F/$n" "$fpsdec" --json "$D/$n.json"
done

echo
echo "cuadros extraidos: $(find "$F" -name '*.png' | wc -l) · $(du -sm "$F" | cut -f1) MB"

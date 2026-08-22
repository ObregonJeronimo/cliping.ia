#!/usr/bin/env bash
# BAJAR LAS REFERENCIAS PARA MEDIRLAS. Material ajeno que se estudia y se borra, no se redistribuye:
# vive fuera del repo, en C:/ae-probe/refs/, igual que `tools/mirar-video.py`.
#
# Se pide 1080p como techo y no mas: la medicion es de MOVIMIENTO y de CORTES, y para eso 1080 sobra.
# Bajar 4K seria pagar diez veces el disco para medir lo mismo.
set -u
D=C:/ae-probe/refs
mkdir -p "$D"

bajar() {
  local id=$1 nombre=$2
  if [ -f "$D/$nombre.mp4" ]; then echo "  ya estaba: $nombre"; return; fi
  python -m yt_dlp -q --no-warnings --no-playlist \
    -f "bestvideo[height<=1080][ext=mp4]/best[height<=1080][ext=mp4]/best[height<=1080]" \
    -o "$D/$nombre.%(ext)s" "https://www.youtube.com/watch?v=$id" 2>&1 | tail -2
  echo "  bajado: $nombre"
}

bajar ISYIEmQxs2M apple
bajar mRql2VJ99gM linear
bajar S92KX8-Hmlc notion
bajar 4SCjXcBeW1E google
bajar Cx2dkpBxst8 figma
bajar aSte18D2_YE neuraflow
bajar awUYikrGsKk numtera

echo
printf '%-12s %8s %10s %6s %12s\n' archivo dur cadencia alto MB
for f in "$D"/*.mp4; do
  n=$(basename "$f" .mp4)
  d=$(ffprobe -v error -select_streams v:0 -show_entries format=duration -of csv=p=0 "$f" 2>/dev/null | cut -d. -f1)
  r=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$f" 2>/dev/null)
  h=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$f" 2>/dev/null)
  m=$(( $(stat -c %s "$f") / 1048576 ))
  printf '%-12s %6ss %10s %6s %10sMB\n' "$n" "$d" "$r" "$h" "$m"
done

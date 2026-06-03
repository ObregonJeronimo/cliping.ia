@echo off
title cliping.ia
cd /d C:\Users\Usuario\Documents\cliping.ia

echo Actualizando codigo...
git pull

wt --title "cliping.ia" --tabColor #6366f1 ^
  powershell -NoExit -Command "cd 'C:\Users\Usuario\Documents\cliping.ia\backend'; try { python run.py } finally { }" ^
  ; split-pane --horizontal --size 0.4 ^
  powershell -NoExit -Command "try { ngrok http 8000 } finally { }"

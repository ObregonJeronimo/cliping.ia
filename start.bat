@echo off
title cliping.ia
cd /d C:\Users\Usuario\Documents\cliping.ia

echo Actualizando codigo...
git pull

wt --title "cliping.ia" --tabColor #6366f1 ^
  powershell -NoExit -Command "cd 'C:\Users\Usuario\Documents\cliping.ia\backend'; python run.py" ^
  ; split-pane --horizontal --size 0.4 ^
  powershell -NoExit -Command "ngrok http 8000"

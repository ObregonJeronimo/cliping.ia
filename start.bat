@echo off
title cliping.ia
cd /d C:\Users\Usuario\Documents\cliping.ia

echo Actualizando codigo...
git pull

wt --title "cliping.ia" ^
  cmd /k "cd /d C:\Users\Usuario\Documents\cliping.ia\backend && python run.py" ^
  ; split-pane --horizontal ^
  cmd /k "ngrok http 8000"

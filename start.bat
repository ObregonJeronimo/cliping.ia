@echo off
title cliping.ia
cd /d C:\Users\Usuario\Documents\cliping.ia

echo Actualizando codigo...
git pull

wt --title "cliping.ia" --tabColor #6366f1 ^
  cmd /k "cd /d C:\Users\Usuario\Documents\cliping.ia\backend && python run.py" ^
  ; split-pane --horizontal --size 0.4 ^
  cmd /k "ngrok http 8000"

@echo off
title cliping.ia
cd /d C:\Users\Usuario\Documents\cliping.ia

echo Actualizando codigo...
git pull

echo Abriendo backend + ngrok...
start "Backend" cmd /k "cd backend && python run.py"
timeout /t 2 /nobreak >nul
start "Ngrok" cmd /k "ngrok http 8000"

echo Listo. Cerra y reabri este bat para reiniciar todo.

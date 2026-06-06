@echo off
title cliping.ia
cd /d C:\Users\Usuario\Documents\cliping.ia

echo Cerrando instancias previas (backend y ngrok)...
taskkill /F /IM ngrok.exe >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo Actualizando codigo...
git pull

echo Instalando dependencias del backend...
python -m pip install -r backend\requirements.txt --quiet --disable-pip-version-check

echo Instalando navegador para captura de sitios (una vez)...
python -m playwright install chromium

echo Instalando dependencias de remotion...
pushd remotion
call npm install --silent --no-audit --no-fund
popd

wt --title "cliping.ia" --tabColor #6366f1 ^
  cmd /k "cd /d C:\Users\Usuario\Documents\cliping.ia\backend && python run.py" ^
  ; split-pane --horizontal --size 0.4 ^
  cmd /k "ngrok http 8000"

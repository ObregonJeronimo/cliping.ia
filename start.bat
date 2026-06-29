@echo off
title cliping.ia
rem Ruta PORTABLE: %~dp0 = la carpeta donde esta este .bat -> funciona en cualquier PC/usuario (Jero o Thiago),
rem sin editar rutas. Requisito: clonar el repo en una ruta SIN espacios.
cd /d "%~dp0"

echo Cerrando instancias previas (backend y ngrok)...
taskkill /F /IM ngrok.exe >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo Actualizando codigo (git pull ANTES de trabajar)...
git pull

echo Publicando reglas de Firestore (best-effort)...
where firebase >nul 2>&1
if %errorlevel%==0 (
  call firebase deploy --only firestore:rules --non-interactive
) else (
  echo   Firebase CLI no encontrado. Para publicar reglas automaticamente, una sola vez:
  echo     npm i -g firebase-tools  ^&^&  firebase login
)

echo Instalando dependencias del backend...
python -m pip install -r backend\requirements.txt --quiet --disable-pip-version-check

echo Instalando navegador para captura de sitios (una vez)...
python -m playwright install chromium

rem Backend (puerto 8000) + ngrok con el dominio FIJO que usa vercel.json (asi la pagina de Vercel llega al backend).
rem El dominio 'draw-overturn-backpack.ngrok-free.dev' esta RESERVADO en la cuenta ngrok de Jero: para hostearlo,
rem Thiago debe cargar el authtoken de Jero UNA sola vez:  ngrok config add-authtoken ^<token-de-jero^>
rem Solo UNO corre el backend por dia (dia de Jero / dia de Thiago) -> nunca dos ngrok con el mismo dominio a la vez.
wt --title "cliping.ia" --tabColor #6366f1 ^
  cmd /k "cd /d %~dp0backend && python run.py" ^
  ; split-pane --horizontal --size 0.4 ^
  cmd /k "ngrok http --domain=draw-overturn-backpack.ngrok-free.dev 8000"

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

rem Publicar reglas de Firestore. Jero y Thiago son OWNERS del proyecto 'cliping-ia' -> a ambos les corre. BEST-EFFORT: la
rem salida del deploy se silencia y se chequea el resultado; si fallara (futuro colaborador sin permiso, o la propagacion
rem del permiso que tarda unos minutos), muestra UN renglon y sigue -- nunca el volcado crudo del 403. 'if errorlevel 1'
rem se evalua en RUNTIME (mas robusto que %%errorlevel%% dentro de un bloque entre parentesis).
echo Publicando reglas de Firestore (best-effort)...
where firebase >nul 2>&1
if errorlevel 1 (
  echo   Firebase CLI no encontrado. Una sola vez:  npm i -g firebase-tools  ^&^&  firebase login
) else (
  call firebase deploy --only firestore:rules --non-interactive >nul 2>&1
  if errorlevel 1 (
    echo   No se pudieron publicar las reglas ^(sin permiso / propagacion / sin red^) -- normal, sigo.
  ) else (
    echo   Reglas de Firestore publicadas.
  )
)

echo Instalando dependencias del backend...
python -m pip install -r backend\requirements.txt --quiet --disable-pip-version-check

echo Instalando navegador para captura de sitios (una vez)...
python -m playwright install chromium

rem Dependencias del FRONTEND (solo la primera vez o si falta node_modules): la pagina local corre con vite.
if not exist node_modules (
  echo Instalando dependencias del frontend ^(una vez^)...
  call npm install --no-audit --no-fund
)

rem Backend (puerto 8000) + ngrok con el dominio FIJO que usa vercel.json (asi la pagina de Vercel llega al backend).
rem El dominio 'draw-overturn-backpack.ngrok-free.dev' esta RESERVADO en la cuenta ngrok de Jero: para hostearlo,
rem Thiago debe cargar el authtoken de Jero UNA sola vez:  ngrok config add-authtoken ^<token-de-jero^>
rem Solo UNO corre el backend por dia (dia de Jero / dia de Thiago) -> nunca dos ngrok con el mismo dominio a la vez.
rem Windows Terminal (wt) da paneles lindos PERO en Windows 10 NO viene instalado -> si no esta, abrimos 2 ventanas cmd
rem normales (andan en cualquier Windows). Sin esto, en la PC Win10 de Thiago el .bat se cerraba SIN levantar el backend.
rem Ademas del backend+ngrok, levantamos la PAGINA LOCAL (vite, puerto 5173, con proxy /api -> :8000) y
rem abrimos el navegador directo en el estudio nuevo Kinetic IA -> probar es: doble click al .bat y listo.
where wt >nul 2>&1
if errorlevel 1 goto launch_cmd
wt --title "cliping.ia" --tabColor #6366f1 ^
  cmd /k "cd /d %~dp0backend && python run.py" ^
  ; split-pane --horizontal --size 0.4 ^
  cmd /k "ngrok http --domain=draw-overturn-backpack.ngrok-free.dev 8000" ^
  ; split-pane --vertical --size 0.5 ^
  cmd /k "cd /d %~dp0 && npm run dev"
goto open_browser
:launch_cmd
echo Windows Terminal no esta -> abriendo backend, ngrok y pagina en ventanas cmd...
start "cliping.ia - backend :8000" cmd /k "cd /d %~dp0backend && python run.py"
start "cliping.ia - ngrok" cmd /k "ngrok http --domain=draw-overturn-backpack.ngrok-free.dev 8000"
start "cliping.ia - pagina :5173" cmd /k "cd /d %~dp0 && npm run dev"
:open_browser
rem Espera a que vite arranque y abre la pagina local en el estudio Kinetic IA (navegador por defecto).
echo Abriendo la pagina local en Kinetic IA...
timeout /t 8 /nobreak >nul
start "" "http://localhost:5173/studio/kinetic"
:end

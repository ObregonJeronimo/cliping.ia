@echo off
title cliping.ia - DEV (local)
rem ============================================================================
rem  DEV LOCAL (un solo doble-clic): backend (puerto 8000) + frontend Vite (5173).
rem  NO usa ngrok ni deploy -> es para PROGRAMAR y PROBAR tus cambios.
rem  La web local http://localhost:5173 pega a tu backend local http://localhost:8000.
rem  Portable (%~dp0): anda en cualquier PC sin editar rutas (repo en ruta SIN espacios).
rem  Cerrar: Ctrl+C en cada panel (o cerra la ventana).
rem  (Para HOSTEAR la demo en vivo con ngrok, usa start.bat en su lugar.)
rem ============================================================================
cd /d "%~dp0"

echo Cerrando backend previo en el puerto 8000 (si quedo abierto)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo Abriendo backend + frontend...
wt --title "cliping.ia DEV" --tabColor #10b981 ^
  cmd /k "cd /d %~dp0backend && python run.py" ^
  ; split-pane --horizontal --size 0.5 ^
  cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo Listo. Backend en http://localhost:8000  |  Frontend en http://localhost:5173
echo (si no abre solo, entra a http://localhost:5173 en el navegador)

@echo off
title cliping.ia — Backend + Ngrok
cd /d C:\Users\Usuario\Documents\cliping.ia

echo ========================================
echo   cliping.ia — actualizando...
echo ========================================
git pull

echo.
echo Iniciando ngrok en segundo plano...
start /B ngrok http 8000 > nul 2>&1

echo Ngrok corriendo en http://localhost:4040
echo.
echo ========================================
echo   Backend — logs en vivo:
echo ========================================
cd backend
python run.py

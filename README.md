# cliping.ia

Video marketing automatizado con IA. Pegá una URL, describí la acción — la IA navega, graba y edita el reel.

## Stack

- **Frontend**: React + Vite → Vercel
- **Backend**: FastAPI + Playwright + FFmpeg (local / Railway)
- **DB**: Firebase Firestore
- **Storage**: Firebase Storage

## Setup local

```bash
npm install
cp .env.example .env.local
# completar variables de Firebase en .env.local
npm run dev
```

## Variables de entorno

Ver `.env.example` para todas las variables necesarias.

## Backend

Ver `/backend` (próximamente) para el agente Python.

# Plan de migración a la nube — cliping.ia (videos)

> Estado: PENDIENTE (decidido dejarlo para más adelante). Documentado para no perderlo.
> Supuestos: cada usuario genera máx. 10 videos/día; tiene que aguantar muchísimos
> renders en paralelo sin romperse.

## La verdad que define todo
El cuello de botella es el RENDER (Remotion = CPU + Chromium headless + ffmpeg,
~15-40s por video). Todo lo demás (auth, copy IA, captura, storage) es liviano.
Hoy el render corre sincrónico dentro de FastAPI en la PC del dev (Windows + ngrok).
Eso no escala. El plan gira en torno a resolver el render.

## Decisión clave: dónde renderizar
RECOMENDADO: **Remotion Lambda** (`@remotion/lambda`). Cada render = una invocación
AWS Lambda, masivamente paralela y pay-per-render. 50 pedidos a la vez = 50 Lambdas.
Sin servidores propios ni colas que se tapen.
- Bonus: desaparece `build_video_files` (el Root temporal por job). Se deploya
  `VideoFromSpec` una vez como "site" en S3 y cada render recibe el `spec` como inputProps.
ALTERNATIVA (si se evita AWS): cola + workers en contenedores (Cloud Run / Railway
workers + Cloud Tasks o Redis). Escala, pero mucho más ops. Para este caso, Lambda gana.

## Arquitectura objetivo (desacoplar request del render)
1. Front (Vercel) igual, pero con login.
2. API FastAPI HOSTEADA (Railway/Render/Fly/Cloud Run) — fuera del Windows. Recibe el
   pedido, NO renderiza: corre director (Anthropic) + captura (Playwright), sube
   screenshot, crea job en Firestore (status: queued), invoca Remotion Lambda y responde.
3. Remotion Lambda renderiza en paralelo → MP4 a S3 (o Cloudinary).
4. Firestore guarda estado del job + videos por usuario. El front escucha en tiempo
   real (onSnapshot), no polling.
- IMPORTANTE: el `jobs = {}` en memoria de hoy se muere con más de 1 instancia →
  moverlo a Firestore.

## Cuentas, cuota y concurrencia
- Auth: Firebase Auth (ya está Firebase). Cada video bajo el `uid`. Security rules:
  cada usuario ve solo lo suyo.
- Cuota 10/día: contador por usuario/día en Firestore. La API chequea antes de encolar;
  el 11 devuelve mensaje amable. Es también el TECHO DE COSTO por usuario.
- Concurrencia: Lambda aísla cada render; API stateless escala horizontal; Firestore y
  Cloudinary aguantan. Vigilar: rate limit de Anthropic (director = pocos tokens) y el
  límite de concurrencia de Lambda de la cuenta AWS (se pide aumento por form).

## Costo (orden de magnitud — verificar en las webs oficiales)
- Render Lambda: centavos USD por video (según RAM/duración).
- Anthropic: centavos por video.
- Cloudinary/S3: storage + bandwidth, barato salvo escala enorme.
- API host: plan chico fijo (~5-10 USD/mes para arrancar).
- La cuota de 10/día acota el gasto por usuario pase lo que pase.

## Migración por fases (sin romper lo que anda)
- FASE 1 — sacar de la PC: hostear la API, mover `jobs` a Firestore, sumar Firebase
  Auth + cuota 10/día. El proxy de `vercel.json` deja de apuntar a ngrok y apunta al
  host nuevo (cambio de 1 línea). Render todavía en el server (aún no paralelo masivo).
- FASE 2 — render paralelo: migrar a Remotion Lambda. Deploy de `VideoFromSpec` como
  site; `_render_video_job` pasa a invocar Lambda con el `spec` como inputProps en vez
  de correr `remotion render` local. Acá ya aguanta muchísimos a la vez.
- FASE 3 — pulido: realtime con onSnapshot (chau polling), reintentos si un render
  falla, panel "Mis videos" por usuario, métricas/alertas de costo.

## Primer paso cuando se retome
Arrancar por FASE 1 (deja de depender de la PC prendida).

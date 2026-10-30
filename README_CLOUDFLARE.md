# Migración de agenda a Cloudflare Pages + D1

Este proyecto puede alojar en Cloudflare Pages la página estática y sus Pages Functions. D1 guarda las reservas de forma persistente. No se usa el disco de Render ni se debe desplegar `.env` o `salon_turnos.sqlite3`.

## Archivos nuevos

- `functions/`: API pública de disponibilidad/solicitudes y endpoints del panel privado.
- `migrations/0001_appointments.sql`: esquema de la base D1.
- `admin.html`: panel estático en `/admin.html` (también se acepta `/admin`).
- La página usa la API del mismo origen, así que `config.js` debe mantener `window.LUMINA_API_BASE_URL = '';`.

## Configurar Cloudflare

1. En **Workers & Pages**, creá un proyecto Pages conectado al repositorio `TCHKarim/peluqueria` y rama `main`. Si la raíz del repo contiene directamente `index.html`, dejá Root directory vacía. Para HTML sin compilación, usá build command `mkdir -p dist && cp index.html styles.css app.js config.js admin.html admin.css admin.js dist/` y output directory `dist`. Así se publican solo los archivos de la página, sin exponer el código de servidor local. Las Pages Functions se reconocen desde `functions/` en la raíz del proyecto.
2. En **Workers & Pages > D1 SQL Database**, creá una base `lumina-turnos`. Abrí su consola SQL y ejecutá el contenido de `migrations/0001_appointments.sql`.
3. En el proyecto Pages, abrí **Settings > Bindings > Add > D1 database**. Elegí esa base y asignale el nombre de variable `DB`. Guardá y redeplegá para que la función reciba el binding.
4. En **Settings > Variables and Secrets**, agregá `LUMINA_ADMIN_USER` como variable, y `LUMINA_ADMIN_PASSWORD` y `LUMINA_SECRET_KEY` como secretos cifrados. `LUMINA_ADMIN_PASSWORD` es la contraseña que vas a escribir en `/admin`; no uses el hash de Werkzeug que se generó para Render. Generá un secreto largo aleatorio para `LUMINA_SECRET_KEY`. No lo subas al repositorio ni lo compartas.
5. Conectá la página mediante su URL `*.pages.dev` o tu dominio. Entrá a `/admin` para administrar turnos.

Cloudflare Pages soporta funciones enlazadas a D1 y aplica cambios de bindings al volver a desplegar. D1 incluye un plan gratuito sujeto a límites diarios de lectura/escritura y almacenamiento; revisá el consumo en el panel de Cloudflare.

## Importante

- El despliegue de Render mostrado en conversaciones anteriores es independiente. No va a usar esta base D1; no cargues secretos en el servicio Render.
- La API crea cada nueva solicitud como **Pendiente**. La disponibilidad se bloquea para solicitudes pendientes y confirmadas.
- Horarios de atención y duraciones en `functions/_shared.js` y `functions/api/availability.js` son valores iniciales. Ajustalos a la operación real del salón antes de recibir turnos.
- Si `TCHKarim/peluqueria` no tiene los cambios locales de esta carpeta, primero hay que sincronizar/subirlos a GitHub para que Pages pueda desplegarlos.
- Los secretos de Pages se ingresan en el panel; nunca en `config.js` ni en GitHub.


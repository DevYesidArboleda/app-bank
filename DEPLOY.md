# Subir Weekly Cash a Vercel

El sitio completo (panel y `/api/*`) pide login. El usuario y la contraseña están en
`CREDENCIALES.local.md`, que no se sube a git.

## 1. Subir el código a GitHub

1. Crea un repositorio **privado** en GitHub (sin README).
2. Desde la carpeta del proyecto:
   ```
   git add .
   git commit -m "Weekly Cash"
   git remote add origin https://github.com/<tu-usuario>/<repo>.git
   git push -u origin master
   ```
   `.env` y `CREDENCIALES.local.md` están en `.gitignore`: verifica con `git status`
   que no aparezcan antes del commit.

## 2. Crear el proyecto en Vercel

1. vercel.com → **Add New → Project** → importa el repositorio.
2. Framework: Next.js (lo detecta solo). No cambies los comandos de build:
   `npm install` corre `prisma generate` (postinstall) y luego `next build`.
3. Antes de **Deploy**, abre **Environment Variables** y agrega las del paso 3.

## 3. Variables de entorno

Copia los valores de tu `.env` local (Settings → Environment Variables, entorno *Production*):

| Variable | Para qué |
|---|---|
| `AUTH_USERNAME`, `AUTH_PASSWORD_HASH`, `AUTH_SECRET` | Login (valores en `CREDENCIALES.local.md`) |
| `TOKEN_ENCRYPTION_KEY` | Cifra los tokens de Jobber guardados en Upstash. **Debe ser la misma** que en local o no podrá leer el token ya guardado |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Tokens, payroll manual y límite de intentos del login |
| `DATABASE_URL`, `DIRECT_URL` | Postgres (Supabase) |
| `JOBBER_CLIENT_ID`, `JOBBER_CLIENT_SECRET`, `JOBBER_AUTH_URL`, `JOBBER_TOKEN_URL`, `JOBBER_API_URL` | Jobber |
| `JOBBER_REDIRECT_URI` | `https://<tu-proyecto>.vercel.app/api/jobber/callback` (**no** el de localhost) |
| `SIMPLEFIN_ACCESS_URL` | Chase vía SimpleFIN |
| `SHEETS_PAYROLL_URL`, `SHEETS_PAYROLL_TOKEN` | Payroll desde Google Sheets |

Plaid y Paychex todavía no se usan en el panel; sus variables son opcionales.
`NEXT_PUBLIC_APP_URL` ya no hace falta.

Si cambias una variable después del primer deploy: **Deployments → ⋯ → Redeploy**.

## 4. Jobber

En developer.getjobber.com → tu app → **Callback URL**, agrega
`https://<tu-proyecto>.vercel.app/api/jobber/callback` (puedes dejar también la de localhost).

El token de Jobber vive en Upstash, compartido entre local y Vercel, así que no hace falta
volver a conectar. Si el panel muestra Jobber como "Not responding", entra (ya logueada) a
`https://<tu-proyecto>.vercel.app/api/jobber/auth` para reconectar.

## 5. Probar

1. Abre `https://<tu-proyecto>.vercel.app` → debe mandarte a `/login`.
2. Entra con `linda` y la contraseña de `CREDENCIALES.local.md`.
3. En el panel, **Sources** debe mostrar Jobber, Chase y Payroll como *Connected*.
4. Sin sesión, `https://<tu-proyecto>.vercel.app/api/summary/weekly` debe responder
   `{"error":"Not signed in"}`.

## Notas

- La primera carga puede tardar 10–30 s: trae ~1,000 facturas de Jobber. Las rutas pesadas
  tienen `maxDuration = 120` s.
- La sesión dura 30 días. "Sign out" está al final de la barra lateral.
- 5 intentos fallidos desde la misma IP (o 30 en total) bloquean el login 15 minutos.
- Cambiar la contraseña: ver `CREDENCIALES.local.md`.

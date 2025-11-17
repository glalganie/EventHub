# EventHub

Applicazione demo per gestione eventi con autenticazione (password e OAuth), iscrizioni, chat in tempo reale (SSE), notifiche e moderazione.

## Requisiti

- Node.js 18+
- MySQL 8 (o compatibile)

## Setup

1. Clona il progetto
2. Crea un file `.env` nella root con le variabili necessarie
3. Installa le dipendenze

```bash
npm install
```

## Configurazione (.env)

```env
# Server
PORT=3001
JWT_SECRET=change_me
PUBLIC_BASE_URL=http://localhost:3001

# Admin seed (facoltativo)
ADMIN_EMAIL=owner2@example.com
ADMIN_PASSWORD=password123
ADMIN_NAME=Admin

# MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=YOUR_PASSWORD
MYSQL_DATABASE=eventhub

# SMTP (facoltativo: reset/verifica email)
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=no-reply@eventhub.local

# OAuth
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GITHUB_CLIENT_ID=YOUR_GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=YOUR_GITHUB_CLIENT_SECRET
```

Note: Se usi email fittizie, puoi omettere la sezione SMTP.

## Avvio

Sviluppo (auto-restart):

```bash
npm run dev
```

Produzione:

```bash
npm start
```

L’applicazione espone la UI statica su `http://localhost:PORT/`.

## Funzioni principali

- Signup/Login via email e password
- Login OAuth:
  - Google: incolla un `id_token` nel campo “Google ID token” e clicca “Login con Google”
  - GitHub: incolla `code` (authorization code) oppure un `access_token` e clicca “Login con GitHub”
- Catalogo eventi, iscrizione, messaggistica, SSE per eventi e notifiche
- Admin: liste utenti/eventi/seg./moderazione

## Endpoints (estratto)

Consulta `GET /api-docs` in esecuzione per la lista completa. Alcuni esempi:

- Auth: `POST /auth/signup`, `POST /auth/login`, `POST /auth/oauth/google`, `POST /auth/oauth/github`
- Eventi: `GET /events`, `POST /events`, `DELETE /events/:id`
- Registrazioni: `POST /events/:id/registrations`, `DELETE /events/:id/registrations/me`
- Messaggi: `GET/POST /events/:id/messages`
- SSE: `GET /realtime/events/:id?token=...`, `GET /realtime/users/:id?token=...`

## Deploy

- Imposta le variabili d’ambiente come in `.env`
- Prepara MySQL raggiungibile dal runtime
- Avvia con `npm start` o tramite un process manager (PM2/systemd)
- `PUBLIC_BASE_URL` deve puntare all’URL pubblico (per link in email e callback)

### Deploy su Vercel

Questa repo è pronta per Vercel.

- File `vercel.json` definisce routing: API verso `api/index.js`, statici da `public/`
- Funzione Node in `api/index.js` esporta l’handler Express con init di TypeORM

Passi:

1. Apri il link di creazione progetto: `https://vercel.com/new?email=glalganie.tchissambo%40edu-its.it&teamSlug=glalganies-projects`
2. Importa la repository Git
3. Imposta le Environment Variables (Production/Preview):
   - `JWT_SECRET`
   - `PUBLIC_BASE_URL` (es. l’URL vercel)
   - MySQL: `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
   - OAuth (opzionale): `GOOGLE_CLIENT_ID`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
   - Admin seed (opzionale): `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`
4. Deploy

Note:

- Le pagine statiche sono servite da `public/` (home: `/` → `public/index.html`)
- Le chiamate API (es. `/auth/*`, `/events/*`, `/realtime/*`) sono gestite dalla funzione Node
- Per MySQL in Vercel usa un DB gestito (es. PlanetScale/Neon/MySQL su cloud) e whitelista gli IP se necessario

### Note OAuth

- Google: verifica `GOOGLE_CLIENT_ID` corrisponda al client usato per generare l’`id_token`
- GitHub: configura l’app OAuth, imposta `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET`

## Sviluppo locale rapido

1. MySQL in locale con db `eventhub`
2. `.env` configurato come sopra
3. `npm run dev` e apri `http://localhost:3001/`

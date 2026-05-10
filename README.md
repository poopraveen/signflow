# SignFlow

Next.js app for document signing (native flow + optional DocuSign bridge for third parties).

## Setup

```bash
npm install
cp .env.example .env.local
# Required: MONGODB_URI, AUTH_SECRET (openssl rand -base64 32), GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
# Optional: APP_ORIGIN, GMAIL_* (invite emails)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with Google to use the dashboard, create envelopes, and manage **API keys** under Settings.

**Third-party native API (no DocuSign):** `POST /api/v1/envelopes` with header `x-api-key: sfk_…` or `Authorization: Bearer sfk_…` (create a key under **Settings → API keys** after signing in).

- **API specification (OpenAPI 3):** [`openapi/signflow-v1.openapi.yaml`](./openapi/signflow-v1.openapi.yaml) — import into [Swagger Editor](https://editor.swagger.io/), Postman, or Insomnia.
- **GitHub (view online):** [openapi/signflow-v1.openapi.yaml on `main`](https://github.com/poopraveen/signflow/blob/main/openapi/signflow-v1.openapi.yaml)

## Deploy (Vercel)

1. Connect this repo in [Vercel](https://vercel.com).
2. Add variables from **[`.env.production.example`](./.env.production.example)** including **`AUTH_SECRET`**, **`GOOGLE_CLIENT_ID`**, **`GOOGLE_CLIENT_SECRET`**, and the Google OAuth redirect `https://<your-host>/api/auth/callback/google`.
3. Set **`APP_ORIGIN`** to your production URL (e.g. `https://your-app.vercel.app`).
4. Native API spec: [`openapi/signflow-v1.openapi.yaml`](./openapi/signflow-v1.openapi.yaml). Optional DocuSign bridge: [`openapi/third-party-docusign-bridge.openapi.yaml`](./openapi/third-party-docusign-bridge.openapi.yaml).

## Scripts

| Command        | Description        |
| -------------- | ------------------ |
| `npm run dev`  | Development server |
| `npm run build`| Production build   |
| `npm run start`| Start production   |
| `npm run lint` | ESLint             |

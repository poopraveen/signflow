# SignFlow

Next.js app for document signing (native flow + optional DocuSign bridge for third parties).

## Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your MongoDB URI and optional keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

1. Connect this repo in [Vercel](https://vercel.com).
2. Add environment variables from **[`.env.production.example`](./.env.production.example)** (copy names and values into the Vercel dashboard — do not commit real secrets).
3. Set **`APP_ORIGIN`** to your production URL (e.g. `https://your-app.vercel.app`).
4. Third-party API spec: [`openapi/third-party-docusign-bridge.openapi.yaml`](./openapi/third-party-docusign-bridge.openapi.yaml).

## Scripts

| Command        | Description        |
| -------------- | ------------------ |
| `npm run dev`  | Development server |
| `npm run build`| Production build   |
| `npm run start`| Start production   |
| `npm run lint` | ESLint             |

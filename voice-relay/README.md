# Artery voice relay

Sarvam streaming STT and TTS relay with two entry points:

- `server.mjs` is the persistent loopback server used by `npm run dev:voice`.
- `api/*.ts` are standalone Vercel Node Functions for production.

## Deploy on Vercel

Create a second Vercel project from this repository and set its **Root Directory**
to `voice-relay`. Keep the framework preset as **Other**.

Set these environment variables:

```env
SARVAM_API_KEY=your-key
SARVAM_BASE_URL=https://api.sarvam.ai
VOICE_RELAY_ALLOWED_ORIGINS=https://artery.saumyajit.dev
```

Deploy, then configure the main Artery Vercel project:

```env
VOICE_STREAMING_ENABLED=true
NEXT_PUBLIC_VOICE_RELAY_URL=wss://your-relay.vercel.app
```

Redeploy the main app because `NEXT_PUBLIC_VOICE_RELAY_URL` is included at build
time. Verify `https://your-relay.vercel.app/health` returns `200`.

The browser connects to `/stt` and `/tts`. Origins are exact matches;
add preview URLs explicitly when testing preview deployments.

## Run locally

Keep `SARVAM_API_KEY` in the repository root `.env.local`, then run:

```bash
npm run dev:voice
```

Local health check: `http://127.0.0.1:8787/health`.

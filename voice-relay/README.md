# Artery voice relay

Runs Sarvam streaming STT and TTS outside the Vercel request lifecycle.

Add these values to `.env.local`:

```env
VOICE_STREAMING_ENABLED=true
NEXT_PUBLIC_VOICE_RELAY_URL=ws://127.0.0.1:8787
VOICE_RELAY_PORT=8787
VOICE_RELAY_ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
```

Keep `SARVAM_API_KEY` in `.env.local`, then run:

```bash
npm run voice-relay
npm run dev
```

Health check: `http://127.0.0.1:8787/health`.

The relay binds to loopback only. An HTTPS-hosted Artery client needs a separately
hosted `wss://` relay; browsers will block an insecure `ws://` relay from HTTPS.

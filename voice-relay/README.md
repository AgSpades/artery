# Artery voice relay

Runs Sarvam streaming STT and TTS outside the Vercel request lifecycle.

Keep the server-only key in `.env.local`:

```env
SARVAM_API_KEY=your-key
```

Then start both Next.js and the relay in one terminal:

```bash
npm run dev:voice
```

Health check: `http://127.0.0.1:8787/health`.

The launcher forces live voice on, disables demo fallback, and points the browser
at `ws://127.0.0.1:8787`. The individual `npm run dev` and
`npm run voice-relay` commands remain available for separate debugging.

The relay binds to loopback only. An HTTPS-hosted Artery client needs a separately
hosted `wss://` relay; browsers will block an insecure `ws://` relay from HTTPS.

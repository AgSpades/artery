# Artery

Artery is a bilingual voice-based misconception-recovery layer for education
platforms. The demo uses a mocked NEET Biology platform and four bounded Cell
Biology concept packets.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev:voice
```

Set `SARVAM_API_KEY` in `.env.local` for live Sarvam STT, diagnosis, and TTS.
Set `DEMO_FALLBACK_MODE=true` only for a clearly labelled cached demo.
See [`voice-relay/README.md`](voice-relay/README.md) for the separate Vercel
voice-relay deployment.

## Checks

```bash
npm test
npm run lint
npm run build
```

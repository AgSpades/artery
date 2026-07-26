# Build status

- Active milestone: 5 — Voice depth
- Implemented: Voice-first mentor UI; one-tap conversational start; standalone local Node STT/TTS relay; configurable external relay URL; relay origin checks, payload limits, and heartbeat cleanup; PCM16 browser capture and playback; provider VAD signals; interruption and barge-in; self-correction continuation; voice verification; English subtitles; REST recorder fallback; bounded Sarvam retry; safe `UNCERTAIN` clarification; existing recovery, memory, recall, and write-back flow
- Working locally: Next.js on port 3000 connects to the Node relay on port 8787; the relay reaches live Sarvam STT and TTS without the Vercel request lifecycle
- Verified: Fifteen focused tests; relay health; live STT `ready`; live TTS returned 12 audio chunks and completion; live diagnosis returned 200; ESLint; production build; browser recovery startup and safe microphone fallback
- Demo-ready: REST recovery remains demo-ready; local streaming is ready when `VOICE_STREAMING_ENABLED=true` and `NEXT_PUBLIC_VOICE_RELAY_URL=ws://127.0.0.1:8787`
- Current blocker: The automated in-app browser cannot grant usable microphone capture; complete the final spoken pass in local Chrome
- Largest demo risk: An HTTPS-hosted frontend requires a separately hosted `wss://` relay; the loopback relay is intentionally local-only
- Next action: Open local Chrome, allow the microphone, and complete one “No wait, actually…” interruption through verification and write-back
- Cut features: Arbitrary open-domain mentor chat; custom VAD; the experimental Vercel relay is no longer required for the local demo

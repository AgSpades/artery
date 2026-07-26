# Build status

- Active milestone: 5 — Voice depth
- Implemented: Voice-first mentor UI; one-tap conversational start; server-side Sarvam STT/TTS WebSocket relays; PCM16 browser capture and playback; provider VAD signals; interruption and barge-in; self-correction continuation; voice verification; English subtitles; REST recorder fallback; existing recovery, memory, recall, and write-back flow
- Working locally: Wrong answer invokes the voice mentor; the conversation attempts streaming automatically and falls back to the stable REST recorder without losing the session when the local runtime cannot upgrade WebSockets
- Verified: Twelve focused tests; TypeScript; ESLint; production build; browser flow from wrong answer to voice start; 320px responsive check; fallback transition; no browser console errors
- Demo-ready: REST recovery remains demo-ready; streaming is guarded by `VOICE_STREAMING_ENABLED=false`
- Current blocker: Vercel’s experimental WebSocket upgrade runtime is not emulated by local Next.js, so the relay requires a flagged preview deployment for live validation
- Largest demo risk: Experimental Vercel upgrade behavior and Sarvam streaming wire compatibility on the production runtime
- Next action: Deploy a Vercel preview with `VOICE_STREAMING_ENABLED=true`, then complete one Android “No wait, actually…” interruption through verification and write-back
- Cut features: Arbitrary open-domain mentor chat; a second relay service; custom VAD; streaming is automatically cut back to REST when unavailable

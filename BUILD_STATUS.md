# Build status

- Active milestone: 5 — Voice depth
- Implemented: Voice-first mentor UI; one-tap conversational start; server-side Sarvam STT/TTS WebSocket relays; PCM16 browser capture and playback; provider VAD signals; interruption and barge-in; self-correction continuation; voice verification; English subtitles; REST recorder fallback; one bounded retry for transient Sarvam network/5xx failures; safe `UNCERTAIN` clarification for out-of-packet model diagnoses; existing recovery, memory, recall, and write-back flow
- Working locally: Wrong answer invokes the voice mentor; diagnosis completes against live Sarvam; the conversation attempts streaming automatically and falls back to the stable REST recorder without losing the session when the local runtime cannot upgrade WebSockets
- Verified: Fourteen focused tests; live Sarvam diagnosis returned 200; TypeScript; ESLint; production build; browser flow from wrong answer to voice start; 320px responsive check; fallback transition; no application console errors
- Demo-ready: REST recovery remains demo-ready; streaming is guarded by `VOICE_STREAMING_ENABLED=false`
- Current blocker: Vercel’s experimental WebSocket upgrade runtime is not emulated by local Next.js, so the relay requires a flagged preview deployment for live validation
- Largest demo risk: Experimental Vercel upgrade behavior and Sarvam streaming wire compatibility on the production runtime
- Next action: Redeploy the preview with the transient-provider retry, then complete one Android “No wait, actually…” interruption through verification and write-back
- Cut features: Arbitrary open-domain mentor chat; a second relay service; custom VAD; streaming is automatically cut back to REST when unavailable

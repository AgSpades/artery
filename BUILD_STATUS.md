# Build status

- Active milestone: 1 — Live provider acceptance
- Implemented: Foundation; host session creation; MediaRecorder; Sarvam STT, structured diagnosis, and TTS adapters; reducer state machine; deterministic verification; recall scheduling; localStorage memory; host write-back; history; labelled fallback mode
- Working locally: Complete fallback flow from wrong answer through host mastery update and persisted history
- Verified: Two tests; ESLint; production build; live health response; real-browser fallback golden path; history after reload; 320px no-overflow check; clean browser console
- Demo-ready: Yes, in visibly labelled fallback mode
- Current blocker: Sarvam rejects the configured credential with `invalid_api_key_error`; the value also lacks the documented key prefix
- Largest demo risk: Live voice cannot pass P0 until a valid Sarvam API key replaces the current value
- Next action: Replace the key, restart, then rerun TTS → STT → diagnosis and the microphone golden path
- Cut features: Streaming, VAD, barge-in, public developer portal

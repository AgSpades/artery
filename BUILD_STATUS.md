# Build status

- Active milestone: 5 — Voice depth
- Implemented: Voice-first mentor UI; one-tap conversational start; one-command local voice launcher; standalone Node STT/TTS relay deployed as a Vercel Node app; configurable external relay URL; relay origin checks, payload limits, and heartbeat cleanup; PCM16 browser capture and playback; provider VAD signals; interruption and barge-in; self-correction continuation; voice verification; English subtitles; REST recorder fallback; bounded Sarvam retry; safe `UNCERTAIN` clarification; existing recovery, memory, recall, and write-back flow
- Working locally: `npm run dev:voice` starts Next.js on port 3000 and the Node relay on port 8787 with live voice enabled and fallback mode disabled
- Verified: Sixteen app tests; two isolated relay tests; relay TypeScript build; zero relay production dependency vulnerabilities; production relay `/health` returned 200; production `wss://` STT returned `ready`; live TTS returned 12 audio chunks and completion; live diagnosis returned 200; ESLint; production build; browser recovery startup and safe microphone fallback
- Demo-ready: REST recovery remains demo-ready; local streaming is available through `npm run dev:voice`
- Current blocker: The automated in-app browser cannot grant usable microphone capture; complete the final spoken pass in local Chrome
- Largest demo risk: Production WebSocket connections remain bounded by Vercel’s five-minute execution duration; completed turns are preserved by the REST fallback
- Next action: Deploy `voice-relay` as a second Vercel project, set the main app relay URL, then complete one production “No wait, actually…” interruption through verification and write-back
- Cut features: Arbitrary open-domain mentor chat; custom VAD; the experimental Vercel relay is no longer required for the local demo

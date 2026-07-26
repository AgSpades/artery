import assert from "node:assert/strict";
import test from "node:test";

import { createVoiceEnvironment } from "./dev.mjs";

test("local voice startup enables streaming and points Next at the relay", () => {
  const env = createVoiceEnvironment({
    SARVAM_API_KEY: "test-key",
    VOICE_RELAY_PORT: "9000",
  });

  assert.equal(env.VOICE_STREAMING_ENABLED, "true");
  assert.equal(env.DEMO_FALLBACK_MODE, "false");
  assert.equal(env.NEXT_PUBLIC_VOICE_RELAY_URL, "ws://127.0.0.1:9000");
  assert.match(env.VOICE_RELAY_ALLOWED_ORIGINS, /http:\/\/127\.0\.0\.1:3000/);
});

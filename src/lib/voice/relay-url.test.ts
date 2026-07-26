import assert from "node:assert/strict";
import test from "node:test";

import { voiceSocketUrl } from "./relay-url.ts";

test("uses an external voice relay when configured and same-origin otherwise", () => {
  assert.equal(
    voiceSocketUrl(
      "stt",
      "https://artery.example/recovery/1",
      "wss://voice.example/",
    ).href,
    "wss://voice.example/stt",
  );
  assert.equal(
    voiceSocketUrl("tts", "http://127.0.0.1:3000/recovery/1").href,
    "ws://127.0.0.1:3000/api/voice/tts",
  );
});

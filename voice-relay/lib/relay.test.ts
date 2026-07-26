import assert from "node:assert/strict";
import test from "node:test";

import { isAllowedOrigin, providerUrl } from "./relay.ts";

test("relay accepts only explicitly configured browser origins", () => {
  const allowed = "https://artery.saumyajit.dev,https://preview.example";

  assert.equal(
    isAllowedOrigin("https://artery.saumyajit.dev", allowed),
    true,
  );
  assert.equal(isAllowedOrigin("https://attacker.example", allowed), false);
  assert.equal(
    isAllowedOrigin("https://artery.saumyajit.dev.attacker.example", allowed),
    false,
  );
});

test("provider URL upgrades HTTPS to secure WebSocket", () => {
  assert.equal(
    providerUrl("/speech-to-text/ws", {}, "https://api.sarvam.ai").protocol,
    "wss:",
  );
});

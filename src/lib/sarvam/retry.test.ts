import assert from "node:assert/strict";
import test from "node:test";

import { shouldRetrySarvam } from "./retry.ts";

test("retries one transient Sarvam failure without retrying client errors", () => {
  assert.equal(shouldRetrySarvam(undefined, 0), true);
  assert.equal(shouldRetrySarvam(502, 0), true);
  assert.equal(shouldRetrySarvam(429, 0), false);
  assert.equal(shouldRetrySarvam(502, 1), false);
});

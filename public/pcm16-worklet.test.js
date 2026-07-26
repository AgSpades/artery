import assert from "node:assert/strict";
import test from "node:test";

import { floatToPcm16 } from "./pcm16-worklet.js";

test("converts browser float audio to bounded signed PCM16", () => {
  assert.deepEqual(
    Array.from(floatToPcm16(new Float32Array([-2, -1, 0, 0.5, 1, 2]))),
    [-32768, -32768, 0, 16383, 32767, 32767],
  );
});

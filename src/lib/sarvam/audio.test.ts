import assert from "node:assert/strict";
import test from "node:test";

import { isSupportedAudioType, normalizeAudioType } from "./audio.ts";

test("accepts codec parameters emitted by MediaRecorder", () => {
  assert.equal(normalizeAudioType("audio/webm;codecs=opus"), "audio/webm");
  assert.equal(isSupportedAudioType("audio/webm;codecs=opus"), true);
  assert.equal(isSupportedAudioType("audio/mp4;codecs=mp4a.40.2"), true);
  assert.equal(isSupportedAudioType("text/plain"), false);
});

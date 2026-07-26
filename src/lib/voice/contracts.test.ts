import assert from "node:assert/strict";
import test from "node:test";

import {
  sarvamSttMessageSchema,
  sarvamTtsMessageSchema,
  sttClientControlSchema,
  sttServerMessageSchema,
  ttsClientMessageSchema,
  ttsServerMessageSchema,
} from "./contracts.ts";

test("validates the browser voice relay protocol", () => {
  assert.deepEqual(sttClientControlSchema.parse({ type: "flush" }), {
    type: "flush",
  });
  assert.equal(
    sttServerMessageSchema.parse({
      type: "transcript",
      transcript: "No wait, actually mitochondria ATP banata hai.",
    }).type,
    "transcript",
  );
  assert.equal(
    ttsClientMessageSchema.parse({
      type: "speak",
      text: "Ananya, ab tumne distinction pakad liya.",
    }).type,
    "speak",
  );
  assert.equal(
    ttsServerMessageSchema.parse({
      type: "audio",
      audio: "YXVkaW8=",
      contentType: "audio/L16",
    }).type,
    "audio",
  );
});

test("validates Sarvam streaming responses before forwarding them", () => {
  assert.equal(
    sarvamSttMessageSchema.parse({
      type: "events",
      data: { signal_type: "START_SPEECH" },
    }).type,
    "events",
  );
  assert.equal(
    sarvamSttMessageSchema.parse({
      type: "data",
      data: { request_id: "stt-1", transcript: "mitochondria" },
    }).type,
    "data",
  );
  assert.equal(
    sarvamTtsMessageSchema.parse({
      type: "event",
      data: { event_type: "final" },
    }).type,
    "event",
  );
});

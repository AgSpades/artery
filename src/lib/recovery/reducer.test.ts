import assert from "node:assert/strict";
import test from "node:test";

import { initialRecoveryState, recoveryReducer } from "./reducer.ts";

test("preserves completed transcript work after a recoverable error", () => {
  const reviewed = recoveryReducer(
    recoveryReducer(initialRecoveryState, { type: "START_RECORDING" }),
    { type: "TRANSCRIPT_READY", transcript: "Nucleus cell ko control karta hai." },
  );
  const failed = recoveryReducer(reviewed, {
    type: "ERROR",
    message: "Diagnosis timed out",
    resumeStage: "transcript_review",
  });

  assert.equal(reviewed.stage, "transcript_review");
  assert.equal(failed.stage, "recoverable_error");
  assert.equal(failed.transcript, reviewed.transcript);
  assert.equal(failed.resumeStage, "transcript_review");
});

test("keeps a self-correction in the same conversation after barge-in", () => {
  let state = recoveryReducer(initialRecoveryState, {
    type: "START_CONVERSATION",
  });
  state = recoveryReducer(state, { type: "VOICE_READY" });
  state = recoveryReducer(state, { type: "BEGIN_EXPLANATION" });
  state = recoveryReducer(state, {
    type: "START_MENTOR_REPLY",
    text: "Nucleus control centre hai, lekin ATP mitochondria banata hai.",
    englishSubtitle:
      "The nucleus controls the cell, but mitochondria produce ATP.",
  });
  state = recoveryReducer(state, { type: "SPEECH_STARTED" });
  state = recoveryReducer(state, {
    type: "TURN_TRANSCRIPT",
    transcript: "No wait, actually mitochondria ATP banata hai.",
  });

  assert.equal(state.voiceStatus, "processing");
  assert.equal(state.turns[0].interrupted, true);
  assert.equal(state.turns[1].turnType, "self_correction");
  assert.match(state.transcript, /Self-correction: No wait, actually/);
});

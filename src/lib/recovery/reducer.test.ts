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

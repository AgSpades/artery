import assert from "node:assert/strict";
import test from "node:test";

import { diagnosisSchema } from "./schemas.ts";

test("rejects a diagnosis that becomes a content dump", () => {
  const result = diagnosisSchema.safeParse({
    misconceptionId: "UNCERTAIN",
    confidence: 0.5,
    studentEvidence: ["I thought the nucleus did every job."],
    correctReasoningFragment: "The nucleus regulates cellular activity.",
    divergencePoint: "Regulation was confused with ATP production.",
    clarificationNeeded: false,
    clarifyingQuestion: null,
    spokenExplanation: "x".repeat(500),
    englishSubtitle: "x".repeat(500),
    verificationQuestion: "Which organelle produces ATP?",
    expectedVerification: "B",
    memoryUpdates: {
      conceptId: "CELL_MITO_001",
      masteryState: "misconception_detected",
      latestCorrection: "Mitochondria produce ATP.",
    },
  });

  assert.equal(result.success, false);
});

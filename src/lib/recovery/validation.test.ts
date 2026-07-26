import assert from "node:assert/strict";
import test from "node:test";

import type { Diagnosis } from "../types.ts";
import { groundDiagnosis } from "./validation.ts";

test("grounds deterministic diagnosis fields in the concept packet", () => {
  const packet = {
    id: "CELL_MITO_001",
    transferQuestion: { question: "Which organelle produces ATP?", correctOption: "B" },
  };
  const diagnosis = {
    misconceptionId: "CONTROL_EQUALS_EXECUTION",
    confidence: 0.8,
    studentEvidence: ["nucleus controls the cell"],
    correctReasoningFragment: "Mitochondria produce ATP.",
    divergencePoint: "Control was confused with execution.",
    clarificationNeeded: false,
    clarifyingQuestion: null,
    spokenExplanation: "Nucleus control karta hai; mitochondria ATP banata hai.",
    englishSubtitle: "The nucleus controls; mitochondria produce ATP.",
    verificationQuestion: "Invented question",
    expectedVerification: "A",
    memoryUpdates: {
      conceptId: "mitochondria",
      masteryState: "provisionally_repaired",
      latestCorrection: "Nucleus controls; mitochondria produce ATP.",
    },
  } satisfies Diagnosis;
  const grounded = groundDiagnosis(diagnosis, packet);

  assert.equal(grounded.verificationQuestion, packet.transferQuestion.question);
  assert.equal(grounded.expectedVerification, packet.transferQuestion.correctOption);
  assert.deepEqual(grounded.memoryUpdates, {
    ...diagnosis.memoryUpdates,
    conceptId: packet.id,
    masteryState: "misconception_detected",
  });
});

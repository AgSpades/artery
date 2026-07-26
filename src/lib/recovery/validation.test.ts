import assert from "node:assert/strict";
import test from "node:test";

import type { Diagnosis } from "../types.ts";
import { groundDiagnosis } from "./validation.ts";

test("grounds deterministic diagnosis fields in the concept packet", () => {
  const packet = {
    id: "CELL_MITO_001",
    transferQuestion: { question: "Which organelle produces ATP?", correctOption: "B" },
    recallCard: { back: "The nucleus controls; mitochondria produce ATP." },
  };
  const diagnosis = {
    misconceptionId: "CONTROL_EQUALS_EXECUTION",
    confidence: 0.8,
    studentEvidence: ["nucleus controls the cell"],
    correctReasoningFragment:
      "You remembered that the nucleus controls the cell. Mitochondria produce ATP.",
    divergencePoint: "Control was confused with execution.",
    clarificationNeeded: false,
    clarifyingQuestion: null,
    spokenExplanation: "First idea. One repair. Unwanted report.",
    englishSubtitle: "Ananya, tumne nucleus ka role yaad rakha. Lekin ATP mitochondria banata hai.",
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
  assert.equal(grounded.spokenExplanation, "First idea. One repair.");
  assert.equal(
    grounded.englishSubtitle,
    "The nucleus controls; mitochondria produce ATP.",
  );
  assert.deepEqual(grounded.memoryUpdates, {
    ...diagnosis.memoryUpdates,
    conceptId: packet.id,
    masteryState: "misconception_detected",
  });
});

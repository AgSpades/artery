import assert from "node:assert/strict";
import test from "node:test";

import type { Diagnosis } from "../types.ts";
import {
  boundMisconception,
  groundClarification,
  groundDiagnosis,
  needsClarificationTranscript,
  resolveSpokenOption,
} from "./validation.ts";

test("turns an out-of-packet model diagnosis into explicit uncertainty", () => {
  const diagnosis = {
    misconceptionId: "NUCLEUS_MAKES_ATP",
    confidence: 0.92,
    studentEvidence: ["nucleus controls everything"],
    correctReasoningFragment: "The control-centre idea was remembered.",
    divergencePoint: "Control was linked to ATP production.",
    clarificationNeeded: false,
    clarifyingQuestion: null,
    spokenExplanation: "Repair.",
    englishSubtitle: "Repair.",
    verificationQuestion: "Transfer?",
    expectedVerification: "B",
    memoryUpdates: {
      conceptId: "CELL_MITO_001",
      masteryState: "misconception_detected",
      latestCorrection: "Mitochondria produce ATP.",
    },
  } satisfies Diagnosis;

  const bounded = boundMisconception(diagnosis, [
    "CONTROL_EQUALS_EXECUTION",
    "UNCERTAIN",
  ]);

  assert.equal(bounded.misconceptionId, "UNCERTAIN");
  assert.equal(bounded.confidence, 0.5);
  assert.equal(bounded.clarificationNeeded, true);
});

test("grounds deterministic diagnosis fields in the concept packet", () => {
  const packet = {
    id: "CELL_MITO_001",
    transferQuestion: { question: "Which organelle produces ATP?", correctOption: "B" },
    recallCard: { back: "The nucleus controls; mitochondria produce ATP." },
    spokenRepair: "Nucleus controls; mitochondria ATP banata hai.",
    clarifyingQuestion: "Which idea were you using?",
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
  const grounded = groundDiagnosis(diagnosis, packet, "Ananya");

  assert.equal(grounded.verificationQuestion, packet.transferQuestion.question);
  assert.equal(grounded.expectedVerification, packet.transferQuestion.correctOption);
  assert.equal(
    grounded.spokenExplanation,
    "Ananya, Nucleus controls; mitochondria ATP banata hai.",
  );
  assert.equal(
    grounded.englishSubtitle,
    "The nucleus controls; mitochondria produce ATP.",
  );
  assert.deepEqual(grounded.memoryUpdates, {
    ...diagnosis.memoryUpdates,
    conceptId: packet.id,
    masteryState: "misconception_detected",
  });

  const corrected = groundDiagnosis(
    diagnosis,
    packet,
    "Ananya",
    "self_correction",
  );
  assert.match(corrected.spokenExplanation, /^Ananya, yes—/);
  assert.match(corrected.englishSubtitle, /That correction/);
});

test("resolves a spoken transfer answer without guessing", () => {
  const options = [
    { id: "A", text: "Lysosomes" },
    { id: "B", text: "Mitochondria" },
    { id: "C", text: "Golgi bodies" },
    { id: "D", text: "Nuclei" },
  ];

  assert.equal(resolveSpokenOption("B, mitochondria because ATP", options), "B");
  assert.equal(resolveSpokenOption("Mitochondria honge", options), "B");
  assert.equal(resolveSpokenOption("High concentration wali side", options), null);
});

test("requests clarification when the learner cannot recall a reason", () => {
  assert.equal(
    needsClarificationTranscript(
      "Mujhe bas A sahi laga, exact reason yaad nahi aa raha.",
    ),
    true,
  );
  assert.equal(
    needsClarificationTranscript(
      "High concentration se low concentration movement hai.",
    ),
    false,
  );
  assert.equal(
    needsClarificationTranscript(
      "Mujhe exact reason yaad nahi aa raha.\nClarification: Mujhe laga har high-to-low movement osmosis hota hai.",
    ),
    false,
  );

  const diagnosis = {
    misconceptionId: "OSMOSIS_EQUALS_ALL_DIFFUSION",
    confidence: 0.9,
    studentEvidence: ["high to low movement"],
    correctReasoningFragment: "You remembered a concentration difference.",
    divergencePoint: "Water and membrane conditions were missing.",
    clarificationNeeded: true,
    clarifyingQuestion: "Model asked an unnecessary question.",
    spokenExplanation: "Grounded repair.",
    englishSubtitle: "Grounded subtitle.",
    verificationQuestion: "Transfer question",
    expectedVerification: "B",
    memoryUpdates: {
      conceptId: "CELL_OSMOSIS_002",
      masteryState: "misconception_detected",
      latestCorrection: "Osmosis requires water and a selective membrane.",
    },
  } satisfies Diagnosis;
  const packet = {
    clarifyingQuestion: "Which osmosis idea were you using?",
  };

  const clear = groundClarification(
    diagnosis,
    packet,
    "Ananya",
    "High concentration se low concentration movement hai.",
  );
  assert.equal(clear.clarificationNeeded, false);
  assert.equal(clear.clarifyingQuestion, null);

  const uncertain = groundClarification(
    diagnosis,
    packet,
    "Ananya",
    "Mujhe exact reason yaad nahi aa raha.",
  );
  assert.equal(uncertain.misconceptionId, "UNCERTAIN");
  assert.equal(uncertain.clarificationNeeded, true);
  assert.equal(
    uncertain.clarifyingQuestion,
    "Ananya, Which osmosis idea were you using?",
  );
});

import { z } from "zod";

import type { Diagnosis } from "@/lib/types";

function firstTwoSentences(text: string) {
  return (text.match(/[^.!?।]+[.!?।]?/g) ?? [text])
    .slice(0, 2)
    .map((sentence) => sentence.trim())
    .join(" ")
    .trim();
}

export function needsClarificationTranscript(transcript: string) {
  const latestAnswer = transcript.split(/\nclarification:\s*/i).at(-1) ?? transcript;
  const normalized = latestAnswer.trim().toLowerCase();
  // ponytail: demo-only uncertainty cues; replace with calibrated confidence when repeated proof expands.
  return (
    normalized.split(/\s+/).length < 5 ||
    /\b(?:don't remember|guess(?:ed)?|no idea|not sure|pata nahi|yaad nahi)\b/.test(
      normalized,
    )
  );
}

export function groundClarification(
  diagnosis: Diagnosis,
  packet: { clarifyingQuestion: string },
  learnerName: string,
  transcript: string,
): Diagnosis {
  if (
    diagnosis.misconceptionId !== "UNCERTAIN" &&
    !needsClarificationTranscript(transcript)
  ) {
    return {
      ...diagnosis,
      clarificationNeeded: false,
      clarifyingQuestion: null,
    };
  }

  return {
    ...diagnosis,
    misconceptionId: "UNCERTAIN",
    confidence: Math.min(diagnosis.confidence, 0.5),
    clarificationNeeded: true,
    clarifyingQuestion: `${learnerName}, ${packet.clarifyingQuestion}`,
  };
}

export function groundDiagnosis(
  diagnosis: Diagnosis,
  packet: {
    id: string;
    transferQuestion: { question: string; correctOption: string };
    recallCard: { back: string };
    spokenRepair: string;
  },
  learnerName: string,
): Diagnosis {
  return {
    ...diagnosis,
    spokenExplanation: firstTwoSentences(
      `${learnerName}, ${packet.spokenRepair}`,
    ),
    englishSubtitle: packet.recallCard.back,
    verificationQuestion: packet.transferQuestion.question,
    expectedVerification: packet.transferQuestion.correctOption,
    memoryUpdates: {
      ...diagnosis.memoryUpdates,
      conceptId: packet.id,
      masteryState: "misconception_detected",
    },
  };
}

export function nextReviewAt(intervalDays: number, now = new Date()) {
  return new Date(now.getTime() + intervalDays * 86_400_000).toISOString();
}

export function matchesExpectedAnswer(answer: string, expected: string) {
  return answer.trim().toUpperCase() === expected.trim().toUpperCase();
}

export function resolveSpokenOption(
  answer: string,
  options: Array<{ id: string; text: string }>,
) {
  const explicit =
    answer.match(/^\s*([A-D])(?:[,.):;-]|$)/i)?.[1] ??
    answer.match(/\boption\s+([A-D])\b/i)?.[1];
  if (explicit && options.some(({ id }) => id === explicit.toUpperCase())) {
    return explicit.toUpperCase();
  }

  const normalized = answer
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  const matches = options.filter(({ text }) =>
    normalized.includes(
      text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim(),
    ),
  );
  return matches.length === 1 ? matches[0].id : null;
}

export const verificationRequestSchema = z.strictObject({
  sessionId: z.string().min(1),
  conceptPacketId: z.string().min(1),
  answer: z.string().min(1),
  successfulReviews: z.number().int().nonnegative().default(0),
});

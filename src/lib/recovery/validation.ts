import { z } from "zod";

import type { Diagnosis } from "@/lib/types";

function firstTwoSentences(text: string) {
  return (text.match(/[^.!?।]+[.!?।]?/g) ?? [text])
    .slice(0, 2)
    .map((sentence) => sentence.trim())
    .join(" ")
    .trim();
}

function hasHindiConnectors(text: string) {
  return /\b(?:aap|aapne|bas|hai|hain|ka|karte|karta|kiya|ko|lekin|mein|tha|thi|tum|tumhara|tumne|yaad)\b/i.test(
    text,
  );
}

export function groundDiagnosis(
  diagnosis: Diagnosis,
  packet: {
    id: string;
    transferQuestion: { question: string; correctOption: string };
    recallCard: { back: string };
  },
): Diagnosis {
  return {
    ...diagnosis,
    spokenExplanation: firstTwoSentences(diagnosis.spokenExplanation),
    englishSubtitle: firstTwoSentences(
      hasHindiConnectors(diagnosis.englishSubtitle)
        ? packet.recallCard.back
        : diagnosis.englishSubtitle,
    ),
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

export const verificationRequestSchema = z.strictObject({
  sessionId: z.string().min(1),
  conceptPacketId: z.string().min(1),
  answer: z.string().min(1),
  successfulReviews: z.number().int().nonnegative().default(0),
});

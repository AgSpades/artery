import { z } from "zod";

import type { Diagnosis } from "@/lib/types";

export function groundDiagnosis(
  diagnosis: Diagnosis,
  packet: {
    id: string;
    transferQuestion: { question: string; correctOption: string };
  },
): Diagnosis {
  return {
    ...diagnosis,
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

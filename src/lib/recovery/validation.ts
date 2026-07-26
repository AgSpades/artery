import { z } from "zod";

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

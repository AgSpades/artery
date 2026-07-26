import { z } from "zod";

import { apiError } from "@/lib/api";
import { getConceptPacket } from "@/lib/concepts/repository";
import {
  matchesExpectedAnswer,
  nextReviewAt,
  resolveSpokenOption,
} from "@/lib/recovery/validation";

const requestSchema = z.strictObject({
  sessionId: z.string().min(1),
  conceptPacketId: z.string().min(1),
  spokenAnswer: z.string().trim().min(1).max(300),
  successfulReviews: z.number().int().nonnegative().default(0),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Say an option letter or answer before checking understanding.",
      422,
      parsed.error.flatten(),
    );
  }

  let packet;
  try {
    packet = getConceptPacket(parsed.data.conceptPacketId);
  } catch {
    return apiError("UNKNOWN_CONCEPT", "The concept packet does not exist.", 404);
  }

  const resolvedAnswer = resolveSpokenOption(
    parsed.data.spokenAnswer,
    packet.transferQuestion.options,
  );
  if (!resolvedAnswer) {
    return Response.json({
      resolvedAnswer: null,
      clarificationNeeded: true,
      clarifyingQuestion:
        "I did not catch one option clearly. Say the option letter or the full answer.",
    });
  }

  const passed = matchesExpectedAnswer(
    resolvedAnswer,
    packet.transferQuestion.correctOption,
  );
  const intervalDays = parsed.data.successfulReviews > 0 ? 3 : 1;
  return Response.json({
    resolvedAnswer,
    clarificationNeeded: false,
    passed,
    expectedAnswer: packet.transferQuestion.correctOption,
    masteryState: passed ? "provisionally_repaired" : "verification_failed",
    recallCard: passed
      ? {
          ...packet.recallCard,
          nextReviewAt: nextReviewAt(intervalDays),
          intervalDays,
        }
      : undefined,
  });
}

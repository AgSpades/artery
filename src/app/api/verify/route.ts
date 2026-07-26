import { apiError } from "@/lib/api";
import { getConceptPacket } from "@/lib/concepts/repository";
import {
  matchesExpectedAnswer,
  nextReviewAt,
  verificationRequestSchema,
} from "@/lib/recovery/validation";

export async function POST(request: Request) {
  const parsed = verificationRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Choose an answer before checking understanding.",
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

  const passed = matchesExpectedAnswer(
    parsed.data.answer,
    packet.transferQuestion.correctOption,
  );
  const intervalDays = parsed.data.successfulReviews > 0 ? 3 : 1;

  return Response.json({
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

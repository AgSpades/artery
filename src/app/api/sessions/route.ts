import { apiError } from "@/lib/api";
import { getConceptPacket } from "@/lib/concepts/repository";
import { hostRecoveryRequestSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = hostRecoveryRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "The host recovery context is invalid.",
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

  if (
    parsed.data.question !== packet.question ||
    parsed.data.correctAnswer !== packet.correctOption
  ) {
    return apiError(
      "CONCEPT_BOUNDARY_ERROR",
      "Host context does not match the verified concept packet.",
      409,
    );
  }

  return Response.json(
    {
      sessionId: crypto.randomUUID(),
      context: parsed.data,
      status: "created",
    },
    { status: 201 },
  );
}

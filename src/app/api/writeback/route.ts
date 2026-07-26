import { apiError } from "@/lib/api";
import { recoveryWritebackSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = recoveryWritebackSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "The recovery writeback is invalid.",
      422,
      parsed.error.flatten(),
    );
  }

  return Response.json({
    accepted: true,
    sessionId: parsed.data.sessionId,
    hostStatus: parsed.data.verificationStatus === "passed"
      ? "Provisionally repaired — review scheduled"
      : "Incorrect — recovery needs another attempt",
  });
}

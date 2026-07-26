import { z } from "zod";

import { apiError } from "@/lib/api";
import { getConceptPacket } from "@/lib/concepts/repository";
import { getFallbackOutput } from "@/lib/demo/fallback";
import { getServerEnv } from "@/lib/env";
import {
  groundClarification,
  groundDiagnosis,
} from "@/lib/recovery/validation";
import { diagnosisSchema, hostRecoveryRequestSchema } from "@/lib/schemas";
import { parseChatResponse } from "@/lib/sarvam/chat";
import { sarvamFetch, SarvamProviderError } from "@/lib/sarvam/client";

const requestSchema = z.strictObject({
  transcript: z.string().min(1),
  learnerName: z.string().trim().min(1).max(80),
  context: hostRecoveryRequestSchema,
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Transcript and host context are required.",
      422,
      parsed.error.flatten(),
    );
  }

  let packet;
  try {
    packet = getConceptPacket(parsed.data.context.conceptPacketId);
  } catch {
    return apiError("UNKNOWN_CONCEPT", "The concept packet does not exist.", 404);
  }

  if (getServerEnv().DEMO_FALLBACK_MODE) {
    return Response.json({
      diagnosis: getFallbackOutput(packet.id).diagnosis,
      fallback: true,
    });
  }

  const prompt = {
    transcript: parsed.data.transcript,
    learnerName: parsed.data.learnerName,
    learnerAnswer: parsed.data.context.learnerAnswer,
    correctAnswer: packet.correctOption,
    allowedMisconceptions: packet.allowedMisconceptions,
    verifiedFacts: packet.verifiedFacts,
    transferQuestion: packet.transferQuestion,
    relevantHistory: parsed.data.context.priorContext.slice(-3),
  };

  try {
    const response = await sarvamFetch("/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sarvam-30b",
        temperature: 0.1,
        reasoning_effort: null,
        max_tokens: 1800,
        messages: [
          {
            role: "system",
            content: `Return only the requested JSON. Diagnose only from the supplied concept packet. Copy misconceptionId verbatim from allowedMisconceptions; never shorten or invent an ID. spokenExplanation must contain exactly 2 short Romanized Hindi sentences and begin exactly "${parsed.data.learnerName}, tumne". Use English only for Biology terms. First affirm one remembered idea, then repair only the crossed distinction. Never say learner, they, unhone, answer, correct, incorrect, option letters, or list facts. englishSubtitle must translate those 2 sentences using English grammar only; never copy Hindi words such as tumne, lekin, hai, hain, or karte. Keep masteryState as misconception_detected before verification.`,
          },
          { role: "user", content: JSON.stringify(prompt) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "artery_diagnosis",
            strict: true,
            schema: z.toJSONSchema(diagnosisSchema),
          },
        },
      }),
    });
    const chat = parseChatResponse(await response.json());
    if (!chat.success) {
      return apiError(
        "PROVIDER_SCHEMA_ERROR",
        "Sarvam returned an unreadable diagnosis response.",
        502,
      );
    }
    const diagnosis = diagnosisSchema.safeParse(
      JSON.parse(chat.data.choices[0].message.content),
    );
    if (!diagnosis.success) {
      return apiError(
        "DIAGNOSIS_SCHEMA_ERROR",
        "The diagnosis did not pass safety validation.",
        502,
        diagnosis.error.flatten(),
      );
    }
    if (
      !packet.allowedMisconceptions.some(
        ({ id }) => id === diagnosis.data.misconceptionId,
      )
    ) {
      return apiError(
        "MISCONCEPTION_OUT_OF_BOUNDS",
        "The diagnosis was outside the verified concept packet.",
        502,
      );
    }
    if (chat.data.id) console.info(`Sarvam diagnosis request: ${chat.data.id}`);
    const grounded = groundDiagnosis(
      diagnosis.data,
      packet,
      parsed.data.learnerName,
    );
    return Response.json({
      diagnosis: groundClarification(
        grounded,
        packet,
        parsed.data.learnerName,
        parsed.data.transcript,
      ),
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return apiError(
        "DIAGNOSIS_JSON_ERROR",
        "Sarvam returned invalid structured output.",
        502,
      );
    }
    if (error instanceof SarvamProviderError) {
      return apiError(error.code, error.message, error.status, {
        requestId: error.requestId,
      });
    }
    return apiError("DIAGNOSIS_ERROR", "Diagnosis failed. Your transcript is safe.", 500);
  }
}

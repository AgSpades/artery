import { z } from "zod";

import { apiError } from "@/lib/api";
import { getServerEnv } from "@/lib/env";
import { sarvamFetch, SarvamProviderError } from "@/lib/sarvam/client";

const requestSchema = z.strictObject({
  text: z.string().min(1).max(2500),
  languageCode: z.literal("hi-IN"),
});

const responseSchema = z.object({
  request_id: z.string().optional(),
  audios: z.array(z.string().min(1)).min(1),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Bilingual explanation text is required.",
      422,
      parsed.error.flatten(),
    );
  }

  if (getServerEnv().DEMO_FALLBACK_MODE) {
    return apiError(
      "FALLBACK_AUDIO_UNAVAILABLE",
      "Cached audio is not bundled. The labelled fallback continues with text.",
      503,
    );
  }

  try {
    const response = await sarvamFetch("/text-to-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: parsed.data.text,
        target_language_code: parsed.data.languageCode,
        model: "bulbul:v3",
        speaker: "ishita",
        pace: 1,
        speech_sample_rate: 24_000,
        output_audio_codec: "wav",
      }),
    });
    const provider = responseSchema.safeParse(await response.json());
    if (!provider.success) {
      return apiError(
        "TTS_SCHEMA_ERROR",
        "Sarvam returned an unreadable audio response.",
        502,
      );
    }
    if (provider.data.request_id) {
      console.info(`Sarvam TTS request: ${provider.data.request_id}`);
    }
    return new Response(Buffer.from(provider.data.audios[0], "base64"), {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof SarvamProviderError) {
      return apiError(error.code, error.message, error.status, {
        requestId: error.requestId,
      });
    }
    return apiError(
      "TTS_ERROR",
      "Spoken audio is unavailable. Continue with the bilingual text.",
      500,
    );
  }
}

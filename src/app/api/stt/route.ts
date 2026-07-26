import { z } from "zod";

import { apiError } from "@/lib/api";
import { getFallbackOutput } from "@/lib/demo/fallback";
import { getServerEnv } from "@/lib/env";
import { isSupportedAudioType, normalizeAudioType } from "@/lib/sarvam/audio";
import { sarvamFetch, SarvamProviderError } from "@/lib/sarvam/client";

const sttResponseSchema = z.object({
  transcript: z.string(),
  language_code: z.string().optional(),
  request_id: z.string().optional(),
});

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  const conceptPacketId = form?.get("conceptPacketId");

  if (!(audio instanceof File) || audio.size === 0) {
    return apiError("MISSING_AUDIO", "Record an explanation before continuing.", 400);
  }
  if (!isSupportedAudioType(audio.type)) {
    return apiError(
      "UNSUPPORTED_AUDIO",
      "Use WebM, OGG, WAV, MP3, MP4, AAC, or FLAC audio.",
      415,
    );
  }

  const env = getServerEnv();
  if (env.DEMO_FALLBACK_MODE) {
    if (typeof conceptPacketId !== "string") {
      return apiError("MISSING_CONCEPT", "Fallback mode needs a concept packet.", 400);
    }
    return Response.json({
      transcript: getFallbackOutput(conceptPacketId).transcript,
      languageCode: "hi-IN",
      fallback: true,
    });
  }

  const providerForm = new FormData();
  providerForm.append(
    "file",
    new Blob([audio], { type: normalizeAudioType(audio.type) }),
    audio.name,
  );
  providerForm.append("model", "saaras:v3");
  providerForm.append("mode", "codemix");
  providerForm.append("language_code", "hi-IN");

  try {
    const response = await sarvamFetch("/speech-to-text", {
      method: "POST",
      body: providerForm,
    });
    const parsed = sttResponseSchema.safeParse(await response.json());
    if (!parsed.success || !parsed.data.transcript.trim()) {
      return apiError(
        "EMPTY_TRANSCRIPT",
        "I am not fully sure I heard that phrase correctly.",
        502,
      );
    }
    return Response.json({
      transcript: parsed.data.transcript.trim(),
      languageCode: parsed.data.language_code,
      requestId: parsed.data.request_id,
    });
  } catch (error) {
    if (error instanceof SarvamProviderError) {
      return apiError(error.code, error.message, error.status, {
        requestId: error.requestId,
      });
    }
    return apiError("STT_ERROR", "Transcription failed. Your recording is safe.", 500);
  }
}

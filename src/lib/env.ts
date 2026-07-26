import "server-only";

import { z } from "zod";

const envSchema = z.object({
  SARVAM_API_KEY: z.string().min(1).optional(),
  SARVAM_BASE_URL: z.url().default("https://api.sarvam.ai"),
  DEMO_FALLBACK_MODE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  VOICE_STREAMING_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export function getServerEnv() {
  return envSchema.parse({
    SARVAM_API_KEY: process.env.SARVAM_API_KEY || undefined,
    SARVAM_BASE_URL: process.env.SARVAM_BASE_URL,
    DEMO_FALLBACK_MODE: process.env.DEMO_FALLBACK_MODE,
    VOICE_STREAMING_ENABLED: process.env.VOICE_STREAMING_ENABLED,
  });
}

export function requireSarvamKey() {
  const env = getServerEnv();
  if (!env.SARVAM_API_KEY) throw new Error("SARVAM_API_KEY is not configured");
  return { ...env, SARVAM_API_KEY: env.SARVAM_API_KEY };
}

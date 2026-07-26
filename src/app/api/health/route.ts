import { conceptPackets } from "@/lib/concepts/repository";
import { getServerEnv } from "@/lib/env";

export function GET() {
  const env = getServerEnv();
  return Response.json({
    ok: true,
    service: "artery",
    conceptPackets: conceptPackets.length,
    sarvamConfigured: Boolean(env.SARVAM_API_KEY),
    fallbackMode: env.DEMO_FALLBACK_MODE,
  });
}

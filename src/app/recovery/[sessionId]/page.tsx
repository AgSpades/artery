import { RecoveryFlow } from "@/components/recovery-flow";
import { conceptPackets } from "@/lib/concepts/repository";
import { getServerEnv } from "@/lib/env";

export default async function RecoveryPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const env = getServerEnv();
  return (
    <RecoveryFlow
      fallbackMode={env.DEMO_FALLBACK_MODE}
      packets={conceptPackets}
      sessionId={sessionId}
      voiceStreamingEnabled={env.VOICE_STREAMING_ENABLED}
    />
  );
}

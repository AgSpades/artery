import expectedOutputs from "@/data/expected-outputs.json";
import { diagnosisSchema } from "@/lib/schemas";

const outputs = Object.fromEntries(
  Object.entries(expectedOutputs).map(([id, { transcript, ...diagnosis }]) => [
    id,
    {
      transcript,
      diagnosis: diagnosisSchema.parse(diagnosis),
    },
  ]),
);

export function getFallbackOutput(conceptPacketId: string) {
  const output = outputs[conceptPacketId];
  if (!output) throw new Error(`No fallback output for ${conceptPacketId}`);
  return output;
}

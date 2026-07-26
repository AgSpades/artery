import packets from "@/data/concept-packets.json";
import { parseConceptPackets } from "@/lib/concepts/validation";

const parsed = parseConceptPackets(packets);

export const conceptPackets = parsed.cases;

export function getConceptPacket(id: string) {
  const packet = conceptPackets.find((item) => item.id === id);
  if (!packet) throw new Error(`Unknown concept packet: ${id}`);
  return packet;
}

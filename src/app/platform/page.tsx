import { PlatformClient } from "@/components/platform-client";
import { getConceptPacket } from "@/lib/concepts/repository";

export default function PlatformPage() {
  return <PlatformClient packet={getConceptPacket("CELL_MITO_001")} />;
}

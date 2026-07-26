import { conceptPacketsSchema } from "../schemas.ts";

export function parseConceptPackets(input: unknown) {
  return conceptPacketsSchema.parse(input);
}

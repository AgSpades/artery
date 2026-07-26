import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import { parseConceptPackets } from "./validation.ts";

const packets = createRequire(import.meta.url)("../../data/concept-packets.json");

test("loads four bounded Cell Biology concept packets", () => {
  const parsed = parseConceptPackets(packets);
  assert.equal(parsed.cases.length, 4);
  assert.equal(parsed.cases[0].correctOption, "B");
  assert.ok(
    parsed.cases[0].allowedMisconceptions.some(
      ({ id }) => id === "UNCERTAIN",
    ),
  );
});

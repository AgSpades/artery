import assert from "node:assert/strict";
import test from "node:test";

import { parseChatResponse } from "./chat.ts";

test("parses Sarvam's JSON-encoded chat envelope", () => {
  const response = JSON.stringify({
    id: "request-1",
    choices: [{ message: { content: "{\"misconceptionId\":\"UNCERTAIN\"}" } }],
  });

  const parsed = parseChatResponse(response);

  assert.equal(parsed.success, true);
});

import { z } from "zod";

const chatResponseSchema = z.object({
  id: z.string().optional(),
  choices: z.array(
    z.object({
      message: z.object({ content: z.string() }),
    }),
  ).min(1),
});

export function parseChatResponse(body: unknown) {
  return chatResponseSchema.safeParse(
    typeof body === "string" ? JSON.parse(body) : body,
  );
}

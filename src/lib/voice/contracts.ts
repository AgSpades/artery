import { z } from "zod";

const relayErrorSchema = z.strictObject({
  type: z.literal("error"),
  code: z.string().min(1),
  message: z.string().min(1),
  recoverable: z.boolean(),
  requestId: z.string().min(1).optional(),
});

export const sttClientControlSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("flush") }),
  z.strictObject({ type: z.literal("close") }),
]);

export const sttServerMessageSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("ready") }),
  z.strictObject({ type: z.literal("speech_start") }),
  z.strictObject({ type: z.literal("speech_end") }),
  z.strictObject({
    type: z.literal("transcript"),
    transcript: z.string().min(1),
    requestId: z.string().min(1).optional(),
  }),
  relayErrorSchema,
]);

export const ttsClientMessageSchema = z.strictObject({
  type: z.literal("speak"),
  text: z.string().trim().min(1).max(500),
});

export const ttsServerMessageSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("ready") }),
  z.strictObject({
    type: z.literal("audio"),
    audio: z.string().min(1),
    contentType: z.string().min(1),
  }),
  z.strictObject({ type: z.literal("final") }),
  relayErrorSchema,
]);

export const sarvamSttMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("data"),
    data: z.object({
      request_id: z.string().min(1).optional(),
      transcript: z.string().min(1),
    }),
  }),
  z.object({
    type: z.literal("events"),
    data: z.object({
      signal_type: z.enum(["START_SPEECH", "END_SPEECH"]),
    }),
  }),
]);

const sarvamTtsEventSchema = z.object({
  type: z.enum(["event", "events"]),
  data: z.object({ event_type: z.literal("final") }),
});

export const sarvamTtsMessageSchema = z.union([
  z.object({
    type: z.literal("audio"),
    data: z.object({
      audio: z.string().min(1),
      content_type: z.string().min(1),
    }),
  }),
  sarvamTtsEventSchema,
]);

export type SttServerMessage = z.infer<typeof sttServerMessageSchema>;
export type TtsServerMessage = z.infer<typeof ttsServerMessageSchema>;

import WebSocket from "ws";
import { z } from "zod";

export const sttClientControlSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("flush") }),
  z.strictObject({ type: z.literal("close") }),
]);

export const ttsClientMessageSchema = z.strictObject({
  type: z.literal("speak"),
  text: z.string().trim().min(1).max(500),
});

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

export const sarvamTtsMessageSchema = z.union([
  z.object({
    type: z.literal("audio"),
    data: z.object({
      audio: z.string().min(1),
      content_type: z.string().min(1),
    }),
  }),
  z.object({
    type: z.enum(["event", "events"]),
    data: z.object({ event_type: z.literal("final") }),
  }),
]);

export function isAllowedOrigin(
  origin: string | null,
  configured = process.env.VOICE_RELAY_ALLOWED_ORIGINS || "",
) {
  return Boolean(
    origin &&
      configured
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .includes(origin),
  );
}

export function providerUrl(
  path: string,
  search: Record<string, string>,
  baseUrl = process.env.SARVAM_BASE_URL || "https://api.sarvam.ai",
) {
  const url = new URL(path, baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.search = new URLSearchParams(search).toString();
  return url;
}

export function requireApiKey() {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error("SARVAM_API_KEY is not configured.");
  return key;
}

export function send(socket: WebSocket, message: unknown) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

export function parseJson(data: WebSocket.RawData) {
  try {
    return JSON.parse(data.toString()) as unknown;
  } catch {
    return null;
  }
}

export function apiError(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

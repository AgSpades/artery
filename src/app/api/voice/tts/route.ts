import { experimental_upgradeWebSocket } from "@vercel/functions";
import WebSocket from "ws";

import { apiError } from "@/lib/api";
import { getServerEnv, requireSarvamKey } from "@/lib/env";
import {
  sarvamTtsMessageSchema,
  ttsClientMessageSchema,
} from "@/lib/voice/contracts";

export const runtime = "nodejs";

function send(socket: WebSocket, message: unknown) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

export async function GET(request: Request) {
  const env = getServerEnv();
  if (!env.VOICE_STREAMING_ENABLED) {
    return apiError(
      "VOICE_STREAMING_DISABLED",
      "Streaming speech is disabled. Continue with text.",
      404,
    );
  }
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return apiError("INVALID_ORIGIN", "Voice connection was rejected.", 403);
  }

  const providerUrl = new URL("/text-to-speech/ws", env.SARVAM_BASE_URL);
  providerUrl.protocol = providerUrl.protocol === "https:" ? "wss:" : "ws:";
  providerUrl.search = new URLSearchParams({
    model: "bulbul:v3",
    send_completion_event: "true",
  }).toString();

  return experimental_upgradeWebSocket((browser) => {
    const provider = new WebSocket(providerUrl, {
      headers: {
        "Api-Subscription-Key": requireSarvamKey().SARVAM_API_KEY,
      },
    });
    const timeout = setTimeout(() => browser.close(1011, "Speech timed out"), 30_000);

    provider.on("open", () => {
      provider.send(
        JSON.stringify({
          type: "config",
          data: {
            target_language_code: "hi-IN",
            speaker: "shubh",
            pace: 1,
            output_audio_codec: "linear16",
          },
        }),
      );
      send(browser, { type: "ready" });
    });
    provider.on("message", (data) => {
      let json: unknown;
      try {
        json = JSON.parse(data.toString()) as unknown;
      } catch {
        json = null;
      }
      const parsed = sarvamTtsMessageSchema.safeParse(json);
      if (!parsed.success) {
        return send(browser, {
          type: "error",
          code: "TTS_SCHEMA_ERROR",
          message: "Live speech returned an unreadable response.",
          recoverable: true,
        });
      }
      if (parsed.data.type === "audio") {
        return send(browser, {
          type: "audio",
          audio: parsed.data.data.audio,
          contentType: parsed.data.data.content_type,
        });
      }
      clearTimeout(timeout);
      send(browser, { type: "final" });
      browser.close(1000, "Speech complete");
      provider.close();
    });
    provider.on("error", () => {
      send(browser, {
        type: "error",
        code: "TTS_NETWORK_ERROR",
        message: "Spoken audio is unavailable. The text remains visible.",
        recoverable: true,
      });
      browser.close(1011, "Provider unavailable");
    });
    provider.on("close", () => clearTimeout(timeout));

    browser.on("message", (data, isBinary) => {
      if (isBinary || provider.readyState !== WebSocket.OPEN) return;
      let json: unknown;
      try {
        json = JSON.parse(data.toString()) as unknown;
      } catch {
        json = null;
      }
      const message = ttsClientMessageSchema.safeParse(json);
      if (!message.success) return browser.close(1008, "Invalid speech request");
      provider.send(
        JSON.stringify({ type: "text", data: { text: message.data.text } }),
      );
      provider.send('{"type":"flush"}');
    });
    browser.on("close", () => {
      clearTimeout(timeout);
      if (provider.readyState < WebSocket.CLOSING) provider.close();
    });
  }, { maxPayload: 8 * 1024 });
}

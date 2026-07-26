import { experimental_upgradeWebSocket } from "@vercel/functions";
import WebSocket from "ws";

import {
  apiError,
  isAllowedOrigin,
  parseJson,
  providerUrl,
  requireApiKey,
  sarvamTtsMessageSchema,
  send,
  ttsClientMessageSchema,
} from "../lib/relay";

export async function GET(request: Request) {
  if (!process.env.SARVAM_API_KEY) {
    return apiError(
      "MISSING_CONFIGURATION",
      "The voice relay is not configured.",
      503,
    );
  }
  if (!isAllowedOrigin(request.headers.get("origin"))) {
    return apiError("INVALID_ORIGIN", "Voice connection was rejected.", 403);
  }

  const url = providerUrl("/text-to-speech/ws", {
    model: "bulbul:v3",
    send_completion_event: "true",
  });

  return experimental_upgradeWebSocket((browser) => {
    const provider = new WebSocket(url, {
      headers: { "Api-Subscription-Key": requireApiKey() },
    });
    const timeout = setTimeout(
      () => browser.close(1011, "Speech timed out"),
      30_000,
    );

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
      const parsed = sarvamTtsMessageSchema.safeParse(parseJson(data));
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
    provider.on("error", (error) => {
      console.error(`[tts] ${error.message}`);
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
      const message = ttsClientMessageSchema.safeParse(parseJson(data));
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

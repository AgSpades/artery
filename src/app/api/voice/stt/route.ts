import { experimental_upgradeWebSocket } from "@vercel/functions";
import WebSocket from "ws";

import { apiError } from "@/lib/api";
import { getServerEnv, requireSarvamKey } from "@/lib/env";
import {
  sarvamSttMessageSchema,
  sttClientControlSchema,
} from "@/lib/voice/contracts";

export const runtime = "nodejs";

function send(socket: WebSocket, message: unknown) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function parseJson(data: WebSocket.RawData) {
  try {
    return JSON.parse(data.toString()) as unknown;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const env = getServerEnv();
  if (!env.VOICE_STREAMING_ENABLED) {
    return apiError(
      "VOICE_STREAMING_DISABLED",
      "Live conversation is disabled. Continue with tap-to-record.",
      404,
    );
  }
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return apiError("INVALID_ORIGIN", "Voice connection was rejected.", 403);
  }

  const providerUrl = new URL("/speech-to-text/ws", env.SARVAM_BASE_URL);
  providerUrl.protocol = providerUrl.protocol === "https:" ? "wss:" : "ws:";
  providerUrl.search = new URLSearchParams({
    "language-code": "hi-IN",
    model: "saaras:v3",
    mode: "codemix",
    sample_rate: "16000",
    input_audio_codec: "pcm_s16le",
    high_vad_sensitivity: "true",
    vad_signals: "true",
    flush_signal: "true",
  }).toString();

  return experimental_upgradeWebSocket((browser) => {
    const provider = new WebSocket(providerUrl, {
      headers: {
        "Api-Subscription-Key": requireSarvamKey().SARVAM_API_KEY,
      },
    });
    const timeout = setTimeout(() => browser.close(1000, "Session complete"), 300_000);

    provider.on("open", () => send(browser, { type: "ready" }));
    provider.on("message", (data) => {
      const parsed = sarvamSttMessageSchema.safeParse(
        parseJson(data),
      );
      if (!parsed.success) {
        return send(browser, {
          type: "error",
          code: "STT_SCHEMA_ERROR",
          message: "Live transcription returned an unreadable response.",
          recoverable: true,
        });
      }
      if (parsed.data.type === "events") {
        return send(browser, {
          type:
            parsed.data.data.signal_type === "START_SPEECH"
              ? "speech_start"
              : "speech_end",
        });
      }
      send(browser, {
        type: "transcript",
        transcript: parsed.data.data.transcript,
        requestId: parsed.data.data.request_id,
      });
    });
    provider.on("error", () => {
      send(browser, {
        type: "error",
        code: "STT_NETWORK_ERROR",
        message: "Live listening disconnected. Your completed turns are safe.",
        recoverable: true,
      });
      browser.close(1011, "Provider unavailable");
    });
    provider.on("close", (code) => {
      clearTimeout(timeout);
      if (browser.readyState === WebSocket.OPEN) {
        browser.close(code === 1000 ? 1000 : 1011, "Listening ended");
      }
    });

    browser.on("message", (data, isBinary) => {
      if (provider.readyState !== WebSocket.OPEN) return;
      if (isBinary) {
        const audio = Array.isArray(data)
          ? Buffer.concat(data)
          : Buffer.from(data as ArrayBuffer);
        return provider.send(
          JSON.stringify({
            audio: {
              data: audio.toString("base64"),
              sample_rate: "16000",
              encoding: "audio/wav",
            },
          }),
        );
      }
      const control = sttClientControlSchema.safeParse(
        parseJson(data),
      );
      if (!control.success) return browser.close(1008, "Invalid control message");
      if (control.data.type === "flush") provider.send('{"type":"flush"}');
      else browser.close(1000, "Client ended session");
    });
    browser.on("close", () => {
      clearTimeout(timeout);
      if (provider.readyState < WebSocket.CLOSING) provider.close();
    });
  }, { maxPayload: 64 * 1024 });
}

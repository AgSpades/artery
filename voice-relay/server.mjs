import { createServer } from "node:http";

import WebSocket, { WebSocketServer } from "ws";

const port = Number(process.env.VOICE_RELAY_PORT || 8787);
const sarvamBaseUrl = process.env.SARVAM_BASE_URL || "https://api.sarvam.ai";
const apiKey = process.env.SARVAM_API_KEY;
const allowedOrigins = new Set(
  (
    process.env.VOICE_RELAY_ALLOWED_ORIGINS ||
    "http://127.0.0.1:3000,http://localhost:3000,https://artery.saumyajit.dev,https://*.vercel.app"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function close(socket, code = 1000, reason = "") {
  if (socket.readyState < WebSocket.CLOSING) socket.close(code, reason);
}

function parseJson(data) {
  try {
    return JSON.parse(data.toString());
  } catch {
    return null;
  }
}

function providerUrl(path, search) {
  const url = new URL(path, sarvamBaseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.search = new URLSearchParams(search).toString();
  return url;
}

function heartbeat(socket) {
  let alive = true;
  socket.on("pong", () => {
    alive = true;
  });
  const timer = setInterval(() => {
    if (!alive) return socket.terminate();
    alive = false;
    if (socket.readyState === WebSocket.OPEN) socket.ping();
  }, 20_000);
  socket.once("close", () => clearInterval(timer));
}

function providerError(browser, service, message) {
  send(browser, {
    type: "error",
    code: `${service}_NETWORK_ERROR`,
    message,
    recoverable: true,
  });
  close(browser, 1011, "Provider unavailable");
}

function handleStt(browser) {
  heartbeat(browser);
  const provider = new WebSocket(
    providerUrl("/speech-to-text/ws", {
      "language-code": "hi-IN",
      model: "saaras:v3",
      mode: "codemix",
      sample_rate: "16000",
      input_audio_codec: "pcm_s16le",
      high_vad_sensitivity: "true",
      vad_signals: "true",
      flush_signal: "true",
    }),
    { headers: { "Api-Subscription-Key": apiKey } },
  );
  heartbeat(provider);
  const timeout = setTimeout(() => close(browser, 1000, "Session complete"), 300_000);

  provider.on("open", () => send(browser, { type: "ready" }));
  provider.on("message", (data) => {
    const message = parseJson(data);
    if (
      message?.type === "events" &&
      ["START_SPEECH", "END_SPEECH"].includes(message.data?.signal_type)
    ) {
      return send(browser, {
        type:
          message.data.signal_type === "START_SPEECH"
            ? "speech_start"
            : "speech_end",
      });
    }
    if (
      message?.type === "data" &&
      typeof message.data?.transcript === "string" &&
      message.data.transcript.length > 0
    ) {
      return send(browser, {
        type: "transcript",
        transcript: message.data.transcript,
        ...(typeof message.data.request_id === "string"
          ? { requestId: message.data.request_id }
          : {}),
      });
    }
    send(browser, {
      type: "error",
      code: "STT_SCHEMA_ERROR",
      message: "Live transcription returned an unreadable response.",
      recoverable: true,
    });
  });
  provider.on("error", (error) => {
    console.error(`[stt] ${error.message}`);
    providerError(
      browser,
      "STT",
      "Live listening disconnected. Your completed turns are safe.",
    );
  });
  provider.on("close", (code) => {
    clearTimeout(timeout);
    if (browser.readyState === WebSocket.OPEN) {
      close(browser, code === 1000 ? 1000 : 1011, "Listening ended");
    }
  });

  browser.on("message", (data, isBinary) => {
    if (provider.readyState !== WebSocket.OPEN) return;
    if (isBinary) {
      return provider.send(
        JSON.stringify({
          audio: {
            data: Buffer.from(data).toString("base64"),
            sample_rate: "16000",
            encoding: "audio/wav",
          },
        }),
      );
    }
    const control = parseJson(data);
    if (control?.type === "flush") return provider.send('{"type":"flush"}');
    if (control?.type === "close") return close(browser, 1000, "Client ended session");
    close(browser, 1008, "Invalid control message");
  });
  browser.on("close", () => {
    clearTimeout(timeout);
    close(provider);
  });
}

function handleTts(browser) {
  heartbeat(browser);
  const provider = new WebSocket(
    providerUrl("/text-to-speech/ws", {
      model: "bulbul:v3",
      send_completion_event: "true",
    }),
    { headers: { "Api-Subscription-Key": apiKey } },
  );
  heartbeat(provider);
  const timeout = setTimeout(() => close(browser, 1011, "Speech timed out"), 30_000);

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
    const message = parseJson(data);
    if (
      message?.type === "audio" &&
      typeof message.data?.audio === "string" &&
      typeof message.data?.content_type === "string"
    ) {
      return send(browser, {
        type: "audio",
        audio: message.data.audio,
        contentType: message.data.content_type,
      });
    }
    if (
      ["event", "events"].includes(message?.type) &&
      message.data?.event_type === "final"
    ) {
      clearTimeout(timeout);
      send(browser, { type: "final" });
      close(browser, 1000, "Speech complete");
      return close(provider);
    }
    send(browser, {
      type: "error",
      code: "TTS_SCHEMA_ERROR",
      message: "Live speech returned an unreadable response.",
      recoverable: true,
    });
  });
  provider.on("error", (error) => {
    console.error(`[tts] ${error.message}`);
    providerError(
      browser,
      "TTS",
      "Spoken audio is unavailable. The text remains visible.",
    );
  });
  provider.on("close", () => clearTimeout(timeout));

  browser.on("message", (data, isBinary) => {
    if (isBinary || provider.readyState !== WebSocket.OPEN) return;
    const message = parseJson(data);
    const text = message?.type === "speak" ? message.text?.trim() : "";
    if (!text || text.length > 500) return close(browser, 1008, "Invalid speech request");
    provider.send(JSON.stringify({ type: "text", data: { text } }));
    provider.send('{"type":"flush"}');
  });
  browser.on("close", () => {
    clearTimeout(timeout);
    close(provider);
  });
}

const server = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(apiKey ? 200 : 503, { "Content-Type": "application/json" });
    return response.end(
      JSON.stringify({
        ok: Boolean(apiKey),
        service: "artery-voice-relay",
        paths: ["/stt", "/tts"],
      }),
    );
  }
  response.writeHead(404).end();
});
const sttServer = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
const ttsServer = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 });

sttServer.on("connection", handleStt);
ttsServer.on("connection", handleTts);
server.on("upgrade", (request, socket, head) => {
  const origin = request.headers.origin;
  if (!apiKey) {
    socket.write("HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n");
    return socket.destroy();
  }
  if (!origin || !allowedOrigins.has(origin)) {
    socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
    return socket.destroy();
  }
  const pathname = new URL(request.url || "/", "http://relay").pathname;
  const target = pathname === "/stt" ? sttServer : pathname === "/tts" ? ttsServer : null;
  if (!target) return socket.destroy();
  target.handleUpgrade(request, socket, head, (websocket) => {
    target.emit("connection", websocket, request);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Artery voice relay listening on ws://127.0.0.1:${port}`);
});

function shutdown() {
  sttServer.clients.forEach((socket) => socket.terminate());
  ttsServer.clients.forEach((socket) => socket.terminate());
  server.close();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

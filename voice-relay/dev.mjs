import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

export function createVoiceEnvironment(baseEnv) {
  const relayPort = baseEnv.VOICE_RELAY_PORT || "8787";
  return {
    ...baseEnv,
    DEMO_FALLBACK_MODE: "false",
    VOICE_STREAMING_ENABLED: "true",
    NEXT_PUBLIC_VOICE_RELAY_URL:
      baseEnv.NEXT_PUBLIC_VOICE_RELAY_URL ||
      `ws://127.0.0.1:${relayPort}`,
    VOICE_RELAY_PORT: relayPort,
    VOICE_RELAY_ALLOWED_ORIGINS:
      baseEnv.VOICE_RELAY_ALLOWED_ORIGINS ||
      "http://127.0.0.1:3000,http://localhost:3000",
  };
}

function start() {
  const env = createVoiceEnvironment(process.env);
  if (!env.SARVAM_API_KEY) {
    console.error("SARVAM_API_KEY is required in .env.local.");
    process.exitCode = 1;
    return;
  }

  const options = { cwd: process.cwd(), env, stdio: "inherit" };
  const relay = spawn(process.execPath, ["voice-relay/server.mjs"], options);
  const next = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3000",
    ],
    options,
  );
  const children = [relay, next];
  let stopping = false;

  function stop(code = 0) {
    if (stopping) return;
    stopping = true;
    children.forEach((child) => child.kill());
    process.exitCode = code;
  }

  children.forEach((child) => {
    child.on("exit", (code) => {
      if (!stopping) stop(code ?? 1);
    });
  });
  process.once("SIGINT", () => stop());
  process.once("SIGTERM", () => stop());
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  start();
}

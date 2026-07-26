export function voiceSocketUrl(
  kind: "stt" | "tts",
  pageUrl: string,
  relayUrl?: string,
) {
  const url = relayUrl
    ? new URL(kind, relayUrl.endsWith("/") ? relayUrl : `${relayUrl}/`)
    : new URL(`/api/voice/${kind}`, pageUrl);
  if (url.protocol === "https:") url.protocol = "wss:";
  if (url.protocol === "http:") url.protocol = "ws:";
  if (!["ws:", "wss:"].includes(url.protocol)) {
    throw new Error("Voice relay must use ws:// or wss://.");
  }
  return url;
}

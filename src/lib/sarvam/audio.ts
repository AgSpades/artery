const supportedAudioTypes = new Set([
  "audio/aac",
  "audio/flac",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "video/webm",
]);

export function normalizeAudioType(value: string) {
  return value.split(";", 1)[0].trim().toLowerCase();
}

export function isSupportedAudioType(value: string) {
  return supportedAudioTypes.has(normalizeAudioType(value));
}

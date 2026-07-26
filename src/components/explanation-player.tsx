"use client";

import { Play, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export function ExplanationPlayer({ text }: { text: string }) {
  const [audioUrl, setAudioUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  async function loadAudio() {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, languageCode: "hi-IN" }),
      });
      if (!response.ok) throw new Error("Audio unavailable");
      const nextUrl = URL.createObjectURL(await response.blob());
      setAudioUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextUrl;
      });
    } catch {
      setError("Audio is unavailable. The complete bilingual explanation remains below.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-4">
      {audioUrl ? (
        <audio className="w-full" controls src={audioUrl}>
          Your browser does not support audio playback.
        </audio>
      ) : (
        <button
          className="inline-flex items-center gap-2 border border-stone-600 px-4 py-2 text-sm font-medium disabled:opacity-60"
          disabled={isLoading}
          onClick={loadAudio}
          type="button"
        >
          {isLoading ? <RefreshCw aria-hidden="true" className="animate-spin" size={16} /> : <Play aria-hidden="true" size={16} />}
          {isLoading ? "Generating audio…" : "Play bilingual audio"}
        </button>
      )}
      {error && (
        <div className="mt-3">
          <p className="text-sm text-amber-200" role="status">{error}</p>
          <button className="mt-2 text-sm underline" onClick={loadAudio} type="button">Retry audio</button>
        </div>
      )}
    </div>
  );
}

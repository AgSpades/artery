"use client";

import { Mic, Square, WandSparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function VoiceRecorder({
  fallbackMode,
  onAudio,
  onRecording,
}: {
  fallbackMode: boolean;
  onAudio: (audio: Blob) => void;
  onRecording: () => void;
}) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    stream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  async function start() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      return setError("This browser does not support microphone recording.");
    }

    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const nextRecorder = new MediaRecorder(
        stream.current,
        mimeType ? { mimeType } : undefined,
      );
      chunks.current = [];
      nextRecorder.ondataavailable = ({ data }) => {
        if (data.size) chunks.current.push(data);
      };
      nextRecorder.onstop = () => {
        setIsRecording(false);
        stream.current?.getTracks().forEach((track) => track.stop());
        onAudio(new Blob(chunks.current, { type: nextRecorder.mimeType }));
      };
      recorder.current = nextRecorder;
      nextRecorder.start();
      setIsRecording(true);
      onRecording();
      timer.current = setTimeout(stop, 30_000);
    } catch {
      setError("Microphone access was unavailable. Check browser permission and retry.");
    }
  }

  function useCachedClip() {
    onRecording();
    onAudio(new Blob(["artery-demo-fallback"], { type: "audio/webm" }));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {isRecording ? (
          <button
            className="inline-flex items-center gap-2 border border-[#8f1838] bg-[#fbf0f2] px-5 py-3 font-medium text-[#8f1838]"
            onClick={stop}
            type="button"
          >
            <span className="size-2 animate-pulse rounded-full bg-[#8f1838]" />
            Stop recording <Square aria-hidden="true" size={16} />
          </button>
        ) : (
          <button
            className="inline-flex items-center gap-2 bg-[#8f1838] px-5 py-3 font-medium text-white"
            onClick={start}
            type="button"
          >
            <Mic aria-hidden="true" size={18} /> Record explanation
          </button>
        )}
        {fallbackMode && !isRecording && (
          <button
            className="inline-flex items-center gap-2 border border-stone-300 bg-white px-5 py-3 font-medium"
            onClick={useCachedClip}
            type="button"
          >
            <WandSparkles aria-hidden="true" size={17} /> Use cached demo clip
          </button>
        )}
      </div>
      <p className="mt-3 text-sm text-stone-500">
        Speak naturally in Hindi and English. Recording stops after 30 seconds.
      </p>
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
    </div>
  );
}

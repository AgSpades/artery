"use client";

import {
  sttServerMessageSchema,
  ttsServerMessageSchema,
} from "@/lib/voice/contracts";
import { voiceSocketUrl } from "@/lib/voice/relay-url";

type VoiceCallbacks = {
  onReady: () => void;
  onReconnecting: () => void;
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  onTranscript: (transcript: string) => void;
  onError: (message: string) => void;
};

function parseJson(value: unknown) {
  try {
    return JSON.parse(String(value)) as unknown;
  } catch {
    return null;
  }
}

export class BrowserVoiceSession {
  private context?: AudioContext;
  private stream?: MediaStream;
  private worklet?: AudioWorkletNode;
  private stt?: WebSocket;
  private tts?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private playbackTimer?: ReturnType<typeof setTimeout>;
  private playbackAt = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private closed = false;

  constructor(private callbacks: VoiceCallbacks) {}

  async start() {
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode) {
      throw new Error("This browser does not support live voice.");
    }
    this.closed = false;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        autoGainControl: true,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    this.context = new AudioContext({ latencyHint: "interactive" });
    await this.context.resume();
    await this.context.audioWorklet.addModule("/pcm16-worklet.js");

    const input = this.context.createMediaStreamSource(this.stream);
    this.worklet = new AudioWorkletNode(this.context, "artery-pcm16", {
      numberOfInputs: 1,
      numberOfOutputs: 0,
    });
    this.worklet.port.onmessage = ({ data }: MessageEvent<ArrayBuffer>) => {
      if (this.stt?.readyState === WebSocket.OPEN) this.stt.send(data);
    };
    input.connect(this.worklet);
    this.connectStt();
  }

  speak(
    text: string,
    {
      onComplete,
      onError,
    }: { onComplete: () => void; onError: (message: string) => void },
  ) {
    if (!this.context) return onError("Spoken audio is unavailable.");
    this.stopSpeech();
    const socket = new WebSocket(
      voiceSocketUrl(
        "tts",
        window.location.href,
        process.env.NEXT_PUBLIC_VOICE_RELAY_URL,
      ),
    );
    this.tts = socket;
    socket.onmessage = ({ data }) => {
      const parsed = ttsServerMessageSchema.safeParse(
        parseJson(data),
      );
      if (!parsed.success) return onError("Spoken audio became unreadable.");
      if (parsed.data.type === "ready") {
        return socket.send(JSON.stringify({ type: "speak", text }));
      }
      if (parsed.data.type === "audio") {
        return this.scheduleAudio(parsed.data.audio);
      }
      if (parsed.data.type === "error") return onError(parsed.data.message);

      const remaining = Math.max(
        0,
        ((this.playbackAt || this.context?.currentTime || 0) -
          (this.context?.currentTime || 0)) *
          1_000,
      );
      this.playbackTimer = setTimeout(onComplete, remaining);
    };
    socket.onerror = () => onError("Spoken audio is unavailable.");
  }

  stopSpeech() {
    if (this.playbackTimer) clearTimeout(this.playbackTimer);
    this.playbackTimer = undefined;
    this.sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Already ended.
      }
    });
    this.sources.clear();
    this.playbackAt = this.context?.currentTime ?? 0;
    const tts = this.tts;
    if (tts && tts.readyState < WebSocket.CLOSING) tts.close(1000, "Interrupted");
    this.tts = undefined;
  }

  close() {
    this.closed = true;
    this.stopSpeech();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const stt = this.stt;
    if (stt && stt.readyState < WebSocket.CLOSING) stt.close();
    this.worklet?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    void this.context?.close();
  }

  private connectStt(attempt = 0) {
    const socket = new WebSocket(
      voiceSocketUrl(
        "stt",
        window.location.href,
        process.env.NEXT_PUBLIC_VOICE_RELAY_URL,
      ),
    );
    this.stt = socket;
    socket.onmessage = ({ data }) => {
      const parsed = sttServerMessageSchema.safeParse(parseJson(data));
      if (!parsed.success) {
        return this.callbacks.onError("Live transcription became unreadable.");
      }
      if (parsed.data.type === "ready") return this.callbacks.onReady();
      if (parsed.data.type === "speech_start") {
        this.stopSpeech();
        return this.callbacks.onSpeechStart();
      }
      if (parsed.data.type === "speech_end") return this.callbacks.onSpeechEnd();
      if (parsed.data.type === "transcript") {
        return this.callbacks.onTranscript(parsed.data.transcript);
      }
      this.callbacks.onError(parsed.data.message);
    };
    socket.onclose = ({ code }) => {
      if (this.closed || code === 1000) return;
      if (attempt >= 2) {
        return this.callbacks.onError(
          "Live listening disconnected. Continue with tap-to-record.",
        );
      }
      this.callbacks.onReconnecting();
      this.reconnectTimer = setTimeout(
        () => this.connectStt(attempt + 1),
        500 * 2 ** attempt,
      );
    };
  }

  private scheduleAudio(base64: string) {
    if (!this.context) return;
    const bytes = Uint8Array.from(atob(base64), (character) =>
      character.charCodeAt(0),
    );
    const view = new DataView(bytes.buffer);
    const samples = new Float32Array(Math.floor(bytes.byteLength / 2));
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = view.getInt16(index * 2, true) / 32768;
    }
    const buffer = this.context.createBuffer(1, samples.length, 24_000);
    buffer.copyToChannel(samples, 0);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    source.onended = () => this.sources.delete(source);
    const startAt = Math.max(this.context.currentTime + 0.02, this.playbackAt);
    source.start(startAt);
    this.playbackAt = startAt + buffer.duration;
    this.sources.add(source);
  }
}

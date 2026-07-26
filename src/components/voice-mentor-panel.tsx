"use client";

import { AudioLines, Mic, RefreshCw, Volume2 } from "lucide-react";

import { RecoveryTimeline } from "@/components/recovery-timeline";
import type { RecoveryState } from "@/lib/recovery/reducer";

const statusCopy = {
  permission_required: "Ready for a conversation",
  connecting: "Connecting to Artery…",
  mentor_speaking: "Artery is speaking",
  listening: "I’m listening",
  processing: "Thinking about that…",
  reconnecting: "Reconnecting without losing your progress…",
  fallback: "Switching to tap-to-record",
  ended: "Conversation complete",
} as const;

export function VoiceMentorPanel({
  learnerName,
  onFallback,
  onStart,
  question,
  selectedAnswer,
  stage,
  state,
}: {
  learnerName: string;
  onFallback: () => void;
  onStart: () => void;
  question: string;
  selectedAnswer: string;
  stage: number;
  state: RecoveryState;
}) {
  const active = state.voiceStatus !== "permission_required";
  const listening = state.voiceStatus === "listening";
  const speaking = state.voiceStatus === "mentor_speaking";

  return (
    <main className="mx-auto max-w-6xl px-5 py-8" id="main" tabIndex={-1}>
      <div className="mb-6">
        <p className="text-sm font-medium text-[#8f1838]">
          Artery voice mentor
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Let’s work through it together, {learnerName}
        </h1>
      </div>
      <RecoveryTimeline current={stage} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[20rem_1fr]">
        <aside className="h-fit border border-stone-200 bg-[#f4f0ea] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
            Original question
          </p>
          <h2 className="mt-3 font-semibold leading-6">{question}</h2>
          <p className="mt-5 border-t border-stone-300 pt-4 text-sm text-stone-500">
            Your selected answer
          </p>
          <p className="mt-1 text-sm font-medium text-[#8f1838]">
            {selectedAnswer}
          </p>
        </aside>

        <section className="min-h-[34rem] border border-stone-200 bg-white p-6 sm:p-8">
          <div className="grid justify-items-center text-center">
            <div
              className={`relative grid size-36 place-items-center rounded-full border ${
                listening
                  ? "border-[#8f1838] bg-[#fbf0f2] text-[#8f1838]"
                  : speaking
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-300 bg-stone-50 text-stone-600"
              }`}
            >
              {(listening || speaking) && (
                <span className="absolute inset-3 animate-ping rounded-full border border-current opacity-30 motion-reduce:animate-none" />
              )}
              {listening ? (
                <Mic aria-hidden="true" size={34} />
              ) : speaking ? (
                <Volume2 aria-hidden="true" size={34} />
              ) : state.voiceStatus === "processing" ? (
                <AudioLines aria-hidden="true" size={34} />
              ) : (
                <RefreshCw
                  aria-hidden="true"
                  className={active ? "animate-spin motion-reduce:animate-none" : ""}
                  size={30}
                />
              )}
            </div>
            <p
              aria-live="polite"
              className="mt-5 text-lg font-semibold text-stone-900"
            >
              {statusCopy[state.voiceStatus]}
            </p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-stone-500">
              Speak naturally in Hindi and English. Pause when you finish.
            </p>
            {!active && (
              <button
                className="mt-6 inline-flex items-center gap-2 bg-[#8f1838] px-6 py-3 font-medium text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#8f1838]"
                onClick={onStart}
                type="button"
              >
                <Mic aria-hidden="true" size={18} /> Start conversation
              </button>
            )}
          </div>

          {state.turns.length > 0 && (
            <ol className="mt-8 divide-y divide-stone-200 border-t border-stone-200" role="list">
              {state.turns.map((turn, index) => (
                <li className="py-5" key={`${turn.speaker}-${index}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                      {turn.speaker === "mentor" ? "Artery" : "You"}
                    </p>
                    {turn.interrupted && (
                      <span className="text-xs font-medium text-[#8f1838]">
                        Interrupted
                      </span>
                    )}
                  </div>
                  <p
                    className="mt-2 max-w-2xl leading-7 text-stone-800"
                    lang={turn.speaker === "mentor" ? "hi-IN" : undefined}
                  >
                    {turn.text}
                  </p>
                  {turn.englishSubtitle && (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
                      <strong className="text-stone-700">English subtitle:</strong>{" "}
                      {turn.englishSubtitle}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}

          {state.diagnosis && (
            <details className="mt-5 border-y border-stone-200 py-4">
              <summary className="cursor-pointer font-medium text-stone-700">
                What Artery noticed in the reasoning
              </summary>
              <dl className="mt-4 grid gap-4 text-sm leading-6">
                <div>
                  <dt className="font-medium text-stone-900">
                    What you understood
                  </dt>
                  <dd className="mt-1 text-stone-600">
                    {state.diagnosis.correctReasoningFragment}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-stone-900">
                    Where the connection crossed
                  </dt>
                  <dd className="mt-1 text-stone-600">
                    {state.diagnosis.divergencePoint}
                  </dd>
                </div>
              </dl>
            </details>
          )}

          {active && (
            <button
              className="mt-6 text-sm font-medium text-stone-600 underline underline-offset-4"
              onClick={onFallback}
              type="button"
            >
              Having trouble? Use tap-to-record
            </button>
          )}
        </section>
      </div>
    </main>
  );
}

"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Send,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useReducer, useState } from "react";
import { z } from "zod";

import { ExplanationPlayer } from "@/components/explanation-player";
import { RecoveryTimeline } from "@/components/recovery-timeline";
import { VoiceRecorder } from "@/components/voice-recorder";
import {
  loadActiveSession,
  loadMemory,
  saveWriteback,
} from "@/lib/memory/storage";
import { useClientReady } from "@/lib/memory/use-client-ready";
import {
  initialRecoveryState,
  recoveryReducer,
} from "@/lib/recovery/reducer";
import {
  diagnosisSchema,
  hostRecoveryRequestSchema,
  recallCardSchema,
} from "@/lib/schemas";
import type {
  ConceptPacket,
  RecoveryStage,
  RecoveryWriteback,
} from "@/lib/types";

const sttResponseSchema = z.object({
  transcript: z.string().min(1),
  languageCode: z.string().optional(),
  fallback: z.boolean().optional(),
});
const diagnosisResponseSchema = z.object({
  diagnosis: diagnosisSchema,
  fallback: z.boolean().optional(),
});
const verifyResponseSchema = z.object({
  passed: z.boolean(),
  expectedAnswer: z.string(),
  masteryState: z.enum(["provisionally_repaired", "verification_failed"]),
  recallCard: recallCardSchema.optional(),
});
const writebackResponseSchema = z.object({
  accepted: z.literal(true),
  sessionId: z.string(),
  hostStatus: z.string(),
});

function stageNumber(stage: RecoveryStage) {
  if (["idle", "recording", "transcribing", "transcript_review"].includes(stage)) return 0;
  if (["diagnosing", "clarification_required"].includes(stage)) return 1;
  if (["explaining", "retry_explanation"].includes(stage)) return 2;
  if (["awaiting_verification", "verifying"].includes(stage)) return 3;
  return 4;
}

export function RecoveryFlow({
  fallbackMode,
  packets,
  sessionId,
}: {
  fallbackMode: boolean;
  packets: ConceptPacket[];
  sessionId: string;
}) {
  const [state, dispatch] = useReducer(recoveryReducer, initialRecoveryState);
  const [answer, setAnswer] = useState("");
  const [clarification, setClarification] = useState("");
  const [lastAudio, setLastAudio] = useState<Blob>();
  const isClient = useClientReady();
  const stored = isClient ? loadActiveSession(sessionId) : undefined;
  const learnerName = isClient ? loadMemory().learner.name : "Learner";
  const parsedContext = hostRecoveryRequestSchema.safeParse(stored?.context);
  const activeContext = parsedContext.success ? parsedContext.data : undefined;

  async function transcribe(audio: Blob) {
    if (!activeContext) return;
    setLastAudio(audio);
    dispatch({ type: "START_TRANSCRIPTION" });
    const form = new FormData();
    const extension = audio.type.includes("mp4") ? "m4a" : "webm";
    form.append("audio", audio, `reasoning.${extension}`);
    form.append("conceptPacketId", activeContext.conceptPacketId);
    try {
      const response = await fetch("/api/stt", { method: "POST", body: form });
      const payload = sttResponseSchema.safeParse(await response.json());
      if (!response.ok || !payload.success) throw new Error("Transcription failed.");
      dispatch({ type: "TRANSCRIPT_READY", transcript: payload.data.transcript });
    } catch {
      dispatch({
        type: "ERROR",
        message: "I am not fully sure I heard that phrase correctly. Retry the clip or record again.",
        resumeStage: "transcribing",
      });
    }
  }

  async function diagnose(transcript = state.transcript) {
    if (!activeContext || !transcript.trim()) return;
    dispatch({ type: "START_DIAGNOSIS" });
    try {
      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, learnerName, context: activeContext }),
      });
      const payload = diagnosisResponseSchema.safeParse(await response.json());
      if (!response.ok || !payload.success) throw new Error("Diagnosis failed.");
      dispatch({ type: "DIAGNOSIS_READY", diagnosis: payload.data.diagnosis });
    } catch {
      dispatch({
        type: "ERROR",
        message: "Diagnosis could not finish. Your transcript is safe.",
        resumeStage: "transcript_review",
      });
    }
  }

  async function sendWriteback(writeback: RecoveryWriteback) {
    dispatch({ type: "START_WRITEBACK", writeback });
    try {
      const response = await fetch("/api/writeback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(writeback),
      });
      const payload = writebackResponseSchema.safeParse(await response.json());
      if (!response.ok || !payload.success) throw new Error("Writeback failed.");
      saveWriteback(writeback);
      dispatch({ type: "COMPLETED", writeback });
    } catch {
      dispatch({
        type: "ERROR",
        message: "Recovery is complete locally, but host write-back failed. Retry safely.",
        resumeStage: "writing_back",
      });
    }
  }

  async function verify() {
    if (!activeContext || !state.diagnosis || !answer) return;
    dispatch({ type: "START_VERIFICATION" });
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          conceptPacketId: activeContext.conceptPacketId,
          answer,
          successfulReviews: 0,
        }),
      });
      const payload = verifyResponseSchema.safeParse(await response.json());
      if (!response.ok || !payload.success) throw new Error("Verification failed.");

      if (!payload.data.passed && state.verificationAttempts === 0) {
        setAnswer("");
        return dispatch({ type: "VERIFICATION_FAILED" });
      }

      const passed = payload.data.passed;
      if (passed) dispatch({ type: "REPAIRED" });
      const writeback: RecoveryWriteback = {
        sessionId,
        learnerId: activeContext.learnerId,
        conceptId: activeContext.conceptPacketId,
        misconceptionId: state.diagnosis.misconceptionId,
        diagnosis: state.diagnosis.divergencePoint,
        evidence: state.diagnosis.studentEvidence,
        verificationStatus: passed ? "passed" : "failed",
        masteryState: passed ? "provisionally_repaired" : "verification_failed",
        recallCard: payload.data.recallCard,
        completedAt: new Date().toISOString(),
      };
      await sendWriteback(writeback);
    } catch {
      dispatch({
        type: "ERROR",
        message: "Verification could not finish. Your diagnosis is safe.",
        resumeStage: "awaiting_verification",
      });
    }
  }

  function retry() {
    if (state.resumeStage === "transcribing" && lastAudio) return void transcribe(lastAudio);
    if (state.resumeStage === "writing_back" && state.writeback) {
      return void sendWriteback(state.writeback);
    }
    dispatch({ type: "RESUME" });
  }

  if (!isClient) {
    return <main className="mx-auto max-w-6xl px-5 py-12" id="main"><p>Loading recovery session…</p></main>;
  }

  const packet = packets.find(({ id }) => id === activeContext?.conceptPacketId);

  if (!activeContext || !packet) {
    return (
      <main className="mx-auto max-w-xl px-5 py-20 text-center" id="main" tabIndex={-1}>
        <TriangleAlert aria-hidden="true" className="mx-auto text-[#8f1838]" />
        <h1 className="mt-4 text-2xl font-semibold">Recovery session not found</h1>
        <p className="mt-3 text-stone-600">Start from the host platform so Artery receives the learning context.</p>
        <Link className="mt-6 inline-flex items-center gap-2 text-[#8f1838] underline" href="/platform">
          <ArrowLeft aria-hidden="true" size={17} /> Return to platform
        </Link>
      </main>
    );
  }

  const selectedText = activeContext.options.find(({ id }) => id === activeContext.learnerAnswer)?.text;

  return (
    <main className="mx-auto max-w-6xl px-5 py-8" id="main" tabIndex={-1}>
      {fallbackMode && (
        <div className="mb-5 border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950" role="status">
          Demo fallback mode — transcript and diagnosis are cached, not live.
        </div>
      )}
      <div className="mb-6">
        <p className="text-sm font-medium text-[#8f1838]">Artery recovery session</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Let’s trace the reasoning, {learnerName}
        </h1>
      </div>
      <RecoveryTimeline current={stageNumber(state.stage)} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[20rem_1fr]">
        <aside className="h-fit border border-stone-200 bg-[#f4f0ea] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Original question</p>
          <h2 className="mt-3 font-semibold leading-6">{activeContext.question}</h2>
          <dl className="mt-5 border-t border-stone-300 pt-4 text-sm">
            <dt className="text-stone-500">Your selected answer</dt>
            <dd className="mt-1 font-medium text-[#8f1838]">{activeContext.learnerAnswer}. {selectedText}</dd>
          </dl>
        </aside>

        <section className="min-h-[28rem] border border-stone-200 bg-white p-6 sm:p-8" aria-live="polite">
          {(state.stage === "idle" || state.stage === "recording") && (
            <>
              <p className="text-sm font-semibold text-[#8f1838]">Stage 1 · Listen</p>
              <h2 className="mt-2 text-2xl font-semibold">
                {learnerName}, what made that answer feel right?
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-stone-600">
                Tell me what you remembered and how you connected it. Hesitation,
                Hindi-English switching, and self-correction are all fine.
              </p>
              <div className="mt-8">
                <VoiceRecorder
                  fallbackMode={fallbackMode}
                  onAudio={transcribe}
                  onRecording={() => dispatch({ type: "START_RECORDING" })}
                />
              </div>
            </>
          )}

          {state.stage === "transcribing" && <Progress title="Listening closely…" copy="Turning the recording into a full Hindi-English transcript." />}

          {state.stage === "transcript_review" && (
            <>
              <p className="text-sm font-semibold text-[#8f1838]">Transcript review</p>
              <h2 className="mt-2 text-2xl font-semibold">Check what Artery heard</h2>
              <label className="mt-6 block font-medium" htmlFor="transcript">Full transcript</label>
              <textarea
                className="mt-2 min-h-36 w-full border border-stone-300 p-4 leading-7"
                id="transcript"
                onChange={(event) => dispatch({ type: "EDIT_TRANSCRIPT", transcript: event.target.value })}
                value={state.transcript}
              />
              <p className="mt-2 text-sm text-stone-500">Edit any phrase that was unclear before diagnosis.</p>
              <button className="mt-5 inline-flex items-center gap-2 bg-[#8f1838] px-5 py-3 font-medium text-white" onClick={() => diagnose()} type="button">
                Diagnose reasoning <ArrowRight aria-hidden="true" size={18} />
              </button>
            </>
          )}

          {state.stage === "diagnosing" && <Progress title="Tracing the divergence…" copy="Comparing the learner’s words with the bounded concept packet." />}

          {state.stage === "clarification_required" && state.diagnosis && (
            <>
              <p className="text-sm font-semibold text-[#8f1838]">Focused clarification</p>
              <h2 className="mt-2 text-2xl font-semibold">{state.diagnosis.clarifyingQuestion}</h2>
              <label className="mt-6 block font-medium" htmlFor="clarification">Your clarification</label>
              <textarea className="mt-2 min-h-28 w-full border border-stone-300 p-4" id="clarification" onChange={(event) => setClarification(event.target.value)} value={clarification} />
              <button
                className="mt-5 bg-[#8f1838] px-5 py-3 font-medium text-white disabled:opacity-50"
                disabled={!clarification.trim()}
                onClick={() => {
                  const updated = `${state.transcript}\nClarification: ${clarification}`;
                  dispatch({ type: "EDIT_TRANSCRIPT", transcript: updated });
                  void diagnose(updated);
                }}
                type="button"
              >
                Continue diagnosis
              </button>
            </>
          )}

          {state.stage === "explaining" && state.diagnosis && (
            <DiagnosisAndExplanation
              diagnosis={state.diagnosis}
              learnerName={learnerName}
              onContinue={() => dispatch({ type: "AWAIT_VERIFICATION" })}
              transcript={state.transcript}
            />
          )}

          {state.stage === "retry_explanation" && state.diagnosis && (
            <>
              <p className="text-sm font-semibold text-[#8f1838]">One simpler distinction</p>
              <h2 className="mt-2 text-2xl font-semibold">Try the contrast once more</h2>
              <p className="mt-5 border-l-4 border-[#8f1838] bg-[#fbf0f2] p-4 leading-7">
                {state.diagnosis.memoryUpdates.latestCorrection}
              </p>
              <button className="mt-5 bg-[#8f1838] px-5 py-3 font-medium text-white" onClick={() => dispatch({ type: "AWAIT_VERIFICATION" })} type="button">
                Final verification attempt
              </button>
            </>
          )}

          {(state.stage === "awaiting_verification" || state.stage === "verifying") && state.diagnosis && (
            <>
              <p className="text-sm font-semibold text-[#8f1838]">Stage 4 · Verify</p>
              <h2 className="mt-2 text-2xl font-semibold">{state.diagnosis.verificationQuestion}</h2>
              <fieldset className="mt-6" disabled={state.stage === "verifying"}>
                <legend className="sr-only">Choose a transfer answer</legend>
                <div className="grid gap-3">
                  {packet.transferQuestion.options.map((option) => (
                    <label className="flex cursor-pointer gap-3 border border-stone-200 p-4 has-[:checked]:border-[#8f1838] has-[:checked]:bg-[#fbf0f2]" key={option.id}>
                      <input checked={answer === option.id} name="verification" onChange={() => setAnswer(option.id)} type="radio" />
                      <span><strong className="mr-2">{option.id}.</strong>{option.text}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button className="mt-5 inline-flex items-center gap-2 bg-[#8f1838] px-5 py-3 font-medium text-white disabled:opacity-50" disabled={!answer || state.stage === "verifying"} onClick={verify} type="button">
                {state.stage === "verifying" ? "Checking…" : "Check understanding"}
              </button>
            </>
          )}

          {(state.stage === "repaired" || state.stage === "writing_back") && (
            <Progress title="Understanding verified" copy="Creating the recall card and sending the mastery update to the host platform." />
          )}

          {state.stage === "completed" && state.writeback && (
            <Completed writeback={state.writeback} />
          )}

          {state.stage === "recoverable_error" && (
            <>
              <TriangleAlert aria-hidden="true" className="text-[#8f1838]" />
              <h2 className="mt-3 text-2xl font-semibold">This step needs another try</h2>
              <p className="mt-3 text-stone-600">{state.error}</p>
              <button className="mt-5 inline-flex items-center gap-2 bg-[#8f1838] px-5 py-3 font-medium text-white" onClick={retry} type="button">
                <RefreshCw aria-hidden="true" size={17} /> Retry
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Progress({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="grid min-h-72 place-content-center text-center">
      <RefreshCw aria-hidden="true" className="mx-auto animate-spin text-[#8f1838]" />
      <h2 className="mt-4 text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-stone-600">{copy}</p>
    </div>
  );
}

function DiagnosisAndExplanation({
  diagnosis,
  learnerName,
  onContinue,
  transcript,
}: {
  diagnosis: z.infer<typeof diagnosisSchema>;
  learnerName: string;
  onContinue: () => void;
  transcript: string;
}) {
  return (
    <>
      <p className="text-sm font-semibold text-[#8f1838]">Stages 2–3 · Diagnose and repair</p>
      <h2 className="mt-2 max-w-2xl text-2xl font-semibold">
        {learnerName}, you had the right fact. One connection got crossed.
      </h2>

      <div className="mt-6 border-l-4 border-stone-300 pl-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
          You were right about
        </p>
        <p className="mt-2 leading-7 text-stone-700">
          {diagnosis.correctReasoningFragment}
        </p>
      </div>

      <div className="mt-5 border border-[#d9a6b3] bg-[#fbf0f2] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f1838]">
          The one switch
        </p>
        <p className="mt-2 leading-7 text-stone-800">{diagnosis.divergencePoint}</p>
      </div>

      <div className="mt-5 bg-stone-900 p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
          Artery’s reply to {learnerName}
        </p>
        <h3 className="mt-2 text-lg font-semibold">Listen to the distinction</h3>
        <ExplanationPlayer text={diagnosis.spokenExplanation} />
        <p className="mt-4 max-w-2xl leading-7" lang="hi-IN">
          {diagnosis.spokenExplanation}
        </p>
        <p className="mt-4 max-w-2xl border-t border-stone-700 pt-4 text-sm leading-6 text-stone-300">
          <strong className="text-white">English subtitle</strong><br />
          {diagnosis.englishSubtitle}
        </p>
      </div>

      <details className="mt-5 border-y border-stone-200 py-4">
        <summary className="cursor-pointer font-medium text-stone-700">
          See what I heard in your reasoning
        </summary>
        <div className="mt-4 space-y-4 text-sm leading-6 text-stone-600">
          <div>
            <p className="font-medium text-stone-800">Your full transcript</p>
            <p className="mt-1">{transcript}</p>
          </div>
          <div>
            <p className="font-medium text-stone-800">Evidence used</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {diagnosis.studentEvidence.map((evidence) => (
                <li key={evidence}>“{evidence}”</li>
              ))}
            </ul>
          </div>
        </div>
      </details>

      <p className="mt-5 font-medium">Ready to try the idea in a new situation?</p>
      <button className="mt-3 inline-flex items-center gap-2 bg-[#8f1838] px-5 py-3 font-medium text-white" onClick={onContinue} type="button">
        Give me a quick check <ArrowRight aria-hidden="true" size={18} />
      </button>
    </>
  );
}

function Completed({ writeback }: { writeback: RecoveryWriteback }) {
  return (
    <>
      <CheckCircle2 aria-hidden="true" className="text-[#8f1838]" size={30} />
      <p className="mt-4 text-sm font-semibold text-[#8f1838]">Stage 5 · Remember</p>
      <h2 className="mt-2 text-2xl font-semibold">
        {writeback.verificationStatus === "passed" ? "Provisionally repaired — review scheduled" : "Verification needs another session"}
      </h2>
      {writeback.recallCard && (
        <div className="mt-6 border border-stone-200 bg-[#f4f0ea] p-5">
          <h3 className="font-semibold">Recall card</h3>
          <p className="mt-3">{writeback.recallCard.front}</p>
          <p className="mt-3 border-t border-stone-300 pt-3 text-stone-600">{writeback.recallCard.back}</p>
          <p className="mt-4 text-sm font-medium text-[#8f1838]">
            Next review: {new Date(writeback.recallCard.nextReviewAt).toLocaleDateString("en-IN")}
          </p>
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="inline-flex items-center gap-2 bg-[#8f1838] px-5 py-3 font-medium text-white" href="/platform">
          <Send aria-hidden="true" size={17} /> View host write-back
        </Link>
        <Link className="inline-flex items-center gap-2 border border-stone-300 px-5 py-3 font-medium" href="/history">
          View learner history
        </Link>
      </div>
    </>
  );
}

"use client";

import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { loadMemory, saveActiveSession } from "@/lib/memory/storage";
import { useClientReady } from "@/lib/memory/use-client-ready";
import { hostRecoveryRequestSchema } from "@/lib/schemas";
import type { ConceptPacket } from "@/lib/types";

const sessionResponseSchema = z.strictObject({
  sessionId: z.string(),
  context: hostRecoveryRequestSchema,
  status: z.literal("created"),
});

export function PlatformClient({ packet }: { packet: ConceptPacket }) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("Unassessed");
  const [message, setMessage] = useState("");
  const [isInvoking, setIsInvoking] = useState(false);
  const isClient = useClientReady();
  const persistedStatus = isClient
    ? loadMemory().completedSessions
      .filter(({ conceptId }) => conceptId === packet.id)
      .at(-1)?.masteryState
    : undefined;
  const displayedStatus =
    status === "Unassessed" && persistedStatus === "provisionally_repaired"
      ? "Provisionally repaired — review scheduled"
      : status;

  async function submitAnswer(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    if (!answer) return setMessage("Choose an answer first.");
    if (answer === packet.correctOption) {
      setStatus("Correct");
      return setMessage("Correct — Artery is only invoked after an incorrect answer.");
    }

    setStatus("Incorrect");
    setIsInvoking(true);
    setMessage("The host platform is invoking Artery because the answer was incorrect.");

    const memory = loadMemory();
    const context = {
      learnerId: memory.learner.id,
      contentId: "neet-biology-cell-01",
      subject: "Biology",
      chapter: "Cell — The Unit of Life",
      question: packet.question,
      options: packet.options,
      learnerAnswer: answer,
      correctAnswer: packet.correctOption,
      preferredLanguage: "hi-IN" as const,
      conceptPacketId: packet.id,
      priorContext: memory.completedSessions.slice(-3).map((item) => ({
        conceptId: item.conceptId,
        misconceptionId: item.misconceptionId,
        masteryState: item.masteryState,
        latestCorrection: item.recallCard?.back,
      })),
    };

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });
      const payload = sessionResponseSchema.safeParse(await response.json());
      if (!response.ok || !payload.success) throw new Error("Session creation failed.");
      saveActiveSession(payload.data.sessionId, payload.data.context);
      router.push(`/recovery/${payload.data.sessionId}`);
    } catch {
      setIsInvoking(false);
      setMessage("Artery could not start. Your selected answer is still here; try again.");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10" id="main" tabIndex={-1}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <p className="text-sm font-medium text-stone-500">Mock host platform</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Northstar NEET</h1>
        </div>
        <dl className="flex gap-8 text-sm">
          <div><dt className="text-stone-500">Learner</dt><dd className="font-medium">Ananya</dd></div>
          <div><dt className="text-stone-500">Course</dt><dd className="font-medium">NEET Biology</dd></div>
        </dl>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
        <form className="border border-stone-200 bg-white p-6 sm:p-8" onSubmit={submitAnswer}>
          <div className="mb-5 flex items-center gap-2 text-sm font-medium text-[#8f1838]">
            <BookOpen aria-hidden="true" size={17} />
            Cell Biology · Question 07
          </div>
          <fieldset disabled={isInvoking}>
            <legend className="text-xl font-semibold leading-8 text-stone-900">
              {packet.question}
            </legend>
            <div className="mt-6 grid gap-3">
              {packet.options.map((option) => (
                <label
                  className="flex cursor-pointer items-start gap-3 border border-stone-200 p-4 has-[:checked]:border-[#8f1838] has-[:checked]:bg-[#fbf0f2]"
                  key={option.id}
                >
                  <input
                    checked={answer === option.id}
                    className="mt-1 size-4"
                    name="answer"
                    onChange={() => setAnswer(option.id)}
                    type="radio"
                    value={option.id}
                  />
                  <span><strong className="mr-2">{option.id}.</strong>{option.text}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div aria-live="polite" className="mt-5 min-h-6 text-sm text-stone-600">{message}</div>
          <button
            className="mt-3 inline-flex items-center gap-2 bg-[#8f1838] px-5 py-3 font-medium text-white disabled:opacity-60"
            disabled={isInvoking}
            type="submit"
          >
            {isInvoking ? "Invoking Artery…" : "Submit answer"}
            {!isInvoking && <ArrowRight aria-hidden="true" size={18} />}
          </button>
        </form>

        <aside className="h-fit border border-stone-200 bg-[#f4f0ea] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Concept progress</p>
          <h2 className="mt-3 font-semibold">{packet.concept}</h2>
          <div className="mt-5 flex items-start gap-3 border-t border-stone-300 pt-4">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 text-[#8f1838]" size={18} />
            <div>
              <p className="text-sm text-stone-500">Mastery status</p>
              <p className="mt-1 text-sm font-medium">{displayedStatus}</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

"use client";

import { ArrowRight, CalendarClock, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useReducer } from "react";

import {
  loadMemory,
  resetMemory,
} from "@/lib/memory/storage";
import { useClientReady } from "@/lib/memory/use-client-ready";

export function HistoryClient() {
  const isClient = useClientReady();
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const memory = isClient ? loadMemory() : undefined;

  if (!memory) {
    return <main className="mx-auto max-w-6xl px-5 py-12" id="main"><p>Loading learner history…</p></main>;
  }

  const latest = memory.completedSessions.at(-1);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10" id="main" tabIndex={-1}>
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-stone-200 pb-7">
        <div>
          <p className="text-sm font-medium text-[#8f1838]">Returning learner</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{memory.learner.name}’s learning memory</h1>
          <p className="mt-2 text-stone-600">Preferred language: Hindi-English · Scientific terms in English</p>
        </div>
        <button
          className="inline-flex items-center gap-2 border border-stone-300 bg-white px-4 py-2 text-sm font-medium"
          onClick={() => {
            if (!window.confirm("Reset all local Artery demo memory?")) return;
            resetMemory();
            refresh();
          }}
          type="button"
        >
          <RotateCcw aria-hidden="true" size={16} /> Reset demo
        </button>
      </div>

      {latest ? (
        <>
          <section className="mt-8 grid gap-5 md:grid-cols-3">
            <div className="border border-stone-200 bg-white p-5">
              <h2 className="text-sm font-medium text-stone-500">Latest mastery</h2>
              <p className="mt-3 font-semibold">{latest.masteryState.replaceAll("_", " ")}</p>
            </div>
            <div className="border border-stone-200 bg-white p-5">
              <h2 className="text-sm font-medium text-stone-500">Previous misconception</h2>
              <p className="mt-3 font-semibold">{latest.misconceptionId.replaceAll("_", " ")}</p>
            </div>
            <div className="border border-stone-200 bg-white p-5">
              <h2 className="text-sm font-medium text-stone-500">Next review</h2>
              <p className="mt-3 flex items-center gap-2 font-semibold">
                <CalendarClock aria-hidden="true" className="text-[#8f1838]" size={18} />
                {latest.recallCard
                  ? new Date(latest.recallCard.nextReviewAt).toLocaleDateString("en-IN")
                  : "Not scheduled"}
              </p>
            </div>
          </section>

          <section className="mt-8 border border-stone-200 bg-white">
            <div className="border-b border-stone-200 px-6 py-4">
              <h2 className="text-lg font-semibold">Misconception history</h2>
            </div>
            <ul className="divide-y divide-stone-100" role="list">
              {[...memory.completedSessions].reverse().map((item) => (
                <li className="grid gap-3 px-6 py-5 sm:grid-cols-[1fr_auto]" key={item.sessionId}>
                  <div>
                    <p className="font-medium">{item.conceptId.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-sm text-stone-600">{item.diagnosis}</p>
                  </div>
                  <span className="h-fit bg-[#f6e9ec] px-3 py-1 text-xs font-semibold text-[#8f1838]">
                    {item.masteryState.replaceAll("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <Link className="mt-7 inline-flex items-center gap-2 bg-[#8f1838] px-5 py-3 font-medium text-white" href="/platform">
            Begin targeted review <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </>
      ) : (
        <section className="mt-12 border border-dashed border-stone-300 p-10 text-center">
          <h2 className="text-xl font-semibold">No recovery history yet</h2>
          <p className="mt-2 text-stone-600">Complete one misconception-recovery session to prove continuity.</p>
          <Link className="mt-6 inline-flex items-center gap-2 text-[#8f1838] underline" href="/platform">
            Start on the host platform <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </section>
      )}
    </main>
  );
}

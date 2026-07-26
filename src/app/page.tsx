import { ArrowRight, Mic2, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";

const steps = [
  { icon: Mic2, title: "Listen", copy: "Capture natural code-mixed reasoning." },
  { icon: ShieldCheck, title: "Diagnose", copy: "Bound diagnosis to verified concept packets." },
  { icon: RefreshCw, title: "Remember", copy: "Verify, schedule recall, and write back." },
];

export default function Home() {
  return (
    <main id="main" tabIndex={-1}>
      <section className="mx-auto grid min-h-[calc(100vh-65px)] max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#8f1838]">
            Voice experience · NEET Biology
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.045em] text-stone-900 sm:text-6xl">
            Trace where the reasoning broke. Restore conceptual flow.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600">
            Artery listens to a learner’s Hindi-English explanation, identifies
            the precise misconception, repairs it bilingually, verifies transfer,
            and writes the new mastery state back.
          </p>
          <Link
            className="mt-9 inline-flex items-center gap-2 bg-[#8f1838] px-5 py-3 font-medium text-white hover:bg-[#6e1029]"
            href="/platform"
          >
            Open platform demo <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
        <ol className="border border-stone-200 bg-white p-7 shadow-[0_18px_50px_rgba(54,42,37,0.08)]" role="list">
          {steps.map(({ icon: Icon, title, copy }, index) => (
            <li className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-stone-100 py-5 last:border-0" key={title}>
              <span className="grid size-10 place-items-center bg-[#f6e9ec] text-[#8f1838]">
                <Icon aria-hidden="true" size={19} />
              </span>
              <div>
                <p className="font-semibold">{index + 1}. {title}</p>
                <p className="mt-1 text-sm leading-6 text-stone-600">{copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

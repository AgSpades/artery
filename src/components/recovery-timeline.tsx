import { Check } from "lucide-react";

const stages = ["Listen", "Diagnose", "Repair", "Verify", "Remember"];

export function RecoveryTimeline({ current }: { current: number }) {
  return (
    <div className="border-y border-stone-200 bg-white">
      <ol className="grid grid-cols-5" aria-label="Recovery progress">
        {stages.map((stage, index) => (
          <li className="relative px-1 py-4 text-center sm:px-2" key={stage}>
            <span
              aria-current={index === current ? "step" : undefined}
              aria-label={`${index + 1}. ${stage}`}
              className={`mx-auto grid size-7 place-items-center border text-xs font-semibold ${
                index < current
                  ? "border-[#8f1838] bg-[#8f1838] text-white"
                  : index === current
                    ? "border-[#8f1838] text-[#8f1838]"
                    : "border-stone-300 text-stone-400"
              }`}
            >
              {index < current ? <Check aria-hidden="true" size={14} /> : index + 1}
            </span>
            <span className={`mt-2 hidden text-sm sm:block ${index === current ? "font-semibold" : "text-stone-500"}`}>
              {stage}
            </span>
          </li>
        ))}
      </ol>
      <p className="pb-3 text-center text-xs font-semibold text-[#8f1838] sm:hidden">
        {current + 1} of {stages.length} · {stages[current]}
      </p>
    </div>
  );
}

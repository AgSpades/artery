import { Check } from "lucide-react";

const stages = ["Listen", "Diagnose", "Repair", "Verify", "Remember"];

export function RecoveryTimeline({ current }: { current: number }) {
  return (
    <ol className="grid grid-cols-5 border-y border-stone-200 bg-white" aria-label="Recovery progress">
      {stages.map((stage, index) => (
        <li className="relative px-2 py-4 text-center" key={stage}>
          <span
            aria-current={index === current ? "step" : undefined}
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
          <span className={`mt-2 block text-xs sm:text-sm ${index === current ? "font-semibold" : "text-stone-500"}`}>
            {stage}
          </span>
        </li>
      ))}
    </ol>
  );
}

import { Activity } from "lucide-react";
import Link from "next/link";

export function ArteryHeader() {
  return (
    <header className="border-b border-stone-200 bg-[#fbf8f3]">
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link className="flex items-center gap-2 font-semibold tracking-tight" href="/">
          <span className="grid size-8 place-items-center bg-[#8f1838] text-white">
            <Activity aria-hidden="true" size={18} />
          </span>
          Artery
        </Link>
        <nav aria-label="Primary">
          <ul className="flex items-center gap-5 text-sm text-stone-600" role="list">
            <li><Link href="/platform">Platform demo</Link></li>
            <li><Link href="/history">Learner history</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

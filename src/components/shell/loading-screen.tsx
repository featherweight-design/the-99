import { Crown } from "../ui/crown";
import type { LoadingCopy } from "../../lib/copy/shell";

/**
 * The one loading skeleton, parameterised by copy. Each route segment owns a
 * loading.tsx that picks its own entry from shellCopy.loading — the markup is
 * shared so the eight segments can't drift apart visually.
 */
export function LoadingScreen({ copy }: { copy: LoadingCopy }) {
  return (
    <div
      role="status"
      className="flex flex-1 flex-col items-center justify-center text-center p-[40px] min-h-[420px] md:min-h-[520px] bg-[color:var(--bg)] bg-[radial-gradient(560px_320px_at_50%_68%,color-mix(in_oklab,var(--accent)_8%,transparent),transparent_70%)]"
    >
      <Crown tone="page" pulse />
      <h1
        className="font-display font-bold text-[19px] md:text-[22px] mt-[24px] mb-0"
        style={{ color: "var(--fg)" }}
      >
        {copy.heading}
      </h1>
      <p className="font-mono text-[12px] md:text-[13px] mt-[8px] mb-0" style={{ color: "var(--fg-faint)" }}>
        {copy.status}
      </p>
      <p
        className="text-[13.5px] md:text-[15px] max-w-[380px] mt-[10px] mb-0 leading-[1.6]"
        style={{ color: "var(--fg-body)" }}
      >
        {copy.caption}
      </p>
    </div>
  );
}

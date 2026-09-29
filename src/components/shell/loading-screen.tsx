import { Crown } from "../ui/crown";
import type { LoadingCopy } from "../../lib/copy/shell";

/**
 * The one loading skeleton, parameterised by copy. The shell draws it for every
 * route but four (`ShellLoading` on a direct load, the pending overlay on a slow
 * press), and those four deck routes draw it from their own loading.tsx — the
 * markup is shared so no route's screen can drift apart visually.
 *
 * `still` is for a segment whose design forbids motion — the version rail, where
 * READINESS 19 allows the commit sheet's open and close and nothing else. The
 * same screen with the crown's pulse off, rather than a second skeleton: a
 * boundary that looked different from its siblings would read as a different
 * app, not as a quieter one.
 */
export function LoadingScreen({ copy, still = false }: { copy: LoadingCopy; still?: boolean }) {
  return (
    <div
      role="status"
      className="flex flex-1 flex-col items-center justify-center text-center p-[40px] min-h-[420px] md:min-h-[520px] bg-[color:var(--bg)] bg-[radial-gradient(560px_320px_at_50%_68%,color-mix(in_oklab,var(--accent)_8%,transparent),transparent_70%)]"
    >
      <Crown tone="page" pulse={!still} />
      <h1
        className="font-display font-bold text-[19px] md:text-[22px] mt-[24px] mb-0"
        style={{ color: "var(--fg)" }}
      >
        {copy.heading}
      </h1>
      <p className="font-mono text-[12px] md:text-[13px] mt-[8px] mb-0" style={{ color: "var(--fg-faint)" }}>
        {copy.status}
      </p>
    </div>
  );
}

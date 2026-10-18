import type { ReactNode } from "react";

import { shellCopy } from "../../lib/copy/shell";

/**
 * The not-found page's body: the numeral, the heading, the caption and a row for its ways out, which the caller supplies.
 * Drawn by the app's own not-found (`Back home` and `View decks`) and by the public pages' (C3: `Back home` alone, since
 * `View decks` leads behind sign-in), so the two cannot drift apart.
 */
export function NotFoundView({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center p-[40px] flex-1 min-h-[400px] md:min-h-[480px] bg-[color:var(--bg)] bg-[radial-gradient(520px_300px_at_50%_70%,color-mix(in_oklab,var(--accent)_7%,transparent),transparent_70%)]"
    >
      <span
        aria-hidden="true"
        className="font-display leading-none text-[48px] md:text-[64px] mb-[2px]"
        style={{ fontWeight: 900, color: "var(--elevated)", letterSpacing: "0.04em" }}
      >
        {shellCopy.notFound.numeral}
      </span>
      {/* No crown here: decision 7 makes the numeral itself the mark, so a
          second one would be one too many. */}
      <h1 className="font-display font-bold text-[21px] md:text-[24px] m-0" style={{ color: "var(--fg)" }}>
        {shellCopy.notFound.heading}
      </h1>
      <p
        className="text-[13.5px] md:text-[15px] max-w-[380px] mt-[10px] mb-0 leading-[1.6]"
        style={{ color: "var(--fg-body)" }}
      >
        {shellCopy.notFound.caption}
      </p>
      <div className="flex flex-col md:flex-row gap-[12px] mt-[24px]">{children}</div>
    </div>
  );
}

/** The size both not-found pages give their buttons. */
export const NOT_FOUND_ACTION = "text-[13px] md:text-[14px] px-[22px] py-[12px]";

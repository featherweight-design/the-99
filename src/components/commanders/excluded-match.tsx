"use client";

// The excluded-match aside (§2c). One sentence above a live list, saying that a
// match exists that the reader cannot see, and offering the one control that
// would bring it back.
//
// `role="status"`: it appears in response to typing, above content the reader is
// already reading, so it is announced rather than found. Not `alert` — nothing
// went wrong.

import type { ExcludedReport } from "../../lib/commanders/excluded-report";
import { Emphasised } from "./emphasis";

export function ExcludedMatchAside({
  report,
  onCorrect,
}: {
  report: ExcludedReport;
  onCorrect: () => void;
}) {
  return (
    <div
      role="status"
      className="rounded-lg p-[12px_14px] bg-[color:var(--surface)] [border:1px_solid_var(--border-strong)] [border-left:2px_solid_var(--accent)]"
    >
      {/* The correction wraps to its own line on the phone rather than shrinking:
          it carries the identity clause in full, because that clause is the
          reason the row is missing and a sentence naming a control without a
          cause is one the reader has to take on trust. */}
      <p className="m-0 flex flex-wrap items-baseline gap-[4px] text-[12.5px] leading-[1.6] text-[color:var(--fg-muted)]">
        {/* The name is the sentence's one marked phrase, and it is found inside
            the finished sentence rather than composed around it. */}
        <Emphasised
          text={report.body}
          values={report.name ? [report.name] : []}
          color="var(--fg)"
        />
        <button
          type="button"
          onClick={onCorrect}
          className="font-mono text-[11.5px] cursor-pointer bg-transparent border-0 p-0 text-[color:var(--accent)] hover:underline"
        >
          {report.cta}
        </button>
      </p>
    </div>
  );
}

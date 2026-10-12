"use client";

// The excluded-match aside (§2c). One sentence above a live list, saying that a
// match exists that the reader cannot see, and offering the one control that
// would bring it back.
//
// `role="status"`: it appears in response to typing, above content the reader is
// already reading, so it is announced rather than found. Not `alert` — nothing
// went wrong.

import Link from "next/link";
import type { ExcludedReport } from "../../lib/commanders/excluded-report";
import { Emphasised } from "./emphasis";
import { PendingReporter } from "../shell/pending-reporter";

const CORRECTION =
  "font-mono text-[11.5px] cursor-pointer bg-transparent border-0 p-0 text-[color:var(--accent)] hover:underline transition-colors";

/**
 * `href` is the correction for the one cause this lane cannot undo in place:
 * the commander is already built, and the list that shows it is another route.
 * A route is a link, so it middle-clicks and opens in a new tab like any other.
 */
export function ExcludedMatchAside({
  report,
  onCorrect,
  href,
}: {
  report: ExcludedReport;
  onCorrect: () => void;
  href?: string;
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
        {href ? (
          <Link href={href} className={CORRECTION}>
            {report.cta}
            <PendingReporter href={href} />
          </Link>
        ) : (
          <button type="button" onClick={onCorrect} className={CORRECTION}>
            {report.cta}
          </button>
        )}
      </p>
    </div>
  );
}

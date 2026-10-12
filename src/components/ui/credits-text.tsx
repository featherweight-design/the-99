import Link from "next/link";
import { Fragment } from "react";

import { CREDITS_HREF, creditsCopy } from "../../lib/copy/credits";
import { PendingReporter } from "../shell/pending-reporter";

/**
 * A credit line as text, with `What uses credits?` drawn as a link to the About `credits` entry
 * (Hugh, 2026-10-12: link, never list). Every surface that draws `creditsCopy.spent` or `paused`, or
 * a line built around them, renders it through here, so the phrase is a link wherever it appears and
 * nothing else in the line changes. A line without the phrase renders as it is.
 *
 * The link inherits the line's size and face; it takes `--accent` with a `--accent-shadow` rule, as
 * the handoff draws it (find-a-deck-read design table, "Credits link (R2)").
 */
export function CreditsText({ text }: { text: string }) {
  const parts = text.split(creditsCopy.link);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 ? (
            <Link
              href={CREDITS_HREF}
              className="text-[color:var(--accent)] underline decoration-[color:var(--accent-shadow)] underline-offset-2"
            >
              {creditsCopy.link}
              <PendingReporter href={CREDITS_HREF} />
            </Link>
          ) : null}
        </Fragment>
      ))}
    </>
  );
}

"use client";

import Link from "next/link";
import { Fragment } from "react";

import { CREDITS_HREF, creditsCopy } from "../../lib/copy/credits";
import { PendingReporter } from "../shell/pending-reporter";
import { useHydrated } from "./hydrated-art";

/**
 * A credit line as text, with `What uses credits?` drawn as a link to the About `credits` entry
 * (Hugh, 2026-10-12: link, never list). Every surface that draws `creditsCopy.spent`, or
 * a line built around them, renders it through here, so the phrase is a link wherever it appears and
 * nothing else in the line changes. A line without the phrase renders as it is.
 *
 * The link inherits the line's size and face; it takes `--accent` with a `--accent-shadow` rule, as
 * the handoff draws it (find-a-deck-read design table, "Credits link (R2)").
 */
export function CreditsText({ text }: { text: string }) {
  const { rest, more } = splitGetMore(text);
  if (!more) return <Phrases text={text} />;
  return (
    <>
      <Phrases text={rest} />
      <GetMoreLink />
    </>
  );
}

/** `Get more credits` (L4) is its own line under the spent line: the model appends it after a line break. A surface that
 *  draws it somewhere other than under the line (Help me choose's phone, R3 item 10) splits it off here. */
export function splitGetMore(text: string): { rest: string; more: boolean } {
  const more = `\n${creditsCopy.getMore}`;
  return text.endsWith(more) ? { rest: text.slice(0, -more.length), more: true } : { rest: text, more: false };
}

export function GetMoreLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href={BUY_HREF}
      className={`mt-[2px] flex min-h-[44px] w-fit items-center gap-[7px] font-sans text-[13px] font-semibold text-[color:var(--accent-text)] md:min-h-[32px] ${className}`}
    >
      {creditsCopy.getMore}<span aria-hidden="true" className="text-[10px]">→</span>
      <PendingReporter href={BUY_HREF} />
    </Link>
  );
}

/** Where `Get more credits` leads. Exported for a surface that draws the link in its own row (SC-Cost C). */
export const BUY_HREF = "/credits";

/**
 * L7: an expiry at the end of the line, in `--warning` (the words carry it; the colour only agrees). Two can stand on
 * one line (G5: the welcome lot's, then a cancelled plan's), so the welcome tail is taken out first. Its date is the
 * reader's own day (G4), formatted by the client render that built the line, so the whole tail, its ` · ` included, is
 * held back until hydration: the server's render and the hydrating one both draw nothing there, and the render after it
 * draws the reader's date, the way the /credits Free cell draws its reset time.
 */
function Expiring({ text }: { text: string }) {
  const w = creditsCopy.welcomeExpiringPattern.exec(text);
  if (w) {
    return (
      <>
        <PlanExpiring text={text.slice(0, w.index)} />
        <WelcomeTail phrase={w[1]} />
        <PlanExpiring text={text.slice(w.index + w[0].length)} />
      </>
    );
  }
  return <PlanExpiring text={text} />;
}

function WelcomeTail({ phrase }: { phrase: string }) {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return (
    <>
      {" · "}
      <span data-testid="credit-expiring" data-lot="welcome" style={{ color: "var(--warning)" }}>{phrase}</span>
    </>
  );
}

function PlanExpiring({ text }: { text: string }) {
  const m = creditsCopy.expiringPattern.exec(text);
  if (!m) return <>{text}</>;
  return (
    <>
      {text.slice(0, m.index)}
      <span data-testid="credit-expiring" style={{ color: "var(--warning)" }}>{m[0]}</span>
      {text.slice(m.index + m[0].length)}
    </>
  );
}

function Phrases({ text }: { text: string }) {
  const parts = text.split(creditsCopy.link);
  if (parts.length === 1) return <Expiring text={text} />;
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          <Expiring text={part} />
          {i < parts.length - 1 ? (
            <Link
              href={CREDITS_HREF}
              className="text-[color:var(--accent-text)] underline decoration-[color:var(--accent-shadow)] underline-offset-2"
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

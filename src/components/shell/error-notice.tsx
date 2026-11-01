"use client";
// What a render that threw draws, for `error.tsx` and `global-error.tsx` alike: the page-level
// empty state, a retry, and a way home. Built from the shared empty state and button primitives
// rather than a layout of its own, sized as the 404 page is.

import * as Sentry from "@sentry/nextjs";
import { useEffect, useRef, useState } from "react";

import { EmptyState, EmptyStateBody, EmptyStateTitle } from "../ui/empty-state";
import { GhostButton, PrimaryButton } from "../ui/button";
import { shellCopy } from "../../lib/copy/shell";
import { reportCopy } from "../../lib/copy/report";
import { useReportable } from "../feedback/feedback-provider";
import { ReportForm } from "../feedback/report-form";

const copy = shellCopy.errorBoundary;
const BUTTON = "text-[13px] md:text-[14px] px-[22px] py-[12px]";

/**
 * The one line a boundary logs: the digest, which matches the server's own log of the error, and
 * never the message. A server error's message is already generic in production, but a client
 * error's is the original, and it can carry a card name, a deck name or a query.
 */
export function logBoundaryError(boundary: "page" | "root", digest: string | undefined): void {
  console.error(`[error-boundary] boundary=${boundary} digest=${digest ?? "none"}`);
}

export function ErrorNotice({
  boundary,
  error,
  retry,
}: {
  boundary: "page" | "root";
  error: Error & { digest?: string };
  retry: () => void;
}) {
  // The event id of a browser-side throw, kept for "Tell us what happened" (a server error carries a digest instead).
  const eventId = useRef<string | null>(null);
  // Each error is captured once, however many times the effect runs (Strict Mode, a changed boundary prop).
  const captured = useRef(new WeakSet<Error>());
  const reportable = useReportable();
  const [reporting, setReporting] = useState<{ eventId: string | null } | null>(null);
  useEffect(() => {
    logBoundaryError(boundary, error.digest);
    // A server error carries a digest and was reported where it happened (`onRequestError`); only a
    // browser-side throw is new here.
    if (error.digest) eventId.current = null;
    else if (!captured.current.has(error)) {
      captured.current.add(error);
      eventId.current = Sentry.captureException(error) ?? null;
    }
  }, [boundary, error]);

  return (
    <EmptyState className="flex-1 min-h-[400px] md:min-h-[480px] p-[40px]">
      <EmptyStateTitle className="text-[21px] md:text-[24px]">{copy.heading}</EmptyStateTitle>
      <EmptyStateBody className="text-[13.5px] md:text-[15px] max-w-[380px] mt-[10px] mb-0">
        {copy.body}
      </EmptyStateBody>
      <div className="flex flex-col md:flex-row gap-[12px] mt-[24px]">
        <PrimaryButton onClick={() => retry()} className={BUTTON}>
          {copy.retry}
        </PrimaryButton>
        <GhostButton href="/" className={BUTTON}>
          {copy.home}
        </GhostButton>
      </div>
      {/* The root crash screen has no shell, no provider and no router, so its link is a plain anchor to /report (the page
          decides the switch). The code rides as `ref`; the form sends it with the report (small items 8, board 6: C1). */}
      {boundary === "root" && !reportable && (
        <a
          href={error.digest ? `/report?ref=${encodeURIComponent(error.digest)}` : "/report"}
          className="mt-[18px] flex min-h-[44px] items-center text-[13.5px] font-medium text-[color:var(--accent-text)] hover:underline"
        >
          {reportCopy.aboutPress}
        </a>
      )}
      {/* Flyer trial PR 5: a third, quiet line for a signed-in reader with Report a problem on (the shell's provider). */}
      {reportable && (
        <>
          <button
            type="button"
            onClick={() => setReporting({ eventId: eventId.current })}
            className="mt-[18px] flex min-h-[44px] cursor-pointer items-center border-0 bg-transparent text-[13.5px] font-medium text-[color:var(--accent-text)] hover:underline"
          >
            {reportCopy.errorLink}
          </button>
          {reporting && (
            <ReportForm source="error" digest={error.digest ?? null} eventId={reporting.eventId} onClose={() => setReporting(null)} />
          )}
        </>
      )}
    </EmptyState>
  );
}

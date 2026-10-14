"use client";
// What a render that threw draws, for `error.tsx` and `global-error.tsx` alike: the page-level
// empty state, a retry, and a way home. Built from the shared empty state and button primitives
// rather than a layout of its own, sized as the 404 page is.

import { useEffect } from "react";

import { EmptyState, EmptyStateBody, EmptyStateTitle } from "../ui/empty-state";
import { GhostButton, PrimaryButton } from "../ui/button";
import { shellCopy } from "../../lib/copy/shell";

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
  useEffect(() => {
    logBoundaryError(boundary, error.digest);
  }, [boundary, error]);

  return (
    <EmptyState className="min-h-[400px] md:min-h-[480px] p-[40px]">
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
    </EmptyState>
  );
}

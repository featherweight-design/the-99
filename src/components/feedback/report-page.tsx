"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { reportCopy as copy } from "../../lib/copy/report";
import { shellCopy } from "../../lib/copy/shell";
import type { ReportSource } from "../../lib/feedback/report-rule";
import { PendingReporter } from "../shell/pending-reporter";
import { SocialToast } from "../social/social-toast";
import { ReportBody, useReportDraft } from "./report-body";

// /report: the Report a problem form on a page of its own (small items 8 board 6: R1 to R6; signed out, the frame is the newcomer's,
// drawn by the route). A column 520 wide (the board's `.rp7`, 16px in on a phone and 40px on desktop) under `‹ Back home`; Close from the sent state goes home too. Works signed out.

export function ReportPage({
  source,
  signedOut,
  digest,
  page,
}: {
  source: ReportSource;
  signedOut: boolean;
  /** `/report?ref=`: the crash screen's error code; rides along with the report and is named under the form. */
  digest: string | null;
  /** `/report?from=`: the path the reader was on. */
  page: string | null;
}) {
  const router = useRouter();
  const draft = useReportDraft({ source, digest, page });
  return (
    <div className="flex w-full flex-1 flex-col items-center px-[16px] py-[18px] md:p-[40px]">
      <div className="w-full max-w-[520px] text-left">
        <Link href="/" className="flex min-h-[44px] items-center text-[13px] font-medium text-[color:var(--accent-text)] no-underline hover:underline">
          ‹ {shellCopy.errorBoundary.home}
          <PendingReporter href="/" />
        </Link>
        <h1 className="m-0 mb-[12px] mt-[4px] font-display text-[22px] font-bold leading-[1.25] text-[color:var(--fg)] [text-wrap:balance]">{copy.title}</h1>
        <ReportBody draft={draft} layout="page" signedOut={signedOut} code={digest} onClose={() => router.push("/")} />
      </div>
      <SocialToast toast={draft.toast} onDone={draft.clearToast} />
    </div>
  );
}

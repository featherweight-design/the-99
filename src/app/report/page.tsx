// /report: Report a problem on a page of its own (small items 8, board 6; flyer trial `Report-Phone`, `Report-Desktop`).
//
// Public in `src/proxy.ts`: the crash screen (`global-error.tsx`, no shell, no router) is drawn to link here with the error's
// digest as `ref` (`ErrorNotice`, root boundary; the board sends no `from`, which the page still reads when an address has
// one). The crash screen cannot read the switch, so the link shipped once Report a problem was on for everyone. The reader may
// not be signed in. The frame is the
// newcomer's (`REPORT_MAIN`) for EVERY reader, signed in or not. The page answers 404 while Report a problem is off FOR THIS READER:
// a signed-in reader's own switches (`requestSwitchEnv`), a signed-out one's the variable and the app-wide override
// (`resolveSwitchEnv(null)`, as `sendProblemReport` decides). `ref` and `from` are read as the action stores them: a short
// word-character code, and a path alone.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CrashWordmark } from "../../components/feedback/crash-wordmark";
import { ReportPage } from "../../components/feedback/report-page";
import { REPORT_MAIN } from "../../components/join/newcomer-column";
import { currentUserId } from "../../lib/auth";
import { reportCopy } from "../../lib/copy/report";
import { feedbackEnabled } from "../../lib/feedback/flag";
import { readReportParams } from "../../lib/feedback/report-link";
import { requestSwitchEnv } from "../../lib/switches/request";
import { resolveSwitchEnv } from "../../lib/switches/snapshot";

export const metadata: Metadata = { title: reportCopy.title };

export default async function ReportRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await currentUserId();
  const env = userId ? await requestSwitchEnv(userId) : await resolveSwitchEnv(null);
  if (!feedbackEnabled(env)) notFound();
  const { ref, from } = readReportParams(await searchParams);
  const page = (
    <ReportPage
      // A signed-in caller cannot claim the signed-out door (`sendProblemReport`); the action forces `report` for the rest.
      source={userId === null ? "report" : ref ? "error" : "about"}
      signedOut={userId === null}
      digest={ref}
      page={from}
    />
  );
  // Signed in, /report is a shell page (small items 9, A2): the shell draws the header, the tab bar and its own <main>, so this
  // draws no frame, no wordmark and no second <main>. Signed out the shell is bare, so the page keeps the newcomer's frame
  // and wordmark, a <main> of its own, and a tab-bar reserve of 8px so the failed-send toast sits 24px above the bottom.
  if (userId) return page;
  return (
    <main className={REPORT_MAIN} style={{ "--tabbar-h": "8px" } as React.CSSProperties}>
      <CrashWordmark />
      {page}
    </main>
  );
}

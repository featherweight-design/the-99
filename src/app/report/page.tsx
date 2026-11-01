// /report: Report a problem on a page of its own (small items 8, board 6; flyer trial `Report-Phone`, `Report-Desktop`).
//
// Public in `src/proxy.ts`: the crash screen (`global-error.tsx`, no shell, no router) links here with the error's digest as
// `ref` and the path the reader was on as `from`, and the reader may not be signed in. The frame is the newcomer's
// (`NEWCOMER_MAIN`) for EVERY reader, signed in or not. The page answers 404 while Report a problem is off FOR THIS READER:
// a signed-in reader's own switches (`requestSwitchEnv`), a signed-out one's the variable and the app-wide override
// (`resolveSwitchEnv(null)`, as `sendProblemReport` decides). `ref` and `from` are read as the action stores them: a short
// word-character code, and a path alone.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CrashWordmark } from "../../components/feedback/crash-wordmark";
import { ReportPage } from "../../components/feedback/report-page";
import { NEWCOMER_MAIN } from "../../components/join/newcomer-column";
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
  return (
    // A <main> of its own: signed out, the shell draws none. Signed out there is no tab bar either, so the failed-send toast
    // sits 24px above the bottom as the board draws it (16px + this 8px); a signed-in reader keeps the shell's own.
    <main className={NEWCOMER_MAIN} style={userId ? undefined : ({ "--tabbar-h": "8px" } as React.CSSProperties)}>
      <CrashWordmark />
      <ReportPage
        // A signed-in caller cannot claim the signed-out door (`sendProblemReport`); the action forces `report` for the rest.
        source={userId === null ? "report" : ref ? "error" : "about"}
        signedOut={userId === null}
        digest={ref}
        page={from}
      />
    </main>
  );
}

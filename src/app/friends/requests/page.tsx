// /friends/requests: Request history (#2984, R1d). A static segment beside the friend routes (a friend's id is a uuid, so the
// two cannot collide). The two first pages and the ex-friend count are read together; "Show older requests" pages from there.
// A read that throws is the app's error boundary, as on /friends.
import type { Metadata } from "next";
import { requireUserId } from "../../../lib/auth";
import { CardDetailProvider } from "../../../components/cards/card-detail-provider";
import { RequestHistory } from "../../../components/social/request-history";
import { historyCopy } from "../../../lib/copy/request-history";
import { hiddenHistoryCount, loadRequestHistory } from "../../../lib/social/request-history";

export const metadata: Metadata = { title: historyCopy.title };

export default async function RequestHistoryPage() {
  const userId = await requireUserId();
  const now = new Date();
  const [asked, ofYou, hidden] = await Promise.all([
    loadRequestHistory(userId, "asked", null, now),
    loadRequestHistory(userId, "received", null, now),
    hiddenHistoryCount(userId),
  ]);
  return (
    <CardDetailProvider>
      <RequestHistory asked={asked} ofYou={ofYou} hiddenCount={hidden} nowMs={now.getTime()} />
    </CardDetailProvider>
  );
}

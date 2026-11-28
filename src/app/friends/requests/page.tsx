// /friends/requests: Request history (#2984, R1d). A static segment beside the friend routes (a friend's id is a uuid, so the
// two cannot collide). The two first pages and the ex-friend count are read together; "Show older requests" pages from there.
// A read that throws is the app's error boundary, as on /friends.
import { ZoneProvider } from "../../../components/zone-context";
import { resolveZone } from "../../../lib/zone/server";
import type { Metadata } from "next";
import { requireUserId } from "../../../lib/auth";
import { CardDetailProvider } from "../../../components/cards/card-detail-provider";
import { RequestHistory } from "../../../components/social/request-history";
import { historyCopy } from "../../../lib/copy/request-history";
import { hiddenHistoryCount, loadRequestHistory } from "../../../lib/social/request-history";
import { TradeSheetHost } from "../../../components/social/trade-sheet-host";
import { loadTradeRows } from "../../../lib/social/trade-reads";

export const metadata: Metadata = { title: historyCopy.title };

export default async function RequestHistoryPage() {
  const userId = await requireUserId();
  const now = new Date();
  const [asked, ofYou, hidden, trades] = await Promise.all([
    loadRequestHistory(userId, "asked", null, now),
    loadRequestHistory(userId, "received", null, now),
    hiddenHistoryCount(userId),
    loadTradeRows(userId, {}, now),
  ]);
  return (
    <CardDetailProvider>
      <ZoneProvider zone={await resolveZone()}><TradeSheetHost><RequestHistory asked={asked} ofYou={ofYou} trades={trades.rows} hiddenCount={hidden} nowMs={now.getTime()} /></TradeSheetHost></ZoneProvider>
    </CardDetailProvider>
  );
}

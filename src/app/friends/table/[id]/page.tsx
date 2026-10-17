// /friends/table/[id]: a Rule 0 table, read only (plan `2026-10-16-rule-zero.md`, PR 3). The read and every seat from
// `loadTable`, through the viewer's grant; the expired page (L4, H3) from `loadClosedTable`. Not found with
// `RULE_ZERO_ENABLED` off for this reader, and for a table the viewer is not seated at, or whose pod they have left.
//
// Loading is the shell's `LoadingScreen`, and a read that throws is the app's error boundary, as on `/friends`.

import { notFound } from "next/navigation";
import { requireUserId } from "../../../../lib/auth";
import { howItWorksEnabled } from "../../../../lib/about/how-it-works-flag";
import { ruleZeroEnabled, socialGamesEnabled } from "../../../../lib/social/flag";
import { loadClosedTable, loadTable } from "../../../../lib/social/rule-zero-table";
import { requestSwitchEnv } from "../../../../lib/switches/request";
import { DeckPageSwitches } from "../../../../components/decks/deck-page-switches";
import { TableBody } from "../../../../components/rule-zero/table-body";
import { TableClosed } from "../../../../components/rule-zero/table-closed";

export default async function TablePage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!ruleZeroEnabled(env)) notFound();
  const { id } = await params;
  const view = await loadTable(userId, id);
  if (view) {
    return (
      // The read's provenance sheet is the deck page's, and draws its method tags from the same switch.
      <DeckPageSwitches howItWorks={howItWorksEnabled(env)}>
        <div className="w-full">
          <TableBody view={view} gamesEnabled={socialGamesEnabled(env)} now={new Date()} />
        </div>
      </DeckPageSwitches>
    );
  }
  const closed = await loadClosedTable(userId, id);
  if (!closed) notFound();
  return (
    <div className="flex w-full flex-1 flex-col">
      <TableClosed podName={closed.podName} setBy={closed.setBy} faces={closed.faces} />
    </div>
  );
}

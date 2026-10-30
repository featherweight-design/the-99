// /decks/precons/early/[id]/[position] (announcements handoff, Early-List board; STATES 3.3 to 3.8, G3, G4): one deck
// list from a Wizards Commander decklists post, drawn view-only as the open precon page draws a precon, before MTGJSON
// lists the box. `[id]` is the post's Contentful id and `[position]` the list's place in it. Once a precon in the
// post's set names the same commander, the address sends the reader to that release list's page (STATES 3.4).

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUserId } from "../../../../../../lib/auth";
import { preconAddedDay, preconDay, preconsCopy } from "../../../../../../lib/copy/precons";
import { requestSwitchEnv } from "../../../../../../lib/switches/request";
import { announcementsEnabled } from "../../../../../../lib/announcements/flag";
import { isWizardsPostUrl, parseListPosition } from "../../../../../../lib/announcements/early-list";
import { loadEarlyList } from "../../../../../../lib/announcements/early-list-read";
import { OpenPreconView } from "../../../../../../components/decks/precons/open-precon-view";

export const metadata: Metadata = { title: preconsCopy.list.title };

type Props = { params: Promise<{ id: string; position: string }> };

const copy = preconsCopy.early;

export default async function EarlyListPage({ params }: Props) {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!announcementsEnabled(env)) notFound();
  // Next hands the segments over decoded.
  const { id, position: segment } = await params;
  const position = parseListPosition(segment);
  if (position === null) notFound();
  const read = await loadEarlyList(userId, id, position);
  if (!read) notFound();
  if (read.kind === "release") redirect(`/decks/precons/${encodeURIComponent(read.fileName)}`);

  const band = read.releasedOn
    ? { lead: copy.releasedLead(preconDay(read.releasedOn)), tail: copy.releasedTail }
    : { lead: copy.lead(preconAddedDay(read.postedAt)), tail: copy.tail };
  return (
    <OpenPreconView
      precon={read.precon}
      fromNew={false}
      early={{ ...band, postUrl: isWizardsPostUrl(read.postUrl) ? read.postUrl : null, unmatched: read.unmatched }}
    />
  );
}

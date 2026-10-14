// /decks/precons/[fileName] (handoff `design_handoff_the99_precons`, R2): one precon as a
// read-only decklist with how many of its cards the reader owns. A Collector's Edition twin's URL
// redirects to its plain edition (design call 4), with the Collector's Edition chosen. Behind `PRECONS_ENABLED`.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUserId } from "../../../../lib/auth";
import { cachePageForUser } from "../../../../lib/cache/page-cache";
import { preconsCopy } from "../../../../lib/copy/precons";
import { preconsEnabled } from "../../../../lib/precons/flag";
import { requestSwitchEnv } from "../../../../lib/switches/request";
import { loadOpenPrecon } from "../../../../lib/precons/open-read";
import { collectionEditEnabled } from "../../../../lib/collection/edit-flag";
import { OpenPreconView } from "../../../../components/decks/precons/open-precon-view";
import { parseEdition } from "../../../../lib/precons/edition";

export const metadata: Metadata = { title: preconsCopy.list.title };

type Props = {
  params: Promise<{ fileName: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OpenPreconPage({ params, searchParams }: Props) {
  const userId = await requireUserId();
  // The reader's resolved switches, once: the gate and the cached precon's key read the same env.
  const env = await requestSwitchEnv(userId);
  if (!preconsEnabled(env)) notFound();
  // Next hands the segment over decoded; decoding it again would throw on a `%`.
  const { fileName: name } = await params;
  const { from, edition } = await searchParams;
  const precon = await cachePageForUser(userId, "precon", [name], async () => ({
    value: await loadOpenPrecon(userId, name),
    store: true,
  }), env);
  if (!precon) notFound();
  if (precon.kind === "twin") {
    // The twin's own URL lands on its plain edition with the Collector's Edition chosen.
    const qs = new URLSearchParams({ ...(from === "new" ? { from: "new" } : {}), edition: "collector" }).toString();
    redirect(`/decks/precons/${encodeURIComponent(precon.plainFileName)}?${qs}`);
  }
  return <OpenPreconView precon={precon} fromNew={from === "new"} canOwn={collectionEditEnabled(env)} edition={parseEdition(edition)} />;
}

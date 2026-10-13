// /decks/precons/[fileName] (handoff `design_handoff_the99_precons`, R2): one precon as a
// read-only decklist with how many of its cards the reader owns. A Collector's Edition twin's URL
// redirects to its plain edition (design call 4). Behind `PRECONS_ENABLED`.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUserId } from "../../../../lib/auth";
import { cachePageForUser } from "../../../../lib/cache/page-cache";
import { preconsCopy } from "../../../../lib/copy/precons";
import { preconsEnabled } from "../../../../lib/precons/flag";
import { requestSwitchEnv } from "../../../../lib/switches/request";
import { loadOpenPrecon } from "../../../../lib/precons/open-read";
import { OpenPreconView } from "../../../../components/decks/precons/open-precon-view";

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
  const from = (await searchParams).from;
  const precon = await cachePageForUser(userId, "precon", [name], async () => ({
    value: await loadOpenPrecon(userId, name),
    store: true,
  }), env);
  if (!precon) notFound();
  if (precon.kind === "twin") {
    redirect(`/decks/precons/${encodeURIComponent(precon.plainFileName)}${from === "new" ? "?from=new" : ""}`);
  }
  return <OpenPreconView precon={precon} fromNew={from === "new"} />;
}

// /decks/precons/[fileName] (handoff `design_handoff_the99_precons`, R2): one precon as a
// read-only decklist with how many of its cards the reader owns. A Collector's Edition twin's URL
// redirects to its plain edition (design call 4), with the Collector's Edition chosen.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUserId } from "../../../../lib/auth";
import { cachePageForUser } from "../../../../lib/cache/page-cache";
import { preconsCopy } from "../../../../lib/copy/precons";
import { requestFlags } from "../../../../lib/flags/request";
import { loadOpenPrecon } from "../../../../lib/precons/open-read";
import { OpenPreconView } from "../../../../components/decks/precons/open-precon-view";
import { parseEdition } from "../../../../lib/precons/edition";
import { preconUpgradeEnabled } from "../../../../lib/precons/upgrade/flag";
import { upgradeOffered } from "../../../../lib/precons/upgrade/flow";
import { LIVE_DEPS, readUpgrade } from "../../../../lib/precons/upgrade/run";
import { loadPreconOverview, overviewForList, renderedPreconList } from "../../../../lib/precons/overview-read";

export const metadata: Metadata = { title: preconsCopy.list.title };

type Props = {
  params: Promise<{ fileName: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OpenPreconPage({ params, searchParams }: Props) {
  const userId = await requireUserId();
  // The reader's resolved switches, once: the cached precon's key read the same env.
  const env = await requestFlags(userId);
  // Next hands the segment over decoded; decoding it again would throw on a `%`.
  const { fileName: name } = await params;
  const { from, edition } = await searchParams;
  // The precon's Overview is catalog data at the reader's contract and role basis, read beside the cached
  // payload rather than in it: a build or copy writes it, and neither moves the reader's stamp. A twin's
  // URL reads the plain edition's below, after its redirect. A failed read draws no block.
  const overviewRead = loadPreconOverview(name, env).catch((error) => {
    // not a fallback: the block is drawn beside the cached payload, never stored in it.
    console.error("precons: the precon's overview could not be read", error);
    return null;
  });
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
  // Upgrade this precon's panel, read beside the cached payload (the reader's own: their runs and credits), after the cached read and the twin's redirect. Off, or a failed read, draws no row.
  const upgradeRead = preconUpgradeEnabled(env)
    ? readUpgrade(userId, name, LIVE_DEPS, env).catch((error) => {
      // not a fallback: the panel is drawn beside the cached payload, never stored in it.
      console.error("precons: the upgrade panel could not be read", error);
      return null;
    })
    : Promise.resolve(null);
  // Shown only beside the list it was written for: an ingest can move the list without touching `current`.
  const overview = overviewForList(await overviewRead, renderedPreconList(precon));
  const upgrade = await upgradeRead;
  return <OpenPreconView precon={precon} fromNew={from === "new"} edition={parseEdition(edition)} overview={overview} upgrade={upgradeOffered(upgrade) ? upgrade : null} />;
}

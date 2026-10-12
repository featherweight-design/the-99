// /decks/precons (handoff `design_handoff_the99_precons`, R2): every Commander precon, with how many
// of its cards the reader owns. Behind `PRECONS_ENABLED`. Cached per reader on the database's
// stamp, as `/decks` is, and on the catalog generation the precon ingest moves.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUserId } from "../../../lib/auth";
import { cachePageForUser } from "../../../lib/cache/page-cache";
import { preconsCopy } from "../../../lib/copy/precons";
import { preconsEnabled } from "../../../lib/precons/flag";
import { parsePreconParams } from "../../../lib/precons/list";
import { loadPreconList, type PreconList } from "../../../lib/precons/list-read";
import { PreconListView } from "../../../components/decks/precons/precon-list-view";
import { PreconsDown } from "../../../components/decks/precons/precons-down";

export const metadata: Metadata = { title: preconsCopy.list.title };

export default async function PreconsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!preconsEnabled()) notFound();
  const userId = await requireUserId();
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") params.set(k, v);

  // L4: an empty or unreadable list is "couldn't be read", never "there are no precons". Not stored,
  // so the next visit reads again.
  let list: PreconList | null = null;
  try {
    list = await cachePageForUser(userId, "precons", [], async () => {
      const value = await loadPreconList(userId);
      return { value, store: value.rows.length > 0 };
    });
  } catch (error) {
    // not a fallback: a load that throws is never stored, and this renders L4, not a list.
    console.error("precons: the list could not be read", error);
  }
  if (!list || list.rows.length === 0) return <PreconsDown />;

  return (
    <PreconListView
      rows={list.rows}
      hasCollection={list.hasCollection}
      fromNew={params.get("from") === "new"}
      initial={parsePreconParams(params)}
      query={params.toString()}
    />
  );
}

"use client";
// `/decks/new`'s loading screen. It is also the nearest boundary above Help me choose's route, so
// a navigation from the create page into that route shows this first: on a choose address it draws
// that route's own screen rather than the create page's.
import { usePathname } from "next/navigation";

import { ChooseLoading } from "../../../components/intake/choose-loading";
import { LoadingScreen } from "../../../components/shell/loading-screen";
import { shellCopy } from "../../../lib/copy/shell";
import { CHOOSE_PATH } from "../../../lib/intake/submit";

export default function Loading() {
  if (usePathname() === CHOOSE_PATH) return <ChooseLoading />;
  return <LoadingScreen copy={shellCopy.loading.deckNew} />;
}

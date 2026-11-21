"use client";

import { usePathname } from "next/navigation";

import { shellCopy } from "../../lib/copy/shell";
import { pendingRouteFor } from "../../lib/shell/pending-routes";
import { DeckOpenLoading } from "../decks/deck-open-loading";
import { PreconsLoading } from "../decks/precons/precons-loading";
import { ChooseLoading } from "../intake/choose-loading";
import { CreditsLoading } from "../credits/credits-loading";
import { LoadingScreen } from "./loading-screen";

/**
 * The shell's page-load fallback (navigation-pending escalation audit, correction 1): the screen a
 * direct load or refresh streams while the page is fetched, chosen by the address being loaded from
 * the same map the overlay reads. Help me choose draws its own screen for its address.
 */
export function ShellLoading() {
  const pathname = usePathname();
  const route = pendingRouteFor(pathname);
  // A direct load of `/decks/<id>` streams this fallback before the page's own boundary mounts, so it draws the deck page's shape too.
  if (route.kind === "kept" && route.screen === "decks" && pathname.split("/").filter(Boolean).length === 2) return <DeckOpenLoading />;
  if (route.kind === "overlay") return <LoadingScreen copy={shellCopy.loading[route.key]} />;
  if (route.screen === "choose") return <ChooseLoading />;
  // The precon list's own boundary reads the stored view; this fallback cannot (it is drawn before any cookie read), so the address alone decides, tiles by default.
  if (route.screen === "credits") return <CreditsLoading />;
  if (route.screen === "precons") return <PreconsLoading />;
  return <LoadingScreen copy={shellCopy.loading[route.screen]} />;
}

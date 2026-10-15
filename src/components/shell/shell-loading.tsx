"use client";

import { usePathname } from "next/navigation";

import { shellCopy } from "../../lib/copy/shell";
import { pendingRouteFor } from "../../lib/shell/pending-routes";
import { PreconsLoading } from "../decks/precons/precons-loading";
import { ChooseLoading } from "../intake/choose-loading";
import { LoadingScreen } from "./loading-screen";

/**
 * The shell's page-load fallback (navigation-pending escalation audit, correction 1): the screen a
 * direct load or refresh streams while the page is fetched, chosen by the address being loaded from
 * the same map the overlay reads. Help me choose draws its own screen for its address.
 */
export function ShellLoading() {
  const route = pendingRouteFor(usePathname());
  if (route.kind === "overlay") return <LoadingScreen copy={shellCopy.loading[route.key]} />;
  if (route.screen === "choose") return <ChooseLoading />;
  // The precon list's own boundary reads the stored view; this fallback cannot (it is drawn before any cookie read), so tiles.
  if (route.screen === "precons") return <PreconsLoading view="tiles" />;
  return <LoadingScreen copy={shellCopy.loading[route.screen]} />;
}

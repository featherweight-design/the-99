"use client";

import { useState } from "react";
import type { ToolLanding } from "../../lib/discovery/tools";
import { useToolLanding } from "./use-tool-landing";

/**
 * Try it's landing on a tool's own page (discovery R2·3, E11): the page decides `landing` and `request` on the server
 * (`pageLanding`) and renders this beside its view. It draws nothing; `useToolLanding` does the rest, exactly as on a
 * deck. Mounted with a null landing it still strips a stale `?tool=`, with no halo and nothing written.
 */
export function ToolLandingMount({
  landing,
  request,
  deferred = false,
}: {
  landing: Pick<ToolLanding, "tool" | "target" | "moment"> | null;
  request: string | null;
  deferred?: boolean;
}) {
  // A deferred landing outlives its parameter: once stripped, a same-page refresh (`router.refresh()`) renders this
  // with no landing and no request, and passing that on would end the wait. So a deferred landing is HELD until a new
  // request replaces it or the page unmounts. Adjusted during render, so the hook never sees the null.
  const [held, setHeld] = useState({ landing, request });
  if (deferred && request !== null && request !== held.request) setHeld({ landing, request });
  const live = deferred && request === null ? held : { landing, request };
  useToolLanding(live.landing, live.request ?? "", { deferred });
  return null;
}

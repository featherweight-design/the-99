"use client";

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
  useToolLanding(landing, request ?? "", { deferred });
  return null;
}

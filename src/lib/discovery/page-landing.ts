import { SWITCH_FLAGS } from "../switches/flags";
import { pageToolLanding, type ToolId } from "./tools";

/**
 * What a tool's own page hands `ToolLandingMount` (discovery R2·3, E11): the landing `?tool=` names, decided from the
 * reader's resolved switches (`requestSwitchEnv`), or null for anything stale; and a token per server render that
 * carries `?tool=`, so a client navigation to the page with a new `?tool=` lands again. A render without one is null.
 */
export function pageLanding(query: string | string[] | undefined, env: NodeJS.ProcessEnv, tool: ToolId) {
  return {
    landing: pageToolLanding(query, (name) => SWITCH_FLAGS[name](env), tool),
    request: query === undefined ? null : crypto.randomUUID(),
  };
}

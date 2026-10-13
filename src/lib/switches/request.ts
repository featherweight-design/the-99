import { headers } from "next/headers";
import { SWITCHES } from "./registry";
import { resolveSwitchEnv } from "./snapshot";

/**
 * The switches the PROXY resolved for this request, carried to the page on a request header
 * (`SWITCHES_HEADER`, one bit per registry switch). The proxy strips any copy a client sent and
 * writes its own for a signed-in reader, so a page, a layout or an action that reads this decides
 * from the same snapshot the proxy's gate and sheet decided from. Resolving again here would use
 * this bundle's own memo, which can disagree with the proxy's for up to its lifetime after a flip.
 */
export const SWITCHES_HEADER = "x-switches";

/** The bits as an env, or null when the header is absent or not one bit per switch. */
export function envFromSwitchBits(bits: string | null, base: NodeJS.ProcessEnv): NodeJS.ProcessEnv | null {
  if (bits === null || bits.length !== SWITCHES.length || !/^[01]+$/.test(bits)) return null;
  const out: NodeJS.ProcessEnv = { ...base };
  SWITCHES.forEach(({ name }, i) => {
    out[name] = bits[i] === "1" ? "true" : "false";
  });
  return out;
}

/**
 * This request's resolved switches: the proxy's, or, when it sent none (a request it did not see),
 * resolved here.
 */
export async function requestSwitchEnv(userId: string, base: NodeJS.ProcessEnv = process.env): Promise<NodeJS.ProcessEnv> {
  return envFromSwitchBits((await headers()).get(SWITCHES_HEADER), base) ?? resolveSwitchEnv(userId, base);
}

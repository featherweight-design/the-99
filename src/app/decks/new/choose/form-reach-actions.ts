"use server";

import { requireUserId } from "../../../../lib/auth";
import { requestSwitchEnv } from "../../../../lib/switches/request";
import { loadFormReach } from "../../../../lib/intake/form-reach-load";
import type { FormReachData } from "../../../../lib/intake/form-reach";

/**
 * The intake form's one read for its bracket heads-up (bracket reach R1b, board A), made when the
 * form opens. No arguments: the reader is the session's, and everything else is filtered in the
 * browser. Help me choose's switch is retired (always on), so it always reads.
 */
export async function formReachData(): Promise<FormReachData> {
  const userId = await requireUserId();
  return loadFormReach(userId, await requestSwitchEnv(userId));
}

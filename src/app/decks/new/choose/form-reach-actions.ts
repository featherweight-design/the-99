"use server";

import { requireUserId } from "../../../../lib/auth";
import { requestSwitchEnv } from "../../../../lib/switches/request";
import { helpMeChooseEnabled } from "../../../../lib/intake/flag";
import { loadFormReach } from "../../../../lib/intake/form-reach-load";
import type { FormReachData } from "../../../../lib/intake/form-reach";

/**
 * The intake form's one read for its bracket heads-up (bracket reach R1b, board A), made when the
 * form opens. No arguments: the reader is the session's, and everything else is filtered in the
 * browser. Null with Help me choose off for this reader, so the form draws the plain caption.
 */
export async function formReachData(): Promise<FormReachData | null> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!helpMeChooseEnabled(env)) return null;
  return loadFormReach(userId, env);
}

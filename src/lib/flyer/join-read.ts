/**
 * What `/join/<CODE>` draws on arrival for a flyer code (flyer trial PR 3; boards `Join-Phone` V1 to E3). SERVER-ONLY.
 * One read of the code, judged against the browser's claim cookie so a reopened page redraws the step reached, and
 * against the trial's switch (decided for the code's CREATOR: the reader has no account). A code nobody made reads as
 * a revoked one, so a stranger cannot tell a mistyped code from an ended one. Nothing here names a person or the store.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { flyerClaims } from "../../db/schema";
import { loadInviteCount } from "../invites/read";
import { CODE_MAX_TRIES, codeState, isClaimSecretShape, resendWaitMs } from "../invites/rules";
import { secretHash } from "../invites/tokens";
import { resolveSwitchEnv } from "../switches/snapshot";
import { findFlyerCode } from "./claim";
import { flyerTrialEnabled } from "./flag";
import { flyerOpenness, holdsPlace, type FlyerClaimRow } from "./rules";

export type FlyerJoinView =
  | { kind: "email" }
  | { kind: "code"; email: string; resendWaitMs: number; expired: boolean }
  | { kind: "proven"; email: string }
  /** `full`: 50 sign-ups, or the creator is out of invites (E1). `revoked`: ended early, or not a code at all (E2). */
  | { kind: "closed"; closed: "full" | "revoked" }
  /** The trial's switch is off: public launch, every code retired (E3). */
  | { kind: "launched" };

export async function readFlyerJoin(code: string, secret: string | null, now: Date = new Date()): Promise<FlyerJoinView> {
  const row = await findFlyerCode(code);
  if (!row) return { kind: "closed", closed: "revoked" };
  if (!flyerTrialEnabled(await resolveSwitchEnv(row.createdBy))) return { kind: "launched" };
  if (row.revokedAt !== null) return { kind: "closed", closed: "revoked" };

  // This browser's own claim, when one still stands: the step it reached.
  if (isClaimSecretShape(secret)) {
    const [mine] = await db.select().from(flyerClaims)
      .where(and(eq(flyerClaims.codeId, row.id), eq(flyerClaims.claimSecretHash, secretHash(secret))));
    if (mine && holdsPlace(mine as FlyerClaimRow, now) && mine.codeTries < CODE_MAX_TRIES && mine.email !== null) {
      if (mine.state === "proven") return { kind: "proven", email: mine.email };
      return {
        kind: "code",
        email: mine.email,
        resendWaitMs: resendWaitMs(mine.codeSentAt, now),
        expired: codeState(mine, now) !== "live",
      };
    }
  }

  const claims = await db.select({ state: flyerClaims.state, holdsUntil: flyerClaims.holdsUntil }).from(flyerClaims)
    .where(eq(flyerClaims.codeId, row.id));
  const { left } = await loadInviteCount(row.createdBy, now);
  const openness = flyerOpenness(row, claims as FlyerClaimRow[], left, now);
  if (openness.open) return { kind: "email" };
  return { kind: "closed", closed: openness.closed === "revoked" ? "revoked" : "full" };
}

import { EXPIRY_WARNING_MS } from "../model/credit-line";

/**
 * THE WELCOME LOT'S STATE (welcome credits D2, `STATES-welcome-credits.md`), decided here and nowhere else. Pure and
 * client-safe. Home's strip, the `Where credits work` sheet and the /credits Welcome cell (PR 2) all read this, so one
 * rule says which row of the matrix a reader is in.
 *
 * The lot comes from `readWelcomeLot` (`welcome-read.ts`), the one read that tells a lot used up, a lot expired and no
 * lot apart: the allowance cannot, since it drops an expired lot and reads a used-up one as `welcome: 0`.
 */

/** The reader's welcome grant row, as `readWelcomeLot` reads it. */
export type WelcomeLot = {
  /** Credits the lot started with (`WELCOME_UNITS`, 15). */
  units: number;
  /** Credits it holds at the read's `now` (`credit-rule.ts`'s `remaining`): zero once used up, and zero once expired. */
  left: number;
  /** When it stops funding runs: 30 days after the ACCOUNT was created. Always set on a welcome lot (the table's check). */
  expiresAt: Date;
  /** `expiresAt` had passed at the read's `now` (`isLive`). */
  expired: boolean;
};

/**
 * What the lot is, before dismissal:
 *   held      not expired, every credit left (`left === units`)
 *   partly    not expired, some spent (`0 < left < units`)
 *   expiring  not expired, a credit left, and within `EXPIRY_WARNING_MS` (3 days) of `expiresAt`; wins over held and partly
 *   usedUp    not expired, nothing left
 */
export type WelcomeLotKind = "held" | "partly" | "expiring" | "usedUp";

/**
 * The state a surface draws.
 *   none       no lot, or it expired: nothing anywhere (no last line).
 *   dismissed  the reader closed the strip (`user_prefs.welcome_strip_dismissed_at`): the strip is absent for good, and
 *              everything else (the cell, the sheet from it, the chip) still draws as `lot` says.
 *   otherwise  `kind` is `lot`, and the strip draws in that form.
 */
export type WelcomeState =
  | { kind: "none" }
  | {
      kind: WelcomeLotKind | "dismissed";
      /** The lot's own state, the same whether or not the strip was dismissed. */
      lot: WelcomeLotKind;
      units: number;
      left: number;
      expiresAt: Date;
      /** The `/credits` teaser (`See packs and the monthly plan`) may draw: payments on for the reader and nothing ever
       *  bought (`everBought`, the chip's rule). Absent, never disabled, otherwise; the used-up strip then reads
       *  `Your free credit comes back each day.` */
      teaser: boolean;
    };

export type WelcomeStateInput = {
  lot: WelcomeLot | null;
  now: Date;
  /** When the strip was closed, or null. */
  dismissedAt: Date | null;
  /** The reader has bought a plan or a pack: the chip's `everBought` (`readEverBought`, `chip.ts`), never restated. */
  everBought: boolean;
  /** `PAYMENTS_ENABLED` for this reader. */
  payments: boolean;
};

export function welcomeLotKind(lot: WelcomeLot, now: Date): WelcomeLotKind | null {
  const ahead = lot.expiresAt.getTime() - now.getTime();
  if (lot.expired || ahead <= 0) return null;
  if (lot.left <= 0) return "usedUp";
  if (ahead <= EXPIRY_WARNING_MS) return "expiring";
  return lot.left >= lot.units ? "held" : "partly";
}

export function welcomeState(input: WelcomeStateInput): WelcomeState {
  const { lot } = input;
  const kind = lot ? welcomeLotKind(lot, input.now) : null;
  if (!lot || !kind) return { kind: "none" };
  return {
    kind: input.dismissedAt ? "dismissed" : kind,
    lot: kind,
    units: lot.units,
    left: lot.left,
    expiresAt: lot.expiresAt,
    teaser: input.payments && !input.everBought,
  };
}

/**
 * One seat as the tracker draws it, and the copy of the table a game keeps from its Start (addendum, Snapshot rule):
 * seats, decks and art are copied when the game starts, so a reseat, a deck change, a late deck pick or a close does
 * not change a running game. The copy lives with the game on this device only, until the table's 6 am.
 */
import type { ThirdPartyName } from "../person-name";

export type PlaySeat = {
  seat: number;
  you: boolean;
  name: string | ThirdPartyName;
  art: string | null;
  partnerArt: string | null;
  /** The commanders' card names (public card text), for the sheet's damage and tax rows. Empty with no deck. */
  commander: string;
  partner: string | null;
  /**
   * The second commander is a Background (opponent Background addendum, call 6): it is cast from the command zone, so
   * Tax keeps its row, but it is no creature and deals no commander damage, so Commander damage draws the commander alone.
   */
  partnerIsBackground?: boolean;
  /** The deck's name, as the table draws it (branded on every seat but the viewer's own), or null while the seat has no deck (S2). */
  deck: string | ThirdPartyName | null;
};

/** The table as the game started: its seats in turn order, and the server's sealed Start roster the result is saved against. */
export type TableSnapshot = { players: readonly PlaySeat[]; roster: string };

/** Each cast of a commander from the command zone costs 2 more than the last. */
export const TAX_PER_CAST = 2;

/** Commander `cmdr` of a seat (1 is the partner), by card name, or null with no deck. */
export const commanderOf = (p: PlaySeat, cmdr: number): string | null => (cmdr === 1 && p.partner ? p.partner : p.commander || null);

/** How many of a seat's commanders can deal commander damage: a Background deals none. */
export const damageCommanders = (p: PlaySeat, commanders: number): number => (p.partnerIsBackground ? 1 : commanders);

/** The art of commander `cmdr` (1 is the partner's half). */
export const commanderArt = (p: PlaySeat, cmdr: number): string | null => (cmdr === 1 ? p.partnerArt : p.art);

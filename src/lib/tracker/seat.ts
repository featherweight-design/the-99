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
  /** The deck's name, as the table draws it (branded on every seat but the viewer's own), or null while the seat has no deck (S2). */
  deck: string | ThirdPartyName | null;
};

/** The table as the game started: its seats in turn order, and the server's sealed Start roster the result is saved against. */
export type TableSnapshot = { players: readonly PlaySeat[]; roster: string };

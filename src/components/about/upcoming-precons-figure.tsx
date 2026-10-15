// The `upcoming-precons` entry's specimen (handoff `The 99 - About · Upcoming Precons Entry.dc.html`, §G per-entry
// artboard; slots in `about · upcoming precons.ts`): one announced set, drawn by the Announced group's own
// `AnnouncedSet` from fixture props, read-only, with its name, its date line and its one revealed commander. The
// banner is not drawn here; the caption names it.
//
// The fixture is staging's own (2026-10-14): Darkhold Destiny Commander and Gargantos, the thinnest real announced
// set. `today` is fixed at the artboard's day, so the countdown reads `in 6 months` whenever the page is opened.

import type { AnnouncedMatch } from "../../lib/precons/arrivals";
import { AnnouncedSet } from "../decks/precons/announced-parts";

/** Fixture props (§G "Fixture props"). */
export const UPCOMING_SET: { match: AnnouncedMatch; today: string } = {
  today: "2026-10-14",
  match: {
    set: {
      code: "mdc",
      name: "Darkhold Destiny Commander",
      releasesOn: "2027-04-09",
      released: false,
      cardCount: 1,
      parentName: null,
      arrivedAt: null,
      seen: true,
    },
    commanders: [
      {
        oracleId: "about-gargantos",
        name: "Gargantos, the Endbringer",
        colorIdentity: ["B", "G"],
        imageUriSmall: "https://cards.scryfall.io/small/front/6/0/60b48730-3590-4c8c-b0e8-6007bb36d6b6.jpg?1791578335",
        collectorNumber: "399",
      },
    ],
    matched: 1,
    revealed: 1,
  },
};

/** The set block as the group draws it in tiles, in the list it belongs to. */
export function UpcomingPreconsFigureBody() {
  return (
    <ul className="m-0 list-none p-[12px]">
      <AnnouncedSet match={UPCOMING_SET.match} today={UPCOMING_SET.today} isNew={false} listed={null} />
    </ul>
  );
}

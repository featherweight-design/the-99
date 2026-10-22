// The news feed (menu and Home handoff; plan `2026-10-22-menu-home.md` PR 4). `news` is Settings' "What's new on
// Home" section (`Settings.dc.html`), placeholder copy from the board.
import type { FeedKind } from "../feed/kinds";

export const feedCopy = {
  news: {
    /** The mono section head, drawn uppercase by CSS. */
    head: "What’s new on Home",
    /** Each kind's checkbox: its name, bold, and the line under it. In `FEED_KINDS` order. */
    kinds: {
      "new-set": { name: "New sets", line: "When a set comes out." },
      "new-precon": { name: "New precons", line: "When a Commander precon comes out." },
      "price-drop": { name: "Price drops on your wishlist", line: "A card you want gets cheaper." },
      "trade-match": { name: "Trade matches", line: "A friend has a spare of a card on your wishlist." },
      "spare-request": { name: "Friends asking for your spares", line: "A friend asks for a card you have spare." },
      combo: { name: "Combos you can make", line: "You now own both halves of a two-card combo." },
    } satisfies Record<FeedKind, { name: string; line: string }>,
    /** The mono foot under the checkboxes. */
    foot: "In the app only: a count on Home and the list. No email, ever.",
    failed: "We couldn’t save that. Try again.", // toast, role alert
  },
} as const;

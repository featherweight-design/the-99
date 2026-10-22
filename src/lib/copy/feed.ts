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
  /**
   * Home's What's new and its lead story (plan PR 6; `Home-States.dc.html`, `Feed-Kinds.dc.html`). Placeholders for
   * `/copy-review`. Money arrives formatted (`formatCents`); this module formats no numbers but counts.
   */
  home: {
    /** The section's mono head, drawn uppercase by CSS. */
    head: "What’s new",
    /** The head's count of unseen items, lowercase by CSS. */
    newCount: (n: number) => `· ${n} new`,
    /** The head's right link, to Settings, while at least one kind is on. */
    choose: "Choose what shows",
    /** Day labels, only when the shown list holds both. "Earlier" rather than the board's "Earlier this week": the feed keeps fourteen days. */
    today: "Today",
    earlier: "Earlier",
    /** The footer, past five: what is not shown, and the press that shows it in place. */
    more: (n: number) => `${n} more`,
    showAll: (n: number) => `Show all ${n}`,
    /** Kinds on, nothing in the window: the bold lead, then the kinds that are on, by name. */
    quietLead: "Nothing new right now.",
    quietRest: (kinds: string) => `You hear about ${kinds} here.`,
    /** The inline opt-in while every kind is off (handoff call 7). The boxes reuse `news.kinds`. */
    optIn: {
      title: "Choose what shows here",
      line: "Pick what you want to hear about. Nothing shows until you do, and you can change it in Settings.",
      save: "Show these",
      foot: "In the app only. No email, ever.",
    },
    /** The mono kicker naming each kind. */
    kicker: {
      "new-set": "New set",
      "new-precon": "New precon",
      "price-drop": "Price drop",
      "trade-match": "Trade match",
      "spare-request": "Spare request",
      combo: "Combo",
    } satisfies Record<FeedKind, string>,
    /** Each kind's one title. */
    title: {
      newSet: (set: string) => `${set} is out`,
      newPrecon: (precon: string) => `${precon} precon is out`,
      priceDrop: (card: string) => `${card} is cheaper`,
      tradeMatch: (friend: string, card: string) => `${friend} has a spare ${card}`,
      spareRequest: (friend: string, card: string) => `${friend} asks for your spare ${card}`,
      combo: (a: string, b: string) => `${a} + ${b}`,
    },
    /** Each kind's one line. */
    line: {
      newSet: (cards: number) => `${cards} cards.`,
      newPrecon: (owned: number, of: number) => `You own ${owned} of its ${of} cards.`,
      /** Follows the struck old price and the new one, both formatted. */
      priceDrop: "at the cheapest printing.",
      tradeMatch: "It’s on your wishlist.",
      spareRequest: "A friend wants a card you have spare.",
      /** Source-neutral: an upload, a hand add and a bought card all complete a pair. */
      combo: (added: string) => `You added ${added}.`,
    },
    /** The press, ending `›` where drawn as a link. */
    press: {
      newSet: "See the set",
      newPrecon: "Open in Precons",
      priceDrop: "Open the card",
      tradeMatch: (friend: string) => `See ${friend}’s spares`,
      combo: "See the combo",
    },
  },
  /** First-run Home's last checklist row, to Settings (`.frw.new`). */
  firstRun: {
    title: "Choose your news",
    line: "New sets, price drops, friends’ spares. Nothing shows until you pick.",
  },
} as const;

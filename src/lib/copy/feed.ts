// The news feed (menu and Home handoff; plan `2026-10-22-menu-home.md` PR 4). `news` is Settings' Notifications
// section (announcements handoff R1b-1, `R1b-Settings.dc.html`), placeholder copy from the board.
import type { FeedKind } from "../feed/kinds";
import { personText, type PersonParts, type ThirdPartyName } from "../person-name/brand";

// The lines that name a friend. Push text names the friend as a plain string (`toPushItem` reveals it, the one server-side
// reveal), so a plain name still yields a string; a branded one (Home's feed, Waiting on you) yields parts.
function tradeMatchTitle(friend: string, card: string): string;
function tradeMatchTitle(friend: ThirdPartyName, card: string): PersonParts;
function tradeMatchTitle(friend: string | ThirdPartyName, card: string): string | PersonParts;
function tradeMatchTitle(friend: string | ThirdPartyName, card: string): string | PersonParts {
  return typeof friend === "string" ? `${friend} has a spare ${card}` : personText`${friend} has a spare ${card}`;
}
function spareRequestTitle(friend: string, card: string): string;
function spareRequestTitle(friend: ThirdPartyName, card: string): PersonParts;
function spareRequestTitle(friend: string | ThirdPartyName, card: string): string | PersonParts;
function spareRequestTitle(friend: string | ThirdPartyName, card: string): string | PersonParts {
  return typeof friend === "string" ? `${friend} asks for your spare ${card}` : personText`${friend} asks for your spare ${card}`;
}
function seeSpares(friend: string): string;
function seeSpares(friend: ThirdPartyName): PersonParts;
function seeSpares(friend: string | ThirdPartyName): string | PersonParts;
function seeSpares(friend: string | ThirdPartyName): string | PersonParts {
  return typeof friend === "string" ? `See ${friend}’s spares` : personText`See ${friend}’s spares`;
}
function askFriend(friend: string): string;
function askFriend(friend: ThirdPartyName): PersonParts;
function askFriend(friend: string | ThirdPartyName): string | PersonParts;
function askFriend(friend: string | ThirdPartyName): string | PersonParts {
  return typeof friend === "string" ? `Ask ${friend}` : personText`Ask ${friend}`;
}

export const feedCopy = {
  news: {
    /** The mono section head, drawn uppercase by CSS. */
    head: "Notifications",
    /** The mono column head over each kind's in-app box (uppercase by CSS), and the foot's bold lead. */
    inApp: "In app",
    /** Each kind's in-app box, by name: the row's text no longer toggles it, so the box carries its own name. */
    inAppAria: (name: string) => `In app: ${name}`,
    /** Each kind's checkbox: its name, bold, and the line under it. In `FEED_KINDS` order. */
    kinds: {
      "new-set": { name: "New sets", line: "When a set comes out." },
      "new-precon": { name: "New precons", line: "When a Commander precon comes out." },
      // Wizards' announcements (announcements handoff, call 7): drafts for `/copy-review`. Default on, so `defaultOn` follows each line.
      "secret-lair": { name: "Secret Lair drops", line: "When Wizards announces a Secret Lair drop." },
      "commander-decklists": { name: "Commander decklists", line: "When Wizards posts a Commander set’s decklists." },
      "wizards-news": { name: "Other Wizards news", line: "Everything else Wizards announces." },
      "price-drop": { name: "Price drops on your wishlist", line: "A card you want gets cheaper." },
      "trade-match": { name: "Trade matches", line: "A friend has a spare of a card on your wishlist." },
      "spare-request": { name: "Friends asking for your spares", line: "A friend asks for a card you have spare." },
      combo: { name: "Combos you can make", line: "You now own both halves of a two-card combo." },
    } satisfies Record<FeedKind, { name: string; line: string }>,
    /** After a default-on kind's line (spare requests, board `Friend-Side`): it starts checked and stays so. */
    defaultOn: "On from the start.",
    /**
     * The mono foot, after a bold `inApp`: `home`, then the push clause while the Push column stands
     * (`pushSettingsCopy.foot`), then `email`.
     */
    foot: { home: ": a count on Home and the list.", email: " No email, ever." },
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
    /** With every kind off, after the offer's ✕ or from Settings (small items 6, item 6): why the box is empty. Drafts for
     *  `/copy-review`. */
    offLead: "Nothing will show here.",
    offRest: "Every kind of news is off.",
    quietRest: (kinds: string) => `You hear about ${kinds} here.`,
    /**
     * Each kind as the quiet line names it, mid-sentence (announcements G1): its own inline form, never a lowercased
     * Settings name, which would print "secret lair". The three Wizards kinds keep their capitals; every other entry is what lowercasing gave.
     */
    quietName: {
      "new-set": "new sets",
      "new-precon": "new precons",
      "secret-lair": "Secret Lair drops",
      "commander-decklists": "Commander decklists",
      "wizards-news": "Wizards news",
      "price-drop": "price drops on your wishlist",
      "trade-match": "trade matches",
      "spare-request": "friends asking for your spares",
      combo: "combos you can make",
    } satisfies Record<FeedKind, string>,
    /**
     * The offer line while the reader has never chosen: at the foot of What's new's rows (announcements call 3,
     * `Offer.dc.html`), and with nothing in the window under the quiet line, or alone with no kind on (small items 5,
     * `Offer-Empty`; it replaces the retired opt-in panel). Placeholders for `/copy-review`. Closed: the bold `lead`, then
     * `rest`, with Pick ▾ and a ✕. Opened: the bold `lead`, then `openRest`, over the shipped boxes (`news.kinds`), `save`
     * and `foot`.
     */
    offer: {
      lead: "Pick what else you want to hear about.",
      /**
       * The kinds this reader can still pick, by their quiet names, never a kind they cannot get (wishlist or friends
       * off): the first three, then "and more" past three. The board's "New sets, price drops, trade matches and more." is
       * this with all of them on.
       */
      rest: (names: readonly string[]) => {
        const shown = names.slice(0, 3);
        const head = shown.length === 1 ? shown[0] : `${shown.slice(0, -1).join(", ")}${names.length > 3 ? ", " : " and "}${shown.at(-1)}`;
        const line = names.length > 3 ? `${head} and more.` : `${head}.`;
        return line.charAt(0).toUpperCase() + line.slice(1);
      },
      openRest: "You can change it in Settings.",
      /** The press that opens the boxes in place; a ▾ follows it, unspoken. */
      pick: "Pick",
      /** The ✕: it saves an empty choice (`feed_offer_closed_at`) and sticks, kinds on or not (small items 6, item 6).
       *  Draft for `/copy-review`. */
      closeAria: "Hide this for good",
      /** The boxes' save (handoff call 7, as shipped). */
      save: "Show these",
      /** The boxes' foot (handoff call 7, as shipped). */
      foot: "In the app only. No email, ever.",
    },
    /** The mono kicker naming each kind. */
    kicker: {
      "new-set": "New set",
      "new-precon": "New precon",
      "secret-lair": "Secret Lair",
      "commander-decklists": "Commander decklists",
      "wizards-news": "Wizards news",
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
      tradeMatch: tradeMatchTitle,
      /** Also the title of the same ask on `/friends`' Waiting on you. */
      spareRequest: spareRequestTitle,
      combo: (a: string, b: string) => `${a} + ${b}`,
    },
    /** Each kind's one line. */
    line: {
      newSet: (cards: number) => `${cards} cards.`,
      newPrecon: (owned: number, of: number) => `You own ${owned} of its ${of} cards.`,
      /** Follows the struck old price and the new one, both formatted. */
      priceDrop: "at the cheapest printing.",
      tradeMatch: "It’s on your wishlist.",
      spareRequest: "Answer in Friends.",
      /** Source-neutral: an upload, a hand add and a bought card all complete a pair. */
      combo: (added: string) => `You added ${added}.`,
      /** A Commander decklists post's mono count of lists out, under its summary (board `Row-States` §5). */
      listsSoFar: (n: number, of: number) => `${n} of ${of} ${of === 1 ? "list" : "lists"} so far`,
      /** One list is just "1 list": "All 1 lists" read as a defect. */
      listsAll: (n: number) => (n === 1 ? "1 list" : `All ${n} lists`),
    },
    /** The press, ending `›` where drawn as a link. */
    press: {
      newSet: "See the set",
      newPrecon: "Open in Precons",
      /** The card on Mana Pool, in a new tab (Hugh, 2026-10-27). Its own words, shorter than card details' link out; the
       *  link-out icon and the spoken new-tab suffix are `FeedPress`'s, as `ExternalLink` draws them. */
      priceDrop: "Buy at Mana Pool",
      tradeMatch: seeSpares,
      /** With spare requests on, the press opens that card's spares sheet with Ask (signature card call 9). */
      tradeMatchAsk: askFriend,
      combo: "See the combo",
      /** A Secret Lair or Wizards news post, on magic.wizards.com in a new tab (the link-out icon and the spoken suffix are `FeedPress`'s). */
      readOnWizards: "Read on Wizards",
      /** A Commander decklists post, the same way; beside See the lists, it is the row's quieter press. */
      readPost: "Read the post",
      /** A Commander decklists post's in-app press, the row's main one: the post's set on Precons (Announcements UI 6b). */
      seeLists: "See the lists",
      /** An answer to the reader's own spare request: opens that one request over Home (small items item 3). */
      answer: "Your request",
    },
    /** The kicker of an answer to the reader's own spare request (spare requests handoff, board `Asker-States`). */
    answerKicker: "Your request",
    /**
     * The ✕ on a What's new item, its lead story and a Waiting on you row (Hugh's ruling 2026-10-27): it hides the item
     * for good and answers nothing. Placeholders for `/copy-review`.
     */
    dismiss: {
      aria: (title: string | PersonParts) => personText`Hide “${title}”`,
      failed: "We couldn’t hide that. Try again.", // toast, role alert
    },
  },
  /** First-run Home's last checklist row, to Settings (`.frw.new`). */
  firstRun: {
    title: "Choose your news",
    line: "New sets, price drops, friends’ spares. Nothing shows until you pick.",
  },
} as const;

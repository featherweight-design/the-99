// src/lib/copy/deck-import.ts — deck import block (#42).
// Shape follows src/lib/copy/collection.ts and src/lib/copy/shell.ts: flat const
// object, functions for interpolated strings, no JSX, no number formatting
// (callers pass pre-formatted, thousands-separated strings).
//
// Voice: Kitchen Table. A deck is a thing you are about to play with. A line
// that did not match is a card the app cannot name — not a mistake you made.
//
// R1, against the locked spec (docs/superpowers/specs/2026-08-02-deck-import-design.md):
//   - §Shape of the flow    → no review gate; nothing here confirms an import
//   - §Reconciliation model → unresolved rows never read as errors or as "to buy"
//   - §Commander            → a declared commander is used SILENTLY; no strings for it
//   - §Entry failures       → the blocks a paste or a file can reach; the four the spec
//                             wrote for URL fetching are gone with the mode itself (#282)
//   - §Locked decisions     → sideboard/maybeboard, dedupe and re-import are silent;
//                             quantity > 1 on a non-basic is the only parse note

import { DECK_IMPORT_FILE_MAX_LABEL } from "../upload-limits";

export const deckImportCopy = {
  // ---- Entry surface -------------------------------------------------------
  entry: {
    headingMobile: "Bring a deck over",
    heading: "Bring a deck over",
    /**
     * The handoff's `subMobile` names three doors, the third being a deck link.
     * That mode does not exist and is not being built (#282) — a decklist arrives
     * here by paste or by file — so the phone's one line of orienting copy names
     * the two doors that open. Design asked to ratify the wording.
     */
    subMobile: "Paste it or drop a file.",
    // Names both doors. The drawn line was mode-agnostic ("Point us at it")
    // because a link was one of three; with two left, naming them is clearer
    // than a phrase that fits neither exactly.
    sub: "You built it somewhere else. Paste it in or drop a file and we'll set it up here.",

    modePaste: "Paste a list",
    modePasteShort: "Paste",
    modeFile: "Upload a file",
    modeFileShort: "File",

    pasteLabel: "Your list",
    pastePlaceholder: "1 Sol Ring\n1 Cultivate\n1 Rhystic Study",
    fileLabel: "Deck file",
    // The size reads "2 MB" exactly as the handoff wrote it; it is spliced from
    // the cap's own label so the sentence cannot outlive the number it describes.
    fileHint: `A .csv or .txt, under ${DECK_IMPORT_FILE_MAX_LABEL}`,

    // The link into this surface from /decks. It sits beside "New Deck", so it
    // names the other way in rather than repeating the verb.
    decksLink: "Import a deck",

    submit: "Import deck →",
    submitFile: "Choose file",
    // Mirrors upload-entry.tsx's "Preview N cards" affordance, down to naming no
    // figure at all before there is one to name — an empty paste read
    // "Import 0 cards", which is a promise to import nothing rather than a
    // prompt to paste something.
    submitPasteCount: (n: number) =>
      n === 0 ? "Import deck →" : n === 1 ? "Import 1 card" : `Import ${n} cards`,

    footnoteMobile: "We'll leave the sideboard behind — Commander doesn't have one.",
    aboutWhatComesHeading: "What comes over",
    aboutWhatComes:
      "The commander and the 99. Sideboard and maybeboard stay behind — Commander doesn't have either.",
    aboutFailureHeading: "If a line won't match",
    aboutFailure:
      "The deck still gets made. We'll flag the line inside it and you can sort it out there.",
  },

  // ---- Waiting state -------------------------------------------------------
  // One of them. The spec drew a second for the third-party round trip a link
  // mode would have made; there is no such round trip, so reading is all there
  // is to wait on.
  parsing: {
    heading: "Reading the list",
    body: (total: string) => `Putting a card to each of the ${total} lines.`,
    bodyWithCommander: (total: string, commander: string) =>
      `Putting a card to each of the ${total} lines. Found the commander: ${commander}.`,
    progress: (done: string, total: string) => `${done} / ${total}`,
    live: "Reading the list.",
  },

  // ---- Entry failures ------------------------------------------------------
  // Each block is {heading, body, bodyMobile, action}. Nothing here carries a
  // Try again button: every remaining failure is one where trying the same thing
  // again cannot succeed. The four the spec wrote for a link fetch — bad URL,
  // private, 404, upstream down — went with the mode.
  failures: {
    fileRejected: {
      heading: "We can't open that file",
      // Both numbers are interpolated so the message names the actual file.
      bodyMobile: (ext: string, size: string) =>
        `We need a .csv or .txt under ${DECK_IMPORT_FILE_MAX_LABEL}. That one is a ${ext} at ${size}.`,
      body: (ext: string, size: string) =>
        `We need a .csv or a .txt under ${DECK_IMPORT_FILE_MAX_LABEL}. That one is a ${ext} at ${size}. Export it as CSV from wherever it came from and we’ll take it.`,
      // Eng-authored. The handoff interpolates an extension and assumes there is
      // always one; a file with no dot needs a phrase that still reads as a noun
      // in "That one is a ___ at 40 KB". Ratification owed.
      noExtension: "file with no extension",
      action: "Choose another file",
      retry: false,
    },
    // R2 correction: this is a MATCH failure, not a parse failure. Almost every
    // line parses — `parsePasteList` falls through to quantity 1 for anything it
    // cannot read as a quantity — though a bad quantity or a bare number does
    // become a parse error. Rule: rows parsed, zero matched → here. Zero rows
    // after parse → `empty` below. The copy must not tell the player their paste
    // is malformed, because that is not what this state means.
    noneMatched: {
      heading: "We couldn't find any of these cards",
      bodyMobile: (lines: number) =>
        `All ${lines} lines read fine — none of them matched a card we know.`,
      body: (lines: number) =>
        `All ${lines} lines read fine, and not one of them matched a card we know. Check you copied the decklist itself and not the page around it.`,
      action: "Clear and start over",
      retry: false,
    },
    // A success that produced nothing, so the copy does not apologise.
    empty: {
      heading: "That deck is empty",
      bodyMobile: "It read fine — there just aren't any cards in it yet.",
      body:
        "It read fine — there just aren’t any cards in it yet. Nothing to bring over. Add some where you built it and we’ll be here.",
      action: "Try a different deck",
      retry: false,
    },
    /**
     * Eng-authored, not from the handoff. `importDeck` throws on the size cap and
     * on an illegal commander, and a throw inside a transition surfaces as an error
     * boundary rather than something the player can act on. The handoff draws seven
     * failures and none of them is "the server refused", so this stands in until
     * Design rules on it — same standing as `entry.subMobileNoLink`.
     */
    unexpected: {
      heading: "That didn't go through",
      /**
       * `detail` is the thrown message when the server refused for a reason the
       * player can act on — the size cap most of all, which is theirs to fix and
       * not "our end". Blaming ourselves for a list they can see is over the cap
       * tells them to retry something that cannot succeed. Only the cap message
       * is passed through — `isDeckImportTooLargeMessage` gates it — because every
       * other throw is an internal invariant no reader should meet.
       */
      bodyMobile: (detail: string | null) =>
        detail
          ? `${detail}. Your list is still here.`
          : "Something went wrong on our end. Your list is still here.",
      body: (detail: string | null) =>
        detail
          ? `${detail}. Your list is still here — trim it and try again.`
          : "Something went wrong on our end and the deck wasn't made. Your list is still here — try it again.",
      // Not "Try again": the button dismisses the banner and hands the list back
      // for editing, and on the size cap an immediate retry cannot succeed. The
      // CTA names what it does. Ratification owed.
      action: "Back to your list",
      retry: false,
    },
  },

  // ---- Commander -----------------------------------------------------------
  // Nothing here renders when the source declares a commander. §Commander:
  // "use it and say nothing."
  commander: {
    heading: "Which one's the commander?",
    subMobile: "The list doesn't say, so you tell us.",
    sub:
      "This list doesn't say. Pick the one you're building around — it sets the colours, anchors the recommendations, and gives the deck its face.",
    // A list with exactly one unmarked legendary still opens the picker — only a
    // list with none is the dead end — so the singular is reachable, not
    // theoretical.
    introMobile: (n: number) =>
      `${n === 1 ? "1 legendary creature" : `${n} legendary creatures`} came over. Pick the one you're building around — it sets the colours and anchors everything we suggest.`,
    count: (n: number) =>
      n === 1
        ? "1 legendary creature in this import"
        : `${n} legendary creatures in this import`,
    rowMetaMobile: (identity: string, line: number) => `${identity} · line ${line}`,
    rowMetaOwned: (identity: string, line: number) => `${identity} · line ${line} · you own it`,
    rowMetaUnowned: (identity: string, line: number) =>
      `${identity} · line ${line} · not in your collection`,
    selectedLabel: "Selected",
    nameLabel: "Deck name",
    nameLabelFromSource: "Deck name — from your list",
    submit: "Make the deck →",
    footnote:
      "Only legendary creatures from this import are listed. If the one you want isn't here, it didn't come over — make the deck and add it from the builder.",

    // The dead end. No deck is created.
    noneHeading: "There's no commander in here",
    noneBody: (total: string) =>
      `Every Commander deck needs a legendary creature to lead it, and none of these ${total} lines is one. If yours is in there under a name we couldn't read, that's the line to fix.`,
    noneBodyDesktop: (total: string) =>
      `Every Commander deck needs a legendary creature to lead it, and none of these ${total} lines is one. If yours is in there under a name we couldn't read, that's the line to fix before you bring it over.`,
    noneCta: "Start from a commander instead →",
    noneBack: "Back to the list",
    noneReassurance: "Nothing was created · your list is still in the box",
  },

  // ---- Arrival on /decks/[id] ---------------------------------------------
  // One dismissible strip. There is no "import complete" screen — the deck is
  // the confirmation.
  arrival: {
    cleanMobile: (n: string) => `All ${n} came over · from your list, just now`,
    clean: (n: string) =>
      `All ${n} lines came over clean. Imported from your list a moment ago — nothing needs your attention.`,
    dismiss: "Dismiss",
  },

  // ---- Unresolved rows -----------------------------------------------------
  unresolved: {
    // Banner under the spine. Disappears at zero.
    //
    // The handoff's mobile line read "it's not in any count below", which the
    // footnote a screen down flatly contradicts — "These count toward the 99 but
    // not toward what's built" — and it dropped the Complete consequence the
    // desktop line carries. Both are the same compression: "any count" is the
    // desktop string's "the mix or either tab" with the qualifier lost. Restored
    // from desktop rather than invented. Design asked to ratify.
    bannerMobile: (n: number) =>
      n === 1
        ? "1 line came over that we couldn't put a card to. It's at the bottom, it's not in the mix or either tab below, and it'll keep the deck off Complete until you sort it out."
        : `${n} lines came over that we couldn't put a card to. They're at the bottom, they're not in the mix or either tab below, and they'll keep the deck off Complete until you sort them out.`,
    banner: (n: number) =>
      n === 1
        ? "1 line came over that we couldn't put a card to. It's sitting at the bottom of the list, it isn't counted in the mix or in either tab below, and it'll keep the deck off Complete until you sort it out."
        : `${n} lines came over that we couldn't put a card to. They're sitting at the bottom of the list, they aren't counted in the mix or in either tab below, and they'll keep the deck off Complete until you sort them out.`,
    bannerAction: "Take a look →",

    groupLabel: "Couldn't identify",
    groupNote: "counted in the 99, not in what's built",
    rowTag: "unmatched",
    rowFix: "Fix",
    // Screen-reader name for the row button. The raw string is quoted so a
    // reader does not run it into the surrounding sentence.
    rowAria: (raw: string, quantity: number) =>
      quantity > 1
        ? `Unmatched line: “${raw}”, quantity ${quantity}. Choose the card this was meant to be.`
        : `Unmatched line: “${raw}”. Choose the card this was meant to be.`,
    footnoteMobile: "These count toward the 99 but not toward what's built.",
    // The second half of Design's mobile footnote, held back until the rows are
    // actually tappable. Promising a gesture the surface does not yet offer is
    // worse than saying less.
    footnoteMobileResolve: "Tap one to put a card to it.",
    // The handoff wrote this against its own two-line example and hardcoded
    // "Both lines", which reads false at every other count. Parameterised here;
    // the wording is otherwise Design's. Ratification owed.
    // The marker on a deck's card in /decks, so a deck that imported short
    // carries the signal outside the builder too. It counts cards, matching the
    // group header beside it in the builder rather than the banner's lines.
    deckCardBadge: (n: number) =>
      n === 1 ? "1 card we couldn't name" : `${n} cards we couldn't name`,
    footnote: (n: number) =>
      n === 1
        ? "That line is still in the deck's total of 99 — it's a card the deck wants. It just isn't a card we can name yet, so it doesn't count as built or owned, and it stays out of the shopping list."
        : `All ${n} lines are still in the deck's total of 99 — they're cards the deck wants. They just aren't cards we can name yet, so they don't count as built or owned, and they stay out of the shopping list.`,
  },

  // ---- Resolution ----------------------------------------------------------
  resolve: {
    headingMobile: "What was this meant to be?",
    promptMobile: (raw: string) => `The list said ${raw}. Pick the card you meant.`,
    prompt: "what was this meant to be?",
    collapse: "Collapse",
    searchAria: (raw: string) => `Search for the card that “${raw}” was meant to be`,
    // TWO filters are deliberately off in this scope — colour identity, and the
    // owned-only filter that quick-add-bar defaults ON (#158). See README §A/§B.
    // The count and the caption are separate strings now: the count sits beside
    // the scoped owned toggle, the caption sits under both.
    resultsCount: (n: number) => `${n} result${n === 1 ? "" : "s"}`,
    filterCaptionMobile: "every card, owned or not — you're naming a line, not shopping",
    filterCaption:
      "every card, owned or not, in every colour — you're naming a line that's already in the deck, not shopping for a new one",
    ownedToggleLabel: "Owned only",
    keyboardHint: "↑↓ to move · ↵ to use the top match · Esc to collapse",
    // Right slot of the active row. The bar says '↵ add'; here it never adds.
    activeRowHint: "↵ use this",
    use: "Use this card",
    useShort: "Use this",
    rawLabel: "The line as it came",
    rawLine: (quantity: number, raw: string) => `${quantity} ${raw}`,
    rawLineNumber: (n: number) => `line ${n} of the import`,
    delete: "Delete this line",
    deleteNote: "Deleting drops it from the deck’s total too — 100 becomes 99.",
    dismiss: "Leave it for now",

    noResultsHeading: "Nothing by that name",
    noResultsBody:
      "Try a shorter piece of it — we match on any part of a card's name. If it isn't a real card, the line can go.",
    // NOTE: no 'turn off the owned filter' escape here, unlike quick-add-bar's
    // no-results copy — that filter is already off in this scope, so an empty
    // result really does mean there is no card by that name.

    // One polite live region, shared by resolve and delete. It replaces its own
    // text; it never stacks, and it never becomes a floating toast.
    // The handoff wrote one `resolved` string ending "and you own it", which is
    // false for half the cards this surface can return: owned-only is deliberately
    // OFF here (see `filterCaption`), so an unowned card is a valid answer and
    // resolving to one puts it on the shopping list rather than into what's built.
    // Split on Design's own `rowMetaOwned` / `rowMetaUnowned` precedent, which
    // draws exactly this distinction a few states earlier. Ratification owed.
    resolvedMobile: (name: string, built: string) => `That's ${name}. ${built} built now.`,
    resolvedUnownedMobile: (name: string) => `That's ${name}. It's on the shopping list.`,
    resolved: (name: string, built: string, remaining: number, role?: string) =>
      `That line was ${name} — it's in with the rest now, and you own it. ${built} built, ${remaining} line${remaining === 1 ? "" : "s"} left.${role ? ` ${role}.` : ""}`,
    resolvedUnowned: (name: string, built: string, remaining: number, role?: string) =>
      `That line was ${name} — it's in with the rest now, but you don't own it yet, so it's on the shopping list. ${built} built, ${remaining} line${remaining === 1 ? "" : "s"} left.${role ? ` ${role}.` : ""}`,
    // roleClause('Removal', 7, 10) → 'Removal is 7 of 10'. Passed into `resolved`
    // only when the resolved card lands in a tracked role — until this moment an
    // unresolved row had no oracle ID and so counted toward no role at all.
    roleClause: (role: string, have: number, target: number) =>
      `${role} is ${have} of ${target}`,
    deletedMobile: (raw: string, total: string) =>
      `Dropped ${raw}. The deck wants ${total} now.`,
    // `priorTotal` is passed in rather than derived: this module's contract is that
    // callers hand over pre-formatted, thousands-separated strings, and `Number("1,234")`
    // is NaN. The handoff computed it inline, which works only until a deck has 1,000 lines.
    deleted: (raw: string, total: string, priorTotal: string) =>
      `Dropped ${raw}. The deck wants ${total} cards now instead of ${priorTotal}.`,
    undo: "Undo",
  },

  // ---- Parse notes ---------------------------------------------------------
  // The one non-fatal note the spec calls for. Everything else the parser drops
  // — tokens, emblems, sideboard, maybeboard, a commander duplicated into the
  // 99 — is dropped in silence.
  notes: {
    quantityClamped: (n: number) =>
      n === 1
        ? "One line asked for more than one copy of a card that only takes one. We brought over a single copy."
        : `${n} lines asked for more than one copy of a card that only takes one. We brought over a single copy of each.`,
  },
} as const;

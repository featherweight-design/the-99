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

/** The import strip's printing clauses, joined: `12 with the printing you own, 3 not in your
 *  Collection`. Either count 0 drops its clause. */
function printingClauses(kept: number, notOwned: number, keptWords: string): string {
  return [
    kept > 0 ? `${kept.toLocaleString("en-US")} ${keptWords}` : null,
    notOwned > 0 ? `${notOwned.toLocaleString("en-US")} not in your Collection` : null,
  ].filter(Boolean).join(", ");
}

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

    footnoteMobile: "We'll leave the sideboard behind: Commander doesn't have one.",
    aboutWhatComesHeading: "What comes over",
    aboutWhatComes:
      "The commander and the 99. Sideboard and maybeboard stay behind: Commander doesn't have either.",
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
        `All ${lines} lines read fine: none of them matched a card we know.`,
      body: (lines: number) =>
        `All ${lines} lines read fine, and not one of them matched a card we know. Check you copied the decklist itself and not the page around it.`,
      action: "Clear and start over",
      retry: false,
    },
    // A success that produced nothing, so the copy does not apologise.
    empty: {
      heading: "That deck is empty",
      bodyMobile: "It read fine: there just aren't any cards in it yet.",
      body:
        "It read fine: there just aren’t any cards in it yet. Add some where you built it and bring it back.",
      action: "Try a different deck",
      retry: false,
    },
    /**
     * Eng-authored, not from the handoff — the handoff predates CSV-column
     * parsing. `detail` is the parser's own account of the first problem
     * (`resolveDeckListInput`'s `describeCsvErrors`), which is specific enough
     * to act on and carries no internal-invariant risk: it only ever names a
     * missing header or a malformed row, never anything else the server
     * might throw. Mode-agnostic deliberately: `resolveDeckListInput` reads a
     * CSV header out of pasted text exactly as it does out of a file, so a
     * player who pastes spreadsheet rows meets this too, and "upload it
     * again" / "Choose another file" would promise a dialog that never opens
     * for them. Same standing as `unexpected` below — ratification owed.
     */
    badCsv: {
      heading: "We can't read that",
      bodyMobile: (detail: string) => `${detail}. Fix it and try again.`,
      body: (detail: string) => `${detail}. Fix it and try again. Nothing was changed.`,
      action: "Try again",
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
      heading: "That didn’t go through",
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
          : "Something went wrong on our end. Your list is still here. Check your decks before you try again.",
      body: (detail: string | null) =>
        detail
          ? `${detail}. Your list is still here. Trim it and try again.`
          : "Something went wrong on our end, and we can’t confirm the deck was made. Your list is still here. Check your decks before you try again.",
      // Not "Try again": the button dismisses the banner and hands the list back
      // for editing, and on the size cap an immediate retry cannot succeed. The
      // CTA names what it does. Ratification owed.
      action: "Back to your list",
      retry: false,
    },
    /**
     * The update's comparison threw. It only reads, so nothing was written and the
     * reader has no deck to go and check; the cap message passes through as above.
     */
    unexpectedCompare: {
      heading: "That didn’t go through",
      bodyMobile: (detail: string | null) =>
        detail ? `${detail}. Your list is still here.` : "Something went wrong on our end. Your list is still here.",
      body: (detail: string | null) =>
        detail
          ? `${detail}. Your list is still here. Trim it and try again.`
          : "Something went wrong on our end, and nothing was changed. Your list is still here. Try it again.",
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
      "This list doesn't say. Pick the one you're building around: it sets the colors and anchors everything we suggest.",
    // A list with exactly one unmarked legendary still opens the picker — only a
    // list with none is the dead end — so the singular is reachable, not
    // theoretical.
    introMobile: (n: number) =>
      `${n === 1 ? "1 legendary creature" : `${n} legendary creatures`} came over. Pick the one you're building around: it sets the colors and anchors everything we suggest.`,
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
    nameLabelFromSource: "Deck name: from your list",
    submit: "Make the deck →",
    footnote:
      "Only legendary creatures from this import are listed. If the one you want isn't here, it didn't come over. Make the deck and add it from the builder.",

    // The dead end. No deck is created.
    noneHeading: "There's no commander in here",
    noneBody: (total: string) =>
      `Every Commander deck needs a legendary creature to lead it, and none of these ${total} lines is one. If yours is in there under a name we couldn't read, that's the line to fix.`,
    noneBodyDesktop: (total: string) =>
      `Every Commander deck needs a legendary creature to lead it, and none of these ${total} lines is one. If yours is in there under a name we couldn't read, that's the line to fix before you bring it over.`,
    noneCta: "Start from a commander instead →",
    noneBack: "Back to the list",
    // "still here", the phrasing `failures.unexpected` already uses for the same
    // fact. The drawn line said "in the box", which is a metaphor for a surface
    // the player is looking at.
    noneReassurance: "Nothing was created · your list is still here",

    // ---- The partner slot --------------------------------------------------

    // The two eyebrows in the Selected sidebar. They appear TOGETHER with the
    // slot and never before it: a lone `Commander` label over a single pick is a
    // new word on a shipped surface for no gain, and it is the label pair that
    // carries the order in text.
    primaryLabel: "Commander",
    partnerLabel: "Partner",

    // State B, the empty plate. A verb, not a noun: the plate is a button.
    addPartner: "Add a partner",

    // State B's caption. `ability` is printed VERBATIM from
    // partnerAbility(oracleText) — `Partner`, `Partner—Father & son`,
    // `Partner with Pir`. The card's own words answer "why can this deck have
    // two?" better than any sentence of ours, and the em-dashed restricted form
    // is the reason the spec needed the `restricted` arm at all.
    //
    // `n` is the canPair count over the player's owned legal commanders, so a
    // filter that returns 3 of 400 is visibly a filter and not a broken list.
    // At n === 0 the ability still prints and the plate is still drawn: the
    // commander CAN pair, the player just owns nothing to pair it with, and that
    // is a collection fact rather than a disabled control.
    partnerAvailable: (ability: string, n: number) =>
      n === 1
        ? `${ability} · 1 of your commanders can pair`
        : `${ability} · ${n} of your commanders can pair`,
    partnerNoneOwned: (ability: string) => `${ability} · none of your commanders can pair`,

    // State C, the import proposal. `line` is the source line number the
    // importer already tracks (`sourceLine`), which is what makes the proposal
    // auditable against the paste rather than merely reversible.
    proposed: (line: number) => `Proposed · from your list, line ${line}`,
    // The primary's eyebrow in import mode, where BOTH halves came from the paste.
    primaryLabelFromSource: "Commander · from your list",

    // The slot's two actions. `Change` re-opens the filtered list; `Remove`
    // returns to state B. Both are text, both are 11px mono, and neither is
    // accent — refresh decision 3 reserves accent for `in use` and `to buy`, and
    // a proposal is neither.
    change: "Change",
    remove: "Remove",

    // ---- The re-headed list, while a partner is being picked ---------------
    //
    // `short` is shortCommanderName(primary.name) — the primary scrolls out of
    // view on a phone, so this strip is the only thing naming what you are
    // pairing. Short rather than full because the strip also carries the count
    // and a Cancel, and the full name is 27 characters of a 358px row.
    pairingFor: (short: string, n: number) => `Partners for ${short} · ${n}`,
    pairingCancel: "Cancel",

    // ---- The header's second card trigger ----------------------------------
    //
    // The header band is one image — the primary's — so the partner's printing
    // opens from the word that names it. This is the trigger's accessible name;
    // the visible affordance is a hairline rule under the partner's half of the
    // caption and nothing else. The primary needs no equivalent: its trigger is the 230px
    // of art beside the text.
    partnerCardAria: (partner: string) => `Show the printing for ${partner}`,

    // ---- Accessible names --------------------------------------------------
    //
    // The one thing the pixels are allowed to drop, and the one thing the
    // accessible name is not. Primary first, both in full, on every surface that
    // truncates or shortens — the resume row and the rail.
    pairAria: (primary: string, partner: string) => `${primary}, with partner ${partner}`,
    // The resume row drops the to-buy clause on pair decks, so the accessible
    // name is where it survives. Appended after pairAria's names.
    pairRowBuyAria: (copies: number) =>
      copies === 1 ? "1 copy to buy" : `${copies} copies to buy`,
    // The empty plate's accessible name, since `Add a partner` alone does not say
    // a partner for WHAT once the list has scrolled.
    addPartnerAria: (primary: string) => `Add a partner for ${primary}`,
    // The proposal's, so a screen reader hears that it is reversible before it
    // hears the name.
    proposedAria: (partner: string) =>
      `Proposed partner from your list: ${partner}. Change or remove.`,
  },

  // ---- Arrival on /decks/[id] ---------------------------------------------
  // One dismissible strip. There is no "import complete" screen — the deck is
  // the confirmation.
  arrival: {
    cleanMobile: (n: string) => `All ${n} came over · from your list, just now`,
    clean: (n: string) =>
      `All ${n} lines came over clean. Imported from your list a moment ago.`,
    // Deck printings: the clean strip with the import's printing clauses (R3 canvas, part C; Hugh's
    // ruling a adds the not-owned clause). `kept` and `notOwned` are card counts, either 0 to omit
    // its clause; the caller uses `clean` when both are. The phone keeps the canvas's short form.
    cleanWithPrintings: (n: string, kept: number, notOwned: number) =>
      `All ${n} lines came over clean, ${printingClauses(kept, notOwned, "with the printing you own")}. Imported from your list a moment ago.`,
    cleanWithPrintingsMobile: (n: string, kept: number, notOwned: number) =>
      `All ${n} came over · ${printingClauses(kept, notOwned, kept === 1 ? "printing kept" : "printings kept")}`,
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
        ? "That line is still in the deck's total of 99. It's a card the deck wants. It just isn't a card we can name yet, so it doesn't count as built or owned, and it stays out of the shopping list."
        : `All ${n} lines are still in the deck's total of 99. They're cards the deck wants. They just aren't cards we can name yet, so they don't count as built or owned, and they stay out of the shopping list.`,
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
    filterCaptionMobile: "every card, owned or not: you're naming a line, not shopping",
    filterCaption:
      "every card, owned or not, in every color: you're naming a line that's already in the deck, not shopping for a new one",
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
    deleteNote: "Deleting drops it from the deck’s total too: 100 becomes 99.",
    dismiss: "Leave it for now",

    noResultsHeading: "Nothing by that name",
    noResultsBody:
      "Try a shorter piece of it: we match on any part of a card's name. If it isn't a real card, the line can go.",
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
      `That line was ${name}. It's in with the rest now, and you own it. ${built} built, ${remaining} line${remaining === 1 ? "" : "s"} left.${role ? ` ${role}.` : ""}`,
    resolvedUnowned: (name: string, built: string, remaining: number, role?: string) =>
      `That line was ${name}. It's in with the rest now, but you don't own it yet, so it's on the shopping list. ${built} built, ${remaining} line${remaining === 1 ? "" : "s"} left.${role ? ` ${role}.` : ""}`,
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
    // Two commanders is the format's whole allowance. A third line is kept out
    // of the 99 — a commander sitting in the 99 would change the deck's colour
    // identity — so the deck the player gets is one card shorter than the list
    // they pasted, and this is the only account of where it went.
    thirdCommanderDeclared: (n: number) =>
      n === 1
        ? "One more line was marked as a commander. A deck takes two at most, so we left it out."
        : `${n} more lines were marked as commanders. A deck takes two at most, so we left them out.`,
    quantityClamped: (n: number) =>
      n === 1
        ? "One line asked for more than one copy of a card that only takes one. We brought over a single copy."
        : `${n} lines asked for more than one copy of a card that only takes one. We brought over a single copy of each.`,
  },

  // ---- Updating a deck from a list (#277) ---------------------------------
  // Transcribed from design/design_handoff_the99_amendments/deck-reimport ·
  // copy strings.ts. A sibling of `arrival`, `entry` and `failures` rather than
  // an edit of them: a first import and an update state different facts, and
  // every string those blocks own is reused verbatim by this flow.
  //
  // Two rules specific to it: nothing apologises and nothing warns twice — the
  // screen is about a decision, not a hazard — and every sentence about
  // deletion says what the player can do about it in the same breath.
  update: {
    // One string, both entry points. "from a list" rather than "from a
    // decklist": the surface it opens takes a paste or a file, and the deck
    // card's menu has no room to say so.
    entryLabel: "Update from a list",
    entryAria: (deckName: string) => `Update ${deckName} from a list`,

    list: {
      heading: (deckName: string) => `Update ${deckName}`,
      sub: "Paste the list as it stands now. We will show you what changes before anything is saved.",
      subMobile: "Paste it. We show you what changes first.",
      // Promises a comparison, not a creation.
      submit: "Compare with this deck",
      reassure: "Nothing is saved yet.",
      reassureMobile: "Nothing is saved until you say so on the next screen.",
      aboutHeading: "What we do with it",
      about:
        "The list becomes the deck. Cards in it that you do not have here get added; cards here that it does not name get removed, and you can keep any of those on the next screen.",
      aboutKeepsHeading: "What stays put",
      aboutKeeps:
        "The deck's name and its commander. A list naming a different commander is a different deck, and we will say so rather than swap it.",
    },

    diff: {
      heading: "What this list changes",
      // Said above the preview's groups on a deck that has a version: what this
      // paste changes becomes a DRAFT, and nothing about the deck's claims moves
      // until the player commits. Without it the preview reads like the write is
      // final, which on a versioned deck it is not.
      draftPasteNotice: (version: number) =>
        `This deck is on v${version}. Applying this list changes your pending changes, not the ` +
        "committed deck. You will still commit it yourself.",
      // "lines" not "cards" — one line can carry many copies, the distinction
      // the shipped arrival strip is also careful about.
      provenance: (lines: string, deckName: string, built: string) =>
        `${lines} lines read from your paste, matched against the ${built} cards in ${deckName}. Nothing is saved until you apply it.`,
      provenanceMobile: (lines: string, built: string) =>
        `${lines} lines · matched against ${built} cards`,

      // Lowercase because they are units under a figure, the treatment the
      // facet strip gives its counts.
      chipOut: "out",
      chipIn: "in",
      chipUnnamed: "we cannot name",
      chipUnnamedMobile: "unnamed",
      chipUnchanged: "unchanged",
      chipUnchangedMobile: "same",
      landing: (from: string, to: string) => `${from} → ${to} / 99`,

      outHeading: (n: string) => `Coming out · ${n}`,
      // One sentence, with no hand-added variant. Nothing records who placed a
      // card — `auto` is false for a hand-add and for a previous import's rows
      // alike — so no removal can honestly be labelled differently from any
      // other. Product ruled the variants out on 2026-09-05.
      outBody: "Your list does not name these.",
      keepAll: (n: string) => `Keep all ${n}`,

      inHeading: (n: string) => `Going in · ${n}`,
      // The shipped ownership vocabulary — new cards can cost money, and this
      // is how the app already says so.
      inMeta: (owned: string, toBuy: string) => `${owned} owned · ${toBuy} to buy`,

      unnamedHeading: (n: string) => `We cannot name these · ${n}`,
      // Says the replacement out loud: it is the one write in this flow a
      // player could not have predicted from the group headings.
      unnamedBody: (existing: string) =>
        existing === "0"
          ? "They come across as lines you can resolve on the deck, exactly as an import's do."
          : existing === "1"
            ? "They come across as lines you can resolve on the deck, exactly as an import's do, and they replace the 1 unresolved line this deck is carrying now."
            : `They come across as lines you can resolve on the deck, exactly as an import's do, and they replace the ${existing} unresolved lines this deck is carrying now.`,

      // A count that moves is reconciled in silence — the ruling that keeps a
      // basic's 12 → 9 from burying the cards that actually left the deck.
      // Silence about the change is not silence about the arithmetic, though:
      // the landing figure carries those copies, so a player adding the chips
      // up lands short of it with nothing on the screen to say why. This line
      // is that why. It stays a line rather than a group for the same reason
      // the change is quiet.
      recounted: (list: string) => `Same cards, new counts: ${list}.`,
      recountedItem: (name: string, from: string, to: string) => `${name} ${from} → ${to}`,

      unchangedDisclosure: (n: string) => `Show the ${n} that do not change`,
      // "the other N" rather than "N more": the group header already printed
      // the total, so this names the remainder.
      showMore: (n: string) => `Show the other ${n}`,
      showFewer: "Show fewer",

      keep: "Keep",
      kept: "Kept ✓",
      keptMobile: "✓",
      keepAria: (name: string) => `Keep ${name} in the deck`,
      // Carries the `auto` marker and nothing else. There is no hand-added
      // counterpart for the same reason `outBody` has no variant: `auto ===
      // false` says only that the app did not place the card, which is as true
      // of a previous import's rows as of a hand-add.
      rowAria: (name: string, marker: string) => (marker ? `${name}. ${marker}.` : name),
      ariaAuto: "Added automatically",
      sourceLine: (n: string) => `line ${n}`,

      // States what it will do, recomputed on every Keep. Never "Apply" and
      // never "Confirm": it is the last thing read before the only
      // irreversible click in the flow.
      apply: (inN: string, outN: string) => `Update the deck: ${inN} in, ${outN} out`,
      applyMobile: (inN: string, outN: string) => `Update: ${inN} in, ${outN} out`,
      applyAria: (inN: string, outN: string, deckName: string) =>
        `Update ${deckName}: add ${inN} cards, remove ${outN}`,
      cancel: "Cancel",
      summary: (kept: string, to: string) =>
        kept === "0"
          ? `lands at ${to} / 99`
          : kept === "1"
            ? `1 kept · lands at ${to} / 99`
            : `${kept} kept · lands at ${to} / 99`,
      // One message per settle, debounced — six fast toggles is one
      // announcement, the contract the synergy selection already uses.
      liveKept: (kept: string, inN: string, outN: string) =>
        `${kept} kept. This update will add ${inN} and remove ${outN}.`,

      wholesaleNote: (inN: string, outN: string) =>
        `This replaces the whole deck. ${inN} cards in, ${outN} out. If that is not what you meant, the list you pasted is probably a different deck. Import it as its own instead.`,
      importAsNew: "Import as new instead",
    },

    // Not an error and not a success: a null result with two ways out. Fires
    // also when every difference is an unresolved line the deck already carries.
    noChange: {
      heading: "This list is the deck you already have",
      body: (built: string) =>
        `All ${built} cards match, nothing to add, nothing to take out. We have changed nothing.`,
      back: "Back to the deck",
      retry: "Try a different list",
    },

    // The shipped failure-banner shape. Never --danger: the player pasted the
    // wrong list, which is not a fault.
    conflict: {
      heading: (listCommander: string) => `That list is a ${listCommander} deck`,
      body: (deckCommander: string) =>
        `This deck is built around ${deckCommander}. Changing the commander re-decides the colors and the legality of all ninety-nine, so we will not swap it out from under you.`,
      primary: "Import it as a new deck",
      cancel: "Cancel",
    },

    applying: {
      heading: "Updating the deck…",
      // The promise, without the mechanism that makes it true — "one
      // transaction" is our word for it, not the player's.
      body: "The whole update lands or none of it does.",
      live: "Updating the deck.",
    },
    refused: {
      heading: "We couldn’t confirm that update",
      body: "Open the deck in another tab to see where it stands. Your list is still here.",
      action: "Try again",
    },

    // A sibling of `arrival`, not an edit of it. A first import's only fact is
    // how much arrived; an update's only interesting fact is what moved.
    arrival: {
      updated: (inN: string, outN: string) =>
        `Updated from your list: ${inN} in, ${outN} out.`,
      updatedWithKept: (inN: string, outN: string, kept: string) =>
        kept === "1"
          ? `Updated from your list: ${inN} in, ${outN} out, 1 you kept.`
          : `Updated from your list: ${inN} in, ${outN} out, ${kept} you kept.`,
      updatedMobile: (inN: string, outN: string) => `Updated: ${inN} in, ${outN} out`,
      // State 20. A `?updated=` value that is not ours still says an update
      // brought the player here, so the strip states the fact and drops the
      // figures rather than printing NaN.
      updatedNoCounts: "Updated from your list.",
      dismiss: "Dismiss",
    },
  },
} as const;

// Proposed copy for the Tuning hub (R1). PLACEHOLDERS: /copy-review resolves wording.
// US English, no em dashes. Never the words AI, model or LLM: tier 2 is "a deeper look".
// Reuses, never restates: creditsCopy.* (credit lines), overCopy.trim.* (the trim line),
// deckTuningCopy.* (Suggested changes, unchanged), helpMeChooseCopy.deeper (shape only).

export const tuningHubCopy = {
  hub: {
    title: "Tuning",
    allTools: "All tools",
    back: "‹ Tuning",
    tools: {
      suggested: { name: "Suggested changes", purpose: "Up to five swaps, read from your games, your notes and the list.", cost: "1 credit a run" },
      mana: { name: "Mana Balance", purpose: "Counts every source of each color against what your spells ask for.", cost: "free · look deeper 1 credit" },
      cuts: {
        name: "Proposed cuts",
        purpose: "A shortlist of what to cut, each with the reason it was picked.",
        // Hugh, landing feedback: the tile names a paid second look, as Mana Balance's does.
        // Brief §Proposed cuts ships tier 1 only; this cost line assumes tier 2 lands with it.
        cost: "free · look deeper 1 credit",
        over: (n: number) => `this deck is ${n} over`,
        // Inert tile. `total` is the spine's figure, commanders included (ruling 4).
        notOffered: (total: number) => `Offered once the deck passes 100 cards. This one is at ${total}.`,
      },
      history: { name: "History", purpose: "Every run of every tool on this deck, newest first.", runs: (n: number, running: number) => `${n} runs${running ? ` · ${running} running` : ""}` },
    },
    // Dates are US short form, month first: "Oct 7", "Oct 7 · 9:40 PM" (Hugh, landing feedback).
    lastRun: (date: string, outcome?: string) => `last run ${date}${outcome ? ` · ${outcome}` : ""}`,
    running: { suggested: "reading your deck", deeper: "looking deeper", cuts: "ranking" },
  },
  shortcuts: {
    proposedCuts: "Proposed cuts →",
    balanceMana: "balance mana →",
    balanceManaShort: "balance →",
    balanceManaAria: (have: number, target: number, color: string) => `Land, ${have} of ${target}. ${color} is short. Open Mana Balance.`,
  },
  mana: {
    sub: "free · counted just now",
    lead: (color: string, n: number, pips: number, have: number, covers: number, covered: string) =>
      `${color} is short by ${n}. Your spells ask for ${pips} ${color.toLowerCase()} pips and the deck has ${have} ${color.toLowerCase()} sources, where ${covers} would cover them. ${covered} covered.`,
    leadAllCovered: "Every color is covered.",
    head: { color: "Color", asked: "Cost", sources: "Sources", status: "Status" },
    covered: "covered",
    short: (n: number) => `short ${n}`,
    // Legend: Deck Stats mana's own labels, plus the tick.
    legend: { land: "Land", other: "Mana rock, dork or land search", covers: "Covers the cost" },
    notCountedShort: (n: number) => `${n} not counted`,
    notCountedTip: (name: string) => `We can’t read what ${name} makes, so it’s left out of every figure.`,
    dorks: (n: number, color: string) => `${n} ${color} sources are creatures: counted, and a wipe takes them.`,
    notCounted: (name: string) => `1 card not counted: we can’t read what ${name} makes. It is left out of every figure above.`,
    // Two lists (Mana Balance and Suggested changes): Additions and Cuts, a line each.
    lists: { head: "From the count", additions: "Additions", cuts: "Cuts", add: "Add", cut: "Cut", reject: "Reject", applyAll: "Apply all", applyRest: "Apply the rest", added: "added", cutDone: "cut", rejected: "rejected", undo: "Undo", showAgain: "Show it again" },
    tally: (into: number, out: number, total: number, now: number) =>
      `+${into} in · −${out} out · ${total === now ? `stays at ${total}` : `the deck goes to ${total}`}`,
    counted: "counted",
    staplePct: (pct: number, commander: string) => `in ${pct}% of ${commander} decks on EDHREC`,
    after: { stays: (n: number) => `the deck stays at ${n}`, goes: (n: number) => `the deck goes to ${n}`, noCut: (n: number) => `adds without a cut · the deck goes to ${n}` },
    add: "Add",
    thin: (n: number, commander: string) => `No staple suggestion this time. EDHREC lists ${n} ${commander} decks, too few to say which rocks they usually run. The count above needs no EDHREC data.`,
    foot: "Counted from the list as it is now. Open it again and it counts again; nothing is spent.",
    failed: { tag: "Couldn’t count", heading: "We couldn’t count this deck’s mana", body: "The card catalog didn’t answer, so there is nothing to show yet. It is usually back within a minute.", kept: "your list is untouched · nothing was spent", deeperWaits: "Look deeper needs the count, so it waits for it." },
  },
  deeper: {
    title: "Want a closer read?",
    lead: "A deeper look reads your description and game notes against this count, and checks every rules claim against the card’s own text.",
    // The cost rides inside the button as a segment; no separate tag.
    costSegment: "1 credit",
    actionAria: "Look deeper. Uses 1 credit.",
    actionAriaSpent: "Look deeper. No credits left.",
    standing: (left: number, total: number, next: string) => `${left} of ${total} credits left · next one at ${next}`,
    action: "Look deeper",
    pending: "Looking deeper…",
    pendingLead: "The count below stays until the deeper look is ready.",
    pendingLine: (notes: number, cards: number, elapsed: string) => `reading your description, ${notes} game notes and ${cards} cards · ${elapsed} · stopping gives the credit back`,
    stop: "Stop",
    doneTitle: "Deeper look",
    doneTag: "done",
    doneRead: (notes: number, cards: number) => `read your description, ${notes} game notes, ${cards} cards and the count below`,
    doneLine: (standing: string) => `1 credit used · ${standing}`,
    countDivider: "The count, unchanged",
    refused: "The deeper look found nothing it could check against this deck, so it showed nothing. Your credit came back, and the count below stands.",
    // The failure mark's aria-label (it replaces the visible tag).
    failTag: "Didn’t finish",
    failed: "The deeper look didn’t finish, so your credit came back. The count below is unchanged.",
    retry: "Try again",
  },
  claim: {
    // Kind tags. Same width, same slot.
    checked: "Checked",
    unchecked: "Unchecked",
    suggestion: "Suggestion",
  },
  // New citation source names, beside deckTuningCopy.card.cite.
  cite: { cardText: "card text", count: "count", edhrec: "edhrec", role: "role", curve: "curve", bracket: "bracket" },
  cuts: {
    sub: "free",
    reading: (cards: number) => `Ranking your ${cards} cards. A second, usually less.`,
    readRows: { list: "Your list", edhrec: (commander: string) => `EDHREC inclusion for ${commander}`, roles: "Your roles and curve", bracket: "Bracket flags" },
    lead: (n: number) => `${n} cards to look at, likeliest cut first. Cut writes to the list straight away.`,
    leadPart: (cut: number) => `${cut} cut. The rest stay ranked as they were.`,
    leadThin: (n: number) => `${n} cards to look at, ranked by role, curve and bracket only.`,
    thinRow: (n: number) => `${n} decks · too few to rank by`,
    reason: {
      edhrec: (pct: number, commander: string, median: number) => `in ${pct}% of ${commander} decks · your median card ${median}%`,
      role: (role: string, have: number, rec: number) => `${role} ${have} · rec ${rec}`,
      curve: (mv: number, n: number, total: number) => `${mv} mana · ${n} of ${total} cost 7 or more`,
      bracket: (flag: string, bracket: number, allows: number, has: number) => `${flag} · bracket ${bracket} allows ${allows}, this deck has ${has}`,
    },
    cut: "Cut",
    keep: "Keep",
    cutDone: "cut",
    kept: "kept",
    undo: "Undo",
    showAgain: "Show it again",
    more: (n: number) => `Show ${n} more`,
    neverCut: (commander: string, locked: number) => `Never lists ${commander} or the ${locked} cards you locked.`,
    rankAgain: "Rank again",
    tally: (cut: number, toGo: number) => `free · ${cut} cut · ${toGo} to go`,
    done: { head: (body: number, cut: number) => `Back to ${body} / ${body}. You cut ${cut}.`, body: "The deck isn’t over any more, so Proposed cuts closes here." },
    // Always overage + 2 candidates (Hugh).
    candidates: (over: number) => over + 2,
    deeper: {
      lead: "A deeper look reads your description, notes and games against this shortlist, and says which cuts fit what the deck is for.",
      pendingLead: "The shortlist below stays, and you can keep cutting while it reads.",
      doneRead: (notes: number, n: number) => `read your description, ${notes} game notes and the ${n} candidates below`,
      divider: "The shortlist, unchanged",
      cutFirst: (name: string) => `${name}: cut it first.`,
      keep: (name: string) => `${name}: keep it.`,
    },
    allLocked: (commander: string) => `Every card but ${commander} is locked, so there is nothing to cut. Unlock a card on Your deck and it can be ranked here.`,
    failed: { tag: "Couldn’t rank", heading: "We couldn’t rank this deck’s cards", body: "The card catalog didn’t answer. It is usually back within a minute." },
  },
  history: {
    sub: "every run of every tool · newest first",
    filterAll: "All",
    tool: { suggested: "Suggested", mana: "Mana", cuts: "Cuts" },
    tier: { free: "free", credit: "1 credit", deeper: "deeper look" },
    outcome: { ok: "ok", refused: "refused", failed: "failed", stopped: "stopped", running: "running" },
    more: "Show 20 more",
    foot: "Kept for as long as the deck is. A free count is recorded once per version of the list.",
    empty: { head: "No runs yet", body: "Every run of every Tuning tool on this deck lands here, newest first, and opens again read-only." },
    emptyFiltered: "No runs of this tool yet",
    back: "‹ History",
    pastMeta: (date: string, version: number, tier: string) => `${date} · version ${version} · ${tier}`,
    pastNote: (n: number) => `A past run, read-only. The list has changed by ${n} cards since; nothing here can be applied now.`,
    leftOpen: "left open",
    loadFailed: { tag: "Couldn’t load", body: "This deck’s history didn’t load. The runs are kept; only the list failed to arrive." },
  },
} as const;

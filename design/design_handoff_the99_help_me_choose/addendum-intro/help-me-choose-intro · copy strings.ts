// Help me choose: the intro above the form (Help me choose intro R1, 2026-11-24). What the tool does, how it helps,
// and what is free and what uses a credit. Never the words AI, model or LLM (the audit's wording rule): the read of
// "Anything else?" is "reads what you wrote".

export const helpMeChooseIntroCopy = {
  kicker: "How it works",
  title: "Describe the deck. See which commanders fit it.",
  lead: "Every commander is ranked by how many of its decks match your answers, owned or not, and each one says why in a line you can check.",
  /** The example's answers, drawn over the example row as the results' own chips would draw them. */
  exampleAsk: "Example · Dinosaurs · under $150",
  exampleName: "Ghalta, Primal Hunger",
  exampleFit: "91% of its decks are Dinosaurs",
  exampleOwn: "you own 79 of its 99 · about $135 to buy",
  steps: [
    { title: "Answer what you like", line: "Colors, themes, sets, budget, bracket. Every answer is optional." },
    { title: "See who fits", line: "The closest fits lead, each with the figure that ranks it." },
    { title: "Build it", line: "Pick one and a deck starts from your cards, the rest priced." },
  ],
  free: {
    title: "Free, every time",
    line: "Your answers, the ranked results and every past run in History. Run it as often as you like.",
  },
  paid: {
    cost: "1 credit",
    title: "Anything else?",
    line: "Write the deck in your own words, and it reads them against every commander your answers allow. Leave it empty and nothing is spent.",
    jump: "Go to Anything else?",
    /** Under the tile: the reader's own daily allowance, shared with every tool that uses credits. */
    daily: (free: number) => (free === 1 ? "1 free credit a day, shared by every tool" : `${free} free credits a day, shared by every tool`),
  },
  hide: "Hide",
  /** Folded: the one line a returning player sees, after their first run. */
  folded: "How Help me choose works",
  foldedTail: "Free unless you write in Anything else?",
  foldedAria: "Show how Help me choose works",
} as const;

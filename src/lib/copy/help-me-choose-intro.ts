// Help me choose intro — copy (Help me choose intro PR 2).
//
// Transcribed verbatim from the handoff's `help-me-choose-intro · copy strings.ts`
// (design/design_handoff_the99_help_me_choose/addendum-intro, READINESS Yellow, G4), then run through
// /copy-review on 2026-11-24 with every string kept. The paid tile's `1 credit` pill is not here: it
// draws `helpMeChooseCopy.read.cost`, the same words the form's press carries.

export const helpMeChooseIntroCopy = {
  kicker: "How it works",
  title: "Describe the deck. See which commanders fit it.",
  lead: "Every commander is ranked by how many of its decks match your answers, owned or not, and each one says why in a line you can check.",
  exampleAsk: "Example · Dinosaurs · under $150",
  exampleName: "Ghalta, Primal Hunger",
  /** The example's fit line: the figure, then the rest of the line. */
  exampleFitFigure: "91%",
  exampleFit: "of its decks are Dinosaurs",
  exampleOwn: "you own 79 of its 99 · about $135 to buy",
  steps: [
    { title: "Answer what you like", line: "Colors, themes, sets, budget, bracket. Every answer is optional." },
    { title: "See who fits", line: "The closest fits lead, each with the figure that ranks it." },
    { title: "Build it", line: "Pick one and a deck starts from your cards, the rest priced." },
  ],
  free: { title: "Free, every time", line: "Your answers, the ranked results and every past run in History. Run it as often as you like." },
  paid: {
    title: "Anything else?",
    line: "Write the deck in your own words, and it reads them against every commander your answers allow. Leave it empty and nothing is spent.",
    jump: "Go to Anything else?",
    /** The jump link's trailing arrow, set off by a non-breaking space. */
    jumpArrow: "\u00a0\u2193",
    /** The reader's own daily limit. Omitted while credits are off. */
    daily: (free: number) => (free === 1 ? "1 free credit a day, shared by every tool" : `${free} free credits a day, shared by every tool`),
  },
  hide: "Hide",
  folded: "How Help me choose works",
  foldedTail: "Free unless you write in Anything else?",
  foldedAria: "Show how Help me choose works",
} as const;

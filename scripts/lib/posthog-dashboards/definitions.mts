// The PostHog dashboards, as data (engagement tracking PR 3). `scripts/posthog-dashboards.mts` makes the dashboards and
// insights below in a PostHog project, matching by NAME: an insight that exists is updated in place, a new insight or
// dashboard is created, an existing dashboard is left as it is (its text is set when it is made), and nothing is ever deleted (a dashboard or insight Hugh adds by hand is left alone).
//
// Every query is a PostHog query object (`TrendsQuery`, `FunnelsQuery`, `RetentionQuery`) written out here rather than
// built from a template, so the file reads as what the project will hold. The event names are the registry's
// (`src/lib/analytics/engagement-events.ts`) and the server funnel's (`funnel-events.ts`); `definitions.test.mts` fails
// on a name that is in neither, so a rename cannot leave a dashboard counting nothing.

type Query = Record<string, unknown>;
export type InsightDef = { name: string; description: string; query: Query };
export type DashboardDef = { name: string; description: string; insights: InsightDef[] };

const DAYS_30 = { date_from: "-30d" };
const DAYS_90 = { date_from: "-90d" };

const event = (id: string, extra: Query = {}): Query => ({ kind: "EventsNode", event: id, name: id, ...extra });
/** Readers who did it: unique persons active in the interval (`weekly_active`; `dau` counts per day, which is not a weekly figure). */
const readers = (id: string, label: string): Query => event(id, { math: "weekly_active", custom_name: label });

const viz = (source: Query): Query => ({ kind: "InsightVizNode", source });

const weekly = (series: Query[], extra: Query = {}, dateRange: Query = DAYS_90): Query =>
  viz({
    kind: "TrendsQuery",
    series,
    interval: "week",
    dateRange,
    trendsFilter: { display: "ActionsLineGraph" },
    ...extra,
  });

/** A weekly line of readers who did one event, split by one property when it has a closed set. */
const eventReaders = (id: string, label: string, by?: string): Query =>
  weekly([readers(id, label)], by ? { breakdownFilter: { breakdown: by, breakdown_type: "event" } } : {});

const FUNNEL_WINDOW = { funnelWindowInterval: 14, funnelWindowIntervalUnit: "day" };

const funnel = (steps: Query[]): Query =>
  viz({
    kind: "FunnelsQuery",
    series: steps,
    dateRange: DAYS_90,
    funnelsFilter: { funnelVizType: "steps", funnelOrderType: "ordered", ...FUNNEL_WINDOW },
  });

const retention = (target: string, returning: string | null): Query => {
  const entity = (id: string) => ({ id, type: "events", name: id });
  return viz({
    kind: "RetentionQuery",
    dateRange: { date_from: "-8w" },
    retentionFilter: {
      retentionType: "retention_first_time",
      period: "Week",
      totalIntervals: 8,
      targetEntity: entity(target),
      returningEntity: entity(returning ?? target),
    },
  });
};

/** The newcomer funnel is personless (a hashed id per step, not a person), so it is a count of events, not a funnel. */
const newcomerCounts = (): Query =>
  weekly(
    [
      event("code_requested", { math: "total", custom_name: "Code requested" }),
      event("code_redeemed", {
        math: "total",
        custom_name: "Code redeemed ok",
        properties: [{ key: "outcome", value: "ok", operator: "exact", type: "event" }],
      }),
      event("account_created", { math: "total", custom_name: "Account created" }),
      event("first_collection_action", { math: "total", custom_name: "First collection action" }),
    ],
    {},
    DAYS_30,
  );

/** Insight names are prefixed so a name matches only an insight this file made: a hand-made "Games logged" is never overwritten. */
const PREFIX = "The 99: ";
const named = (defs: DashboardDef[]): DashboardDef[] => defs.map((d) => ({ ...d, insights: d.insights.map((i) => ({ ...i, name: `${PREFIX}${i.name}` })) }));

export const DASHBOARDS: DashboardDef[] = named([
  {
    name: "The 99: core actions",
    description: "Readers who did each core action, per week (one send per reader session). Counts are a lower bound: ad blockers drop some browser events.",
    insights: [
      { name: "Readers per core action, weekly", description: "One line per core action: unique readers who did it in the week.", query: weekly([
        readers("deck_created", "Deck created"),
        readers("deck_card_added", "Card added"),
        readers("deck_game_logged", "Game logged"),
        readers("collection_imported", "Collection imported"),
        readers("wishlist_added", "Wishlist added"),
        readers("upgrade_applied", "Upgrade applied"),
        readers("friend_invite_created", "Friend invite"),
        readers("credits_bought", "Credits bought"),
        readers("recommendation_run", "Recommendation run"),
      ]) },
      { name: "Decks created, by source", description: "Readers who created a deck, by where it started: scratch, free build, guided, precon or import.", query: eventReaders("deck_created", "Deck created", "source") },
      { name: "Cards added to a deck, by way", description: "Readers who added a card, by search, suggestion or combo. Each reader session sends at most three.", query: eventReaders("deck_card_added", "Card added", "via") },
      { name: "Games logged", description: "Readers who logged a game.", query: eventReaders("deck_game_logged", "Game logged") },
      { name: "Collections imported, by way", description: "Readers who imported or synced a collection, by CSV or Sync.", query: eventReaders("collection_imported", "Collection imported", "via") },
      { name: "Wishlist adds", description: "Readers who put a card on the wishlist.", query: eventReaders("wishlist_added", "Wishlist added") },
      { name: "Precon upgrades applied", description: "Readers who applied a precon upgrade to a deck.", query: eventReaders("upgrade_applied", "Upgrade applied", "kind") },
      { name: "Friend invites created", description: "Readers who made a friend invite.", query: eventReaders("friend_invite_created", "Friend invite") },
      { name: "Credits bought, by kind", description: "Readers who bought credits, a plan or a pack.", query: eventReaders("credits_bought", "Credits bought", "kind") },
      { name: "Recommendation runs", description: "Readers whose Help me choose result rendered.", query: eventReaders("recommendation_run", "Recommendation run", "surface") },
    ],
  },
  {
    name: "The 99: funnels",
    description: "Where readers get to, signed in. The browser funnel follows one reader; the newcomer funnel is personless, so it counts events.",
    insights: [
      { name: "Engaged funnel: import, deck, card, game", description: "Readers who imported a collection, then created a deck, then added a card, then logged a game, within 14 days.", query: funnel([
        event("collection_imported", { custom_name: "Imported a collection" }),
        event("deck_created", { custom_name: "Created a deck" }),
        event("deck_card_added", { custom_name: "Added a card" }),
        event("deck_game_logged", { custom_name: "Logged a game" }),
      ]) },
      { name: "Deck start funnel: created, then a card, then a game", description: "Readers who created a deck, then added a card, then logged a game, within 14 days.", query: funnel([
        event("deck_created", { custom_name: "Created a deck" }),
        event("deck_card_added", { custom_name: "Added a card" }),
        event("deck_game_logged", { custom_name: "Logged a game" }),
      ]) },
      { name: "Recommendation to deck", description: "Readers who ran Help me choose, then created a deck, within 14 days. Fills in once the event ships.", query: funnel([
        event("recommendation_run", { custom_name: "Ran Help me choose" }),
        event("deck_created", { custom_name: "Created a deck" }),
      ]) },
      { name: "Newcomer funnel, event counts", description: "The server-side funnel from a poster or invite to a first collection action. Personless: count the events, not people.", query: newcomerCounts() },
    ],
  },
  {
    name: "The 99: retention",
    description: "Do readers come back. First-time cohort, weekly, eight weeks.",
    insights: [
      { name: "Retention: deck created, weekly", description: "Readers whose first deck was in a week, and who created another in later weeks.", query: retention("deck_created", null) },
      { name: "Retention: import, then a deck", description: "Readers whose first import was in a week, and who created a deck in later weeks.", query: retention("collection_imported", "deck_created") },
      { name: "Retention: game logged, weekly", description: "Readers who logged a game, and who logged another in later weeks.", query: retention("deck_game_logged", null) },
      { name: "Retention: card added, weekly", description: "Readers who added a card to a deck, and who added another in later weeks.", query: retention("deck_card_added", null) },
    ],
  },
]);

/** Every event name a query in `DASHBOARDS` counts, for the guard test. */
export function eventNamesIn(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => eventNamesIn(v, out));
  else if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (o.kind === "EventsNode" && typeof o.event === "string") out.add(o.event);
    if (o.type === "events" && typeof o.id === "string") out.add(o.id);
    Object.values(o).forEach((v) => eventNamesIn(v, out));
  }
  return out;
}

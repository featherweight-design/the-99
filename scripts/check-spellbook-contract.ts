/**
 * Canary for Commander Spellbook's contract. Touches no database and needs no secrets.
 *
 * The combo ingest runs WEEKLY, so a breaking upstream change would otherwise go unnoticed
 * for up to seven days and then surface as a failed — or worse, a quietly wrong — refresh.
 * Running this daily turns that into a same-day alert. Same reasoning as `check:scryfall` and
 * `check:manapool`, which it runs beside.
 *
 * Five assertions, and the last two are the ones that earn it: a count can stay healthy while
 * the CLASSIFICATION quietly changes meaning, and an added enum member would fail every
 * insert after the next upstream release rather than being noticed at ingest time.
 *
 * ON THE NAMED ANCHORS, and the tension with "never transcribe a list" (§4.1): that rule is
 * about data CONSUMED as data — a transcribed copy of a live list goes stale silently. These
 * five cards are a TEST FIXTURE: they are asserted, never read. One of them ceasing to
 * classify is a signal to investigate, and if a card legitimately leaves the index then this
 * check failing is the correct outcome rather than a false alarm.
 */

const BULK_INDEX = "https://json.commanderspellbook.com/variants.json";
const SWEEP = "https://backend.commanderspellbook.com/estimate-bracket";
const SCHEMA = "https://backend.commanderspellbook.com/schema/?format=json";
const USER_AGENT = "the-99/1.0 (deck analysis; contact hugh@featherweight.design)";

/**
 * The file is rebuilt DAILY and this check runs daily, so two days tolerates exactly one
 * missed upstream build and no more. An eight-day window — an earlier draft's figure — could
 * only ever fire after the weekly ingest had already consumed a week-stale file, which is the
 * failure it exists to prevent rather than report.
 */
const MAX_AGE_DAYS = 2;

/** The seven the `spellbook_variants` check constraint encodes. */
const BRACKET_TAGS = ["R", "S", "P", "O", "C", "E", "B"];

/** Every field `toVariantRows` projects. A missing one is a silently emptier ingest. */
const REQUIRED_TOP_LEVEL = ["id", "bracketTag", "identity", "uses", "requires", "produces", "legalities"];

/** Asserted through a live sweep; never read as data. */
const MLD_ANCHORS = ["Armageddon", "Ravages of War", "Jokulhaups"];
const EXTRA_TURN_ANCHORS = ["Time Warp", "Temporal Manipulation"];

const failures: string[] = [];
const fail = (m: string) => failures.push(m);

/** Reads only as much of the 656 MB document as the first record needs. */
async function firstVariant(): Promise<Record<string, unknown> | null> {
  const res = await fetch(BULK_INDEX, {
    headers: { "User-Agent": USER_AGENT, Range: "bytes=0-500000" },
  });
  if (!res.ok && res.status !== 206) {
    fail(`bulk: HTTP ${res.status}`);
    return null;
  }
  const text = await res.text();
  const at = text.indexOf('"variants"');
  if (at === -1) {
    fail("bulk: no `variants` key in the first 500KB");
    return null;
  }
  const open = text.indexOf("{", text.indexOf("[", at));
  let depth = 0, inStr = false, esc = false;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\" && inStr) { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) {
      return JSON.parse(text.slice(open, i + 1)) as Record<string, unknown>;
    }
  }
  fail("bulk: first record did not close within the fetched range");
  return null;
}

async function main(): Promise<void> {
  // 1 · the bulk is fresh
  const head = await fetch(BULK_INDEX, { method: "HEAD", headers: { "User-Agent": USER_AGENT } });
  if (!head.ok) {
    fail(`bulk HEAD: HTTP ${head.status}`);
  } else {
    const lm = head.headers.get("last-modified");
    if (!lm) fail("bulk: no `last-modified` header");
    else {
      const ageDays = (Date.now() - new Date(lm).getTime()) / 86_400_000;
      if (!Number.isFinite(ageDays)) fail(`bulk: unparseable last-modified "${lm}"`);
      else if (ageDays > MAX_AGE_DAYS) {
        fail(`bulk: last-modified ${ageDays.toFixed(1)} days ago, over the ${MAX_AGE_DAYS}-day window`);
      } else {
        console.log(`bulk: ok (rebuilt ${ageDays.toFixed(1)} days ago)`);
      }
    }
  }

  // 2 · the first record still carries every field the ingest projects
  const first = await firstVariant();
  if (first) {
    for (const f of REQUIRED_TOP_LEVEL) {
      if (!(f in first)) fail(`bulk entry: missing \`${f}\``);
    }
    // The two shapes the spec could NOT write down, and which §4.3b rule 1 rides on.
    const uses = first.uses as { card?: { oracleId?: unknown }; mustBeCommander?: unknown }[];
    if (!Array.isArray(uses) || uses.length === 0) fail("bulk entry: `uses` is not a non-empty array");
    else {
      if (typeof uses[0]?.card?.oracleId !== "string") fail("bulk entry: no `uses[].card.oracleId`");
      if (!("mustBeCommander" in (uses[0] ?? {}))) fail("bulk entry: no `uses[].mustBeCommander`");
    }
    if (!Array.isArray(first.requires)) fail("bulk entry: `requires` is not an array");
    const produces = first.produces as { feature?: { name?: unknown } }[];
    if (!Array.isArray(produces) || typeof produces[0]?.feature?.name !== "string") {
      fail("bulk entry: no `produces[].feature.name`");
    }
    if (typeof (first.legalities as Record<string, unknown>)?.commander !== "boolean") {
      fail("bulk entry: `legalities.commander` is not a boolean");
    }
    if (failures.length === 0) console.log(`bulk entry: ok (\`${String(first.id)}\`)`);
  }

  // 3 + 5 · the sweep's shape AND the named anchors, in one live call
  try {
    const res = await fetch(SWEEP, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify({
        main: [...MLD_ANCHORS, ...EXTRA_TURN_ANCHORS].map((card) => ({ card, quantity: 1 })),
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as {
      cards?: { card?: { name?: string }; [k: string]: unknown }[];
    };
    const entries = body.cards ?? [];
    if (entries.length === 0) fail("sweep: returned no `cards`");
    for (const flag of ["massLandDenial", "extraTurn", "gameChanger", "banned"]) {
      if (entries.length > 0 && !(flag in entries[0])) fail(`sweep: entry missing \`${flag}\``);
    }
    const by = new Map(entries.map((e) => [e.card?.name ?? "", e]));
    for (const n of MLD_ANCHORS) {
      if (by.get(n)?.massLandDenial !== true) fail(`sweep: \`${n}\` no longer classifies as mass land denial`);
    }
    for (const n of EXTRA_TURN_ANCHORS) {
      if (by.get(n)?.extraTurn !== true) fail(`sweep: \`${n}\` no longer classifies as an extra turn`);
    }
    console.log(`sweep: ok (${entries.length} entries, ${MLD_ANCHORS.length + EXTRA_TURN_ANCHORS.length} anchors asserted)`);
  } catch (err) {
    fail(`sweep: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 4 · the bracket-tag vocabulary still has exactly seven members.
  //
  // The consequence is a SILENT DROP, not a failed insert — `toVariantRows` refuses any tag
  // outside the seven and returns `unknown-bracket-tag`, so an added or renamed tag upstream
  // makes the ingest quietly discard every variant carrying it and exit 0. That is worse than
  // a red insert and is why this assertion is worth a daily request.
  try {
    const res = await fetch(SCHEMA, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const schema = (await res.json()) as {
      components?: { schemas?: Record<string, { enum?: string[] }> };
    };
    const live = schema.components?.schemas?.BracketTagEnum?.enum;
    if (!Array.isArray(live)) fail("schema: no `BracketTagEnum.enum`");
    else {
      const added = live.filter((t) => !BRACKET_TAGS.includes(t));
      const gone = BRACKET_TAGS.filter((t) => !live.includes(t));
      // An ADDED tag is the sharp one: every insert carrying it fails the check constraint,
      // and the ingest would go red after the next upstream release rather than here.
      if (added.length > 0) fail(`schema: BracketTagEnum gained ${added.join(", ")} — the ingest will silently DROP every variant carrying it`);
      if (gone.length > 0) fail(`schema: BracketTagEnum lost ${gone.join(", ")}`);
      if (added.length === 0 && gone.length === 0) console.log(`schema: ok (${live.length} bracket tags)`);
    }
  } catch (err) {
    fail(`schema: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (failures.length > 0) {
    console.error("\nCommander Spellbook contract check FAILED:");
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("\nCommander Spellbook contract check passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

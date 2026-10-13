// probe:opening-printing — a card the reader does not own previews the printing card details opens it on.
//
// A hover preview drew `cards.image_uri`, one arbitrary printing per card, while card details opens an unowned card
// on `openingScryfallId`'s pick (the oracle's own printing when the shop carries it, else the cheapest live one with
// art). For a card whose oracle default is not stocked that is a different picture: the press changed the art the
// tile had just shown. `loadOpeningPrintings` is the one resolver every previewing loader now takes the art from
// (`chainArt`'s fallback), so this proves the PROPERTY across the real catalog: for a sample of cards the reader owns
// no copy of, the preview's art IS the art `loadCardDetail` opens on, and it says how many cards the old read got
// wrong.
//
// READ-ONLY: it writes nothing, so it may point at staging (the measurement rule) as well as local-dev or a scratch
// branch. The reader is a made-up id that owns nothing.
//
// Run: pnpm probe:opening-printing
import { requireEnv } from "./lib/env.mjs";
import { sql } from "drizzle-orm";

import { db } from "../src/db";
import { loadOpeningPrintings } from "../src/lib/cards/opening-printing";
import { loadCardDetail } from "../src/lib/collection/card-detail";

requireEnv(["DATABASE_URL"]);
const READER = `probe-opening-printing-${Date.now()}`;
const SAMPLE = 30;

let failures = 0;
const check = (label: string, ok: boolean, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
};

async function main() {
  // The class the rule exists for: the oracle default's printing carries no live price, another printing does.
  const stranded = (await db.execute(sql`
    with newest as (select max(as_of) as as_of from printing_prices)
    select c.oracle_id::text as id, c.image_uri
    from cards c
    where exists (
      select 1 from printings p join printing_prices pp on pp.scryfall_id = p.scryfall_id, newest n
      where p.oracle_id = c.oracle_id and p.image_uri is not null and pp.price_cents is not null and pp.as_of = n.as_of
    ) and not exists (
      select 1 from printing_prices pp, newest n
      where pp.scryfall_id = c.scryfall_id and pp.price_cents is not null and pp.as_of = n.as_of
    )
    order by c.oracle_id limit ${SAMPLE}`)).rows as { id: string; image_uri: string | null }[];
  const typical = (await db.execute(sql`
    select c.oracle_id::text as id, c.image_uri from cards c
    where c.commander_legal and c.image_uri is not null
    order by md5(c.oracle_id::text) limit ${SAMPLE}`)).rows as { id: string; image_uri: string | null }[];

  for (const [label, sample] of [["stranded default", stranded], ["typical", typical]] as const) {
    if (sample.length === 0) { console.log(`SKIP  ${label}: the catalog holds no such card`); continue; }
    const opening = await loadOpeningPrintings(sample.map((s) => s.id));
    let agree = 0;
    let opened = 0;
    let oldWrong = 0;
    for (const s of sample) {
      const detail = await loadCardDetail(READER, s.id);
      const mine = opening.get(s.id)?.imageUri;
      if (mine === undefined) continue;                 // the rule found none: the caller keeps `cards.image_uri`
      opened += 1;
      if (detail?.imageUri === mine) agree += 1;
      else console.log(`      differs: ${s.id} detail=${detail?.imageUri} opening=${mine}`);
      if (s.image_uri !== mine) oldWrong += 1;
    }
    check(`${label}: the preview's art is the art card details opens on`, agree === opened, `${agree} of ${opened} cards the rule resolves (of ${sample.length} sampled)`);
    console.log(`INFO  ${label}: ${oldWrong} of ${opened} would have previewed another printing off \`cards.image_uri\``);
  }
  check("the stranded-default class is real in this catalog", stranded.length > 0, `${stranded.length} sampled`);
}

main()
  .catch((error) => { failures += 1; console.error(error); })
  .finally(() => { console.log(failures === 0 ? "all checks passed" : `${failures} check(s) failed`); process.exit(failures === 0 ? 0 : 1); });

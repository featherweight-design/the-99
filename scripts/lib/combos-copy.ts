// The combo copy's spec, shared by `db:copy:combos` and `probe:catalog-copy`. See copy-combos.ts.
import { cardBracketFlags, cards, spellbookVariantCards, spellbookVariants } from "../../src/db/schema";
import { emptyLogReport, logTableExists } from "../../src/lib/notices/log";
import { classifierCollapse, FLOORS, publishFlagsIn, publishVariantsIn } from "../../src/lib/spellbook/seed";
import { copyTable, type CopySpec } from "./catalog-copy";


export type CombosSnapshot = {
  flags: (typeof cardBracketFlags.$inferSelect)[];
  variants: (typeof spellbookVariants.$inferSelect)[];
  members: (typeof spellbookVariantCards.$inferSelect)[];
};

const has = (sources: readonly string[], source: string) => sources.includes(source);

export const combosCopySpec: CopySpec<CombosSnapshot> = {
  kind: "combos",
  tables: [
    copyTable("card_bracket_flags", cardBracketFlags),
    copyTable("spellbook_variants", spellbookVariants),
    copyTable("spellbook_variant_cards", spellbookVariantCards),
  ],
  readSource: async (tx) => ({
    flags: await tx.select().from(cardBracketFlags),
    variants: await tx.select().from(spellbookVariants),
    members: await tx.select().from(spellbookVariantCards),
  }),
  // The ingest's own floors, on what the snapshot holds. The sweep's resolution share is a fact
  // about a run, not about its output, so it is passed as met here; the ledger's `ok` is what says
  // that run cleared it.
  floors: (s) => {
    const counts = {
      mldSweep: s.flags.filter((f) => has(f.massLandDenialSources, "spellbook_sweep")).length,
      mldRule: s.flags.filter((f) => has(f.massLandDenialSources, "oracle_rule")).length,
      etSweep: s.flags.filter((f) => has(f.extraTurnSources, "spellbook_sweep")).length,
      etRule: s.flags.filter((f) => has(f.extraTurnSources, "oracle_rule")).length,
      tutorRule: s.flags.filter((f) => has(f.tutorSources, "oracle_rule")).length,
    };
    const below = classifierCollapse(counts, 1, FLOORS);
    if (s.variants.length < FLOORS.variantsKept) below.push(`variants ${s.variants.length} < ${FLOORS.variantsKept}`);
    return below;
  },
  describe: (s) => `${s.flags.length} flag rows · ${s.variants.length} variants · ${s.members.length} members`,
  publish: async (tx, s) => {
    const logging = await logTableExists(tx);
    const notices = emptyLogReport();
    const names = new Map(
      (await tx.select({ oracleId: cards.oracleId, name: cards.name }).from(cards)).map((c) => [c.oracleId, c.name]),
    );
    await publishFlagsIn(tx, s.flags, logging, notices);
    await publishVariantsIn(tx, s.variants, s.members, logging, notices, (id) => names.get(id) ?? id);
    console.log(`notices: ${notices.written} entries written, ${notices.lost} lost`);
  },
};

import "./lib/env.mjs";
import { ingestCombos } from "../src/lib/spellbook/seed";

ingestCombos()
  .then((r) => {
    console.log(
      `\ncombos: ${r.variants.kept} variants, ${r.variants.cards} membership rows, ` +
        `${r.flags.rows} flag rows.`,
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });

/**
 * Writes `public/mana/sprite.svg` from the committed per-symbol files, one square cell per symbol.
 * `pnpm fetch:mana` runs this after it writes them; run it by hand after editing one. Touches no
 * database and no network. See `src/lib/cards/mana-sprite.ts` for why the sprite exists.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { buildManaSprite } from "../src/lib/cards/mana-sprite";

const DIR = "public/mana";

export async function writeManaSprite(): Promise<number> {
  const files = (await readdir(DIR)).filter((f) => f.endsWith(".svg") && f !== "sprite.svg");
  const symbols = await Promise.all(
    files.map(async (f) => ({ slug: f.slice(0, -4), svg: await readFile(`${DIR}/${f}`, "utf8") })),
  );
  await writeFile(`${DIR}/sprite.svg`, buildManaSprite(symbols));
  return symbols.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeManaSprite().then((n) => console.log(`wrote ${DIR}/sprite.svg with ${n} symbols`));
}

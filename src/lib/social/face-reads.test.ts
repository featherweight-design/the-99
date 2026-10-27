// Every read that draws a face takes `commanderColumns`, whose art is `coalesce(face_printing.art_crop_uri, ...)`. A
// reader that takes the columns without joining `facePrinting` fails at run time (an unknown alias) on a database,
// and one that hand-writes the SQL would silently draw the card's default art. This pins the boundary by import:
// every file in src/lib/social that spreads `commanderColumns` or joins `commanderCard` also joins `facePrinting`,
// and the raw-SQL readers (which cannot import it) join `printings` beside their `cards` join.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DIR = join(process.cwd(), "src/lib/social");
const files = readdirSync(DIR).filter((f) => f.endsWith(".ts") && !f.includes(".test.") && f !== "commander.ts");
const read = (f: string) => readFileSync(join(DIR, f), "utf8");
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe("the face's readers", () => {
  it("join facePrinting once for every commanderCard join they make on a profile", () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = read(f);
      const cardJoins = count(src, /\.leftJoin\(commanderCard,\s*(?:and\(\s*)?eq\(commanderCard\.oracleId,\s*socialProfiles\.commanderOracleId\)/g);
      const printingJoins = count(src, /\.leftJoin\(facePrinting,/g);
      if (cardJoins !== printingJoins) offenders.push(`${f}: ${cardJoins} card joins, ${printingJoins} printing joins`);
    }
    expect(offenders).toEqual([]);
  });

  it("covers the readers it names", () => {
    const withFace = files.filter((f) => /commanderColumns/.test(read(f)));
    expect(withFace.sort()).toEqual(["access.ts", "friends.ts", "home-friends.ts", "rule-zero.ts", "spares.ts"]);
  });

  it("joins printings in every raw-SQL read of a profile's card", () => {
    const src = read("spare-requests.ts");
    const profileCardJoins = count(src, /left join \$\{cards\} \w+ on \w+\.oracle_id = \w+\.commander_oracle_id/g);
    const printingJoins = count(src, /left join \$\{printings\} \w+ on \w+\.scryfall_id = \w+\.commander_printing_id and \w+\.oracle_id = \w+\.commander_oracle_id/g);
    expect(profileCardJoins).toBe(2);
    expect(printingJoins).toBe(profileCardJoins);
  });
});

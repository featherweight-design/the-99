import { renderToString } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { QuickAddBar } from "../src/components/decks/quick-add-bar";
const r = (id: string, name: string, typeLine: string, manaCost: string, cmc: number, img: string, ownedQty = 1, facts: any = null) => ({
  oracleId: id, name, typeLine, owned: ownedQty > 0, ownedQty, cardTypeGroup: "Instants", role: null, imageUri: img, manaCost, cmc,
  availability: null, flavorName: null, facts });
const S = [
  r("searing", "Searing Touch", "Instant", "{R}", 1, "c-searing-touch.jpg", 1),
  r("lathliss", "Lathliss, Dragon Queen", "Legendary Creature — Dragon", "{4}{R}{R}", 6, "c-lathliss.jpg", 1),
  r("fire", "Firebending Lesson", "Instant — Lesson", "{R}", 1, "c-firebending-lesson.jpg", 2),
  r("moon", "Moonmist", "Instant", "{1}{G}", 2, "c-moonmist.jpg", 1),
];
const L = [
  r("ava", "Avabruck Caretaker // Hollowhenge Huntmaster", "Creature — Human Werewolf", "{4}{G}{G}", 6, "c-avabruck-caretaker.jpg", 1),
  r("aven", "Avenger of Zendikar", "Creature — Elemental", "{5}{G}{G}", 7, "c-avenger-of-zendikar.jpg", 3),
];
const counts = { gameChanger: 0, tutor: 0 } as any;
const jobs: [string, any[], string, any, string[]][] = [
  ["shipped-s", S, "s", { v: "shipped" }, ["fire"]],
  ["p1-s", S, "s", { v: "p1" }, ["fire"]],
  ["p1-s-press0", S, "s", { v: "p1", press: 0 }, ["fire"]],
  ["p1-s-press1", S, "s", { v: "p1", press: 1 }, ["fire"]],
  ["p1-s-added0", S, "s", { v: "p1" }, ["fire", "searing"]],
  ["shipped-av", L, "av", { v: "shipped" }, []],
  ["p1-av", L, "av", { v: "p1" }, []],
];
for (const [k, res, q, fx, inDeck] of jobs) {
  const html = renderToString(
    <div data-dock className="sticky bottom-[var(--tabbar-h)] md:bottom-0 z-20 mt-auto px-[16px] pt-[10px] pb-[12px] md:px-[30px] md:py-[11px]" style={{ background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
      <QuickAddBar deckId="d" commanderIdentity={["R", "G"]} deckOracleIds={inDeck} commanderShortName="Ghalta" commanderOracleId="ghalta"
        initialQuery={q} declaredBracket={null} noteCounts={counts} fx={{ results: res, ...fx }} />
    </div>);
  writeFileSync(`gen/qa-${k}.html`, html);
}

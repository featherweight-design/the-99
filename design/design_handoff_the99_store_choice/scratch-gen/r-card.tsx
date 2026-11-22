import { writeFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { W } from "./r-settings";
import { loadDemoCardDetails } from "../src/lib/demo/card-details";
import { DemoCardModal } from "../src/components/landing/demo/demo-card-modal";
import { DemoProviders } from "../src/components/landing/demo/demo-providers";
const G = globalThis as any;
const scale: Record<string, number> = { manapool: 1, tcgplayer: 0.91, cardkingdom: 1.18 };
function priced(c: any, store: string, none: boolean) {
  const sc = (f: any) => ({ ...f, cents: f.cents == null ? null : Math.round(f.cents * scale[store]), foilCents: f.foilCents == null ? null : Math.round(f.foilCents * scale[store]) });
  const map = (o: any) => Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [k, sc(v)]));
  const p = c.prices;
  return { ...c, prices: none ? { ...p, byScryfallId: {}, byPrintingKey: {} } : { ...p, byScryfallId: map(p.byScryfallId), byPrintingKey: map(p.byPrintingKey) } };
}
(async () => {
  const d: any = await loadDemoCardDetails();
  const cd = d.cardDetails;
  const find = (n: string) => Object.values(cd).find((c: any) => c.name === n) as any;
  const withArt = (c: any, img: string) => ({ ...c, imageUri: img, printings: c.printings.map((p: any) => ({ ...p, imageUri: img })) });
  const sw = withArt(find("Giada, Font of Hope"), "art/c-giada.jpg");
  const cs = sw;
  const jobs: [string, string, any, boolean][] = [
    ["cd-mp", "manapool", sw, false], ["cd-tcg", "tcgplayer", sw, false], ["cd-ck", "cardkingdom", sw, false], ["cd-ck-none", "cardkingdom", cs, true], ["cd-tcg-none", "tcgplayer", cs, true],
  ];
  for (const [k, store, c, none] of jobs) {
    G.__STORE = store;
    const card = priced(c, store, none);
    writeFileSync(`dz/frames/${k}.html`, renderToString(W(<DemoProviders onOpen={() => {}} onClose={() => {}} openOracleId={null}>
      <DemoCardModal card={card} position={3} total={14} onClose={() => {}} onPrev={() => {}} onNext={() => {}} {...({} as any)} />
    </DemoProviders>, "/decks/x")));
  }
  console.log("ok");
})();

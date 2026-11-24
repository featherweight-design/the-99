// Help me choose intro R1: every frame's HTML (the /commanders/choose form, base and proposal).
import { writeFileSync, mkdirSync } from "node:fs";
import { shell } from "./shell";
import { ChooseHeader } from "../src/components/intake/choose-header";
import { ChooseHistory } from "../src/components/intake/choose-history";
import { HistoryLink } from "../src/components/intake/history-link";
import { IntakeForm } from "../src/components/intake/intake-form";
import { helpMeChooseCopy as copy } from "../src/lib/copy/help-me-choose";
import { helpMeChooseHistoryCopy as historyCopy } from "../src/lib/copy/help-me-choose-history";
import { parseLiveParams } from "../src/lib/intake/params";
mkdirSync("dz/frames", { recursive: true });
const G = globalThis as any;
const themes = ["Dinosaurs", "Dragons", "Tokens", "+1/+1 Counters", "Landfall", "Spellslinger"].map((l) => ({ slug: l.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label: l, commanders: 40 })) as any;
const initial = parseLiveParams(new URLSearchParams());
const standing = { used: 0, limit: 1, nextAt: null, reopensAt: null, ownerShare: false, welcome: 12 } as any;
const runs = { rows: [
  { id: "r1", at: new Date(Date.UTC(2026, 10, 22, 19)).toISOString(), state: "ok", words: "something scary and a little nasty", thumbs: ["a","b","c"], thumbArt: ["art/crop-zimone.jpg","art/crop-giada.jpg","art/crop-lathliss.jpg"], picks: 12, pool: 340, href: "#" },
  { id: "r2", at: new Date(Date.UTC(2026, 10, 18, 19)).toISOString(), state: "ok", words: "a Landfall deck unlike the ones I’ve built", thumbs: ["a","b"], thumbArt: ["art/crop-gisa.jpg","art/crop-ghalta.jpg"], picks: 9, pool: 212, href: "#" },
] , nextCursor: null } as any;
const art = { lead: "art/crop-ghalta.jpg", behind: ["art/crop-lathliss.jpg", "art/crop-gisa.jpg"] as [string, string] };

function page(hist: any) {
  const chooseAt = "/commanders/choose";
  return (
    <div className="flex flex-col pb-[24px] md:px-[40px] md:pb-[48px]">
      <div className="md:mx-auto md:w-full md:max-w-[1100px] lg:flex lg:items-start lg:justify-center lg:gap-[40px]">
        <div className="min-w-0 md:w-[680px] md:max-w-full md:shrink">
          <ChooseHeader title={copy.intake.title} sub={copy.intake.sub} subPhone={copy.intake.subPhone} centered trailing={<HistoryLink href={`${chooseAt}?v=history`} label={historyCopy.link} />} />
          <IntakeForm themes={themes} sets={[]} initial={{...initial, themes: ["dinosaurs"], colors: ["W","U"]} as any} standing={standing} />
        </div>
        <aside className="hidden lg:sticky lg:top-[24px] lg:mt-[34px] lg:block lg:w-[320px] lg:shrink-0 min-[1100px]:w-[380px]">
          <ChooseHistory initial={hist} layout="column" />
        </aside>
      </div>
    </div>
  );
}
for (const dev of ["phone", "desk"] as const) {
  G.__VW = dev === "desk" ? 1300 : 390;
  writeFileSync(`dz/frames/${dev === "desk" ? "d" : "p"}.html`, shell(page(runs), "/commanders/choose"));
}
G.__VW = 390;
writeFileSync(`dz/frames/ph.html`, shell(<div className="px-[18px] pt-[16px]"><ChooseHistory initial={runs} layout="column" /></div>, "/commanders/choose"));
console.log("ok");

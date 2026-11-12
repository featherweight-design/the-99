import { renderToString } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { Credits } from "../src/components/landing/credits";
const base = { welcome: { units: 15, days: 30 }, buying: { pack: { units: 40, priceCents: 500 }, plan: { units: 50, priceCents: 500 } }, suggestedTwo: true, publicPages: false };
const J: [string, any, string | undefined][] = [["shipped", { ...base, upgrade: false }, undefined], ["upgrade", { ...base, upgrade: true }, undefined], ["upgrade-tip", { ...base, upgrade: true }, "upgrade"], ["upgrade-off", { ...base, welcome: null, buying: null, upgrade: true }, undefined]];
for (const [k, c, o] of J) writeFileSync(`hero/lp-${k}.html`, renderToString(<main className="bg-[color:var(--bg)] text-[color:var(--fg)]"><Credits claims={c} initOpen={o} /></main>));

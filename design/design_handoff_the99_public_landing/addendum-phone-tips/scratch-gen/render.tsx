import { renderToString } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { Credits } from "../src/components/landing/credits";
import { Close } from "../src/components/landing/landing";
import { LaunchListProvider } from "../src/components/landing/launch-panel";
const claims = { welcome: { units: 15, days: 30 }, buying: { pack: { units: 40, priceCents: 500 }, plan: { units: 50, priceCents: 500 } }, suggestedTwo: true, publicPages: false };
const J: Record<string, [string | null, string]> = { none: [null, "shipped"], "s-deeper": ["deeper", "shipped"], "s-suggested": ["suggested", "shipped"], "s-which": ["which", "shipped"], "f-deeper": ["deeper", "flow"], "f-suggested": ["suggested", "flow"], "f-which": ["which", "flow"], "f-overview": ["overview", "flow"] };
for (const [k, [id, v]] of Object.entries(J)) {
  const html = renderToString(<LaunchListProvider action={async () => ({ ok: true })}><main className="flex flex-1 flex-col bg-[color:var(--bg)] text-[color:var(--fg)]"><Credits claims={claims} force={id ? { id, pinned: true } : null} v={v} /><Close /></main></LaunchListProvider>);
  writeFileSync(`tips/${k}.html`, html);
}

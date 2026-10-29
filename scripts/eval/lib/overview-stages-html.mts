import { STAGE_LABELS, type OverviewDoc, type StagesChecks } from "../../../src/lib/synopsis/stages";

/**
 * The side-by-side page for `overview-stages.mts`: per deck, today's Overview (left) and the stages
 * shape (right) on desktop, stacked on a phone, each showing exactly the text a reader sees, the
 * stage labels, and the check results. Pure string work; a local file, never published.
 */

export type ComparePanel = {
  doc: OverviewDoc | null;
  /** Section refusals a reader would see in place of the section, by section id. */
  refused: { section: string; reason: string }[];
  /** Where this side came from, for the reader of the page. */
  source: string;
};

export type CompareDeck = {
  id: string;
  name: string;
  commanders: string[];
  kind: "precon" | "player deck";
  landLine: string;
  old: ComparePanel;
  new: ComparePanel;
  checks: StagesChecks | null;
  note?: string;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** A line as it renders: marks become the card's name, set apart as the app's card-open trigger is. */
const line = (text: string) => esc(text).replace(/\[\[([^\[\]]+)\]\]/g, '<span class="card">$1</span>');

function panel(side: "Today" | "Stages", p: ComparePanel, landLine: string): string {
  const out: string[] = [`<section class="panel"><h3>${side}</h3><p class="src">${esc(p.source)}</p>`];
  if (!p.doc) {
    out.push(`<p class="missing">Nothing to show.</p></section>`);
    return out.join("");
  }
  const d = p.doc;
  const refusedNote = (section: string) => p.refused.filter((r) => r.section === section).map((r) => `<p class="refused">Refused (${esc(r.reason)}): a reader sees the refusal here.</p>`).join("");
  out.push(`<h4>Overview</h4>${refusedNote("overview")}${d.overview.map((l) => `<p>${line(l.text)}</p>`).join("")}`);
  out.push(`<h4>Primer</h4>${refusedNote("primer")}`);
  if (d.strategy.length > 0) out.push(`<h5>Core strategy</h5><ol>${d.strategy.map((l) => `<li>${line(l.text)}</li>`).join("")}</ol>`);
  if (d.stages.length > 0) {
    out.push(`<h5>Game plan</h5><dl class="stages">${d.stages.map((l, i) => `<dt>${esc(STAGE_LABELS[i] ?? `Extra ${i + 1}`)}</dt><dd>${line(l.text)}</dd>`).join("")}</dl>`);
  }
  if (d.winsBy.length > 0) out.push(`<dl class="stages">${d.winsBy.map((l) => `<dt>Wins by</dt><dd>${line(l.text)}</dd>`).join("")}</dl>`);
  if (d.alternate.length > 0) out.push(`<dl class="stages">${d.alternate.map((l) => `<dt>Alternate</dt><dd>${line(l.text)}</dd>`).join("")}</dl>`);
  if (d.keep.length + d.sendBack.length > 0) {
    out.push(`<h5>Mulligan</h5><p class="fixed">${esc(landLine)}</p><div class="mull"><div><b>Keep</b><ul>${d.keep.map((l) => `<li>${line(l.text)}</li>`).join("")}</ul></div><div><b>Send back</b><ul>${d.sendBack.map((l) => `<li>${line(l.text)}</li>`).join("")}</ul></div></div>`);
  }
  if (d.tips.length > 0) out.push(`<h5>Tips</h5><ul>${d.tips.map((l) => `<li>${line(l.text)}</li>`).join("")}</ul>`);
  out.push(`<h4>Key cards</h4>${refusedNote("keyCards")}<ul class="keys">${d.keyCards.map((k) => `<li><span class="card">${esc(k.card)}</span> ${line(k.job.text)}</li>`).join("")}</ul>`);
  out.push(`<h4>Weaknesses</h4>${refusedNote("weaknesses")}<ul>${d.weaknesses.map((l) => `<li>${line(l.text)}</li>`).join("")}</ul>`);
  out.push("</section>");
  return out.join("");
}

function checksBlock(c: StagesChecks | null): string {
  if (!c) return `<div class="checks"><p>No checks: the new answer did not come back.</p></div>`;
  const row = (name: string, pass: boolean, detail: unknown[]) =>
    `<li class="${pass ? "ok" : "bad"}"><b>${pass ? "Pass" : "Fail"}</b> ${esc(name)}${detail.length ? `<ul>${detail.map((x) => `<li>${esc(typeof x === "string" ? x : JSON.stringify(x))}</li>`).join("")}</ul>` : ""}</li>`;
  return `<div class="checks"><h4>Checks</h4><ul>${[
    row("Zero cards not in the list", c.cardsInList.pass, c.cardsInList.offenders),
    row("Zero turn numbers but the cast turn", c.turnNumbers.pass, c.turnNumbers.offenders.map((o) => `${o.where}: turn ${o.turn}`)),
    row("Zero cards explained twice (commander included)", c.explainedOnce.pass, c.explainedOnce.offenders.map((o) => `${o.card}${o.commander ? " (commander)" : ""}: ${o.sections.join(", ")}`)),
    row("Zero cards explained twice (commander exempt)", c.explainedOnce.passExceptCommanders, []),
    row(`Early cards cost at most ${c.stageFit.max}`, c.stageFit.pass, c.stageFit.offenders.map((o) => `${o.card}: ${o.manaValue}`)),
    row("Every stage line names a deck card", c.stagesNameCards.pass, c.stagesNameCards.offenders.map((o) => `${o.stage}: ${o.why}`)),
    row(`Length: ${c.length.newChars} characters against ${c.length.oldChars} today`, c.length.pass, []),
    row("Shape (3 stages, Wins by, tips 2-3, alternate when carried, budgets)", c.shape.pass, c.shape.offenders),
  ].join("")}</ul></div>`;
}

export function compareHtml(title: string, decks: readonly CompareDeck[], summaryLines: readonly string[]): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
:root { --bg: #fbfaf7; --fg: #1c1b19; --muted: #6b6760; --line: #e2ded6; --card: #2f5d8a; --ok: #2d6a3e; --bad: #a3322a; --panel: #ffffff; }
@media (prefers-color-scheme: dark) { :root { --bg: #161513; --fg: #ece8e1; --muted: #a39e95; --line: #34312c; --card: #8db8e3; --ok: #7cc68f; --bad: #f08a80; --panel: #1f1d1a; } }
* { box-sizing: border-box; }
body { margin: 0; padding: 16px; background: var(--bg); color: var(--fg); font: 15px/1.5 -apple-system, system-ui, sans-serif; }
h1 { font-size: 20px; margin: 0 0 8px; } h2 { font-size: 18px; margin: 32px 0 4px; } h3 { margin: 0 0 2px; font-size: 16px; }
h4 { margin: 16px 0 4px; font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
h5 { margin: 10px 0 2px; font-size: 14px; }
.meta, .src { color: var(--muted); font-size: 13px; margin: 0 0 8px; }
.pair { display: grid; grid-template-columns: 1fr; gap: 12px; }
@media (min-width: 760px) { .pair { grid-template-columns: 1fr 1fr; } }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px 14px; min-width: 0; overflow-wrap: anywhere; }
.card { color: var(--card); font-weight: 600; }
ul, ol { padding-left: 20px; margin: 4px 0; }
dl.stages { display: grid; grid-template-columns: max-content 1fr; gap: 4px 10px; margin: 4px 0; }
dl.stages dt { font-weight: 700; } dl.stages dd { margin: 0; }
.mull { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.fixed { color: var(--muted); margin: 2px 0; }
.refused { color: var(--bad); }
.checks { border-top: 1px dashed var(--line); margin-top: 8px; font-size: 13px; }
.checks li.ok > b { color: var(--ok); } .checks li.bad > b { color: var(--bad); }
.summary li { margin: 2px 0; }
</style></head><body>
<h1>${esc(title)}</h1>
<ul class="summary">${summaryLines.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
${decks.map((d) => `<h2>${esc(d.name)}</h2><p class="meta">${esc(d.kind)} · ${esc(d.commanders.join(" and "))}${d.note ? ` · ${esc(d.note)}` : ""}</p>
<div class="pair">${panel("Today", d.old, d.landLine)}<div>${panel("Stages", d.new, d.landLine)}${checksBlock(d.checks)}</div></div>`).join("\n")}
</body></html>
`;
}

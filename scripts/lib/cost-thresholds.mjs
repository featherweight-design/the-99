// When the weekly cost check goes red. Pure, so the numbers are a diff and each rule is tested. Baselines, per
// week, from the 2026-10-23 cost audit: Vercel about 17 at list price and 3,600 Build CPU minutes; Neon about
// 21 CU-hours a day. Hugh edits these.

export const THRESHOLDS = {
  vercelWeekUsd: 30,
  vercelGrowth: { factor: 1.5, minUsd: 8 },
  buildGrowth: { factor: 1.5, minMinutes: 1500 },
  neonWeekCuHours: 200,
  neonWeekTransferGb: 100,
  neonRate: 0.106, // dollars per CU-hour, Launch plan
  branchesIncluded: 10,
  scratchMaxCu: 0.25,
};

const money = (n) => `$${n.toFixed(2)}`;

/**
 * @param {{ vercel: {thisWeek:any,lastWeek:any}|null, neon: any, neonWeek: any }} input
 * @returns {{ red: boolean, rules: {id:string,label:string,fired:boolean,skipped?:boolean,detail:string}[] }}
 */
export function evaluate({ vercel, neon, neonWeek }, t = THRESHOLDS) {
  const rules = [];
  const add = (id, label, fired, detail, skipped = false) => rules.push({ id, label, fired, detail, skipped });

  if (!vercel) {
    add("vercel-read", "Vercel could be read", true, "the Vercel read failed");
  } else {
    const { thisWeek: w, lastWeek: p } = vercel;
    const costGrew = w.costUsd >= p.costUsd * t.vercelGrowth.factor && w.costUsd - p.costUsd >= t.vercelGrowth.minUsd;
    add("vercel-cost", `Vercel week cost over ${money(t.vercelWeekUsd)} or up ${Math.round((t.vercelGrowth.factor - 1) * 100)}%`,
      w.costUsd > t.vercelWeekUsd || costGrew, `${money(w.costUsd)} this week, ${money(p.costUsd)} last`);
    const buildGrew = w.buildMinutes >= p.buildMinutes * t.buildGrowth.factor && w.buildMinutes - p.buildMinutes >= t.buildGrowth.minMinutes;
    add("build-minutes", `Build CPU minutes up ${Math.round((t.buildGrowth.factor - 1) * 100)}% and ${t.buildGrowth.minMinutes} minutes`,
      buildGrew, `${Math.round(w.buildMinutes)} this week, ${Math.round(p.buildMinutes)} last`);
  }

  if (!neon) {
    add("neon-read", "Neon could be read", true, "the Neon read failed");
  } else {
    if (neonWeek) {
      add("neon-compute", `Neon compute over ${t.neonWeekCuHours} CU-hours a week`, neonWeek.computeCuHours > t.neonWeekCuHours,
        `${neonWeek.computeCuHours.toFixed(0)} CU-hours (${money(neonWeek.computeCuHours * t.neonRate)}) over ${neonWeek.days.toFixed(1)} days, scaled to a week`);
      add("neon-transfer", `Neon transfer over ${t.neonWeekTransferGb} GB a week`, neonWeek.transferGb > t.neonWeekTransferGb,
        `${neonWeek.transferGb.toFixed(1)} GB over ${neonWeek.days.toFixed(1)} days, scaled to a week`);
    } else {
      add("neon-compute", "Neon compute", false, "no usable previous snapshot (first run, under a day, or a new month); not compared", true);
      add("neon-transfer", "Neon transfer", false, "no usable previous snapshot; not compared", true);
    }
    add("branches", `At most ${t.branchesIncluded} branches`, neon.branchCount > t.branchesIncluded, `${neon.branchCount} branches (each beyond ${t.branchesIncluded} is $1.50 a month)`);
    const over = neon.scratchEndpoints.filter((e) => e.maxCu > t.scratchMaxCu);
    add("scratch-cap", `Scratch branches at ${t.scratchMaxCu} CU or less`, over.length > 0,
      over.length ? over.map((s) => `${s.branch} at ${s.maxCu} CU`).join(", ") : "none over");
  }
  return { red: rules.some((r) => r.fired), rules };
}

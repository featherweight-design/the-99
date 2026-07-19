export type Role = "ramp" | "draw" | "removal" | "wipes" | "land";
export type RoleInput = { typeLine: string; oracleText: string | null; keywords: string[] };

export const ROLE_TARGETS: Record<Exclude<Role, "land">, number> = {
  ramp: 10, draw: 10, removal: 8, wipes: 3,
};

const RAMP_PATTERNS = [
  /\{t\}: add /, /adds? (one|two|three|\{[wubrgc]\})/,
  /search your library for .{0,40}land .{0,60}onto the battlefield/,
];
const DRAW_PATTERNS = [/draw (a|one|two|three|four|x) cards?/];
// Mass removal is its own role (design baseline 3); these patterns move OUT of
// the removal set so a wrath doesn't inflate both chips.
const WIPE_PATTERNS = [/destroy all/, /exile all/, /all creatures get [-−]\d/];
const REMOVAL_PATTERNS = [
  /destroy target/, /exile target/,
  /counter target/, /deals? \d+ damage to (any target|target creature)/,
  /target creature gets [-−]\d/,
];
const NOT_REMOVAL = /target .{0,30}you control/;

export function classifyRoles(card: RoleInput): Role[] {
  const roles: Role[] = [];
  const text = (card.oracleText ?? "").toLowerCase();
  const type = card.typeLine.toLowerCase();

  if (type.includes("land")) roles.push("land");
  if (!type.includes("land") && RAMP_PATTERNS.some((p) => p.test(text))) roles.push("ramp");
  if (DRAW_PATTERNS.some((p) => p.test(text))) roles.push("draw");
  if (WIPE_PATTERNS.some((p) => p.test(text))) roles.push("wipes");
  if (REMOVAL_PATTERNS.some((p) => p.test(text)) && !NOT_REMOVAL.test(text)) roles.push("removal");
  return roles;
}

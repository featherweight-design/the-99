// The refusals `--diagnose` makes before it spends anything (scripts/generate-commander-prose.ts), as one pure decision so they
// are tested: a diagnostic that bills must never run under a flag that promises it calls nothing, past the cap, for a name that
// is not exactly one commander, or for a commander the run would never write.

export type DiagnoseCheck = {
  name: string | undefined;
  dryRun: boolean;
  oneCallUsd: number;
  maxUsd: number;
  matches: number;
  suppressed: boolean;
};

/** The reason `--diagnose` must not call, or null when it may make its one call. */
export function diagnoseRefusal(c: DiagnoseCheck): string | null {
  if (!c.name || c.name.startsWith("--")) return 'needs a commander name, e.g. --diagnose "Jace, Multiverse Architect"';
  if (c.dryRun) return "cannot be combined with --dry-run: a dry run calls nothing and --diagnose makes one call";
  if (c.oneCallUsd > c.maxUsd) return `one call could cost $${c.oneCallUsd.toFixed(4)}, over PROSE_MAX_USD $${c.maxUsd.toFixed(2)}`;
  if (c.matches !== 1) return `${c.matches} commanders are named "${c.name}"; it needs exactly one`;
  if (c.suppressed) return `"${c.name}" is on the suppressed list, so a run would never ask for it`;
  return null;
}

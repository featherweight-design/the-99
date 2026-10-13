import { explainForAccounts, switchEnvValues } from "../switches/explain";
import { readSwitchSnapshot } from "../switches/snapshot";
import { listAccounts } from "./accounts";
import { switchRows, type SwitchRow } from "./switches-rule";

export type SwitchesList = { rows: SwitchRow[]; total: number; overridesRead: boolean };

/**
 * The Switches list's data (admin STATES L1). The overrides are read fresh, never through the
 * 30-second memo, so the page shows the admin's own write at once. `overridesRead` is false when the
 * read failed: every row then resolves from the environment alone, which is what readers are served
 * in that state too (`snapshot.ts`).
 */
export async function loadSwitchesList(): Promise<SwitchesList> {
  const [snapshot, { accounts }] = await Promise.all([readSwitchSnapshot(), listAccounts()]);
  const verdicts = explainForAccounts(snapshot, accounts.map((a) => a.id));
  return {
    rows: switchRows({ env: switchEnvValues(), overrides: snapshot?.overrides ?? [], verdicts }),
    total: accounts.length,
    overridesRead: snapshot !== null,
  };
}

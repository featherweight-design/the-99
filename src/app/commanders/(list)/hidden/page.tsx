// /commanders/hidden: the Commanders place's fourth tab (design_handoff_the99_hide_commander README §3). The
// commanders the reader hid, newest first, each with the way back. Read live per request: it caches nothing, and the
// list is the reader's own small set.
//
// No collection is needed to draw it (READINESS: "no console error on /commanders/hidden for a reader with no
// collection"): a hide outlives a collection replaced or emptied, so the list reads the hides alone.
import { requireUserId } from "../../../../lib/auth";
import { loadHiddenList } from "../../../../lib/commanders/hidden-list";
import { requestSwitchEnv } from "../../../../lib/switches/request";
import { PageHeader } from "../../../../components/commanders/page-header";
import { HiddenList } from "../../../../components/commanders/hidden-list";

export default async function HiddenPage() {
  const userId = await requireUserId();
  // The reader's resolved switches (`requestSwitchEnv`): the slug lookup reads the stored scores under them.
  const env = await requestSwitchEnv(userId);
  const rows = await loadHiddenList(userId, env);
  // No `min-h-screen`: the board draws the zero state straight under the header (its own 40px/34px top), not
  // centred in the viewport's leftover height as `ZeroState`'s `flex-1` would place it in a full-height column.
  return (
    <section className="flex flex-col">
      <PageHeader lane="hidden" />
      <HiddenList rows={rows} />
    </section>
  );
}

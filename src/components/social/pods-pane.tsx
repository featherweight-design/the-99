"use client";
// The pods section of /friends (Social R1 PR E1; design table `social-r1-pods.md` §1 to §5, §9, §10): its head with
// New pod, the inline create field, the empty state, and each pod as a table (`PodCard`). Drawn when the reader has
// a friend or a pod (README 2), so a reader with neither is not shown a group they cannot fill.
//
// The page reads; this holds what a press changes until the server's redraw lands (every write revalidates
// `/friends`). A removed seat leaves at once and a spares box flips at once; a write that fails puts them back and says
// so in the shared toast (E15). A write that answers "already done" is done (E12). Every redraw from the server
// retires what was held, since it carries the truth.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Friend, Pod, PodMember } from "../../lib/social/access";
import { socialCopy } from "../../lib/copy/social";
import { capName, POD_NAME_MAX } from "../../lib/social/client-rules";
import { addMembersAction, createPodAction, removeMemberAction, shareSparesWithAction } from "../../app/friends/actions";
import { PodCard } from "./pod-card";
import { PodAddFriends } from "./pod-add-friends";
import { SocialToast, type SocialToastState } from "./social-toast";

const copy = socialCopy.pods;
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "en-US", { sensitivity: "base" });

/** What a redraw is compared by: everything a held press could have changed. */
function servedKey(pods: readonly Pod[], sharedIds: readonly string[]): string {
  return JSON.stringify([pods.map((p) => [p.id, p.members.map((m) => m.publicId)]), [...sharedIds].sort()]);
}

export function PodsPane({ pods, sharedIds, friends }: { pods: Pod[]; sharedIds: string[]; friends: Friend[] }) {
  const router = useRouter();
  // Seats removed and boxes flipped, held until the server's redraw carries them (or a failure puts them back).
  const [removed, setRemoved] = useState<ReadonlySet<string>>(() => new Set());
  const [sharing, setSharing] = useState<Readonly<Record<string, boolean>>>({});
  const [served, setServed] = useState(() => servedKey(pods, sharedIds));
  const key = servedKey(pods, sharedIds);
  if (key !== served) {
    setServed(key);
    setRemoved(new Set());
    setSharing({});
  }
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const addSeats = useRef(new Map<string, HTMLButtonElement>());
  const addReturn = useRef<HTMLElement | null>(null);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const toastSeq = useRef(0);
  const fail = () => setToast({ id: ++toastSeq.current, text: copy.failed });
  // The switch went off for this reader mid-visit: the page is not found now, and a refresh draws that.
  const off = (r: { ok: boolean; reason?: string }) => !r.ok && r.reason === "off";

  if (friends.length === 0 && pods.length === 0) return null;

  const shown = [...pods].sort(byName).map((p) => ({ ...p, members: p.members.filter((m) => !removed.has(`${p.id}:${m.publicId}`)) }));
  const shared = (podId: string) => sharing[podId] ?? sharedIds.includes(podId);
  const adding_ = shown.find((p) => p.id === adding) ?? null;

  async function create() {
    const clean = name.trim();
    if (!clean || busy) return;
    setBusy(true);
    try {
      const r = await createPodAction(clean);
      if (r.ok) {
        setCreating(false);
        setName("");
      } else if (off(r)) router.refresh();
      else fail();
    } catch {
      fail();
    } finally {
      setBusy(false);
    }
  }

  async function remove(pod: Pod, member: PodMember) {
    const held = `${pod.id}:${member.publicId}`;
    setRemoved((prev) => new Set(prev).add(held));
    const back = () => setRemoved((prev) => {
      const next = new Set(prev);
      next.delete(held);
      return next;
    });
    try {
      // Any answer but off is done: `changed: false` is a member already out (E12).
      if (off(await removeMemberAction(pod.id, member.publicId))) router.refresh();
    } catch {
      back();
      fail();
    }
  }

  async function share(podId: string, on: boolean) {
    const before = shared(podId);
    setSharing((prev) => ({ ...prev, [podId]: on }));
    try {
      const r = await shareSparesWithAction(podId, on);
      if (off(r)) router.refresh();
      else if (!r.ok) {
        setSharing((prev) => ({ ...prev, [podId]: before }));
        fail();
      }
    } catch {
      setSharing((prev) => ({ ...prev, [podId]: before }));
      fail();
    }
  }

  async function add(podId: string, ids: string[]) {
    setBusy(true);
    try {
      const r = await addMembersAction(podId, ids);
      if (r.ok) setAdding(null);
      else if (off(r)) router.refresh();
      else fail();
    } catch {
      fail();
    } finally {
      setBusy(false);
    }
  }

  const candidates = adding_
    ? friends.filter((f) => !adding_.members.some((m) => m.publicId === f.publicId)).sort((a, b) => byName({ name: a.displayName }, { name: b.displayName }))
    : [];

  return (
    <section aria-labelledby="pods-head" className="mt-[24px] md:mt-[34px]" data-testid="pods-pane">
      <div className="flex min-h-[44px] items-center justify-between [border-bottom:1px_solid_var(--border)] md:min-h-[32px] md:pb-[8px]">
        <h2 id="pods-head" className="m-0 font-mono text-[10.5px] font-medium uppercase tracking-[.14em] text-[color:var(--fg-faint)]">{copy.head(pods.length)}</h2>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="min-h-[44px] cursor-pointer border-0 bg-transparent px-[4px] font-sans text-[13.5px] font-medium text-[color:var(--accent)] md:min-h-[32px]"
        >
          {copy.newPod}
        </button>
      </div>
      {creating ? (
        <form
          className="mt-[12px] flex flex-col gap-[8px] rounded-[12px] bg-[color:var(--surface-rail)] p-[14px] [border:1px_solid_var(--border-strong)] md:mt-[14px] md:px-[18px] md:py-[16px]"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setCreating(false);
              setName("");
            }
          }}
        >
          <label htmlFor="pod-new-name" className="text-[13px] font-semibold text-[color:var(--fg)]">{copy.nameLabel}</label>
          <div className="flex flex-col gap-[8px] md:flex-row md:items-center">
            <input
              id="pod-new-name"
              autoFocus
              value={name}
              onChange={(e) => setName(capName(e.target.value, POD_NAME_MAX))}
              autoComplete="off"
              className="box-border h-[46px] w-full rounded-[8px] bg-[color:var(--surface-sunken)] px-[12px] text-[16px] text-[color:var(--fg)] outline-none [border:1px_solid_var(--accent)] md:h-[40px] md:flex-1 md:rounded-[6px] md:text-[14px]"
            />
            <div className="flex gap-[8px] max-md:order-last">
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setName("");
                }}
                className="h-[44px] flex-1 cursor-pointer rounded-[8px] bg-transparent px-[14px] text-[14px] text-[color:var(--fg-body)] [border:1px_solid_var(--border-strong)] md:h-[40px] md:flex-none md:rounded-[6px] md:text-[13px]"
              >
                {copy.cancel}
              </button>
              <button
                type="submit"
                aria-disabled={!name.trim() || busy || undefined}
                className="h-[44px] flex-1 cursor-pointer rounded-[8px] border-0 bg-[color:var(--accent)] px-[16px] text-[14px] font-semibold text-[color:var(--bg)] aria-disabled:cursor-default aria-disabled:opacity-50 md:h-[40px] md:flex-none md:rounded-[6px] md:text-[13px]"
              >
                {copy.create}
              </button>
            </div>
            <p className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)] md:hidden">{copy.nameHint}</p>
          </div>
          <p className="m-0 hidden font-mono text-[11px] text-[color:var(--fg-faint)] md:block">{copy.nameHint}</p>
        </form>
      ) : null}
      {shown.length === 0 && !creating ? (
        <div className="mt-[12px] flex flex-col gap-[6px] rounded-[12px] px-[18px] py-[20px] [border:1px_dashed_var(--border-dashed)] md:mt-[14px] md:px-[28px] md:py-[26px]" data-testid="pods-empty">
          <b className="font-display text-[16px] font-bold text-[color:var(--fg)] md:text-[17px]">{copy.emptyTitle}</b>
          <span className="text-[13px] leading-[1.55] text-[color:var(--fg-muted)] md:max-w-[560px] md:text-[13.5px]">{copy.emptyBody}</span>
        </div>
      ) : null}
      {shown.map((p) => (
        <PodCard
          key={p.id}
          pod={p}
          shared={shared(p.id)}
          onRemove={(m) => void remove(p, m)}
          onShare={(on) => void share(p.id, on)}
          onAdd={() => {
            addReturn.current = addSeats.current.get(p.id) ?? null;
            setAdding(p.id);
          }}
          addRef={(el) => {
            if (el) addSeats.current.set(p.id, el);
            else addSeats.current.delete(p.id);
          }}
        />
      ))}
      {adding_ ? (
        <PodAddFriends
          podName={adding_.name}
          candidates={candidates}
          hasFriends={friends.length > 0}
          busy={busy}
          onAdd={(ids) => void add(adding_.id, ids)}
          onClose={() => setAdding(null)}
          returnFocusRef={addReturn}
        />
      ) : null}
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </section>
  );
}

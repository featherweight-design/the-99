"use client";
// The pods section of /friends (Social R1 PR E1; design table `social-r1-pods.md` §1 to §5, §9, §10): its head with
// New pod, the inline create field, the empty state, and each pod as a table (`PodCard`). Drawn when the reader has
// a friend or a pod (README 2), so a reader with neither is not shown a group they cannot fill.
//
// The page reads; this holds what a press changes until the server's redraw lands (every write revalidates
// `/friends`). A removed seat leaves at once and a spares box flips at once; a write that fails puts them back and says
// so in the shared toast (E15). A write that answers "already done" is done (E12). Every redraw from the server
// retires what was held, since it carries the truth.

import type { OpenTable } from "../../lib/social/rule-zero";
import { PodRuleZeroRow } from "../rule-zero/pod-row";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Friend, Pod, PodMember } from "../../lib/social/access";
import { socialCopy } from "../../lib/copy/social";
import { capName, POD_NAME_MAX } from "../../lib/social/client-rules";
import {
  addMembersAction,
  createPodAction,
  deletePodAction,
  leavePodAction,
  removeMemberAction,
  renamePodAction,
  shareSparesWithAction,
} from "../../app/friends/actions";
import { AFFIX_FOCUS, AFFIX_INPUT } from "../ui/text-field";
import { PodCard } from "./pod-card";
import { PodAddFriends } from "./pod-add-friends";
import { compareNames } from "../../lib/person-name";
import { SocialToast, type SocialToastState } from "./social-toast";

const copy = socialCopy.pods;
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "en-US", { sensitivity: "base" });


export function PodsPane({
  pods,
  sharedIds,
  friends,
  ruleZero = null,
}: {
  pods: Pod[];
  sharedIds: string[];
  friends: Friend[];
  /** Rule 0 on for the reader: each pod's open table the reader sits at (or none), and the server's clock. */
  ruleZero?: { tables: OpenTable[]; now: Date } | null;
}) {
  const router = useRouter();
  // Seats removed and boxes flipped, held until the server's redraw carries them (or a failure puts them back).
  const [removed, setRemoved] = useState<ReadonlySet<string>>(() => new Set());
  const [sharing, setSharing] = useState<Readonly<Record<string, boolean>>>({});
  // Names saved and pods left or deleted, held the same way.
  const [renamed, setRenamed] = useState<Readonly<Record<string, string>>>({});
  const [gone, setGone] = useState<ReadonlySet<string>>(() => new Set());
  // Every payload the server sends retires them, even one equal to the last: a fresh read is the truth, whatever
  // the held value says (another tab may have put back what this one changed). The page's payload is decoded once
  // per redraw, so a new array is a new read and the same array is a render of the same one.
  const [served, setServed] = useState({ pods, sharedIds });
  if (served.pods !== pods || served.sharedIds !== sharedIds) {
    setServed({ pods, sharedIds });
    setRemoved(new Set());
    setSharing({});
    setRenamed({});
    setGone(new Set());
  }
  const [creating, setCreating] = useState(false);
  // Which opening of the create field is on screen: a create that answers after the reader cancelled and opened
  // it again leaves that new draft alone.
  const createOpening = useRef(0);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  // The open Add dialog, with the opening it belongs to: a request that finishes closes only its own opening.
  const [adding, setAdding] = useState<{ podId: string; seq: number } | null>(null);
  const openings = useRef(0);
  // A spares write per pod at a time: its box holds while one is in flight, so a rollback is never to a value that
  // was itself unsaved.
  const [sharePending, setSharePending] = useState<ReadonlySet<string>>(() => new Set());
  const addSeats = useRef(new Map<string, HTMLButtonElement>());
  const addReturn = useRef<HTMLElement | null>(null);
  // Where focus goes when a card leaves under it (a leave or a delete): the head's New pod, always drawn.
  const newPodRef = useRef<HTMLButtonElement>(null);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const toastSeq = useRef(0);
  const fail = () => setToast({ id: ++toastSeq.current, text: copy.failed });
  // The switch went off for this reader mid-visit: the page is not found now, and a refresh draws that.
  const off = (r: { ok: boolean; reason?: string }) => !r.ok && r.reason === "off";

  if (friends.length === 0 && pods.length === 0) return null;

  const shown = pods
    .filter((p) => !gone.has(p.id))
    .map((p) => {
      const members = p.members.filter((m) => !removed.has(`${p.id}:${m.publicId}`));
      return { ...p, name: renamed[p.id] ?? p.name, members };
    })
    .sort(byName);
  const shared = (podId: string) => sharing[podId] ?? sharedIds.includes(podId);
  const adding_ = shown.find((p) => p.id === adding?.podId) ?? null;

  async function create() {
    const clean = name.trim();
    if (!clean || busy) return;
    const opening = createOpening.current;
    setBusy(true);
    try {
      const r = await createPodAction(clean);
      if (r.ok) {
        if (createOpening.current === opening) {
          setCreating(false);
          setName("");
        }
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

  // A failed spares write lets go of its own value, so the box reads the server's latest: the page before the write,
  // or a redraw that landed while it was in flight.
  const drop = (podId: string) =>
    setSharing((prev) => {
      const next = { ...prev };
      delete next[podId];
      return next;
    });

  async function share(podId: string, on: boolean) {
    if (sharePending.has(podId)) return;
    setSharing((prev) => ({ ...prev, [podId]: on }));
    setSharePending((prev) => new Set(prev).add(podId));
    try {
      const r = await shareSparesWithAction(podId, on);
      if (off(r)) router.refresh();
      else if (!r.ok) {
        drop(podId);
        fail();
      }
    } catch {
      drop(podId);
      fail();
    } finally {
      setSharePending((prev) => {
        const next = new Set(prev);
        next.delete(podId);
        return next;
      });
    }
  }

  async function rename(podId: string, next: string) {
    setRenamed((prev) => ({ ...prev, [podId]: next }));
    // A failure lets go of this name only: a later save of another one stands.
    const back = () =>
      setRenamed((prev) => {
        if (prev[podId] !== next) return prev;
        const rest = { ...prev };
        delete rest[podId];
        return rest;
      });
    try {
      const r = await renamePodAction(podId, next);
      if (r.ok) return;
      back();
      // Not the owner any more, or the pod is gone: the page is stale, and its redraw says so.
      if (off(r) || r.reason === "notOwner") router.refresh();
      else fail();
    } catch {
      back();
      fail();
    }
  }

  // Leave and delete answer whether the pod is gone for this reader; the card leaves at once when it is.
  async function leaveCard(podId: string, write: () => Promise<{ ok: boolean; reason?: string }>): Promise<boolean> {
    try {
      const r = await write();
      if (off(r)) {
        router.refresh();
        return false;
      }
      // `notMember` from a leave is a reader already out (E12): done, and the page is stale.
      if (!r.ok && r.reason !== "notMember") {
        fail();
        return false;
      }
      if (!r.ok) router.refresh();
      // The section leaves with its last pod when the reader has no friend, so focus goes to the page's title.
      const lastOut = friends.length === 0 && shown.every((p) => p.id === podId);
      setGone((prev) => new Set(prev).add(podId));
      (lastOut ? document.getElementById("friends-title") : newPodRef.current)?.focus();
      return true;
    } catch {
      fail();
      return false;
    }
  }

  async function add(podId: string, seq: number, ids: string[]) {
    setBusy(true);
    try {
      const r = await addMembersAction(podId, ids);
      if (r.ok) setAdding((now) => (now?.seq === seq ? null : now));
      else if (off(r)) router.refresh();
      else fail();
    } catch {
      fail();
    } finally {
      setBusy(false);
    }
  }

  const candidates = adding_
    ? friends.filter((f) => !adding_.members.some((m) => m.publicId === f.publicId)).sort((a, b) => compareNames(a.displayName, b.displayName, "en-US", { sensitivity: "base" }))
    : [];

  return (
    <section aria-labelledby="pods-head" className="mt-[24px] md:mt-[34px]" data-testid="pods-pane">
      <div className="flex min-h-[44px] items-center justify-between [border-bottom:1px_solid_var(--border)] md:min-h-[32px] md:pb-[8px]">
        <h2 id="pods-head" className="m-0 font-mono text-[10.5px] font-medium uppercase tracking-[.14em] text-[color:var(--fg-faint)]">{copy.head(shown.length)}</h2>
        <button
          ref={newPodRef}
          type="button"
          onClick={() => {
            if (!creating) createOpening.current += 1;
            setCreating(true);
          }}
          // From 1180px the head sits beside the left column's heads (small items item 6), so it holds their 32px, rule
          // included: the press drops its own minimum there and the head's 32px governs, with a coarse pointer's 44px hit kept.
          className="relative min-h-[44px] cursor-pointer border-0 bg-transparent px-[4px] font-sans text-[13.5px] font-medium text-[color:var(--accent-text)] md:min-h-[32px] min-[73.75rem]:min-h-0 pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:top-1/2 pointer-coarse:after:h-[44px] pointer-coarse:after:-translate-y-1/2 pointer-coarse:after:content-['']"
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
            // Escape while composing cancels the composition, not the field.
            if (e.key === "Escape" && !e.nativeEvent.isComposing) {
              setCreating(false);
              setName("");
            }
          }}
        >
          <label htmlFor="pod-new-name" className="text-[13px] font-semibold text-[color:var(--fg)]">{copy.nameLabel}</label>
          <div className="flex flex-col gap-[8px] md:flex-row md:items-center">
            {/* The field draws its focus (the accent edge the board shows while it is open), the input none (AFFIX). */}
            <div className={`box-border flex h-[46px] w-full rounded-[8px] bg-[color:var(--surface-sunken)] [border:1px_solid_var(--border-strong)] md:h-[40px] md:flex-1 md:rounded-[6px] ${AFFIX_FOCUS}`}>
              <input
                id="pod-new-name"
                autoFocus
                value={name}
                onChange={(e) => setName(capName(e.target.value, POD_NAME_MAX))}
                autoComplete="off"
                className={`h-full w-full min-w-0 px-[12px] text-[16px] text-[color:var(--fg)] [@media(pointer:fine)]:md:text-[14px] ${AFFIX_INPUT}`}
              />
            </div>
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
          ruleZero={
            ruleZero ? (
              <PodRuleZeroRow podId={p.id} table={ruleZero.tables.find((t) => t.podId === p.id) ?? null} now={ruleZero.now} />
            ) : undefined
          }
          sharePending={sharePending.has(p.id)}
          onRemove={(m) => void remove(p, m)}
          onShare={(on) => void share(p.id, on)}
          // The heir's seat is removed and not yet redrawn: who the pod passes to is the server's to say again
          // (a tie on join time is broken by account ids the page never holds), so Leave waits for the redraw.
          leaveHeld={!!p.nextOwner && removed.has(`${p.id}:${p.nextOwner.publicId}`)}
          onRename={(next) => void rename(p.id, next)}
          onLeave={() => leaveCard(p.id, () => leavePodAction(p.id))}
          onDelete={() => leaveCard(p.id, () => deletePodAction(p.id))}
          onAdd={() => {
            addReturn.current = addSeats.current.get(p.id) ?? null;
            setAdding({ podId: p.id, seq: ++openings.current });
          }}
          addRef={(el) => {
            if (el) addSeats.current.set(p.id, el);
            else addSeats.current.delete(p.id);
          }}
        />
      ))}
      {adding_ ? (
        <PodAddFriends
          key={adding!.seq}
          podName={adding_.name}
          candidates={candidates}
          hasFriends={friends.length > 0}
          busy={busy}
          onAdd={(ids) => void add(adding_.id, adding!.seq, ids)}
          onClose={() => setAdding(null)}
          returnFocusRef={addReturn}
        />
      ) : null}
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </section>
  );
}

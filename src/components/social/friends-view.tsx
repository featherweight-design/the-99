"use client";
// /friends, drawn (Social R1 PR C): the head and the commander picker it opens. The page reads; this holds what
// a press changes until the server's redraw lands (every write revalidates `/friends`), and owns the writes'
// failures, which are the shared toast (E15).
//
// The name and the face follow the server: when a redraw brings a profile that differs from the last one drawn,
// they take it, during render (never in an effect, or the old value paints once first). A press's optimistic value
// stands only until that redraw lands, or its own write answers.

import { useEffect, useRef, useState } from "react";
import type { ProfileCommander } from "../../lib/social/commander";
import type { OwnProfile } from "../../lib/social/friends";
import type { CommanderTile } from "../../lib/decks/commander-picker";
import { socialCopy } from "../../lib/copy/social";
import { setCommanderAction, setDisplayNameAction } from "../../app/friends/actions";
import { FriendsHead } from "./friends-head";
import { CommanderPicker } from "./commander-picker";
import { SocialToast, type SocialToastState } from "./social-toast";

const p = socialCopy.page;

/** What a redraw is compared by: the fields the head draws. */
function drawnKey(p: OwnProfile): string {
  const c = p.commander;
  return JSON.stringify([p.displayName, c?.oracleId ?? null, c?.name ?? null, c?.artCropUri ?? null]);
}

/**
 * One optimistic write at a time to one field. The new value shows at once; a second write while one is in
 * flight is refused (the caller says so), so a rollback never lands on another write's unsaved value. Success
 * draws nothing more: the action's redraw brings the saved value, and a newer redraw is already adopted. A
 * failure puts back what the server LAST drew, read at the moment it fails, never a value from before a redraw.
 */
function useFieldWrite<T>(served: T, show: (v: T) => void) {
  const latest = useRef(served);
  useEffect(() => {
    latest.current = served;
  }, [served]);
  const pending = useRef(false);
  return async function write(next: T, save: () => Promise<boolean>): Promise<"saved" | "failed" | "busy"> {
    if (pending.current) return "busy";
    pending.current = true;
    show(next);
    const ok = await save().catch(() => false);
    pending.current = false;
    if (!ok) show(latest.current);
    return ok ? "saved" : "failed";
  };
}

export function FriendsView({ profile }: { profile: OwnProfile }) {
  const [name, setName] = useState(profile.displayName);
  const [commander, setCommander] = useState(profile.commander);
  const [served, setServed] = useState(() => drawnKey(profile));
  const servedKey = drawnKey(profile);
  if (servedKey !== served) {
    setServed(servedKey);
    setName(profile.displayName);
    setCommander(profile.commander);
  }
  const face = useRef<HTMLButtonElement>(null);
  const [picking, setPicking] = useState(false);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const say = (text: string) => setToast({ id: Date.now(), text });
  const writeName = useFieldWrite(profile.displayName, setName);
  const writeCommander = useFieldWrite<ProfileCommander | null>(profile.commander, setCommander);

  async function rename(next: string) {
    // A second save while one is in flight is refused and changes nothing on screen.
    const done = await writeName(next, async () => (await setDisplayNameAction(next)).ok);
    if (done === "failed") say(p.nameField.failed);
  }

  async function pick(tile: CommanderTile | null) {
    setPicking(false);
    const done = await writeCommander(tile, async () => (await setCommanderAction(tile?.oracleId ?? null)).ok);
    if (done === "failed") say(socialCopy.commander.failed);
  }

  return (
    <>
      <div className="mx-auto box-border w-full max-w-[720px] px-[16px] pb-[60px] pt-[22px] md:px-0 md:pt-[36px]">
        <FriendsHead name={name} commander={commander} onRename={rename} onOpenPicker={() => setPicking(true)} faceRef={face} picking={picking} />
      </div>
      {picking ? <CommanderPicker current={commander?.oracleId ?? null} onPick={pick} onClose={() => setPicking(false)} returnFocusRef={face} /> : null}
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}

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
 * Optimistic writes to one field, any number in flight. Only the newest write's answer draws; a failure puts back the
 * last value a write CONFIRMED (or the server drew), never the optimistic value an earlier, still unanswered write
 * left on screen. An older write answering after the newest has settled draws what is confirmed by then. A write
 * started before the server's latest redraw is superseded by it: its answer, success or failure, draws nothing.
 */
function useFieldWrites<T>(served: T, show: (v: T) => void) {
  const confirmed = useRef(served);
  const seq = useRef({ latest: 0, confirmedBy: 0, latestSettled: true });
  // The server's redraw is the truth a failure falls back to, and it retires every write started before it.
  const generation = useRef(0);
  useEffect(() => {
    confirmed.current = served;
    generation.current += 1;
  }, [served]);
  return async function write(next: T, save: () => Promise<{ value: T } | null>): Promise<boolean> {
    const s = seq.current;
    const n = ++s.latest;
    const g = generation.current;
    s.latestSettled = false;
    show(next);
    const out = await save();
    if (g !== generation.current) {
      if (n === s.latest) s.latestSettled = true;
      return out !== null;
    }
    if (out && n > s.confirmedBy) {
      confirmed.current = out.value;
      s.confirmedBy = n;
    }
    if (n === s.latest) s.latestSettled = true;
    if (n === s.latest || s.latestSettled) show(confirmed.current);
    return out !== null;
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
  const writeName = useFieldWrites(profile.displayName, setName);
  const writeCommander = useFieldWrites<ProfileCommander | null>(profile.commander, setCommander);

  async function rename(next: string) {
    const saved = await writeName(next, async () => {
      const out = await setDisplayNameAction(next).catch(() => null);
      return out?.ok ? { value: out.displayName } : null;
    });
    if (!saved) say(p.nameField.failed);
  }

  async function pick(tile: CommanderTile | null) {
    setPicking(false);
    const saved = await writeCommander(tile, async () => {
      const out = await setCommanderAction(tile?.oracleId ?? null).catch(() => null);
      return out?.ok ? { value: tile } : null;
    });
    if (!saved) say(socialCopy.commander.failed);
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

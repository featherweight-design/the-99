"use client";
// /friends, drawn (Social R1 PR C): the head and the commander picker it opens. The page reads; this holds what
// a press changes until the server's redraw lands (every write revalidates `/friends`), and owns the writes'
// failures, which are the shared toast (E15).

import { useState } from "react";
import type { OwnProfile } from "../../lib/social/friends";
import type { CommanderTile } from "../../lib/decks/commander-picker";
import { socialCopy } from "../../lib/copy/social";
import { setCommanderAction, setDisplayNameAction } from "../../app/friends/actions";
import { FriendsHead } from "./friends-head";
import { CommanderPicker } from "./commander-picker";
import { SocialToast, type SocialToastState } from "./social-toast";

const p = socialCopy.page;

export function FriendsView({ profile }: { profile: OwnProfile }) {
  const [name, setName] = useState(profile.displayName);
  const [commander, setCommander] = useState(profile.commander);
  const [picking, setPicking] = useState(false);
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const say = (text: string) => setToast({ id: Date.now(), text });

  async function rename(next: string) {
    const was = name;
    setName(next);
    const out = await setDisplayNameAction(next).catch(() => null);
    if (out?.ok) setName(out.displayName);
    else {
      setName(was);
      say(p.nameField.failed);
    }
  }

  async function pick(tile: CommanderTile | null) {
    setPicking(false);
    const was = commander;
    setCommander(tile);
    const out = await setCommanderAction(tile?.oracleId ?? null).catch(() => null);
    if (!out?.ok) {
      setCommander(was);
      say(socialCopy.commander.failed);
    }
  }

  return (
    <>
      <div className="mx-auto box-border w-full max-w-[720px] px-[16px] pb-[60px] pt-[22px] md:px-0 md:pt-[36px]">
        <FriendsHead name={name} commander={commander} onRename={rename} onOpenPicker={() => setPicking(true)} />
      </div>
      {picking ? <CommanderPicker current={commander?.oracleId ?? null} onPick={pick} onClose={() => setPicking(false)} /> : null}
      <SocialToast toast={toast} onDone={() => setToast(null)} />
    </>
  );
}

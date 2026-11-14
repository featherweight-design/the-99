"use client";
// The landing after an account is deleted (account settings handoff R1, call 10; READINESS clarification 7): signed out,
// with the shipped toast "Your account is deleted." (role status). The delete lands here through Clerk's sign-out with
// `/?deleted=1`; the param is read on the client, then stripped with `mirrorUrl` so a reload or a shared link says nothing.
// The landing has no tab bar, so the toast's foot is its own: 16px off the bottom (`--tabbar-h` 0 here, as /report sets
// its own), where the app's 74px would float it.

import { useEffect, useRef, useState } from "react";
import { accountCopy } from "../../lib/copy/account";
import { mirrorUrl } from "../../lib/url/mirror";
import { SocialToast, type SocialToastState } from "../social/social-toast";

export const DELETED_PARAM = "deleted";

export function DeletedToast() {
  const [toast, setToast] = useState<SocialToastState | null>(null);
  const read = useRef(false);
  useEffect(() => {
    if (read.current) return;
    read.current = true;
    const url = new URL(window.location.href);
    if (url.searchParams.get(DELETED_PARAM) !== "1") return;
    url.searchParams.delete(DELETED_PARAM);
    mirrorUrl(url);
    // Shown once the address is clean; a state set from the address read on mount, never during render (no server value).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToast({ id: 1, text: accountCopy.deleted });
  }, []);
  if (!toast) return null;
  return (
    <div data-deleted-toast="" style={{ "--tabbar-h": "0px" } as React.CSSProperties}>
      <SocialToast toast={toast} role="status" onDone={() => setToast(null)} />
    </div>
  );
}

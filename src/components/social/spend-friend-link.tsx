"use client";

import { useEffect, useRef } from "react";
import { spendFriendLinkAction } from "../../app/friends/actions";

/**
 * Spends an already-friends link (G4, E6): one call to the action, after mount, never from a render. The
 * ref holds it to one call per mount even where React runs an effect twice (Strict Mode), and the action
 * re-reads the link and spends only an open one from a friend, so a second call spends nothing anyway.
 */
export function SpendFriendLink({ token }: { token: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    // The card already says the link is used up; a failure here leaves it open for its inviter to revoke.
    void spendFriendLinkAction(token).catch(() => {});
  }, [token]);
  return null;
}

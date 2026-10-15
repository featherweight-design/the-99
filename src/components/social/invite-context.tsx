"use client";
// Add a friend's press, shared by the /friends head and the pod sheet's no-friends empty (R1 Pods, decision 15):
// one press makes one link and opens the dialog on it (decision 3), whichever control was pressed. FriendsView
// owns the call, its pending state and the hold at ten; the pods pane is drawn inside it, so it reads this.

import { createContext, useContext } from "react";

export type FriendInvite = { invite: () => void; pending: boolean; held: boolean };

export const FriendInviteContext = createContext<FriendInvite | null>(null);

export function useFriendInvite(): FriendInvite | null {
  return useContext(FriendInviteContext);
}

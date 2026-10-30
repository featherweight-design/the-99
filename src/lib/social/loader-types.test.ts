// No exported loader type hands another reader's name out as a plain string (PersonName plan, PR G). `pnpm typecheck`
// evaluates this file: a field named like a name whose type is not `ThirdPartyName` (or null) turns a `Ok<...>` below
// into a type error. Nothing here runs anything; the one `it` only keeps the file a valid suite.
import { describe, expect, it } from "vitest";
import type { GameOpponent } from "../decks/game-opponents";
import type { FriendCell } from "../decks/matchups";
import type { ThirdPartyName } from "../person-name";
import type { Friend, Pod, PodMember } from "./access";
import type { FriendDeckPage } from "./decks";
import type { FeedFriend } from "./feed-items";
import type { InviteSender } from "./friends";
import type { FriendDeck as PickerDeck, PickerFriend, PickerPod, PodSeat } from "./games";
import type { OtherSide } from "./spare-requests";
import type { SharedPod, SpareFriend } from "./spares";

/** The keys under which a loader names a person, a pod or a friend's deck. */
type NameKey = "displayName" | "name" | "podName" | "inviterName" | "deckName" | "setBy" | "owner" | "label";
/** The name-like keys of `T` (one level) whose type is not a `ThirdPartyName`, or null. */
type PlainNames<T> = { [K in keyof T]: K extends NameKey ? ([T[K]] extends [ThirdPartyName | null | undefined] ? never : K) : never }[keyof T];
type None<T> = [T] extends [never] ? true : false;
type Ok<T extends true> = T;

export type LoaderTypeChecks = [
  // The checker sees a plain name: this is the proof it can fail.
  Ok<PlainNames<{ displayName: string }> extends "displayName" ? true : false>,
  Ok<None<PlainNames<{ displayName: string }>> extends false ? true : false>,
  Ok<None<PlainNames<Friend>>>,
  Ok<None<PlainNames<PodMember>>>,
  Ok<None<PlainNames<Pod>>>,
  Ok<None<PlainNames<NonNullable<Pod["nextOwner"]>>>>,
  Ok<None<PlainNames<FeedFriend>>>,
  Ok<None<PlainNames<InviteSender>>>,
  Ok<None<PlainNames<OtherSide>>>,
  Ok<None<PlainNames<SpareFriend>>>,
  Ok<None<PlainNames<SharedPod>>>,
  Ok<None<PlainNames<PodSeat>>>,
  Ok<None<PlainNames<PickerFriend>>>,
  Ok<None<PlainNames<PickerPod>>>,
  Ok<None<PlainNames<PickerDeck>>>,
  Ok<None<PlainNames<FriendDeckPage>>>,
  Ok<None<PlainNames<FriendCell>>>,
  Ok<None<PlainNames<GameOpponent>>>,
  Ok<None<PlainNames<NonNullable<GameOpponent["friend"]>>>>,
];

describe("loader types", () => {
  it("brand every other reader's name", () => {
    const pods: SpareFriend["pods"] = [];
    expect(pods).toEqual([]);
  });
});

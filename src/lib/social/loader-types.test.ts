// No exported loader type hands another reader's name out as a plain string (PersonName plan, PR G). `pnpm typecheck`
// evaluates this file: a field named like a name whose type is not `ThirdPartyName` (or null) turns a `Ok<...>` below
// into a type error. Nothing here runs anything; the one `it` only keeps the file a valid suite.
import { describe, expectTypeOf, it } from "vitest";
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

/** The keys under which a loader names a person, a pod or a friend's deck (a card's or a commander's name is not one). */
type NameKey =
  | "displayName" | "name" | "podName" | "podNames" | "pods" | "inviterName" | "deckName" | "setBy" | "setByName"
  | "owner" | "ownerName" | "label" | "friendNameThen" | "deckNameThen";
/** Keys whose contents are cards, not people: their `name` is a card name and is not walked. */
type CardKey = "commander" | "partner" | "commanders" | "cards" | "faces" | "colorIdentity";
type IsAny<T> = 0 extends 1 & T ? true : false;
/**
 * The name-like keys of `T`, to four levels through objects and arrays, whose type is not a `ThirdPartyName` (or a
 * list of them, or null), or is `any`. `never` when every one is branded.
 */
type Walk<T, D extends unknown[] = []> =
  IsAny<T> extends true ? "any"
  : D["length"] extends 4 ? never
  : T extends ThirdPartyName | Date | string | number | boolean | null | undefined ? never
  : T extends readonly (infer E)[] ? Walk<E, [...D, 0]>
  : T extends object
    ? {
        [K in keyof T & string]: K extends CardKey ? never
          : K extends NameKey
            ? IsAny<T[K]> extends true ? K
              : [T[K]] extends [ThirdPartyName | readonly ThirdPartyName[] | null | undefined] ? never : K
            : Walk<T[K], [...D, 0]>;
      }[keyof T & string]
    : never;
type None<T> = [T] extends [never] ? true : false;
type Ok<T extends true> = T;

export type LoaderTypeChecks = [
  // The walk can fail: a plain name, a plain list, a name two levels down in an array, and `any` are each found.
  Ok<Walk<{ displayName: string }> extends "displayName" ? true : false>,
  Ok<Walk<{ podNames: string[] }> extends "podNames" ? true : false>,
  Ok<Walk<{ a: { b: { setByName: string }[] } }> extends "setByName" ? true : false>,
  Ok<Walk<{ displayName: any }> extends "displayName" ? true : false>, // eslint-disable-line @typescript-eslint/no-explicit-any
  Ok<None<Walk<{ commander: { name: string } }>>>,
  Ok<None<Walk<Friend>>>,
  Ok<None<Walk<PodMember>>>,
  Ok<None<Walk<Pod>>>,
  Ok<None<Walk<FeedFriend>>>,
  Ok<None<Walk<InviteSender>>>,
  Ok<None<Walk<OtherSide>>>,
  Ok<None<Walk<SpareFriend>>>,
  Ok<None<Walk<SharedPod>>>,
  Ok<None<Walk<PodSeat>>>,
  Ok<None<Walk<PickerFriend>>>,
  Ok<None<Walk<PickerPod>>>,
  Ok<None<Walk<PickerDeck>>>,
  // `shares` are the VIEWER's own decks, plain on purpose.
  Ok<None<Walk<Omit<FriendDeckPage, "shares">>>>,
  Ok<None<Walk<FriendCell>>>,
  Ok<None<Walk<GameOpponent>>>,
];

describe("loader types", () => {
  it("brand every other reader's name", () => {
    expectTypeOf<Friend["displayName"]>().toEqualTypeOf<ThirdPartyName>();
    expectTypeOf<Pod["name"]>().toEqualTypeOf<ThirdPartyName>();
    expectTypeOf<SpareFriend["pods"]>().toEqualTypeOf<ThirdPartyName[]>();
    expectTypeOf<PickerDeck["name"]>().toEqualTypeOf<ThirdPartyName>();
  });
});

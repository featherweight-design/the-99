// Social R1's actions (PR B): each decides the switch for the READER and refuses as `off` without writing,
// and each maps its library result to an outcome the screen draws, so a refusal never reads as done (E12).
// A component test mocks these away, so a write that skipped the gate or a mapping would pass everywhere else.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  requestSwitchEnv: vi.fn(),
  headers: vi.fn(),
  revalidatePath: vi.fn(),
  after: vi.fn(),
  setDisplayName: vi.fn(),
  setCommander: vi.fn(),
  createInvite: vi.fn(),
  ensureProfile: vi.fn(),
  profileAgeMs: vi.fn(),
  currentUser: vi.fn(),
  revokeInvite: vi.fn(),
  redeemInvite: vi.fn(),
  spendAlreadyFriendsInvite: vi.fn(),
  declineInvite: vi.fn(),
  readInvite: vi.fn(),
  unfriend: vi.fn(),
  createPod: vi.fn(),
  renamePod: vi.fn(),
  deletePod: vi.fn(),
  addMembers: vi.fn(),
  removeMember: vi.fn(),
  leavePod: vi.fn(),
  shareSparesWith: vi.fn(),
  listOwnDeckCommanders: vi.fn(),
  searchFaceCommanders: vi.fn(),
}));
vi.mock("../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("next/headers", () => ({ headers: m.headers }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("next/server", () => ({ after: m.after }));
vi.mock("@clerk/nextjs/server", () => ({ currentUser: m.currentUser }));
vi.mock("../../lib/social/friends", () => ({
  setDisplayName: m.setDisplayName, createInvite: m.createInvite, ensureProfile: m.ensureProfile, profileAgeMs: m.profileAgeMs, revokeInvite: m.revokeInvite,
  redeemInvite: m.redeemInvite, declineInvite: m.declineInvite, readInvite: m.readInvite, unfriend: m.unfriend,
  spendAlreadyFriendsInvite: m.spendAlreadyFriendsInvite,
}));
vi.mock("../../lib/social/commander", () => ({ setCommander: m.setCommander }));
vi.mock("../../lib/social/pods", () => ({
  createPod: m.createPod, renamePod: m.renamePod, deletePod: m.deletePod, addMembers: m.addMembers,
  removeMember: m.removeMember, leavePod: m.leavePod,
}));
vi.mock("../../lib/social/spares", () => ({ shareSparesWith: m.shareSparesWith }));
vi.mock("../../lib/decks/commander-picker", () => ({
  listOwnDeckCommanders: m.listOwnDeckCommanders, searchFaceCommanders: m.searchFaceCommanders,
}));

import * as actions from "./actions";

const ON = { SOCIAL_FRIENDS_ENABLED: "true" };
const TOKEN = "AbCdEfGhIjKlMnOpQrStUv";
const POD = "11111111-1111-4111-8111-111111111111";
const FRIEND = "22222222-2222-4222-8222-222222222222";
const headersOf = (h: Record<string, string>) => ({ get: (k: string) => h[k] ?? null });
const open = (over: Record<string, unknown> = {}) => ({
  state: "open", inviterName: "Ana", commander: null, self: false, alreadyFriends: false, friendsSince: null, ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  m.requireUserId.mockResolvedValue("user_1");
  m.profileAgeMs.mockResolvedValue(null);
  m.requestSwitchEnv.mockResolvedValue(ON);
  m.headers.mockResolvedValue(headersOf({ host: "staging.the-99.dev", "x-forwarded-proto": "https" }));
  m.after.mockImplementation((fn: () => void) => fn());
});

describe("the switch", () => {
  // Every action, called with arguments that would write if the gate were missing.
  const calls: [string, () => Promise<unknown>][] = [
    ["setDisplayNameAction", () => actions.setDisplayNameAction("Ana")],
    ["setCommanderAction", () => actions.setCommanderAction("o")],
    ["createInviteAction", () => actions.createInviteAction()],
    ["revokeInviteAction", () => actions.revokeInviteAction(TOKEN)],
    ["redeemInviteAction", () => actions.redeemInviteAction(TOKEN)],
    ["declineInviteAction", () => actions.declineInviteAction(TOKEN)],
    ["spendFriendLinkAction", () => actions.spendFriendLinkAction(TOKEN)],
    ["unfriendAction", () => actions.unfriendAction(FRIEND)],
    ["createPodAction", () => actions.createPodAction("Tuesday")],
    ["renamePodAction", () => actions.renamePodAction(POD, "Friday")],
    ["deletePodAction", () => actions.deletePodAction(POD)],
    ["addMembersAction", () => actions.addMembersAction(POD, [FRIEND])],
    ["removeMemberAction", () => actions.removeMemberAction(POD, FRIEND)],
    ["leavePodAction", () => actions.leavePodAction(POD)],
    ["shareSparesWithAction", () => actions.shareSparesWithAction(POD, true)],
    ["listDeckCommandersAction", () => actions.listDeckCommandersAction()],
    ["searchFaceCommandersAction", () => actions.searchFaceCommandersAction("krenko")],
  ];

  it("covers every exported action", () => {
    const exported = Object.entries(actions).filter(([, v]) => typeof v === "function").map(([k]) => k).sort();
    expect(calls.map(([name]) => name).sort()).toEqual(exported);
  });

  it.each(calls)("%s refuses as off, reads nothing and writes nothing while it is off for the reader", async (_n, call) => {
    m.requestSwitchEnv.mockResolvedValue({});
    expect(await call()).toEqual({ ok: false, reason: "off" });
    expect(m.requestSwitchEnv).toHaveBeenCalledWith("user_1");
    for (const [key, fn] of Object.entries(m)) {
      if (["requireUserId", "requestSwitchEnv", "after"].includes(key)) continue;
      expect(fn, key).not.toHaveBeenCalled();
    }
  });

  it("refuses a signed-out caller before anything else", async () => {
    m.requireUserId.mockRejectedValue(new Error("unauthenticated"));
    await expect(actions.createInviteAction()).rejects.toThrow("unauthenticated");
    expect(m.createInvite).not.toHaveBeenCalled();
  });
});

describe("your name and face", () => {
  it("refuses an invalid name before writing, and says so", async () => {
    expect(await actions.setDisplayNameAction("   ")).toEqual({ ok: false, reason: "invalid" });
    expect(await actions.setDisplayNameAction("x".repeat(31))).toEqual({ ok: false, reason: "invalid" });
    expect(m.setDisplayName).not.toHaveBeenCalled();
  });

  it("never reads a refused write as done", async () => {
    m.setDisplayName.mockResolvedValue(false);
    expect(await actions.setDisplayNameAction("Ana")).toEqual({ ok: false, reason: "noProfile" });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("saves the cleaned name and redraws /friends", async () => {
    m.setDisplayName.mockResolvedValue(true);
    expect(await actions.setDisplayNameAction("  Ana   B ")).toEqual({ ok: true, displayName: "Ana B" });
    expect(m.setDisplayName).toHaveBeenCalledWith("user_1", "Ana B");
    expect(m.revalidatePath).toHaveBeenCalledWith("/friends");
  });

  it("passes the commander's refusal through", async () => {
    m.setCommander.mockResolvedValue({ ok: false, reason: "notCommander" });
    expect(await actions.setCommanderAction("o")).toEqual({ ok: false, reason: "notCommander" });
    m.setCommander.mockResolvedValue({ ok: true });
    expect(await actions.setCommanderAction(null)).toEqual({ ok: true });
    expect(m.setCommander).toHaveBeenLastCalledWith("user_1", null);
  });
});

describe("friend links", () => {
  it("addresses a new link at the request's own origin (E7)", async () => {
    const expiresAt = new Date("2026-10-22T00:00:00Z");
    m.createInvite.mockResolvedValue({ ok: true, token: TOKEN, expiresAt });
    expect(await actions.createInviteAction()).toEqual({
      ok: true, token: TOKEN, url: `https://staging.the-99.dev/friend/${TOKEN}`, expiresAt,
    });
  });

  it("makes the inviter's profile before the link, so a link made from Home before /friends is redeemable", async () => {
    m.currentUser.mockResolvedValue({ firstName: "Hugh" });
    m.createInvite.mockResolvedValue({ ok: true, token: TOKEN, expiresAt: new Date("2026-10-22T00:00:00Z") });
    await actions.createInviteAction();
    expect(m.ensureProfile).toHaveBeenCalledWith("user_1", "Hugh");
    expect(m.ensureProfile.mock.invocationCallOrder[0]).toBeLessThan(m.createInvite.mock.invocationCallOrder[0]);
  });

  it("makes no link when the origin cannot be read", async () => {
    m.headers.mockResolvedValue(headersOf({}));
    expect(await actions.createInviteAction()).toEqual({ ok: false, reason: "noOrigin" });
    expect(m.createInvite).not.toHaveBeenCalled();
  });

  it("holds at the cap", async () => {
    m.createInvite.mockResolvedValue({ ok: false, reason: "tooMany" });
    expect(await actions.createInviteAction()).toEqual({ ok: false, reason: "tooMany" });
  });

  it("reads a revoke of an ended link as done, and never revokes a malformed token", async () => {
    m.revokeInvite.mockResolvedValue(false);
    expect(await actions.revokeInviteAction(TOKEN)).toEqual({ ok: true, changed: false });
    expect(await actions.revokeInviteAction("../x")).toEqual({ ok: true, changed: false });
    expect(m.revokeInvite).toHaveBeenCalledTimes(1);
  });

  it("passes an accept's refusal through, and defers /friends on success", async () => {
    m.redeemInvite.mockResolvedValue({ ok: false, reason: "self" });
    expect(await actions.redeemInviteAction(TOKEN)).toEqual({ ok: false, reason: "self" });
    expect(m.after).not.toHaveBeenCalled();
    const ok = { ok: true, friend: { publicId: FRIEND, displayName: "Ana" }, alreadyFriends: false };
    m.redeemInvite.mockResolvedValue(ok);
    expect(await actions.redeemInviteAction(TOKEN)).toEqual(ok);
    expect(m.after).toHaveBeenCalledTimes(1);
    expect(m.revalidatePath).toHaveBeenCalledWith("/friends");
  });

  it("answers a refused decline from a fresh read, never as declined (E12)", async () => {
    m.declineInvite.mockResolvedValue(false);
    m.readInvite.mockResolvedValue({ state: "expired" });
    expect(await actions.declineInviteAction(TOKEN)).toEqual({ ok: false, reason: "ended" });
    m.readInvite.mockResolvedValue(null);
    expect(await actions.declineInviteAction(TOKEN)).toEqual({ ok: false, reason: "ended" });
    m.readInvite.mockResolvedValue(open({ self: true }));
    expect(await actions.declineInviteAction(TOKEN)).toEqual({ ok: false, reason: "self" });
    m.readInvite.mockResolvedValue(open());
    expect(await actions.declineInviteAction(TOKEN)).toEqual({ ok: false, reason: "failed" });
    m.declineInvite.mockResolvedValue(true);
    expect(await actions.declineInviteAction(TOKEN)).toEqual({ ok: true });
  });
});

describe("the already-friends spend (G4)", () => {
  it("spends through the spend-only write, never the accept, so a view writes no friendship", async () => {
    m.spendAlreadyFriendsInvite.mockResolvedValue(true);
    expect(await actions.spendFriendLinkAction(TOKEN)).toEqual({ ok: true, spent: true });
    expect(m.spendAlreadyFriendsInvite).toHaveBeenCalledWith("user_1", TOKEN);
    expect(m.redeemInvite).not.toHaveBeenCalled();
  });

  it("reports nothing spent when the write found no open link from a friend", async () => {
    m.spendAlreadyFriendsInvite.mockResolvedValue(false);
    expect(await actions.spendFriendLinkAction(TOKEN)).toEqual({ ok: true, spent: false });
    expect(m.redeemInvite).not.toHaveBeenCalled();
  });

  it("refuses a malformed token before any write", async () => {
    expect(await actions.spendFriendLinkAction("nope")).toEqual({ ok: true, spent: false });
    expect(m.spendAlreadyFriendsInvite).not.toHaveBeenCalled();
  });
});

describe("friends and pods", () => {
  it("says when there was no friendship to remove", async () => {
    m.unfriend.mockResolvedValue(false);
    expect(await actions.unfriendAction(FRIEND)).toEqual({ ok: false, reason: "notFriend" });
    m.unfriend.mockResolvedValue(true);
    expect(await actions.unfriendAction(FRIEND)).toEqual({ ok: true });
  });

  it("maps a pod create", async () => {
    m.createPod.mockResolvedValue(null);
    expect(await actions.createPodAction("")).toEqual({ ok: false, reason: "invalid" });
    m.createPod.mockResolvedValue({ id: POD });
    expect(await actions.createPodAction("Tuesday")).toEqual({ ok: true, podId: POD });
  });

  it("tells an invalid name from a pod the reader does not own", async () => {
    expect(await actions.renamePodAction(POD, "x".repeat(41))).toEqual({ ok: false, reason: "invalid" });
    expect(m.renamePod).not.toHaveBeenCalled();
    m.renamePod.mockResolvedValue(false);
    expect(await actions.renamePodAction(POD, "Friday")).toEqual({ ok: false, reason: "notOwner" });
    m.renamePod.mockResolvedValue(true);
    expect(await actions.renamePodAction(POD, " Friday ")).toEqual({ ok: true, name: "Friday" });
  });

  it("reads a delete or a removal that changed nothing as done", async () => {
    m.deletePod.mockResolvedValue(false);
    expect(await actions.deletePodAction(POD)).toEqual({ ok: true, changed: false });
    m.removeMember.mockResolvedValue(true);
    expect(await actions.removeMemberAction(POD, FRIEND)).toEqual({ ok: true, changed: true });
  });

  it("passes the batch add's refusal through", async () => {
    m.addMembers.mockResolvedValue({ ok: false, reason: "notFriend" });
    expect(await actions.addMembersAction(POD, [FRIEND])).toEqual({ ok: false, reason: "notFriend" });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses a leave by a non-member, and names how a leave went", async () => {
    m.leavePod.mockResolvedValue("notMember");
    expect(await actions.leavePodAction(POD)).toEqual({ ok: false, reason: "notMember" });
    m.leavePod.mockResolvedValue("handedOn");
    expect(await actions.leavePodAction(POD)).toEqual({ ok: true, outcome: "handedOn" });
  });

  it("refuses sharing with a pod the reader is not in, but reads turning off as done (E12)", async () => {
    m.shareSparesWith.mockResolvedValue(false);
    expect(await actions.shareSparesWithAction(POD, true)).toEqual({ ok: false, reason: "notMember" });
    expect(await actions.shareSparesWithAction(POD, false)).toEqual({ ok: true, on: false });
    expect(m.shareSparesWith).toHaveBeenLastCalledWith("user_1", POD, false);
  });

  it("never turns sharing on from anything but true", async () => {
    m.shareSparesWith.mockResolvedValue(true);
    expect(await actions.shareSparesWithAction(POD, "true")).toEqual({ ok: true, on: false });
    expect(m.shareSparesWith).toHaveBeenLastCalledWith("user_1", POD, false);
  });
});

describe("the picker's reads (E2)", () => {
  it("reads the reader's own decks' commanders, by the session's id, and revalidates nothing", async () => {
    const tiles = [{ oracleId: "o1", name: "Krenko, Mob Boss", artCropUri: null, colorIdentity: ["R"] }];
    m.listOwnDeckCommanders.mockResolvedValue(tiles);
    expect(await actions.listDeckCommandersAction()).toEqual({ ok: true, tiles });
    expect(m.listOwnDeckCommanders).toHaveBeenCalledWith("user_1");
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("hands the search its query as given, for the library to judge", async () => {
    m.searchFaceCommanders.mockResolvedValue([]);
    expect(await actions.searchFaceCommandersAction(42)).toEqual({ ok: true, tiles: [] });
    expect(m.searchFaceCommanders).toHaveBeenCalledWith(42);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const RESOLVED = { RESOLVED: "1" } as unknown as NodeJS.ProcessEnv;
const stub = vi.hoisted(() => ({ on: true, tuningOn: true, search: vi.fn(), signedIn: vi.fn(async () => "user_1"), flagEnv: [] as unknown[] }));
vi.mock("../../lib/auth", () => ({ requireUserId: stub.signedIn }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: vi.fn(async () => RESOLVED) }));
vi.mock("../../lib/intake/flag", () => ({ helpMeChooseEnabled: (env?: unknown) => (stub.flagEnv.push(env), stub.on) }));
vi.mock("../../lib/tuning/flag", () => ({ tuningEnabled: (env?: unknown) => (stub.flagEnv.push(env), stub.tuningOn) }));
vi.mock("../../lib/decks/notes-store", () => ({ searchNoteCards: stub.search }));

const { searchTagCards } = await import("./tag-actions");

beforeEach(() => { stub.on = true; stub.tuningOn = true; stub.search.mockReset().mockResolvedValue([{ oracleId: "a", name: "Sol Ring", commanderLegal: true }]); stub.signedIn.mockClear(); });

describe("searchTagCards", () => {
  it("searches for a signed-in reader of a surface whose switch is on", async () => {
    expect(await searchTagCards("intake", "sol")).toEqual([{ oracleId: "a", name: "Sol Ring", commanderLegal: true }]);
    expect(stub.signedIn).toHaveBeenCalled();
  });

  it("decides the switch from the reader's resolved switches, not the environment's", async () => {
    stub.flagEnv.length = 0;
    await searchTagCards("intake", "sol");
    await searchTagCards("tuning", "sol");
    expect(stub.flagEnv).toEqual([RESOLVED, RESOLVED]);
  });

  it("asks for only the cards a commander deck may hold, in the query itself, since a tag here is a requirement", async () => {
    await searchTagCards("intake", "o");
    expect(stub.search).toHaveBeenCalledWith("o", { commanderLegalOnly: true });
  });

  it("answers null, searching nothing, with the surface off, an unknown surface or a non-string query", async () => {
    stub.on = false;
    expect(await searchTagCards("intake", "sol")).toBeNull();
    stub.on = true;
    expect(await searchTagCards("deck" as never, "sol")).toBeNull();
    expect(await searchTagCards("intake", 7 as never)).toBeNull();
    expect(stub.search).not.toHaveBeenCalled();
  });

  it("answers null when the lookup throws", async () => {
    stub.search.mockRejectedValueOnce(new Error("db down"));
    expect(await searchTagCards("intake", "sol")).toBeNull();
  });

  it("answers each surface behind its own switch", async () => {
    stub.on = false;
    expect(await searchTagCards("tuning", "sol")).not.toBeNull();
    expect(await searchTagCards("intake", "sol")).toBeNull();
    stub.on = true;
    stub.tuningOn = false;
    expect(await searchTagCards("tuning", "sol")).toBeNull();
    expect(await searchTagCards("intake", "sol")).not.toBeNull();
  });
});

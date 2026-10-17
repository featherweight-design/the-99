import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const stub = vi.hoisted(() => ({
  userId: "user_1" as string | null,
  env: { RULE_ZERO_ENABLED: "true", SOCIAL_FRIENDS_ENABLED: "true" } as Record<string, string>,
  load: vi.fn(),
  read: vi.fn(),
  closed: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: stub.userId }) }));
vi.mock("../../../../../lib/switches/request", () => ({ requestSwitchEnv: async () => stub.env }));
vi.mock("../../../../../lib/social/rule-zero-table", () => ({
  loadTable: stub.load,
  readOnTheSpot: stub.read,
  loadClosedTable: stub.closed,
}));

import { GET } from "./route";

const TABLE = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const get = (id = TABLE) => GET(new NextRequest(`http://localhost/api/rule-zero/tables/${id}`), { params: Promise.resolve({ id }) });
const seat = (n: number, kind: string) => ({ seat: n, state: { kind } });
const view = (...seats: ReturnType<typeof seat>[]) => ({ tableId: TABLE, seats });
const CLOSED = { podName: "Thursday", setBy: null, faces: [] };

beforeEach(() => {
  stub.userId = "user_1";
  stub.env = { RULE_ZERO_ENABLED: "true", SOCIAL_FRIENDS_ENABLED: "true" };
  for (const f of [stub.load, stub.read, stub.closed]) f.mockReset();
  stub.closed.mockResolvedValue(null);
});

describe("GET /api/rule-zero/tables/[id]", () => {
  it("answers the open table through the reader's grant, uncached", async () => {
    stub.load.mockResolvedValue(view(seat(1, "fresh"), seat(2, "waiting")));
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ kind: "open", view: view(seat(1, "fresh"), seat(2, "waiting")) });
    expect(stub.load).toHaveBeenCalledWith("user_1", TABLE);
    expect(stub.read).not.toHaveBeenCalled();
  });

  it("reads each unread seat on the spot, one at a time, and reads the table again when one landed", async () => {
    const order: string[] = [];
    stub.load.mockResolvedValueOnce(view(seat(1, "unread"), seat(2, "fresh"), seat(3, "unread")))
      .mockResolvedValueOnce(view(seat(1, "fresh"), seat(2, "fresh"), seat(3, "unread")));
    stub.read.mockImplementation(async (_u: string, _t: string, n: number) => {
      order.push(`start ${n}`);
      await Promise.resolve();
      order.push(`end ${n}`);
      return n === 1 ? "read" : "busy";
    });
    const body = await (await get()).json();
    expect(order).toEqual(["start 1", "end 1", "start 3", "end 3"]);
    expect(stub.read.mock.calls.map((c) => c.slice(0, 3))).toEqual([["user_1", TABLE, 1], ["user_1", TABLE, 3]]);
    expect(stub.load).toHaveBeenCalledTimes(2);
    expect(body.view.seats[0].state.kind).toBe("fresh");
  });

  it("does not read the table again when nothing landed", async () => {
    stub.load.mockResolvedValue(view(seat(1, "unread")));
    stub.read.mockResolvedValue("skipped");
    await get();
    expect(stub.load).toHaveBeenCalledTimes(1);
  });

  it("answers a table the reader sat at that has closed with its closed body", async () => {
    stub.load.mockResolvedValue(null);
    stub.closed.mockResolvedValue(CLOSED);
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ kind: "closed", closed: CLOSED });
    expect(stub.closed).toHaveBeenCalledWith("user_1", TABLE);
  });

  it("is not found for a table the reader may not see, open or closed", async () => {
    stub.load.mockResolvedValue(null);
    const res = await get();
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("refuses a reader who is not signed in, before reading anything", async () => {
    stub.userId = null;
    expect((await get()).status).toBe(401);
    expect(stub.load).not.toHaveBeenCalled();
  });

  it("is not there with Rule 0 off for the reader, or with its parent off", async () => {
    for (const env of [{ SOCIAL_FRIENDS_ENABLED: "true" }, { RULE_ZERO_ENABLED: "true" }] as Record<string, string>[]) {
      stub.env = env;
      expect((await get()).status).toBe(404);
    }
    expect(stub.load).not.toHaveBeenCalled();
  });
});

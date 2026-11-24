import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ user: null as string | null, rows: null as unknown[] | null }));
vi.mock("../../../../lib/copy-editor/gate", () => ({ copyEditorUser: async () => stub.user }));
const read = vi.hoisted(() => vi.fn());
vi.mock("../../../../lib/copy-editor/rows", () => ({ readEditorRows: read }));

import { GET } from "./route";

beforeEach(() => {
  read.mockReset();
  read.mockImplementation(async () => stub.rows);
  stub.user = "user_admin";
  stub.rows = [{ key: "src/lib/copy/a.ts#x", kind: "text", text: "Hi", placeholders: [], context: "", readOnly: "" }];
});

describe("GET /api/copy-edit/rows", () => {
  it("is a bare 404 for anyone the gate refuses, and never reads the rows", async () => {
    stub.user = null;
    const res = await GET();
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("");
    expect(read).not.toHaveBeenCalled();
  });

  it("returns the rows to the admin, uncached", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).rows).toHaveLength(1);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("is 503 when the build step did not write the rows", async () => {
    stub.rows = null;
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "rows-not-built" });
  });
});

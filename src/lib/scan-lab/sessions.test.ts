import { describe, expect, it } from "vitest";
import { sessionHolder } from "./sessions";

const session = () => {
  const s = { released: 0, release: async () => { s.released++; } };
  return s;
};
const settle = () => new Promise((r) => setTimeout(r, 0));

describe("scan-lab sessions", () => {
  it("releases every held session on close, once", async () => {
    const h = sessionHolder<ReturnType<typeof session>>();
    const a = session(), b = session();
    expect(h.accept(a)).toBe(true);
    expect(h.accept(b)).toBe(true);
    h.close();
    h.close();
    await settle();
    expect([a.released, b.released]).toEqual([1, 1]);
  });

  it("releases a session that finishes loading after the page was left or its sibling failed", async () => {
    const h = sessionHolder<ReturnType<typeof session>>();
    h.close();
    const late = session();
    expect(h.accept(late)).toBe(false);
    await settle();
    expect(late.released).toBe(1);
  });

  it("waits for an inference in flight before releasing, and refuses a new one", async () => {
    const h = sessionHolder<ReturnType<typeof session>>();
    const a = session();
    h.accept(a);
    let finish!: () => void;
    const run = h.use(() => new Promise<void>((r) => { finish = r; }));
    h.close();
    await settle();
    expect(a.released).toBe(0);
    finish();
    await run;
    await settle();
    expect(a.released).toBe(1);
    await expect(h.use(async () => 1)).rejects.toThrow();
  });

  it("re-opens on remount", async () => {
    const h = sessionHolder<ReturnType<typeof session>>();
    h.close();
    h.open();
    const a = session();
    expect(h.accept(a)).toBe(true);
    await settle();
    expect(a.released).toBe(0);
  });
});

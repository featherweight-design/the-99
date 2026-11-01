import { describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement } from "react";

const env = vi.hoisted(() => ({ value: {} as unknown as NodeJS.ProcessEnv }));
vi.mock("../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: async () => env.value }));
vi.mock("../../../lib/commanders/counts", () => ({ loadPlaceCounts: async () => ({ owned: 1, discover: 2, hidden: 3 }) }));

const { default: Layout } = await import("./layout");

/** Every prop a server layout hands a client component must cross the wire: a function does not. */
function propsOf(node: unknown, found: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(node)) node.forEach((n) => propsOf(n, found));
  else if (isValidElement(node)) {
    const el = node as ReactElement<Record<string, unknown>>;
    found.push(el.props);
    propsOf(el.props.children, found);
  }
  return found;
}

describe("the Commanders place layout", () => {
  it("hands its client components nothing a server cannot serialise", async () => {
    env.value = {} as unknown as NodeJS.ProcessEnv;
    const tree = await Layout({ children: <p>page</p> });
    const all = propsOf(tree);
    expect(all.some((p) => "counts" in p)).toBe(true);
    for (const props of all) {
      for (const [key, value] of Object.entries(props)) expect(typeof value, key).not.toBe("function");
    }
  });
});

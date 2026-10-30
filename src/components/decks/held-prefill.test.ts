// The table prefill as BuilderShell holds it (Rule 0 PR 8): only a save or a Cancel spends it.
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TablePrefill } from "../../lib/social/rule-zero-log";
import { useHeldPrefill } from "./held-prefill";
import { named } from "../../lib/person-name/mint";

const prefill = (id: string): TablePrefill => ({ table: { id, seating: "a".repeat(64) }, podName: named("Thursday night"), podSize: 4, seats: [] });

describe("useHeldPrefill", () => {
  it("keeps an unspent prefill through a refresh drawn without one (a game deleted while the form is open)", () => {
    const first = prefill("t1");
    const { result, rerender } = renderHook(({ drawn }) => useHeldPrefill(drawn), { initialProps: { drawn: first as TablePrefill | null } });
    rerender({ drawn: null });
    expect(result.current[0]).toBe(first);
  });

  it("ends the offer on a spend, and a later refresh without one does not bring it back", () => {
    const { result, rerender } = renderHook(({ drawn }) => useHeldPrefill(drawn), { initialProps: { drawn: prefill("t1") as TablePrefill | null } });
    act(() => result.current[1]());
    expect(result.current[0]).toBeNull();
    rerender({ drawn: null });
    expect(result.current[0]).toBeNull();
  });

  it("adopts a fresh prefill (a new arrival from a table) after a spend", () => {
    const { result, rerender } = renderHook(({ drawn }) => useHeldPrefill(drawn), { initialProps: { drawn: prefill("t1") as TablePrefill | null } });
    act(() => result.current[1]());
    const next = prefill("t2");
    rerender({ drawn: next });
    expect(result.current[0]).toBe(next);
  });
});

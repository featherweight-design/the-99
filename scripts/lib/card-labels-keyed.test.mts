import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The build is database-bound, so its wiring is pinned on its source: a reply is matched by KEY, an
// intent records ORACLE IDS, and a card whose name another oracle row shares is planned like any
// other. Until prompt version 9 those cards were excluded, and a run left with only them (the 18
// commander-legal duplicates) exited "EVERY stale card is unlabelable" every week from 2026-10-07.
const src = readFileSync(join(import.meta.dirname, "card-labels-build.ts"), "utf8");

describe("the label build matches replies by key, not by name", () => {
  it("no longer excludes a card for sharing its name, so the duplicates-only stop cannot fire", () => {
    expect(src).not.toMatch(/EVERY stale card is unlabelable/);
    expect(src).not.toMatch(/nameRows/);
    expect(src).toMatch(/const stale = all;/);
  });

  it("reads each reply by key against the oracle ids the intent asked", () => {
    expect(src).toMatch(/readKeyedReply\(replyText\(entry\.result\.message\), intent\.asked\.map\(\(id\) => \(\{ oracleId: id, name: byId\.get\(id\)\?\.name \}\)\)\)/);
    expect(src).not.toMatch(/readReply\(/);
    expect(src).not.toMatch(/readCardsByName/);
  });

  it("plans, records and hashes cards by oracle id", () => {
    expect(src).toMatch(/planChunks\(runId, MODEL, cards\.map\(\(c\) => c\.oracleId\)/);
    expect(src).toMatch(/!inFlight\.has\(c\.oracleId\)/);
    expect(src).toMatch(/new Map\(cards\.map\(\(c\) => \[c\.oracleId, c\]\)\)/);
    expect(src).toMatch(/\[id, labelInputHash\(row, MODEL\)\]/);
  });
});

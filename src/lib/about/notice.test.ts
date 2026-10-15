// About's notice on Home's banner: the sheet's rule, with the appendix left out (Q3) and a browser whose sheet
// cookie is current told nothing; and the ✕'s re-validation, which writes only what the page drew and is still new.
import { describe, expect, it } from "vitest";
import { ABOUT_VERSION, aboutEntries, type AboutEntry } from "../copy/about";
import { HOW_IT_WORKS_ID } from "../copy/how-it-works-links";
import { sheetCookieIsCurrent, sheetCookieValue, sheetDecision } from "./gate";
import { aboutDismissal, aboutLine, aboutNotice } from "./notice";
import { visibleEntries, type SeenState } from "./visible";

const V = ABOUT_VERSION;
const seen = (version: number, ids: string[] = []): SeenState => ({ version, ids });
const env = (on: Record<string, string> = {}) => on as unknown as NodeJS.ProcessEnv;
// The page with every switch off, and with Change commander on.
const OFF = visibleEntries(env());
const FLIPPED = visibleEntries(env({ CHANGE_COMMANDER_ENABLED: "true" }));
// The newest unswitched entry: a reader one behind it has something unswitched to be told.
const W = Math.max(...OFF.map((e) => e.since));

describe("aboutNotice", () => {
  it("introduces a first-run reader to the page", () => {
    expect(aboutNotice(seen(0), OFF, false)).toEqual({ kind: "firstRun" });
  });

  it("names what a reader behind has not seen, in page order, as the sheet did", () => {
    const n = aboutNotice(seen(W - 1), OFF, false);
    const sheet = sheetDecision({ userId: "u", seen: seen(W - 1), visible: OFF });
    expect(n?.kind).toBe("behind");
    expect(n?.kind === "behind" && n.entries.map((e) => e.id).join(",")).toBe(sheet.show && sheet.header);
  });

  it("tells a current reader nothing", () => {
    expect(aboutNotice(seen(V), OFF, false)).toBeNull();
  });

  it("names a switch-tied entry a flip makes new, though the reader's version is current", () => {
    expect(aboutNotice(seen(V), OFF, false)).toBeNull();
    const n = aboutNotice(seen(V), FLIPPED, false);
    expect(n).toEqual({ kind: "behind", entries: [FLIPPED.find((e) => e.id === "change-commander")] });
    // Met on /about: no longer new.
    expect(aboutNotice(seen(V, ["change-commander"]), FLIPPED, false)).toBeNull();
  });

  it("cannot name the How it works appendix (Q3): the sheet appended it, and the catalog the notice reads lacks it", () => {
    // By construction: the notice's entries are drawn from the visible catalog, and the appendix is not an entry.
    // This pins that premise, so an appendix moved into the catalog fails here rather than reaching the banner.
    expect(aboutEntries.map((e) => e.id)).not.toContain(HOW_IT_WORKS_ID);
    const sheet = sheetDecision({ userId: "u", seen: seen(W - 1), visible: OFF, appendix: true });
    expect(sheet.show && sheet.header).toContain(HOW_IT_WORKS_ID);
  });

  it("is suppressed in a browser whose sheet cookie is current, and only there", () => {
    const current = sheetCookieIsCurrent(sheetCookieValue("u", OFF), "u", OFF);
    expect(aboutNotice(seen(W - 1), OFF, current)).toBeNull();
    expect(aboutNotice(seen(0), OFF, current)).toBeNull();
    // A cookie written before the flip no longer matches, so the flipped entry is told.
    const stale = sheetCookieIsCurrent(sheetCookieValue("u", OFF), "u", FLIPPED);
    expect(stale).toBe(false);
    expect(aboutNotice(seen(V), FLIPPED, stale)?.kind).toBe("behind");
  });
});

describe("aboutLine", () => {
  it("hands the browser titles and the ids its ✕ claims", () => {
    const line = aboutLine(aboutNotice(seen(V), FLIPPED, false), FLIPPED);
    const entry = FLIPPED.find((e) => e.id === "change-commander")!;
    expect(line).toEqual({ kind: "behind", titles: [entry.title], ids: ["change-commander"] });
  });

  it("claims every visible entry for a first-run line, as a visit does", () => {
    expect(aboutLine({ kind: "firstRun" }, OFF)).toEqual({ kind: "firstRun", ids: OFF.map((e) => e.id) });
    expect(aboutLine(null, OFF)).toBeNull();
  });
});

describe("aboutDismissal (the ✕)", () => {
  const plain: AboutEntry = { ...aboutEntries[0], id: "plain", since: 3, switch: undefined };
  const newer: AboutEntry = { ...aboutEntries[0], id: "newer", since: 5, switch: undefined };
  const a: AboutEntry = { ...aboutEntries[0], id: "a", since: 4, switch: "NEVER_CUT_ENABLED" };
  const b: AboutEntry = { ...aboutEntries[0], id: "b", since: 4, switch: "CHANGE_COMMANDER_ENABLED" };
  const visible = [plain, a, b, newer];

  it("writes what the page drew, as a visit writes it", () => {
    expect(aboutDismissal(["plain", "a", "b", "newer"], seen(2), visible, 6)).toEqual({ version: 6, ids: ["a", "b"] });
  });

  it("never writes an id the reader's notice does not name now", () => {
    // `a` was already met, `zzz` is no entry, and the appendix is never the notice's to write.
    expect(aboutDismissal(["a", "b", "zzz", HOW_IT_WORKS_ID], seen(5, ["a"]), visible, 6)).toEqual({ version: 6, ids: ["b"] });
  });

  it("leaves an entry that arrived after the render new: no claim, no floor past it", () => {
    // `newer` (since 5) is new now but was not drawn, so the floor rises to `plain` alone.
    expect(aboutDismissal(["plain", "a"], seen(2), visible, 6)).toEqual({ version: 3, ids: ["a"] });
    // A dropped entry BELOW a claimed one: the floor stops under it, so dropping it never marks it seen.
    expect(aboutDismissal(["newer", "a"], seen(2), visible, 6)).toEqual({ version: 2, ids: ["a"] });
    // And a switched entry flipped on after the render stays new too.
    expect(aboutDismissal(["b"], seen(5, ["a"]), visible, 6)).toEqual({ version: 6, ids: ["b"] });
    expect(aboutDismissal(["a"], seen(5, ["a"]), visible, 6)).toBeNull();
  });

  it("takes a first-run reader past first run with what a visit writes", () => {
    expect(aboutDismissal(visible.map((e) => e.id), seen(0), visible, 6)).toEqual({ version: 6, ids: ["a", "b"] });
  });

  it("writes nothing for a current reader, a claim that is not a list, or nothing still new", () => {
    expect(aboutDismissal(["a"], seen(6, ["a", "b"]), visible, 6)).toBeNull();
    expect(aboutDismissal("a", seen(2), visible, 6)).toBeNull();
    expect(aboutDismissal([], seen(2), visible, 6)).toBeNull();
    expect(aboutDismissal([7, null, { id: "a" }], seen(2), visible, 6)).toBeNull();
  });
});

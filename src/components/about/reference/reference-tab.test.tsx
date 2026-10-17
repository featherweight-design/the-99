import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { aboutCopy } from "../../../lib/copy/about";
import { aboutEntries } from "../../../lib/copy/about-entries";
import { creatorNoteCopy, referenceCopy } from "../../../lib/copy/discovery";
import { referenceScreens, type ReferenceScreen } from "../../../lib/about/reference";
import { CreatorNote } from "./creator-note";
import { ReferenceTab } from "./reference-tab";

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

const screens: ReferenceScreen[] = referenceScreens(aboutEntries, [], undefined);
const first = screens[0].entries[0];

const draw = (over: Partial<Parameters<typeof ReferenceTab>[0]> = {}) =>
  render(<ReferenceTab screens={screens} whatsNew={[]} how={null} howCount={0} {...over} />);

const field = () => screen.getByRole("searchbox", { name: referenceCopy.search }) as HTMLInputElement;
const type = (text: string) => fireEvent.change(field(), { target: { value: text } });
const openEntry = (container: HTMLElement) => container.querySelector("[data-entry-open]")?.getAttribute("data-entry-open") ?? null;

describe("ReferenceTab, the list", () => {
  it("draws every entry under its screen, closed, each row its title and first sentence", () => {
    const { container } = draw();
    expect(container.querySelectorAll("[data-reference-screen]")).toHaveLength(screens.length);
    const ids = screens.flatMap((s) => s.entries.map((e) => e.id));
    for (const id of ids) expect(container.querySelector(`[id="${id}"]`), id).not.toBeNull();
    expect(openEntry(container)).toBeNull();
    const row = container.querySelector(`[id="${first.id}"]`) as HTMLElement;
    expect(row.textContent).toContain(first.title);
    expect(row.textContent).toContain(first.first);
  });

  it("opens one entry at a time, and a second press closes it", () => {
    const { container } = draw();
    const [a, b] = screens.flatMap((s) => s.entries);
    const press = (id: string) => fireEvent.click(within(container.querySelector(`[id="${id}"]`) as HTMLElement).getAllByRole("button")[0]);
    press(a.id);
    expect(openEntry(container)).toBe(a.id);
    press(b.id);
    expect(openEntry(container)).toBe(b.id);
    press(b.id);
    expect(openEntry(container)).toBeNull();
  });

  it("on the phone, a screen's row toggles its entries open and closed", () => {
    const { container } = draw();
    const section = container.querySelector(`[data-reference-screen="${screens[0].key}"]`) as HTMLElement;
    const toggle = within(section).getAllByRole("button")[0];
    const list = toggle.parentElement!.lastElementChild as HTMLElement;
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(list.className).toMatch(/(^|\s)hidden(\s|$)/);
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(list.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens the entry a #hash names, and its screen with it", () => {
    const target = screens[2].entries[0];
    window.location.hash = `#${target.id}`;
    const { container } = draw();
    expect(openEntry(container)).toBe(target.id);
    const section = container.querySelector(`[data-reference-screen="${screens[2].key}"]`) as HTMLElement;
    expect(within(section).getAllByRole("button")[0].getAttribute("aria-expanded")).toBe("true");
  });

  it("follows a later hashchange to another entry", () => {
    const { container } = draw();
    const target = screens[1].entries[0];
    act(() => {
      window.location.hash = `#${target.id}`;
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(openEntry(container)).toBe(target.id);
  });

  it("ignores a hash that names no entry", () => {
    window.location.hash = "#no-such-entry";
    const { container } = draw();
    expect(openEntry(container)).toBeNull();
  });

  it("ignores a malformed hash, and still follows the next one", () => {
    window.location.hash = "#%E0";
    const { container } = draw();
    expect(openEntry(container)).toBeNull();
    const target = screens[1].entries[0];
    act(() => {
      window.location.hash = `#${target.id}`;
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(openEntry(container)).toBe(target.id);
  });

  it("links an opened entry to its How it works row only while How it works draws", () => {
    const e = screens.flatMap((x) => x.entries).find((x) => x.row)!;
    const rowLink = (c: HTMLElement) => c.querySelector(`[data-entry-open="${e.id}"] a[href="#${e.row}"]`);
    window.location.hash = `#${e.id}`;
    const { container, rerender } = draw();
    expect(rowLink(container)).toBeNull();
    rerender(<ReferenceTab screens={screens} whatsNew={[]} how={<section id="how" />} howCount={9} />);
    expect(rowLink(container)).not.toBeNull();
  });
});

describe("ReferenceTab, what's new", () => {
  const whatsNew = [{ id: first.id, title: first.title }];

  it("lists what's new, each a link that opens its entry", () => {
    const { container } = draw({ whatsNew });
    const box = container.querySelector("#new") as HTMLElement;
    expect(box.textContent).toContain(aboutCopy.newSinceEyebrow(1));
    fireEvent.click(within(box).getByRole("link", { name: first.title }));
    expect(openEntry(container)).toBe(first.id);
  });

  it("draws nothing when nothing is new", () => {
    const { container } = draw();
    expect(container.querySelector("#new")).toBeNull();
  });

  it("gives way to search while the field holds text", () => {
    const { container } = draw({ whatsNew });
    type(first.title);
    expect(container.querySelector("#new")).toBeNull();
  });
});

describe("ReferenceTab, search", () => {
  it("reads titles, captions and keys, names each hit's screen, and hides the list", () => {
    const { container } = draw();
    type(first.title);
    const hits = container.querySelector("[data-reference-hits]") as HTMLElement;
    expect(within(hits).getByRole("status").textContent).toMatch(/entr(y|ies) mention/);
    const link = within(hits).getAllByRole("link").find((a) => a.getAttribute("href") === `#${first.id}`)!;
    expect(link.textContent).toContain(first.screen);
    expect(link.querySelector("mark")).not.toBeNull();
    // A title match still shows the entry's first sentence beneath it.
    expect(link.textContent).toContain(first.first);
    const list = container.querySelector("[data-reference-screen]")!.parentElement!;
    expect(list.hidden).toBe(true);
  });

  it("finds an entry by a phrase only its keys hold", () => {
    const all = screens.flatMap((s) => s.entries);
    const lower = (t: string) => t.toLowerCase();
    // A key phrase no entry's title or caption carries, so only the key search can find it.
    const found = all
      .flatMap((e) => e.keys.map((k) => ({ e, k })))
      .find(({ k }) => k.length >= 4 && all.every((x) => !lower(x.title).includes(lower(k)) && !lower(x.caption).includes(lower(k))));
    expect(found, "an entry with a key phrase found only in keys").toBeTruthy();
    const { container } = draw();
    type(found!.k);
    const hits = container.querySelector("[data-reference-hits]") as HTMLElement;
    expect(within(hits).getAllByRole("link").some((a) => a.getAttribute("href") === `#${found!.e.id}`)).toBe(true);
  });

  it("finds an entry by a word only its caption holds", () => {
    const e = screens.flatMap((s) => s.entries).find((x) => x.caption.includes("Mana Pool")) ?? first;
    const word = e === first ? first.caption.split(" ")[1] : "Mana Pool";
    const { container } = draw();
    type(word);
    const hits = container.querySelector("[data-reference-hits]") as HTMLElement;
    expect(within(hits).getAllByRole("link").some((a) => a.getAttribute("href") === `#${e.id}`)).toBe(true);
  });

  it("a hit clears the search and opens its entry", () => {
    const { container } = draw();
    type(first.title);
    const hits = container.querySelector("[data-reference-hits]") as HTMLElement;
    fireEvent.click(within(hits).getAllByRole("link").find((a) => a.getAttribute("href") === `#${first.id}`)!);
    expect(field().value).toBe("");
    expect(openEntry(container)).toBe(first.id);
  });

  it("says when nothing matches, and offers the way back to every entry", () => {
    const { container } = draw();
    const q = "zzqx-nothing-holds-this";
    type(q);
    expect(container.querySelector("[data-reference-hits]")).toBeNull();
    expect(screen.getByText(referenceCopy.none(q))).toBeTruthy();
    expect(screen.getByText(referenceCopy.noneNote)).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: referenceCopy.noneOut }));
    expect(field().value).toBe("");
    expect((container.querySelector("[data-reference-screen]")!.parentElement as HTMLElement).hidden).toBe(false);
  });
});

describe("ReferenceTab, following links", () => {
  const raf = () => act(() => vi.runAllTimers());
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "setTimeout"] });
    Element.prototype.scrollIntoView ??= () => {};
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("a search hit pressed moves focus to the entry it opens", () => {
    const { container } = draw();
    type(first.title);
    const hits = container.querySelector("[data-reference-hits]") as HTMLElement;
    fireEvent.click(within(hits).getAllByRole("link").find((a) => a.getAttribute("href") === `#${first.id}`)!);
    raf();
    expect(document.activeElement).toBe(document.getElementById(first.id)!.querySelector("button[aria-expanded]"));
  });

  it("a hash that arrives during a search clears the search, so its entry can be seen", () => {
    const { container } = draw();
    type("deck");
    const target = screens[1].entries[0];
    act(() => {
      window.location.hash = `#${target.id}`;
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(field().value).toBe("");
    expect(openEntry(container)).toBe(target.id);
  });

});

describe("ReferenceTab, the in Tools mark", () => {
  it("is announced at every width: the wide mark is not aria-hidden", () => {
    const e = { ...first, inTools: true };
    const { container } = draw({ screens: [{ ...screens[0], entries: [e, ...screens[0].entries.slice(1)] }, ...screens.slice(1)] });
    const marks = [...(container.querySelector(`[id="${e.id}"]`) as HTMLElement).querySelectorAll("span")].filter(
      (x) => x.textContent?.trim() === referenceCopy.inTools,
    );
    expect(marks.length).toBe(2);
    expect(marks.every((m) => m.closest("[aria-hidden]") === null)).toBe(true);
  });
});

describe("ReferenceTab, the screens index", () => {
  it("lists each screen with its count, and How it works only when it draws", () => {
    const { rerender } = draw();
    const nav = screen.getByRole("navigation", { name: referenceCopy.screensLabel });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(screens.length);
    expect(links[0].getAttribute("href")).toBe(`#screen-${screens[0].key}`);
    expect(links[0].textContent).toBe(`${screens[0].name}${screens[0].entries.length}`);
    rerender(<ReferenceTab screens={screens} whatsNew={[]} how={<section id="how" />} howCount={9} />);
    const withHow = within(screen.getByRole("navigation", { name: referenceCopy.screensLabel })).getAllByRole("link");
    expect(withHow).toHaveLength(screens.length + 1);
    expect(withHow.at(-1)!.textContent).toBe(`${referenceCopy.howIndex}9`);
  });

  it("is not drawn while a search holds the column", () => {
    draw();
    type(first.title);
    expect(screen.queryByRole("navigation", { name: referenceCopy.screensLabel })).toBeNull();
  });

  it("marks the first screen in the band, in page order, across the observer's partial reports", () => {
    let report: (entries: { target: Element; isIntersecting: boolean }[]) => void = () => {};
    let margin: string | undefined;
    const Real = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = class {
      constructor(cb: typeof report, opts?: IntersectionObserverInit) {
        report = cb;
        margin = opts?.rootMargin;
      }
      observe() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
    try {
      const { container } = draw();
      const el = (i: number) => container.querySelector(`[data-reference-screen="${screens[i].key}"]`)!;
      const current = () =>
        within(screen.getByRole("navigation", { name: referenceCopy.screensLabel }))
          .getAllByRole("link")
          .find((a) => a.getAttribute("aria-current") === "location")
          ?.getAttribute("href");
      // The band is set in pixels from the viewport's height, never as a percentage.
      expect(margin).toBe(`0px 0px -${Math.round(window.innerHeight * 0.7)}px 0px`);
      act(() => report([{ target: el(1), isIntersecting: true }]));
      act(() => report([{ target: el(2), isIntersecting: true }]));
      expect(current()).toBe(`#screen-${screens[1].key}`);
      // The reader scrolls back: only screen 2 leaving is reported, and screen 1 is still in the band.
      act(() => report([{ target: el(2), isIntersecting: false }]));
      expect(current()).toBe(`#screen-${screens[1].key}`);
      act(() => report([{ target: el(0), isIntersecting: true }]));
      expect(current()).toBe(`#screen-${screens[0].key}`);
    } finally {
      globalThis.IntersectionObserver = Real;
    }
  });
});

describe("CreatorNote", () => {
  it("is the last row, opening the note as a dialog that Escape closes", () => {
    render(<CreatorNote />);
    const row = screen.getByRole("link", { name: new RegExp(creatorNoteCopy.title) });
    expect(row.getAttribute("aria-haspopup")).toBe("dialog");
    fireEvent.click(row);
    const dialog = screen.getByRole("dialog", { name: creatorNoteCopy.title });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const paragraphs = aboutCopy.pageIntro.split("\n\n");
    expect(dialog.textContent).toContain(paragraphs[0]);
    expect(dialog.textContent).toContain(paragraphs.at(-1));
    // Focus moves to the first VISIBLE focusable, which jsdom cannot lay out: `dialog.ts`'s own tests hold that half.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes from its ✕ and from the scrim", () => {
    render(<CreatorNote />);
    const row = screen.getByRole("link", { name: new RegExp(creatorNoteCopy.title) });
    fireEvent.click(row);
    fireEvent.click(screen.getByRole("button", { name: creatorNoteCopy.close }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(row);
    const scrim = screen.getByRole("dialog").previousElementSibling as HTMLElement;
    fireEvent.click(scrim);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

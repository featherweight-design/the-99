import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BROWSE_CELLS, BROWSE_SET_CODE } from "../../lib/about/fixtures";
import { identityGradient } from "../../lib/collection/gradients";
import { sortOrderLabel } from "../../lib/collection/sort-options";
import { collectionChassisCopy, collectionFilterCopy } from "../../lib/copy/collection";
import { chassisCopy, PIP_ORDER } from "../../lib/copy/filter-chassis";
import { setPageCopy } from "../../lib/copy/set-collections";
import { BrowseFigureBody } from "./browse-figure";

// This figure was a chip row, a count and two text pills — about a fifth of
// what the canvas draws — and every check on the page passed over it, because
// they all asked whether a figure EXISTED. The entry's three key lines are each
// about what happens to a result, and there was no result drawn at all.
describe("the browse figure", () => {
  it("draws the result the three key lines are about", () => {
    const { container } = render(<BrowseFigureBody />);

    // A cell per fixture card, each with its own copy count — a grid where
    // every badge read the same number would say nothing about it being one.
    for (const cell of BROWSE_CELLS) {
      expect(screen.getByText(cell.name)).toBeInTheDocument();
    }
    // Three of the five are `common`, so each caption is COUNTED rather than
    // found: `getByText` throws on the duplicates, and taking the first would
    // pass over a figure that drew one caption five times.
    //
    // Matched by text rather than by element, because the caption is the
    // route's `CardTileCaption` and its markup is that component's business —
    // a selector naming a tag here would break the moment it restyled, which
    // is the drift mounting it was meant to avoid.
    const wanted = BROWSE_CELLS.map((c) => `${BROWSE_SET_CODE} · ${c.rarity}`);
    const captions = [...container.querySelectorAll("*")]
      .filter((el) => el.children.length === 0 && wanted.includes(el.textContent ?? ""))
      .map((el) => el.textContent);
    expect(captions.sort()).toEqual([...wanted].sort());
    // The count sits in the caption's meta line and is ABSENT at one copy,
    // which is what `GridView` draws — `×1` on a collection is the one figure
    // that tells a reader nothing. The figure drew a badge over the art on
    // every cell, including the `×1`s, which is a result the route stopped
    // drawing. So the assertion is the route's rule, not a badge count.
    const counts = [...container.querySelectorAll("span")]
      .map((el) => el.textContent)
      .filter((text) => /^×\d+$/.test(text ?? ""));
    expect(counts.sort()).toEqual(
      BROWSE_CELLS.filter((c) => c.copies > 1)
        .map((c) => `×${c.copies}`)
        .sort(),
    );

    // §I's floor. Three across on a phone must not squash the cell, which is
    // why it is sized by ratio and not by a height — and the art is the
    // ROUTE's own `identityGradient`, not a wash this figure invented.
    const art = [...container.querySelectorAll("div")].filter(
      (el) => el.style.aspectRatio === "63/88",
    );
    expect(art).toHaveLength(BROWSE_CELLS.length);

    // Every tile sits in the ROUTE's own plate — `--surface` inside a
    // `--border`, owning the radius and the clipping. Asserted on the art's
    // parent rather than by counting plates, so a shell that stopped wrapping
    // the caption is caught too.
    for (const cell of art) {
      const shell = cell.parentElement!;
      expect(shell.className).toContain("bg-[color:var(--surface)]");
      expect(shell.className).toContain("border-[color:var(--border)]");
      expect(shell.className).toContain("overflow-hidden");
      expect(shell.querySelector("[class*='truncate'], [class*='line-clamp']")).not.toBeNull();
    }
    for (const cell of art) {
      // jsdom normalises hex to `rgb()`, so the two are compared through the
      // same normalisation rather than as strings — asserting the raw helper
      // output would fail on a correct build.
      const probe = document.createElement("div");
      probe.style.background = identityGradient(cell.dataset.identity?.split(",") ?? ["G"]);
      expect(cell.style.background).toBe(probe.style.background);
      expect(cell.textContent, "nothing sits on the art").toBe("");
    }
  });

  it("carries the numeral onto the part each line describes", () => {
    const { container } = render(<BrowseFigureBody />);
    // Three lines, three marks. The page shipped with the numerals on the
    // LINES only, which makes them bullets: a numeral needs something to point
    // at or the annotation grammar is half-drawn.
    const marks = [...container.querySelectorAll("span")].filter(
      (s) => s.getAttribute("aria-hidden") === "true" && /^[123]$/.test(s.textContent ?? ""),
    );
    expect(marks.map((m) => m.textContent)).toEqual(["1", "2", "3"]);
  });

  it("draws both forms of the row the route itself forks", () => {
    render(<BrowseFigureBody />);

    // The route puts the pips and the four panels behind one trigger below
    // 1000px and keeps a shorter placeholder. Drawing the wide bar to a phone
    // reader would show them controls their phone does not have — so BOTH
    // forms are in the markup, each hidden at the other width.
    // Read from the copy module, not retyped: the point of moving these out
    // of `filter-bar.tsx` was that a rename reaches this figure, and a test
    // holding its own copy of the string would hide exactly that.
    expect(
      screen.getByText(collectionChassisCopy.searchPlaceholder.compact),
    ).toBeInTheDocument();
    expect(
      screen.getByText(collectionChassisCopy.searchPlaceholder.wide),
    ).toBeInTheDocument();
    expect(screen.getByText(collectionChassisCopy.sheet.trigger)).toBeInTheDocument();

    // The wide form's own controls, read from the route's copy so a rename
    // reaches the figure without anyone editing it.
    expect(screen.getByText(collectionFilterCopy.type.triggerCount!(0))).toBeInTheDocument();
    expect(screen.getByText(collectionFilterCopy.set.triggerCount!(1))).toBeInTheDocument();
    expect(
      screen.getByText(collectionFilterCopy.sort.triggerOne("Name · A–Z")),
    ).toBeInTheDocument();
    expect(screen.getByText(chassisCopy.chips.clearAll)).toBeInTheDocument();
    expect(screen.getByText(setPageCopy.entryPoint.label)).toBeInTheDocument();

    // Both count lines, for the same reason: the long one has room beside two
    // controls on the wide bar and does not at 390px.
    expect(screen.getByText(collectionChassisCopy.resultCompact(34))).toBeInTheDocument();
    expect(
      screen.getByText(collectionChassisCopy.result(34, 2805, 4120, true)),
    ).toBeInTheDocument();
  });

  // jsdom applies no media query, so "both strings are in the document" is all
  // a render can say — and it says it just as happily when both render at the
  // same width. What decides which one a reader sees is the class, so the
  // class is what gets asserted, per element, on both sides of each fork.
  it("hides each form at the width the other belongs to", () => {
    const { container } = render(<BrowseFigureBody />);
    // `at` matched only CHILDLESS elements, and a `Trigger` label carries an
    // arrow span — so `trigger` and `panel` came back UNDEFINED and
    // `expect(undefined).not.toBeNull()` passed. Both breakpoint assertions
    // measured nothing, in a test written to answer a finding about tests
    // measuring nothing. It matches the element owning the label's own text
    // node now, and every lookup is asserted to have found something before
    // anything is read off it.
    const at = (text: string) => {
      const found = [...container.querySelectorAll("*")].find((el) =>
        [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim() === text),
      );
      expect(found, `nothing in the figure reads "${text}"`).toBeDefined();
      return found!;
    };

    // The FIELD forks at 768 — `useIsDesktop`, which is the route's own
    // breakpoint for this control and not the chassis's 1000.
    expect(at(collectionChassisCopy.searchPlaceholder.compact).className).toContain("md:hidden");
    const wide = at(collectionChassisCopy.searchPlaceholder.wide).className;
    expect(wide).toContain("hidden");
    expect(wide).toContain("md:inline");

    // The CONTROLS fork at 1000 — the chassis's stop, where the pips and the
    // four panels move into the sheet behind one trigger.
    expect(
      at(collectionChassisCopy.sheet.trigger).closest("[class*='min-[1000px]:hidden']"),
    ).not.toBeNull();
    expect(
      at(collectionFilterCopy.type.triggerCount!(0)).closest("[class*='min-[1000px]:flex']"),
    ).not.toBeNull();

    // Sort is NOT one of the controls that moves. `FilterChassis` keeps it in
    // its own persistent slot past the hairline — only colour, type, set and
    // availability go into the sheet — so a compact figure that hid it would
    // tell a phone reader the order lives behind `Filters`.
    expect(
      at(collectionFilterCopy.sort.triggerOne(sortOrderLabel("name", "asc")))
        .closest("[class*='min-[1000px]:flex']"),
    ).toBeNull();

    // And the count line, which forks with the controls: the long form has
    // room beside two of them on the wide bar and does not at 390px.
    expect(at(collectionChassisCopy.resultCompact(34)).className).toContain(
      "min-[1000px]:hidden",
    );
  });

  it("colours the one-colour chip with the route's green, not a status hue", () => {
    // §3 gives the dot `var(--g)` — the WUBRG green of the filter it stands
    // for. It shipped as `--success`, which is a different palette value and
    // says "this went well" rather than "this is the green filter". Both are
    // declared, so `check:tokens` is silent about it and only the canvas
    // disagrees.
    const { container } = render(<BrowseFigureBody />);
    const dots = [...container.querySelectorAll("[style*='--g']")];
    expect(dots.length).toBeGreaterThan(0);
    expect(container.innerHTML).not.toContain("var(--success)");
  });

  it("draws the route's own five hues, not five discs that look like them", () => {
    const { container } = render(<BrowseFigureBody />);
    const pips = [...container.querySelectorAll("span")].filter((s) =>
      (s.getAttribute("style") ?? "").includes("/mana/"),
    );
    // Keyed to PIP_ORDER's length rather than to 5: a hue added to the route's
    // control has to reach this figure by itself.
    expect(pips).toHaveLength(PIP_ORDER.length);
  });
});

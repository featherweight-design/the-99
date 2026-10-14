// The repo has no user-event, so interaction goes through fireEvent. Nothing
// here depends on the focus a real pointer click would move, only on the
// handler running.
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemePicker } from "./theme-picker";

// The layout writes the attribute and the prop from the same cookie, so a first
// mount always finds the two agreeing. Painting the document alongside the
// render keeps the tests describing a state the app can actually be in.
function renderPicker(current: "amonkhet" | "eldraine" | "kaldheim") {
  document.documentElement.dataset.theme = current;
  return render(<ThemePicker current={current} />);
}

describe("ThemePicker", () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = "amonkhet";
    document.cookie = "the99_theme=; path=/; max-age=0";
  });

  it("is a labelled radiogroup with six options", () => {
    render(<ThemePicker current="amonkhet" />);
    expect(screen.getByRole("radiogroup", { name: "Color theme" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(6);
  });

  // The account menu unmounts the picker when it closes, and `current` is
  // resolved on the server at the last navigation. A second opening therefore
  // arrives with a prop that predates any choice made in the first.
  it("shows the theme in force, not the one the server last resolved", () => {
    const { unmount } = render(<ThemePicker current="amonkhet" />);
    fireEvent.click(screen.getByRole("radio", { name: "Witching Hour, Wilds of Eldraine" }));
    unmount();

    render(<ThemePicker current="amonkhet" />);
    expect(screen.getByRole("radio", { name: "Witching Hour, Wilds of Eldraine" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Low Sun, Amonkhet" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("names each option by theme and plane", () => {
    render(<ThemePicker current="amonkhet" />);
    expect(screen.getByRole("radio", { name: "First Frost, Kaldheim" })).toBeInTheDocument();
  });

  it("marks the current theme checked, and only that one", () => {
    renderPicker("eldraine");
    const checked = screen
      .getAllByRole("radio")
      .filter((r) => r.getAttribute("aria-checked") === "true");
    expect(checked).toHaveLength(1);
    expect(checked[0]).toHaveAccessibleName("Witching Hour, Wilds of Eldraine");
  });

  it("does not carry selection by colour alone — the checked chip draws a tick", () => {
    renderPicker("eldraine");
    const checked = screen.getByRole("radio", { name: "Witching Hour, Wilds of Eldraine" });
    expect(checked.querySelector("[data-selected-tick]")).not.toBeNull();
    const other = screen.getByRole("radio", { name: "Canopy, Ixalan" });
    expect(other.querySelector("[data-selected-tick]")).toBeNull();
  });

  // The whole point of a miniature over a swatch: it has to paint the theme it
  // offers, not the one in force. Without data-theme on the box every chip
  // would preview whatever the app is currently wearing.
  it("paints each miniature in the theme it previews", () => {
    render(<ThemePicker current="amonkhet" />);
    const chip = screen.getByRole("radio", { name: "Oil Haze, New Phyrexia" });
    expect(chip.querySelector("[data-theme]")?.getAttribute("data-theme")).toBe("phyrexia");
  });

  it("swaps the document attribute immediately on selection", () => {
    render(<ThemePicker current="amonkhet" />);
    fireEvent.click(screen.getByRole("radio", { name: "First Frost, Kaldheim" }));
    expect(document.documentElement.dataset.theme).toBe("kaldheim");
  });

  it("persists the selection to the cookie", () => {
    render(<ThemePicker current="amonkhet" />);
    fireEvent.click(screen.getByRole("radio", { name: "Neon Rain, Kamigawa: Neon Dynasty" }));
    expect(document.cookie).toContain("the99_theme=kamigawa");
  });

  it("announces the change, because there is no Save button to confirm it", () => {
    render(<ThemePicker current="amonkhet" />);
    fireEvent.click(screen.getByRole("radio", { name: "Canopy, Ixalan" }));
    expect(screen.getByRole("status")).toHaveTextContent("Canopy applied.");
  });

  // Both axes step by one. The options are a grid, but a radiogroup reads
  // Right/Down as "next" and Left/Up as "previous" regardless of layout.
  it.each([
    ["ArrowUp", "ArrowDown"],
    ["ArrowLeft", "ArrowRight"],
  ])("moves focus with %s / %s, wrapping", (back, forward) => {
    render(<ThemePicker current="amonkhet" />);
    const radios = screen.getAllByRole("radio");
    radios[0].focus();
    fireEvent.keyDown(radios[0], { key: back });
    expect(radios[5]).toHaveFocus();
    fireEvent.keyDown(radios[5], { key: forward });
    expect(radios[0]).toHaveFocus();
  });

  // A radiogroup with no Save has to select as it moves, or the arrow keys
  // leave the caret somewhere the app has not gone.
  it("selects as the arrow key moves, not on a second press", () => {
    render(<ThemePicker current="amonkhet" />);
    const radios = screen.getAllByRole("radio");
    radios[0].focus();
    fireEvent.keyDown(radios[0], { key: "ArrowUp" });
    expect(radios[5]).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.dataset.theme).toBe("kaldheim");
    expect(document.cookie).toContain("the99_theme=kaldheim");
    expect(screen.getByRole("status")).toHaveTextContent("First Frost applied.");
  });

  // The chip is ~90px wide. A plane that does not fit is shown short rather
  // than truncated mid-word, and the full name still carries in the label.
  it("shows a plane short enough for the chip, and the full one in the label", () => {
    render(<ThemePicker current="amonkhet" />);
    const chip = screen.getByRole("radio", { name: "Witching Hour, Wilds of Eldraine" });
    expect(chip).toHaveTextContent("Eldraine");
    expect(chip).not.toHaveTextContent("Wilds of Eldraine");
  });

  it("keeps the mobile sheet’s chips at the 44px minimum touch target", () => {
    render(<ThemePicker current="amonkhet" panel="sheet" />);
    for (const chip of screen.getAllByRole("radio")) {
      expect(chip.className).toContain("min-h-[44px]");
    }
  });
});

// A user whose persisted theme was retired arrives already painted in the
// survivor — the layout resolved it. The notice exists so that move is not
// silent, which would otherwise read as the app losing their setting.
describe("ThemePicker retirement notice", () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = "amonkhet";
    document.cookie = "the99_theme=; path=/; max-age=0";
  });

  function renderRetired() {
    document.cookie = "the99_theme=innistrad; path=/";
    document.documentElement.dataset.theme = "phyrexia";
    return render(<ThemePicker current="phyrexia" />);
  }

  it("names the retired theme and where the user landed", () => {
    renderRetired();
    expect(screen.getByText(/Moonlit has been retired\./)).toBeInTheDocument();
    expect(screen.getByText(/You’re on Oil Haze/)).toBeInTheDocument();
  });

  // The theme cookie is rarely the only one. jsdom always joins with "; ", so
  // this cannot exercise a tighter separator — the parser trims for that, and
  // what this holds is that the notice still finds its own cookie in a crowd.
  it("finds its cookie among the others", () => {
    document.cookie = "session=abc; path=/";
    document.cookie = "the99_theme=innistrad; path=/";
    document.cookie = "locale=en-GB; path=/";
    document.documentElement.dataset.theme = "phyrexia";
    render(<ThemePicker current="phyrexia" />);
    expect(screen.getByText(/Moonlit has been retired\./)).toBeInTheDocument();
    document.cookie = "session=; path=/; max-age=0";
    document.cookie = "locale=; path=/; max-age=0";
  });

  it("stays hidden for a theme that still exists", () => {
    document.cookie = "the99_theme=kaldheim; path=/";
    render(<ThemePicker current="kaldheim" />);
    expect(screen.queryByText(/has been retired/)).not.toBeInTheDocument();
  });

  // Dismissing writes the survivor over the retired id, which is the whole of
  // the persistence: the next mount reads a live theme and finds nothing to say.
  it("persists the dismissal by adopting the survivor", () => {
    const { unmount } = renderRetired();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText(/has been retired/)).not.toBeInTheDocument();
    expect(document.cookie).toContain("the99_theme=phyrexia");

    unmount();
    render(<ThemePicker current="phyrexia" />);
    expect(screen.queryByText(/has been retired/)).not.toBeInTheDocument();
  });

  // The ✕ unmounts with the notice it dismisses. Left alone, focus falls to the
  // body and the hosting panel's focus trap has nothing to wrap around.
  it("hands focus to the checked chip rather than dropping it on the body", () => {
    renderRetired();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.getByRole("radio", { name: "Oil Haze, New Phyrexia" })).toHaveFocus();
  });

  it("drops the line once the user picks a theme, dismissed or not", () => {
    renderRetired();
    fireEvent.click(screen.getByRole("radio", { name: "Canopy, Ixalan" }));
    expect(screen.queryByText(/has been retired/)).not.toBeInTheDocument();
    expect(document.cookie).toContain("the99_theme=ixalan");
  });
});

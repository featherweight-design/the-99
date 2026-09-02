import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseThemeBlocks } from "@/lib/theme/parse-css";
import { clerkAppearance } from "./clerk-appearance";

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const AMONKHET = parseThemeBlocks(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app", "globals.css"),
    "utf8",
  ),
).get("amonkhet")!;

const elements = clerkAppearance.elements as Record<string, Record<string, unknown>>;
const variables = clerkAppearance.variables as Record<string, unknown>;

/** Every value anywhere in the map, flattened through nested state/media keys. */
function values(node: unknown): string[] {
  if (typeof node === "string") return [node];
  if (typeof node !== "object" || node === null) return [];
  return Object.values(node).flatMap(values);
}

describe("Clerk appearance variables", () => {
  // Clerk's variables are the only place raw hexes are allowed: they are read
  // by Clerk's own colour maths, which cannot resolve a CSS custom property.
  it("carries all 16 keys the design table enumerates", () => {
    expect(Object.keys(variables)).toEqual([
      "colorPrimary",
      "colorBackground",
      // V3–V7 under Clerk 6.12's names; see the map for the rename table.
      "colorForeground",
      "colorMutedForeground",
      "colorPrimaryForeground",
      "colorInput",
      "colorInputForeground",
      "colorNeutral",
      "colorDanger",
      "colorSuccess",
      "colorWarning",
      "colorShimmer",
      "fontFamily",
      "fontFamilyButtons",
      "fontSize",
      "borderRadius",
    ]);
  });

  // Read out of globals.css rather than written down here. Clerk cannot take a
  // var(), so these hexes are a hand copy of the amonkhet block; asserting
  // against the source is what stops the copy going stale when a token moves.
  it("matches the amonkhet tokens the hexes stand in for", () => {
    const pairs: [string, string][] = [
      ["colorPrimary", "accent"],
      ["colorBackground", "surface"],
      ["colorForeground", "fg"],
      ["colorMutedForeground", "fg-muted"],
      ["colorPrimaryForeground", "bg"],
      ["colorInput", "surface-sunken"],
      ["colorInputForeground", "fg"],
      ["colorNeutral", "fg-faint"],
      ["colorDanger", "danger"],
      ["colorSuccess", "success"],
      ["colorWarning", "warning"],
    ];
    for (const [key, token] of pairs) {
      expect(variables[key], `${key} should be --${token}`).toBe(AMONKHET.get(token));
    }
  });

  // The two alpha washes Clerk needs as literals; only the alpha differs.
  it("tints its shimmer and focus ring with the amonkhet accent", () => {
    const [, r, g, b] = /^#(..)(..)(..)$/.exec(AMONKHET.get("accent")!)!;
    const rgb = [r, g, b].map((c) => parseInt(c, 16)).join(",");
    expect(variables.colorShimmer).toBe(`rgba(${rgb},0.10)`);
    expect(values(elements.badge)).toContain(`rgba(${rgb},0.14)`);
    expect(values(elements.formFieldInput)).toContain(`0 0 0 3px rgba(${rgb},0.16)`);
  });
});

describe("Clerk appearance elements", () => {
  it("themes every element the design table names", () => {
    for (const key of [
      "rootBox",
      "modalBackdrop",
      "modalContent",
      "cardBox",
      "card",
      "scrollBox",
      "navbar",
      "navbarButton",
      "navbarButton__active",
      "navbarButtonIcon",
      "navbarMobileMenuButton",
      "header",
      "headerTitle",
      "headerSubtitle",
      "profileSection",
      "profileSectionTitleText",
      "profileSectionContent",
      "profileSectionPrimaryButton",
      "activeDeviceIcon",
      "badge",
      "formFieldLabel",
      "formFieldInput",
      "formFieldHintText",
      "formFieldErrorText",
      "formFieldSuccessText",
      "formFieldAction",
      "formButtonPrimary",
      "formButtonReset",
      "avatarBox",
      "avatarImageActionsUpload",
      "dividerLine",
      "dividerText",
      "alert",
      "alertText",
      "menuButton",
      "menuList",
      "menuItem",
      "footer",
      "footerActionLink",
    ]) {
      expect(elements, key).toHaveProperty(key);
    }
  });

  // The design table predates Clerk 6.12, which stopped rendering these. A key
  // that matches nothing is dead config that reads as coverage.
  it("omits the elements Clerk no longer renders", () => {
    for (const key of [
      "breadcrumbs",
      "breadcrumbsItem",
      "accordionTriggerButton",
      "accordionContent",
      "fileDropAreaBox",
      "fileDropAreaIconBox",
    ]) {
      expect(elements, key).not.toHaveProperty(key);
    }
  });

  // RD§5 — every shipped overlay uses rgba(8,6,4,0.72); the canvas's
  // rgba(10,8,6,0.72) appears nowhere in src/.
  it("uses the shipped backdrop value", () => {
    expect(elements.modalBackdrop.background).toBe("rgba(8,6,4,0.72)");
  });

  // Outside `variables`, raw hexes are a token that got away.
  it("delivers element colour through tokens, not hexes", () => {
    const hexes = values(elements).filter((v) => /#[0-9A-Fa-f]{3,8}\b/.test(v));
    expect(hexes).toEqual([]);
  });

  // The card is full-bleed below Clerk's own nav-collapse breakpoint (N18).
  it("drops the card radius on mobile", () => {
    const mobile = elements.cardBox["@media (max-width: 639px)"] as Record<string, unknown>;
    expect(mobile.borderRadius).toBe(0);
    expect(elements.cardBox.borderRadius).toBe(16);
  });

  // Ambiguity 18: hiding "Secured by Clerk" is a plan-terms question for
  // eng/legal. Until it is answered the footer ships visible.
  it("leaves the Clerk footer visible", () => {
    expect(elements.footer.display).toBeUndefined();
  });

  // Accent fill marks the single primary action per panel; a second one on a
  // section button would make the hierarchy meaningless.
  it("reserves the accent fill for formButtonPrimary", () => {
    expect(elements.formButtonPrimary.background).toBe("var(--accent)");
    expect(elements.profileSectionPrimaryButton.background).toBe("transparent");
  });
});

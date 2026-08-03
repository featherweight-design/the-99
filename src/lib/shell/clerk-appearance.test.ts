import { describe, expect, it } from "vitest";
import { clerkAppearance } from "./clerk-appearance";

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

  it("matches the brand tokens the hexes stand in for", () => {
    expect(variables.colorPrimary).toBe("#C9A24B");
    expect(variables.colorBackground).toBe("#1E1A15");
    expect(variables.colorForeground).toBe("#EDE6D8");
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

  // Brass fill marks the single primary action per panel; a second one on a
  // section button would make the hierarchy meaningless.
  it("reserves the brass fill for formButtonPrimary", () => {
    expect(elements.formButtonPrimary.background).toBe("var(--brass)");
    expect(elements.profileSectionPrimaryButton.background).toBe("transparent");
  });
});

import type { ComponentProps } from "react";
// @clerk/types is transitive, so the prop type is read off the provider that
// consumes it rather than imported from a package we don't depend on.
import type { ClerkProvider } from "@clerk/nextjs";

type Appearance = NonNullable<ComponentProps<typeof ClerkProvider>["appearance"]>;

/**
 * Brand theme for Clerk's own surfaces — chiefly the `<UserProfile/>` modal the
 * account menu's "Manage account" opens. Keys and values track the appearance
 * map in docs/superpowers/design-tables/user-menu.md (V1–V16, M1–M45); the row
 * ids in the comments below are the audit trail back to it.
 *
 * The table was written against an older Clerk. Seven of its rows name elements
 * that 6.12 no longer renders at all — M15/M16 `breadcrumbs*`, M21/M22
 * `accordion*`, M35/M36 `fileDropArea*` — so they are omitted rather than
 * shipped as keys that match nothing. The variables were renamed, not removed;
 * see the V3–V7 note below.
 *
 * The `variables` map cannot use `var()`: Clerk derives its hover and disabled
 * shades from these values arithmetically, so it needs real colours. They
 * therefore mirror the `:root` (amonkhet) block of globals.css by hand, and the
 * modal stays Gilded Stone under all six themes. Any change to an amonkhet token
 * has to be copied here or the modal drifts away from the app around it. The
 * `elements` map has no such limit and resolves through tokens, so it themes for
 * free.
 */

const RING = "0 0 0 3px rgba(207,135,69,0.16)";

/** Below this Clerk collapses its left nav; the card goes full-bleed (N18). */
const MOBILE = "@media (max-width: 639px)";

export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#CF8745",
    colorBackground: "#1E1A15",
    // V3–V7. Clerk renamed these between the version the design table was
    // written against and 6.12: colorText → colorForeground, colorTextSecondary
    // → colorMutedForeground, colorTextOnPrimaryBackground →
    // colorPrimaryForeground, colorInputBackground → colorInput, colorInputText
    // → colorInputForeground. Only the key names changed.
    colorForeground: "#EDE6D8",
    colorMutedForeground: "#A59C89",
    colorPrimaryForeground: "#14110E",
    colorInput: "#18140F",
    colorInputForeground: "#EDE6D8",
    colorNeutral: "#8B8270",
    colorDanger: "#C6533F",
    colorSuccess: "#6FA368",
    colorWarning: "#DEAA29",
    colorShimmer: "rgba(207,135,69,0.10)",
    fontFamily: "var(--font-plex-sans)",
    fontFamilyButtons: "var(--font-plex-sans)",
    fontSize: "14px",
    borderRadius: "8px",
  },
  elements: {
    rootBox: { width: "100%", fontFamily: "var(--font-plex-sans)" },
    // RD§5 gives the backdrop as a fixed near-black at 0.72. Every shipped
    // overlay — sheet backdrop, card detail — now mixes the canvas at that same
    // alpha instead, so a theme with a lighter canvas dims rather than blackens.
    modalBackdrop: { background: "color-mix(in oklab, var(--bg) 72%, transparent)" },
    modalContent: { borderRadius: 16, [MOBILE]: { borderRadius: 0 } },
    cardBox: {
      background: "var(--surface)",
      border: "1px solid var(--border-strong)",
      borderRadius: 16,
      boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
      [MOBILE]: { borderRadius: 0, border: "none" },
    },
    // cardBox owns the surface; card must not paint a second one over it.
    card: { background: "transparent", padding: 0 },
    scrollBox: { background: "transparent" },

    navbar: {
      background: "var(--surface-rail)",
      borderRight: "1px solid var(--border-strong)",
    },
    navbarButton: {
      color: "var(--fg-muted)",
      fontWeight: 500,
      borderRadius: 8,
      "&:hover": { background: "var(--elevated-hover)" },
    },
    navbarButton__active: {
      background: "var(--elevated)",
      color: "var(--fg)",
      fontWeight: 600,
    },
    navbarButtonIcon: { color: "var(--border-strong)" },
    navbarMobileMenuButton: {
      color: "var(--fg-muted)",
      border: "1px solid var(--border-strong)",
      borderRadius: 8,
    },

    header: { padding: "0 0 18px", borderBottom: "1px solid var(--border)" },
    headerTitle: {
      fontFamily: "var(--font-cinzel)",
      fontWeight: 700,
      fontSize: 22,
      color: "var(--fg)",
    },
    headerSubtitle: {
      fontFamily: "var(--font-plex-mono)",
      fontSize: "11.5px",
      color: "var(--fg-faint)",
    },
    profileSection: { borderBottom: "1px solid var(--border)", padding: "18px 0" },
    // 15px, not the 22px of headerTitle — these are subheads inside one panel.
    profileSectionTitleText: {
      fontFamily: "var(--font-cinzel)",
      fontWeight: 600,
      fontSize: 15,
      color: "var(--fg)",
    },
    profileSectionContent: {
      color: "var(--fg-body)",
      fontSize: "13.5px",
      lineHeight: 1.6,
    },
    // Quiet on purpose: accent fill is reserved for the one formButtonPrimary.
    profileSectionPrimaryButton: {
      background: "transparent",
      color: "var(--accent)",
      fontWeight: 600,
      "&:hover": { background: "var(--elevated)" },
    },
    activeDeviceIcon: { color: "var(--fg-faint)" },
    badge: {
      background: "rgba(207,135,69,0.14)",
      color: "var(--accent)",
      fontFamily: "var(--font-plex-mono)",
      fontSize: "10.5px",
      borderRadius: 999,
    },

    formFieldLabel: { fontSize: "12.5px", fontWeight: 600, color: "var(--fg-muted)" },
    formFieldInput: {
      background: "var(--surface-sunken)",
      border: "1px solid var(--border-strong)",
      borderRadius: 8,
      height: 40,
      color: "var(--fg)",
      "&:focus": { borderColor: "var(--accent)", boxShadow: RING },
    },
    formFieldHintText: {
      fontFamily: "var(--font-plex-mono)",
      fontSize: 11,
      color: "var(--fg-faint)",
    },
    // Clerk pairs these with its own icon, so colour is never the only signal.
    formFieldErrorText: { color: "var(--danger)", fontSize: 12 },
    formFieldSuccessText: { color: "var(--success)", fontSize: 12 },
    formFieldAction: { color: "var(--accent)", fontWeight: 600 },
    formButtonPrimary: {
      background: "var(--accent)",
      color: "var(--bg)",
      fontWeight: 600,
      borderRadius: 8,
      padding: "12px 26px",
      "&:hover": { background: "var(--accent-hover)" },
    },
    formButtonReset: {
      background: "transparent",
      border: "1px solid var(--border-strong)",
      color: "var(--fg-muted)",
      borderRadius: 8,
      "&:hover": { borderColor: "var(--accent)" },
    },

    avatarBox: { borderRadius: 12, border: "1px solid var(--accent)" },
    avatarImageActionsUpload: { color: "var(--accent)", fontWeight: 600 },
    dividerLine: { background: "var(--border)" },
    dividerText: {
      fontFamily: "var(--font-plex-mono)",
      fontSize: 10,
      letterSpacing: "0.08em",
      color: "var(--fg-faint)",
      textTransform: "uppercase",
    },
    alert: {
      background: "var(--surface-sunken)",
      borderLeftWidth: 3,
      borderRadius: 8,
    },
    alertText: { color: "var(--fg-body)", fontSize: 13 },

    menuButton: {
      color: "var(--fg-muted)",
      borderRadius: 8,
      "&:hover": { background: "var(--elevated-hover)" },
    },
    // Deliberately the account popover container, so Clerk's own menus read as
    // the same object the shell menu is.
    menuList: {
      background: "var(--surface-raised)",
      border: "1px solid var(--border-strong)",
      borderRadius: 14,
      boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
    },
    menuItem: {
      fontSize: 14,
      color: "var(--fg)",
      padding: "11px 12px",
      borderRadius: 8,
      "&:hover": { background: "var(--elevated)" },
    },

    // M44 keeps the "Secured by Clerk" footer visible: hiding it is a plan-terms
    // question for eng/legal, not a design one, and #35 does not settle it.
    footer: { background: "transparent" },
    footerActionLink: {
      color: "var(--accent)",
      "&:hover": { color: "var(--accent-hover)" },
    },
  },
};

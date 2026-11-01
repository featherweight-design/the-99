// The search's keyboard shortcut (handoff R2, README call 7): ⌘K on a Mac, Ctrl+K elsewhere, from anywhere including
// inside page fields (neither edits text), NEVER Ctrl+K on a Mac (it deletes to the end of the line in every text
// field), and not while a dialog is up. Pure, so the rule is tested without a browser.

/** The shortcut's platform: a Mac (and an iPad that reports as one) takes ⌘, every other platform Ctrl. */
export function isMacPlatform(nav: { platform?: string; userAgentData?: { platform?: string } }): boolean {
  const platform = nav.userAgentData?.platform ?? nav.platform ?? "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}

type KeyLike = Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey"> & { isComposing?: boolean };

/** Whether this key press is the search's shortcut on this platform. */
export function isSearchShortcut(e: KeyLike, mac: boolean): boolean {
  if (e.isComposing || e.altKey || e.shiftKey) return false;
  if (e.key.toLowerCase() !== "k") return false;
  // Exactly one modifier, and on a Mac it is ⌘: Ctrl+K there is the text field's own kill-line.
  return mac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
}

/**
 * Whether this key press is the search's keyboard add (add a card from anywhere, READINESS O4): ⌘↵ on a Mac, Ctrl ↵
 * elsewhere, on the active row. Either modifier is taken on either platform (neither edits text in a field), but only
 * one, and no Alt or Shift.
 */
export function isAddShortcut(e: KeyLike): boolean {
  if (e.isComposing || e.altKey || e.shiftKey || e.key !== "Enter") return false;
  return e.metaKey !== e.ctrlKey;
}

/**
 * Whether a dialog other than the search's own is up over the page. The search never opens over one: the dialog
 * is modal and the page behind it is inert. A dialog under `[hidden]` or `[inert]` (the About page's figures) is
 * a specimen, not a surface a reader can use. Read from the DOM because many surfaces lock nothing.
 */
export function dialogIsUp(root: Pick<Document, "querySelectorAll">, own: Element | null): boolean {
  for (const el of root.querySelectorAll('[aria-modal="true"], [role="dialog"], [role="menu"]')) {
    if (el === own || own?.contains(el) || el.closest("[hidden], [inert]")) continue;
    return true;
  }
  return false;
}

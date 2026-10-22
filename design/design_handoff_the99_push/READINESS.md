# Readiness — push notifications

**Verdict: Green.** R1 approved by Hugh 2026-10-22 ("Agreed with A. This LGTM, let's open a PR"). Delivery is **A** by
his ruling: each event as it happens, several of one kind from one job as one push, nothing 21:00 to 09:00 in the
device's time zone, no quiet-hours setting. Nothing below blocks the build; each open item has a drawn default.
Checked against main at `147669b`.

## For Hugh

1. **About screen.** The entry lives on a NEW About screen, `settings` (README A1): /settings has none today. The
   alternative is `account` (found by search only, no capture of Settings); default is the new screen.
2. **Icon badge.** Installed apps carry the Home slot's unseen count on the app icon (call 7). Not in the brief; drop it
   and nothing else changes.
3. **Copy** is placeholder throughout, for `/copy-review`: the device row's six lines, the sheet, the foot line, every
   notification title and body, the collapsed copy.

## For engineering

1. **Settings.** `news-section.tsx` gains the push column: the section head's right slot reads **Push** over a 44px
   column; each row keeps its label (the Home box's press) and gains a separate 44px cell holding the shared
   `Checkbox` (its own `ariaLabel`, e.g. "Push: Price drops on your wishlist"). The device row is the first `li`: bell
   glyph in the box slot, title + one line, the device box in the column. One save at a time, as shipped; the shared
   toast on a failed write.
2. **The ask.** Only from a push tick (device row or kind) while `Notification.permission === "default"`, inside that
   press's handler (the user gesture): `requestPermission`, then `pushManager.subscribe`. Never on load, Home or the
   inline opt-in. No pre-prompt.
3. **iPhone in Safari.** Detect iOS ≥16.4 not standalone: the device row's "How ›", its box, and any push tick open
   the guidance sheet (shared sheet box, ✕); the tick is saved first.
4. **Delivery** per README G3 to G6: per-device `time_zone`, the overnight hold, one push per (user, kind, job run),
   `tag` = kind, landing route + feed item key in the payload, no push with a focused client, seen closes delivered
   notifications.
5. **Notifications** per the README's table: title and body are the feed item's (`feedCopy.home`), reworded only where
   drawn; icon `public/icons/icon-192.png`; `image` = the feed item's card at card shape where the platform shows one;
   no action buttons.
6. **Gaps** G1 to G8 in `README.md` (store, prefs default `["spare-request"]`, sending, collapse and hold, landing and
   seen, foreground and badge, sign out, `PUSH_ENABLED`) and About A1 to A5 (`about · push.ts`; switched entry,
   `since` = the version current when it ships, no bump).
7. **Foot line** of the section gains the push clause only where push is possible.
8. **Mobile and desktop** ship together: same markup, the 720 column at `md`; *this phone* / *this browser* /
   *this iPhone* by device.

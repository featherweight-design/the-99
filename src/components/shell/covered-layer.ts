// A layer the shell draws outside its <main> that still belongs to the page inside it (the deck toast stack, which a
// deck page's toasts portal into so they can climb out of the page's own stacking contexts). While a navigation's
// screen covers <main>, every element carrying this attribute is made inert with it (`NavigationPendingProvider`),
// including one that mounts while the screen is up: the screen covers the page, so nothing the page drew elsewhere may
// still be pressed, and a toast clock that counts only while its toast can be pressed (`useToastClock`) stops with it.
//
// Which portals carry it. A portal to `document.body` whose press acts on the current page's state carries it on its
// portalled root (deck tile overflow, Printed in's list, the tag picker's list, fact tooltips, moment bubbles, the
// first-run tour, the card search's results host). Mark a static wrapper when the root sets its own `inert`: the
// provider removes the attribute at the run's end. Two kinds go without it: shell chrome whose presses do not act on the
// page (the account menu, help), which stays live like the rail, and the push-how and iOS install sheets, which are
// documented as deliberately live under the screen. A sheet in `useSheetHost` (`sheet-host.ts`) is prepended into
// <main> and goes inert with it, so it needs none.
export const COVERED_WITH_MAIN = "data-covered-with-main";

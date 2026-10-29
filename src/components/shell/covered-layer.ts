// A layer the shell draws outside its <main> that still belongs to the page inside it (the deck toast stack, which a
// deck page's toasts portal into so they can climb out of the page's own stacking contexts). While a navigation's
// screen covers <main>, every element carrying this attribute is made inert with it (`NavigationPendingProvider`):
// the screen covers the page, so nothing the page drew elsewhere may still be pressed, and a toast clock that counts
// only while its toast can be pressed (`useToastClock`) stops with it.
export const COVERED_WITH_MAIN = "data-covered-with-main";

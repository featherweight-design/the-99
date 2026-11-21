# Readiness: Clear all of What's new

**Verdict: Green.** Hugh approved R1 on 2026-11-20. One small PR (S): no migration, no new switch, no loader change.
New player-facing copy (the press, its accessible name, two toasts) is DRAFT for `/copy-review`. Checked against
`origin/main` @728de56.

## For engineering

- **`src/components/feed/show-all.tsx` `ShowAllFooter`:** an optional Clear all press between `aside` and Show all
  (same press classes as Show all, `--fg-muted` ink). The footer draws when `hidden > 0`, `aside` is set, or Clear all
  shows; with neither of the others, Clear all sits alone on the right. Only `WhatsNew` passes it: Waiting on you on
  `/friends` is unchanged.
- **`src/components/home/whats-new.tsx`:** show Clear all while the feed holds two or more items (lead + every row,
  not only the shown five, + Upcoming drops). The press hides them all at once through the same hidden set
  `useFeedDismiss` keeps, zeroes the head count, and focuses `#home-whats-new`. The box then draws `Quiet` as shipped.
- **Server:** a bulk action beside `dismissFeedItemAction` (`src/app/feed-dismiss-actions.ts`), keys parsed with
  `parseDismissKey` (refuse on any invalid key), written in one statement in `src/lib/social/feed-dismiss.ts`; revalidate
  `/` and `/friends`. Undo: delete the reader's own `feed_dismissals` rows for those keys. Home's spare-request items
  dismiss their `item:` key only, so Waiting on you keeps the ask (as the ✕ today).
- **Toasts:** `SocialToast` centre placement. Success `role="status"` with its action press as Undo; failure role alert,
  no action, every item restored.
- **Copy** in `src/lib/copy/feed.ts` (`home`): the press, its aria label, `cleared(n)`, `clearFailed` (README § Copy).
- **Tests:** Clear all at 2+ items, none at 1; the count includes the lead and hidden rows; bad keys refused; undo
  deletes only the reader's own rows; a failed write restores every item.
- **Both widths** in the same PR (one component).
- **About:** the `home-feed` captures may show the foot; re-take when convenient. No label.

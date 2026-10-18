import { shellCopy } from "../lib/copy/shell";
import { NOT_FOUND_ACTION, NotFoundView } from "../components/shell/not-found-view";
import { GhostButton, PrimaryButton } from "../components/ui/button";

export default function NotFound() {
  return (
    <NotFoundView>
      <PrimaryButton href="/" className={NOT_FOUND_ACTION}>
        {shellCopy.notFound.primaryCta}
      </PrimaryButton>
      <GhostButton href="/decks" className={NOT_FOUND_ACTION}>
        {shellCopy.notFound.secondaryCta}
      </GhostButton>
    </NotFoundView>
  );
}

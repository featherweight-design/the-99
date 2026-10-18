import { PublicNotFound } from "../../../components/public/not-found";

/**
 * The commander page's 404 (C3): an unknown or ambiguous address, a card with no commander page, and every address while
 * `PUBLIC_PAGES_ENABLED` is off, draw the public not-found instead of the app's, which offers `View decks` behind sign-in.
 */
export default function CommanderNotFound() {
  return <PublicNotFound />;
}

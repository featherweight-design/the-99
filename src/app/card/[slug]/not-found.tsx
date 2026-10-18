import { PublicNotFound } from "../../../components/public/not-found";

/**
 * The card page's 404 (C3): an unknown or ambiguous address, and every address while `PUBLIC_PAGES_ENABLED` is off, draw the
 * public not-found instead of the app's, which offers `View decks` behind sign-in.
 */
export default function CardNotFound() {
  return <PublicNotFound />;
}

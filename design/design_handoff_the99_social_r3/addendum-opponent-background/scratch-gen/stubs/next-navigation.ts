export const useRouter = () => ({ replace() {}, push() {}, refresh() {}, prefetch() {} });
export const usePathname = () => (globalThis as any).__PATH ?? "/decks/d1";
export const useSearchParams = () => new URLSearchParams();
export const redirect = () => {}; export const notFound = () => {};

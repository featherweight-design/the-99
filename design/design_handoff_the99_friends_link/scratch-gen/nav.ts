const r = { refresh() {}, push() {}, replace() {}, prefetch() {}, back() {}, forward() {} };
export const useRouter = () => r;
export let PATH = "/friends";
export const usePathname = () => (globalThis as any).__PATH ?? "/friends";
export const useSearchParams = () => new URLSearchParams();
export const useParams = () => ({});
export const redirect = () => { throw new Error("redirect"); };
export const notFound = () => { throw new Error("nf"); };

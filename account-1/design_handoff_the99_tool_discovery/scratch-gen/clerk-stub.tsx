export const useUser = () => ({ isLoaded: true, isSignedIn: true, user: (globalThis as any).__user ?? { firstName: "Wren", lastName: "Calloway", fullName: "Wren Calloway", primaryEmailAddress: { emailAddress: "wren@example.com" }, imageUrl: "" } });
export const useClerk = () => ({ signOut: async () => {}, redirectToUserProfile: async () => {} });
export const useAuth = () => ({ isLoaded: true, isSignedIn: true, userId: "u" });
export const SignInButton = ({ children }: any) => children ?? null;
export const SignedIn = ({ children }: any) => children; export const SignedOut = () => null;
export const ClerkProvider = ({ children }: any) => children;
export const useSignIn = () => ({}); export const useSignUp = () => ({}); export const useSession = () => ({});
export const useReverification = (f: any) => f;

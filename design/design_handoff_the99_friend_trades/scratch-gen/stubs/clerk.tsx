export const useUser = () => ({ isLoaded: true, isSignedIn: true, user: { firstName: "Hugh", lastName: "H", fullName: "Hugh H", primaryEmailAddress: { emailAddress: "you@example.com" }, imageUrl: "" } });
export const useClerk = () => ({ signOut() {}, openUserProfile() {}, openSignIn() {} });
export const useAuth = () => ({ isLoaded: true, isSignedIn: true, userId: "u1" });
export const SignInButton = ({ children }: any) => children ?? null;
export const SignUpButton = ({ children }: any) => children ?? null;
export const SignedIn = ({ children }: any) => children; export const SignedOut = () => null;
export const ClerkProvider = ({ children }: any) => children;

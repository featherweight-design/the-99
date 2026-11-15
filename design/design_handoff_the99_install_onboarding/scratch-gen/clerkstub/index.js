const user = { id: "u", firstName: "Hugh", fullName: "Hugh", imageUrl: "", primaryEmailAddress: { emailAddress: "h@example.com" } };
module.exports = {
  useUser: () => ({ isLoaded: true, isSignedIn: true, user }),
  useClerk: () => ({ signOut() {}, openUserProfile() {}, openSignIn() {} }),
  useAuth: () => ({ isLoaded: true, isSignedIn: true, userId: "u", getToken: async () => null }),
  SignInButton: ({ children }) => children ?? null,
  ClerkProvider: ({ children }) => children,
};

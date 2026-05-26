
import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthState, User } from "../types";
import { auth } from "../firebse";
import { onAuthStateChanged, getIdToken, signOut } from "firebase/auth";

interface AuthContextType extends AuthState {
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    requiresVerification: false,
    isLoading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          requiresVerification: false,
          isLoading: false,
        });
        return;
      }

      await firebaseUser.reload();
      const token = await getIdToken(firebaseUser, true);
      setState({
        user: {
          id: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || undefined,
        },
        token,
        isAuthenticated: firebaseUser.emailVerified,
        requiresVerification: !firebaseUser.emailVerified,
        isLoading: false,
      });
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      requiresVerification: false,
      isLoading: false,
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

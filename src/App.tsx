/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AuthForm } from "./components/AuthForm";
import { TodoList } from "./components/TodoList";
import { auth } from "./firebse";
import { sendEmailVerification } from "firebase/auth";

function VerifyEmailNotice() {
  const [status, setStatus] = useState("Email verification is required before you can access the app.");

  const resendVerification = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      setStatus("Verification email resent. Check your inbox and refresh after verifying.");
    } catch (error) {
      setStatus("Unable to send verification email. Try again later.");
    }
  };

  const refreshStatus = async () => {
    if (!auth.currentUser) return;
    try {
      await auth.currentUser.reload();
      setStatus("Status refreshed. If your email is verified, please refresh the page.");
    } catch (error) {
      setStatus("Unable to refresh status. Please reload the page.");
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 p-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Verify your email</h1>
        <p className="text-slate-500 text-sm mb-6">{status}</p>
        <div className="space-y-3">
          <button
            onClick={resendVerification}
            className="w-full bg-blue-600 text-white py-3 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all"
          >
            Resend verification email
          </button>
          <button
            onClick={refreshStatus}
            className="w-full border border-slate-200 text-slate-700 py-3 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all"
          >
            Refresh verification status
          </button>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, requiresVerification, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading authentication status...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {requiresVerification ? <VerifyEmailNotice /> : isAuthenticated ? <TodoList /> : <AuthForm />}
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

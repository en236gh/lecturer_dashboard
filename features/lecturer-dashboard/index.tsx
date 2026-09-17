"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { bootstrapSession, clearSession, hasSession } from "@/lib/api";
import { AppShell } from "./components/app-shell";
import { Login } from "./components/login";
import { AppShellSkeleton } from "./components/skeleton";

export default function LecturerDashboard() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initSession() {
      if (!hasSession()) {
        if (!cancelled) {
          setAuthenticated(false);
          setReady(true);
        }
        return;
      }

      try {
        await bootstrapSession();
      } catch {
        // Keep the user signed in when refresh fails transiently; only logout if tokens were revoked.
      }

      if (!cancelled) {
        setAuthenticated(hasSession());
        setReady(true);
      }
    }

    void initSession();

    function onSessionCleared() {
      setAuthenticated(false);
    }
    window.addEventListener("unza-session-cleared", onSessionCleared);
    return () => {
      cancelled = true;
      window.removeEventListener("unza-session-cleared", onSessionCleared);
    };
  }, []);

  if (!ready) {
    return <AppShellSkeleton />;
  }

  if (!authenticated) {
    return (
      <>
        <Login onAuthenticated={() => setAuthenticated(true)} />
        <Toaster position="top-right" richColors closeButton />
      </>
    );
  }

  return (
    <AppShell
      onSignOut={() => {
        clearSession();
        setAuthenticated(false);
      }}
    />
  );
}

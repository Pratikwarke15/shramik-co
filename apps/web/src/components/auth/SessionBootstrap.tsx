"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";

/**
 * Runs once when the app boots:
 *  1. Loads the stored session and validates it against the API, so a stale,
 *     forged or cross-role session is torn down before anything renders.
 *  2. Breaks browser bfcache resurrection: when the user presses Back after
 *     logging out, the browser may restore the frozen dashboard page (old
 *     React state, still "logged in"). A hard reload reconstructs the page
 *     from storage, and every guard then redirects to /login.
 */
export function SessionBootstrap() {
  const ran = useRef(false);
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const validateToken = useAuthStore((s) => s.validateToken);

  useEffect(() => {
    // Never let a bfcache-restored page show stale authenticated content.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    loadFromStorage();
    validateToken();
  }, [loadFromStorage, validateToken]);

  return null;
}

export default SessionBootstrap;
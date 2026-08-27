"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";

/**
 * Validates the stored session against the API exactly once on app load.
 * Mounted in the root layout so every page inherits a server-checked session.
 */
export function SessionBootstrap() {
  const ran = useRef(false);
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const validateToken = useAuthStore((s) => s.validateToken);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    loadFromStorage();
    validateToken();
  }, [loadFromStorage, validateToken]);

  return null;
}

export default SessionBootstrap;
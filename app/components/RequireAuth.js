"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  clearAuthTokens,
  fetchMe,
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
  setAuthTokens,
  setStoredUser,
} from "../../lib/auth";

export default function RequireAuth({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function verifySession() {
      const access = getAccessToken();
      const refresh = getRefreshToken();

      if (!access || !refresh) {
        clearAuthTokens();
        router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
        return;
      }

      try {
        const me = await fetchMe(access);
        setStoredUser(me);
        setIsChecking(false);
        return;
      } catch {
        // Access token might be expired, so attempt refresh once.
      }

      try {
        const refreshed = await refreshAccessToken(refresh);
        setAuthTokens({ access: refreshed.access, refresh });
        const me = await fetchMe(refreshed.access);
        setStoredUser(me);
        setIsChecking(false);
      } catch {
        clearAuthTokens();
        router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
      }
    }

    verifySession();
  }, [pathname, router]);

  if (isChecking) {
    return <main style={{ padding: "2rem" }}>Checking your session...</main>;
  }

  return children;
}

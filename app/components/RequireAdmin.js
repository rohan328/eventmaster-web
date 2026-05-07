"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  fetchMe,
  getAccessToken,
  getStoredUser,
  setStoredUser,
} from "../../lib/auth";

export function isAdminRole(role) {
  return role === "admin";
}

/**
 * Must be nested inside RequireAuth. Allows only users with the admin app role
 * (JWT/me role === "admin", including superuser-derived admin).
 */
export default function RequireAdmin({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function check() {
      const access = getAccessToken();
      let me = getStoredUser();

      if (access) {
        try {
          me = await fetchMe(access);
          setStoredUser(me);
        } catch {
          router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
          return;
        }
      }

      if (!me) {
        router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
        return;
      }

      if (!isAdminRole(me.role)) {
        router.replace("/dashboard");
        return;
      }

      setAllowed(true);
    }

    check();
  }, [pathname, router]);

  if (!allowed) {
    return <main style={{ padding: "2rem" }}>Checking access...</main>;
  }

  return children;
}

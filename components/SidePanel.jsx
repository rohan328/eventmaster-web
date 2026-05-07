"use client";

import { useEffect, useState } from "react";
import styles from "./SidePanel.module.css";
import { usePathname, useRouter } from "next/navigation";
import { getStoredUser } from "../lib/auth";

const MAIN_NAV = [
  { label: "Overview", href: "/dashboard", organizerOnly: false },
  { label: "Create an Event", href: "/create-event", organizerOnly: true },
  { label: "Your Events", href: "/your-events", organizerOnly: false },
  { label: "Your Calendar", href: "/calender", organizerOnly: false },
  { label: "Manage Attendees", href: "/manage-attendees", organizerOnly: true },
  { label: "Notifications", href: null, organizerOnly: false },
];

const SECONDARY_NAV = [
  { label: "Pending Approvals", href: "/administration/approvals", adminOnly: true },
  { label: "Manage Events", href: "/administration/manage-events", adminOnly: true },
];

function canSeeOrganizerNav(role) {
  return role === "organizer" || role === "admin";
}

export default function SidePanel() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState(null);

  useEffect(() => {
    const user = getStoredUser();
    setRole(user?.role ?? null);
  }, [pathname]);

  const organizerOk = canSeeOrganizerNav(role);

  const visibleMain = MAIN_NAV.filter(
    (item) => !item.organizerOnly || organizerOk
  );

  const visibleSecondary = SECONDARY_NAV.filter(
    (item) => !item.adminOnly || role === "admin"
  );

  function navigate(href) {
    if (href) router.push(href);
  }

  return (
    <aside className={styles.panel}>
      <div className={styles.brandRow}>
        <span className={styles.brandIcon}></span>
        <span
          className={styles.brandName}
          onClick={() => router.push("/dashboard")}
        >
          Eventmaster
        </span>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>MAIN</p>
        {visibleMain.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`${styles.navItem} ${
              item.href && pathname === item.href ? styles.active : ""
            } ${!item.href ? styles.navItemDisabled : ""}`}
            onClick={() => navigate(item.href)}
            disabled={!item.href}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visibleSecondary.length > 0 ? (
        <div className={styles.section}>
          <p className={styles.sectionLabel}>OTHERS</p>
          {visibleSecondary.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`${styles.navItem} ${
                item.href && pathname === item.href ? styles.active : ""
              } ${!item.href ? styles.navItemDisabled : ""}`}
              onClick={() => navigate(item.href)}
              disabled={!item.href}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {role === "attendee" && (
        <button
          type="button"
          className={styles.organizerButton}
          onClick={() => router.push("/settings")}
        >
          Become an Organizer
        </button>
      )}
      <button type="button" className={styles.helpButton}>
        Help &amp; Feedback
      </button>
    </aside>
  );
}

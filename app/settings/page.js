"use client";

import { useEffect, useState } from "react";
import SidePanel from "../../components/SidePanel";
import RequireAuth from "../components/RequireAuth";
import {
  clearAuthTokens,
  fetchMe,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  patchMe,
  refreshAccessToken,
  setAuthTokens,
  setStoredUser,
} from "../../lib/auth";
import styles from "./page.module.css";

function emptyProfile() {
  return {
    firstName: "",
    lastName: "",
    email: "",
  };
}

export default function SettingsPage() {
  const [profile, setProfile] = useState(() => emptyProfile());
  const [role, setRole] = useState(null);
  const [saveState, setSaveState] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const roleLocked = role === "admin";
  const canPickRole = role !== null && !roleLocked;

  function updateField(field, value) {
    setSaveState("idle");
    setSaveError("");
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateRole(nextRole) {
    setSaveState("idle");
    setSaveError("");
    setRole(nextRole);
  }

  useEffect(() => {
    async function loadCurrentUser() {
      const applyUser = (user) => {
        if (!user) return;
        setProfile({
          firstName: user.first_name || "",
          lastName: user.last_name || "",
          email: user.email || "",
        });
        setRole(user.role ?? "attendee");
      };

      const storedUser = getStoredUser();
      applyUser(storedUser);

      const access = getAccessToken();
      if (!access) {
        setIsLoadingProfile(false);
        return;
      }

      try {
        const me = await fetchMe(access);
        setStoredUser(me);
        applyUser(me);
      } catch {
        clearAuthTokens();
      } finally {
        setIsLoadingProfile(false);
      }
    }

    loadCurrentUser();
  }, []);

  async function handleSave(event) {
    event.preventDefault();
    setSaveState("saving");
    setSaveError("");

    const access = getAccessToken();
    if (!access) {
      setSaveError("You are not signed in.");
      setSaveState("idle");
      return;
    }

    const body = {
      first_name: profile.firstName.trim(),
      last_name: profile.lastName.trim(),
      email: profile.email.trim(),
    };
    if (canPickRole && role) {
      body.role = role;
    }

    try {
      const me = await patchMe(access, body);
      setStoredUser(me);
      setProfile({
        firstName: me.first_name || "",
        lastName: me.last_name || "",
        email: me.email || "",
      });
      setRole(me.role ?? "attendee");

      const refresh = getRefreshToken();
      if (refresh) {
        try {
          const tokens = await refreshAccessToken(refresh);
          setAuthTokens({
            access: tokens.access,
            refresh: tokens.refresh ?? refresh,
          });
        } catch {
          /* keep access token from before refresh; user can re-login if needed */
        }
      }

      setSaveState("saved");
    } catch (err) {
      setSaveError(err.message || "Could not save profile.");
      setSaveState("idle");
    }
  }

  return (
    <RequireAuth>
      <div className={styles.settingsLayout}>
        <SidePanel />

        <main className={styles.content}>
          <section className={styles.headerSection}>
            <h1 className={styles.title}>Account Settings</h1>
            <p className={styles.subtitle}>
              Update your name, email, and how you use Eventmaster (attendee or organizer).
            </p>
            {isLoadingProfile && <p className={styles.savedMessage}>Loading your account details...</p>}
          </section>

          <form className={styles.form} onSubmit={handleSave}>
            <article className={styles.card}>
              <h2 className={styles.cardTitle}>Profile</h2>
              <p className={styles.cardDescription}>These details are saved to your Eventmaster account.</p>

              <div className={styles.gridTwo}>
                <label className={styles.field}>
                  <span>First name</span>
                  <input
                    value={profile.firstName}
                    onChange={(event) => updateField("firstName", event.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  <span>Last name</span>
                  <input
                    value={profile.lastName}
                    onChange={(event) => updateField("lastName", event.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  <span>Email</span>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    required
                  />
                </label>
              </div>

              {!isLoadingProfile && roleLocked && (
                <p className={styles.adminRoleNote}>
                  Your account has the <strong>admin</strong> role. It cannot be switched to attendee or organizer
                  from this page.
                </p>
              )}

              {!isLoadingProfile && canPickRole && (
                <fieldset className={styles.roleFieldset}>
                  <legend className={styles.roleLegend}>Account type</legend>
                  <p className={styles.roleHint}>
                    Attendees discover and join events. Organizers create events and manage registrations.
                  </p>
                  <div className={styles.roleOptions}>
                    <label className={styles.roleRadioLabel}>
                      <input
                        type="radio"
                        name="account-role"
                        value="attendee"
                        checked={role === "attendee"}
                        onChange={() => updateRole("attendee")}
                      />
                      <span>Attendee — join and register for events</span>
                    </label>
                    <label className={styles.roleRadioLabel}>
                      <input
                        type="radio"
                        name="account-role"
                        value="organizer"
                        checked={role === "organizer"}
                        onChange={() => updateRole("organizer")}
                      />
                      <span>Organizer — create and manage events</span>
                    </label>
                  </div>
                </fieldset>
              )}
            </article>

            <div className={styles.actions}>
              <button type="submit" className={styles.saveButton} disabled={saveState === "saving"}>
                {saveState === "saving" ? "Saving..." : "Save Changes"}
              </button>
              {saveError && (
                <p className={styles.savedMessage} role="alert">
                  {saveError}
                </p>
              )}
              {saveState === "saved" && !saveError && (
                <p className={styles.savedMessage}>Profile saved to your account.</p>
              )}
            </div>
          </form>
        </main>
      </div>
    </RequireAuth>
  );
}

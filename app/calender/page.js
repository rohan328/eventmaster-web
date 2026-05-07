"use client";

import { useEffect, useMemo, useState } from "react";
import SidePanel from "../../components/SidePanel";
import { fetchMyRegisteredEvents } from "../../lib/events";
import { buildGoogleCalendarUrl } from "../../lib/googleCalendar";
import RequireAuth from "../components/RequireAuth";
import styles from "./page.module.css";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const GOOGLE_CALENDAR_EMBED_URL =
  process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_EMBED_URL || "";
const GOOGLE_TOKEN_KEY = "eventmaster_google_calendar_token";
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events";

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(isoDate) {
  return new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

async function getGoogleApiErrorMessage(response) {
  try {
    const payload = await response.json();
    const message = payload?.error?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  } catch {
    // Ignore JSON parsing errors and return fallback message.
  }
  return "Could not add event to Google Calendar.";
}

function readStoredGoogleToken() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(GOOGLE_TOKEN_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.access_token || !parsed?.expires_at) return null;
    if (Date.now() >= Number(parsed.expires_at)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function buildMonthDays(events, year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const totalDays = lastDay.getDate();
  const leadingEmpty = firstDay.getDay();

  const eventsInMonth = events.filter((event) => {
    const d = new Date(event.starts_at);
    return d.getFullYear() === year && d.getMonth() === monthIndex;
  });

  const eventDays = new Set(
    eventsInMonth.map((event) => new Date(event.starts_at).getDate())
  );

  const today = new Date();
  const viewingCurrentMonth =
    today.getFullYear() === year && today.getMonth() === monthIndex;

  const cells = [];

  for (let i = 0; i < leadingEmpty; i += 1) {
    cells.push({ type: "empty", key: `empty-${i}-${year}-${monthIndex}` });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({
      type: "day",
      key: `day-${year}-${monthIndex}-${day}`,
      day,
      hasEvent: eventDays.has(day),
      isToday: viewingCurrentMonth && day === today.getDate(),
    });
  }

  return cells;
}

export default function CalendarPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [googleToken, setGoogleToken] = useState(null);
  const [tokenClient, setTokenClient] = useState(null);
  const [connectError, setConnectError] = useState("");
  const [syncState, setSyncState] = useState("idle");
  const [activeEventId, setActiveEventId] = useState(null);
  const [savedEvents, setSavedEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");
  const [viewMonth, setViewMonth] = useState(() => {
    const t = new Date();
    return { year: t.getFullYear(), monthIndex: t.getMonth() };
  });

  useEffect(() => {
    let cancelled = false;

    async function loadRegisteredEvents() {
      setEventsLoading(true);
      setEventsError("");
      try {
        const list = await fetchMyRegisteredEvents();
        if (cancelled) return;
        const sorted = [...list].sort(
          (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
        );
        setSavedEvents(sorted);
      } catch (error) {
        if (!cancelled) {
          setEventsError(error.message || "Could not load your registered events.");
          setSavedEvents([]);
        }
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    }

    loadRegisteredEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  function goToPrevMonth() {
    setViewMonth((prev) =>
      prev.monthIndex === 0
        ? { year: prev.year - 1, monthIndex: 11 }
        : { year: prev.year, monthIndex: prev.monthIndex - 1 }
    );
  }

  function goToNextMonth() {
    setViewMonth((prev) =>
      prev.monthIndex === 11
        ? { year: prev.year + 1, monthIndex: 0 }
        : { year: prev.year, monthIndex: prev.monthIndex + 1 }
    );
  }

  function goToToday() {
    const t = new Date();
    setViewMonth({ year: t.getFullYear(), monthIndex: t.getMonth() });
  }

  const calendarCells = useMemo(
    () => buildMonthDays(savedEvents, viewMonth.year, viewMonth.monthIndex),
    [savedEvents, viewMonth.year, viewMonth.monthIndex]
  );

  const monthLabel = useMemo(
    () =>
      new Date(viewMonth.year, viewMonth.monthIndex, 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [viewMonth.year, viewMonth.monthIndex]
  );
  const upcomingCount = savedEvents.filter(
    (event) => new Date(event.starts_at).getTime() > Date.now()
  ).length;

  useEffect(() => {
    const storedToken = readStoredGoogleToken();
    if (storedToken) {
      setGoogleToken(storedToken);
      setIsConnected(true);
    }
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (typeof window === "undefined") return;
    if (window.google?.accounts?.oauth2) {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPE,
        callback: (response) => {
          if (response?.error || !response?.access_token) {
            setConnectError("Google authorization failed. Please try again.");
            return;
          }

          const expiresInMs = Number(response.expires_in || 3600) * 1000;
          const tokenPayload = {
            access_token: response.access_token,
            expires_at: Date.now() + expiresInMs,
          };
          localStorage.setItem(GOOGLE_TOKEN_KEY, JSON.stringify(tokenPayload));
          setGoogleToken(tokenPayload);
          setIsConnected(true);
          setConnectError("");
        },
      });
      setTokenClient(client);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google?.accounts?.oauth2) return;
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPE,
        callback: (response) => {
          if (response?.error || !response?.access_token) {
            setConnectError("Google authorization failed. Please try again.");
            return;
          }

          const expiresInMs = Number(response.expires_in || 3600) * 1000;
          const tokenPayload = {
            access_token: response.access_token,
            expires_at: Date.now() + expiresInMs,
          };
          localStorage.setItem(GOOGLE_TOKEN_KEY, JSON.stringify(tokenPayload));
          setGoogleToken(tokenPayload);
          setIsConnected(true);
          setConnectError("");
        },
      });
      setTokenClient(client);
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  function handleConnectGoogle() {
    setConnectError("");

    if (!GOOGLE_CLIENT_ID) {
      setConnectError("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID. Add it to your web environment.");
      return;
    }

    if (!tokenClient) {
      setConnectError("Google client is still loading. Try again in a moment.");
      return;
    }

    tokenClient.requestAccessToken({ prompt: "consent" });
  }

  function handleDisconnectGoogle() {
    localStorage.removeItem(GOOGLE_TOKEN_KEY);
    setGoogleToken(null);
    setIsConnected(false);
    setConnectError("");
  }

  async function handleAddEventToGoogle(event) {
    if (!googleToken?.access_token) {
      setConnectError("Please connect Google Calendar first.");
      return;
    }

    setActiveEventId(event.id);
    setSyncState("syncing");
    setConnectError("");

    try {
      const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${googleToken.access_token}`,
        },
        body: JSON.stringify({
          summary: event.title,
          location: event.location,
          description: event.description || "Saved from Eventmaster",
          start: {
            dateTime: new Date(event.starts_at).toISOString(),
          },
          end: {
            dateTime: new Date(event.ends_at).toISOString(),
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleDisconnectGoogle();
          throw new Error("Google session expired. Please reconnect your calendar.");
        }
        const apiErrorMessage = await getGoogleApiErrorMessage(response);
        throw new Error(`Google Calendar rejected the request: ${apiErrorMessage}`);
      }

      setSyncState("success");
    } catch (error) {
      setSyncState("error");
      setConnectError(error.message || "Unable to sync with Google Calendar.");
    } finally {
      setActiveEventId(null);
    }
  }

  return (
    <RequireAuth>
      <div className={styles.calendarLayout}>
        <SidePanel />

        <main className={styles.content}>
          <section className={styles.headerSection}>
            <h1 className={styles.title}>Your Calendar</h1>
            <p className={styles.subtitle}>
              Events you&apos;ve registered for on Eventmaster — sync them to Google Calendar if you like.
            </p>
          </section>

          <section className={styles.statGrid}>
            <article className={styles.statCard}>
              <p className={styles.statLabel}>Registered events</p>
              <p className={styles.statValue}>
                {eventsLoading ? "…" : savedEvents.length}
              </p>
            </article>
            <article className={styles.statCard}>
              <p className={styles.statLabel}>Upcoming This Year</p>
              <p className={styles.statValue}>{upcomingCount}</p>
            </article>
            <article className={styles.statCard}>
              <p className={styles.statLabel}>Google Calendar</p>
              <p className={styles.statValue}>{isConnected ? "Connected" : "Not Connected"}</p>
            </article>
          </section>

          <section className={styles.integrationSection}>
            <div>
              <h2 className={styles.sectionTitle}>Google Calendar Integration</h2>
              <p className={styles.sectionText}>
                Connect your Google account and push registered events into Google Calendar with one click.
              </p>
            </div>

            <div className={styles.integrationActions}>
              <button type="button" className={styles.primaryButton} onClick={handleConnectGoogle}>
                {isConnected ? "Reconnect Google Calendar" : "Connect Google Calendar"}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleDisconnectGoogle}
              >
                Disconnect
              </button>
            </div>
            {connectError && <p className={styles.errorText}>{connectError}</p>}
            {syncState === "success" && (
              <p className={styles.successText}>Event was added to your Google Calendar.</p>
            )}
          </section>

          <section className={styles.mainGrid}>
            <article className={styles.monthCard}>
              <div className={styles.monthHeader}>
                <div className={styles.monthNav}>
                  <button
                    type="button"
                    className={styles.monthArrow}
                    onClick={goToPrevMonth}
                    aria-label="Previous month"
                  >
                    ‹
                  </button>
                  <h3 className={styles.monthTitle}>{monthLabel}</h3>
                  <button
                    type="button"
                    className={styles.monthArrow}
                    onClick={goToNextMonth}
                    aria-label="Next month"
                  >
                    ›
                  </button>
                </div>
                <div className={styles.monthHeaderAside}>
                  <button type="button" className={styles.todayButton} onClick={goToToday}>
                    Today
                  </button>
                  <p className={styles.legend}>
                    <span className={styles.legendDot} />
                    Days with registered events
                  </p>
                </div>
              </div>

              <div className={styles.weekdays}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
                  <p key={label}>{label}</p>
                ))}
              </div>

              <div className={styles.dayGrid}>
                {calendarCells.map((cell) =>
                  cell.type === "empty" ? (
                    <div key={cell.key} className={styles.emptyCell} />
                  ) : (
                    <div
                      key={cell.key}
                      className={`${styles.dayCell} ${cell.hasEvent ? styles.dayWithEvent : ""} ${
                        cell.isToday ? styles.today : ""
                      }`}
                    >
                      {cell.day}
                    </div>
                  )
                )}
              </div>
            </article>

            <article className={styles.savedEventsCard}>
              <h3 className={styles.sectionTitle}>Your registered events</h3>

              {eventsError ? (
                <p className={styles.errorText}>{eventsError}</p>
              ) : null}

              {eventsLoading ? (
                <p className={styles.emptyState}>Loading your events…</p>
              ) : savedEvents.length === 0 ? (
                <p className={styles.emptyState}>
                  You haven&apos;t registered for any events yet. Open an event from the dashboard and tap
                  Register — it will show up here.
                </p>
              ) : (
                <div className={styles.eventList}>
                  {savedEvents.map((event) => (
                    <article key={event.id} className={styles.eventItem}>
                      <div>
                        <p className={styles.eventTitle}>{event.title}</p>
                        <p className={styles.eventMeta}>
                          {formatDate(event.starts_at)} at {formatTime(event.starts_at)}
                        </p>
                        <p className={styles.eventMeta}>{event.location}</p>
                      </div>

                      <button
                        type="button"
                        className={styles.addButton}
                        onClick={() => {
                          if (isConnected) {
                            handleAddEventToGoogle(event);
                            return;
                          }

                          window.open(buildGoogleCalendarUrl(event), "_blank", "noopener,noreferrer");
                        }}
                      >
                        {activeEventId === event.id && syncState === "syncing"
                          ? "Syncing..."
                          : "Add to Google"}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>

          {GOOGLE_CALENDAR_EMBED_URL && (
            <section className={styles.embedSection}>
              <h2 className={styles.sectionTitle}>Google Calendar Preview</h2>
              <iframe
                title="Google Calendar"
                src={GOOGLE_CALENDAR_EMBED_URL}
                className={styles.embed}
                loading="lazy"
              />
            </section>
          )}
        </main>
      </div>
    </RequireAuth>
  );
}

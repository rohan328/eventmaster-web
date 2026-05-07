"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import SidePanel from "../../components/SidePanel";
import {
  cancelRegistrationForUser,
  fetchEventRegistrations,
  fetchMyOrganizedEvents,
} from "../../lib/events";
import RequireAuth from "../components/RequireAuth";
import RequireOrganizer from "../components/RequireOrganizer";
import styles from "./page.module.css";

function formatRegisteredAt(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function eventLocationLine(event) {
  const loc = event.location?.trim();
  if (event.venue_type === "online") {
    return event.online_url?.trim() ? "Online" : "Online event";
  }
  if (event.venue_type === "hybrid") {
    return loc ? `${loc} · online` : "Hybrid";
  }
  return loc || "—";
}

export default function ManageAttendeesClient() {
  const searchParams = useSearchParams();
  const eventParam = searchParams.get("event");
  const preferredEventId = useMemo(() => {
    if (eventParam == null || eventParam === "") return null;
    const n = Number(eventParam);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [eventParam]);

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [cancellingUserId, setCancellingUserId] = useState(null);
  const lastAppliedEventParamRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setEventsLoading(true);
    setEventsError("");
    fetchMyOrganizedEvents()
      .then((list) => {
        if (!cancelled) setEvents(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setEvents([]);
          setEventsError(err.message || "Could not load your events.");
        }
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    const locQ = locationSearch.trim().toLowerCase();
    return events.filter((e) => {
      const title = (e.title || "").toLowerCase();
      const locLine = eventLocationLine(e).toLowerCase();
      if (q && !title.includes(q)) return false;
      if (locQ && !locLine.includes(locQ)) return false;
      return true;
    });
  }, [events, eventSearch, locationSearch]);

  const eventsForSelect = useMemo(() => {
    if (selectedEventId == null) return filteredEvents;
    const inFiltered = filteredEvents.some((e) => Number(e.id) === Number(selectedEventId));
    if (inFiltered) return filteredEvents;
    const extra = events.find((e) => Number(e.id) === Number(selectedEventId));
    return extra ? [extra, ...filteredEvents] : filteredEvents;
  }, [filteredEvents, events, selectedEventId]);

  useEffect(() => {
    if (eventsLoading || events.length === 0) return;

    const eventInList = (id) => events.some((e) => Number(e.id) === Number(id));

    if (
      preferredEventId != null &&
      eventInList(preferredEventId) &&
      lastAppliedEventParamRef.current !== eventParam
    ) {
      lastAppliedEventParamRef.current = eventParam;
      setSelectedEventId(preferredEventId);
      return;
    }

    if (eventsForSelect.length === 0) {
      setSelectedEventId(null);
      return;
    }
    const stillThere = eventsForSelect.some((e) => Number(e.id) === Number(selectedEventId));
    if (!stillThere) setSelectedEventId(eventsForSelect[0].id);
  }, [
    events,
    eventsLoading,
    preferredEventId,
    eventParam,
    eventsForSelect,
    selectedEventId,
  ]);

  useEffect(() => {
    if (!selectedEventId) {
      setRegistrations([]);
      setRegError("");
      return;
    }
    let cancelled = false;
    setRegLoading(true);
    setRegError("");
    fetchEventRegistrations(selectedEventId)
      .then((rows) => {
        if (!cancelled) setRegistrations(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setRegistrations([]);
          setRegError(err.message || "Could not load registrations.");
        }
      })
      .finally(() => {
        if (!cancelled) setRegLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedEventId]);

  const selectedEvent =
    events.find((e) => Number(e.id) === Number(selectedEventId)) ?? null;

  async function handleCancelRegistration(row) {
    if (!selectedEventId || cancellingUserId != null) return;
    const username = row.username || `user #${row.user_id}`;
    const ok = window.confirm(
      `Cancel registration for ${username}? They will need to register again to attend.`
    );
    if (!ok) return;
    setRegError("");
    const uid = Number(row.user_id);
    setCancellingUserId(uid);
    try {
      await cancelRegistrationForUser(selectedEventId, uid);
      setRegistrations((prev) => prev.filter((r) => Number(r.user_id) !== uid));
    } catch (err) {
      setRegError(err.message || "Could not cancel registration.");
    } finally {
      setCancellingUserId(null);
    }
  }

  return (
    <RequireAuth>
      <RequireOrganizer>
        <div className={styles.shell}>
          <SidePanel />

          <main className={styles.content}>
            <header className={styles.headerSection}>
              <h1 className={styles.title}>Manage attendees</h1>
              <p className={styles.subtitle}>
                See who has registered for each event you organize. Registrations update when
                attendees use Register on the event page.
              </p>
            </header>

            {eventsError ? <p className={styles.bannerError}>{eventsError}</p> : null}

            {eventsLoading ? (
              <p className={styles.muted}>Loading your events…</p>
            ) : eventsForSelect.length === 0 ? (
              <div className={styles.card}>
                <p className={styles.muted}>
                  {events.length === 0
                    ? "You have no events yet. Create one from Create an Event."
                    : "No events match your search. Try different title or location filters."}
                </p>
              </div>
            ) : (
              <>
                <div className={styles.toolbar}>
                  <label className={styles.selectLabel} htmlFor="manage-attendees-event">
                    Event
                  </label>
                  <select
                    id="manage-attendees-event"
                    className={styles.select}
                    value={selectedEventId ?? ""}
                    onChange={(e) => setSelectedEventId(Number(e.target.value))}
                  >
                    {eventsForSelect.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title}
                        {e.status && e.status !== "published" ? ` (${e.status})` : ""}
                      </option>
                    ))}
                  </select>
                  {selectedEvent ? (
                    <Link href={`/event?id=${selectedEvent.id}`} className={styles.eventLink}>
                      Open event →
                    </Link>
                  ) : null}
                </div>

                {selectedEvent ? (
                  <p className={styles.metaLine}>
                    <span>{eventLocationLine(selectedEvent)}</span>
                    {" · "}
                    <span className={styles.metaMuted}>Status: {selectedEvent.status}</span>
                  </p>
                ) : null}

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>Registrations</h2>
                    {regLoading ? (
                      <span className={styles.muted}>Loading…</span>
                    ) : (
                      <span className={styles.countBadge}>{registrations.length} total</span>
                    )}
                  </div>

                  {regError ? <p className={styles.bannerError}>{regError}</p> : null}

                  {!regLoading && registrations.length === 0 && !regError ? (
                    <p className={styles.muted}>
                      No one has registered yet. When attendees register for this published
                      event, they appear here.
                    </p>
                  ) : null}

                  {registrations.length > 0 ? (
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th scope="col">Username</th>
                            <th scope="col">User id</th>
                            <th scope="col">Registered at</th>
                            <th scope="col" className={styles.actionsCol}>
                              <span className={styles.visuallyHidden}>Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrations.map((row) => (
                            <tr key={String(row.user_id)}>
                              <td className={styles.mono}>{row.username}</td>
                              <td className={styles.mono}>{row.user_id}</td>
                              <td className={styles.mono}>
                                {formatRegisteredAt(row.created_at)}
                              </td>
                              <td className={styles.actionsCell}>
                                <button
                                  type="button"
                                  className={styles.cancelRegButton}
                                  disabled={cancellingUserId != null}
                                  onClick={() => handleCancelRegistration(row)}
                                >
                                  {cancellingUserId === Number(row.user_id)
                                    ? "Cancelling…"
                                    : "Cancel registration"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </main>
        </div>
      </RequireOrganizer>
    </RequireAuth>
  );
}


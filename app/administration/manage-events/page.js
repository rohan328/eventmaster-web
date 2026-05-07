"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SearchBar from "../../../components/SearchBar";
import SidePanel from "../../../components/SidePanel";
import RequireAuth from "../../components/RequireAuth";
import RequireAdmin from "../../components/RequireAdmin";
import {
  deleteEvent,
  fetchAdminAllEvents,
  updateEvent,
} from "../../../lib/events";
import styles from "./page.module.css";

function formatWhen(startsAt, endsAt) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime())) return "—";
  const datePart = start.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const tf = { hour: "numeric", minute: "2-digit" };
  const endOk = !Number.isNaN(end.getTime());
  return endOk
    ? `${datePart} · ${start.toLocaleString("en-US", tf)} – ${end.toLocaleString("en-US", tf)}`
    : datePart;
}

function statusClass(status) {
  switch (status) {
    case "draft":
      return styles.statusDraft;
    case "pending_approval":
      return styles.statusPending;
    case "published":
      return styles.statusPublished;
    case "cancelled":
      return styles.statusCancelled;
    default:
      return "";
  }
}

function statusLabel(status) {
  if (status === "pending_approval") return "Pending approval";
  return status ? String(status).replace(/_/g, " ") : "—";
}

export default function ManageEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchAdminAllEvents();
      setEvents(Array.isArray(list) ? list : []);
    } catch (e) {
      setEvents([]);
      setError(e.message || "Could not load events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  async function handleMoveToPending(id) {
    setBusyId(id);
    setToast("");
    setError("");
    try {
      await updateEvent(id, { status: "pending_approval" });
      setToast("Event moved to pending approval.");
      await loadEvents();
    } catch (e) {
      const msg =
        e.body && typeof e.body.detail === "string"
          ? e.body.detail
          : e.message || "Could not update event.";
      setError(msg);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id, title) {
    const ok =
      typeof window !== "undefined" &&
      window.confirm(
        `Delete “${title}”? This cannot be undone and removes all registrations.`
      );
    if (!ok) return;

    setBusyId(id);
    setToast("");
    setError("");
    try {
      await deleteEvent(id);
      setToast("Event deleted.");
      await loadEvents();
    } catch (e) {
      setError(e.message || "Delete failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <RequireAuth>
      <RequireAdmin>
        <div className={styles.shell}>
          <SidePanel />

          <main className={styles.main}>
            <SearchBar />

            <header className={styles.header}>
              <h1 className={styles.title}>Manage events</h1>
              <p className={styles.subtitle}>
                Events from every organizer except drafts (organizers keep those private until they
                submit). You can remove an event or send it back to the pending-approval queue for
                review.
              </p>
            </header>

            {error && (
              <p className={styles.bannerError} role="alert">
                {error}
              </p>
            )}
            {toast && (
              <p className={styles.bannerSuccess} role="status">
                {toast}
              </p>
            )}

            {loading && <p className={styles.loading}>Loading events…</p>}

            {!loading && !error && events.length === 0 && (
              <div className={styles.empty}>No events in the system.</div>
            )}

            {!loading && events.length > 0 && (
              <div className={styles.list}>
                {events.map((event) => (
                  <article key={event.id} className={styles.card}>
                    <div className={styles.cardTop}>
                      <div>
                        <h2 className={styles.eventTitle}>{event.title}</h2>
                        <p className={styles.meta}>
                          <strong>#{event.id}</strong>
                          {event.organizer_username
                            ? ` · Organizer: ${event.organizer_username}`
                            : ""}
                          {event.category?.name ? ` · ${event.category.name}` : ""}
                        </p>
                        <div className={styles.statusRow}>
                          <span
                            className={`${styles.statusPill} ${statusClass(event.status)}`}
                          >
                            {statusLabel(event.status)}
                          </span>
                        </div>
                        <p className={styles.meta}>{formatWhen(event.starts_at, event.ends_at)}</p>
                        <p className={styles.meta}>
                          {event.location?.trim()
                            ? event.location.trim()
                            : event.venue_type === "online"
                              ? "Online event"
                              : "—"}
                        </p>
                      </div>
                      <Link href={`/event?id=${event.id}`} className={styles.link}>
                        Open detail
                      </Link>
                    </div>

                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.btnPending}
                        disabled={busyId !== null || event.status === "pending_approval"}
                        onClick={() => handleMoveToPending(event.id)}
                      >
                        {busyId === event.id
                          ? "Working…"
                          : event.status === "pending_approval"
                            ? "Already pending"
                            : "Move to pending approval"}
                      </button>
                      <button
                        type="button"
                        className={styles.btnDelete}
                        disabled={busyId !== null}
                        onClick={() => handleDelete(event.id, event.title)}
                      >
                        {busyId === event.id ? "Working…" : "Delete event"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </main>
        </div>
      </RequireAdmin>
    </RequireAuth>
  );
}

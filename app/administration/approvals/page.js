"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SearchBar from "../../../components/SearchBar";
import SidePanel from "../../../components/SidePanel";
import RequireAuth from "../../components/RequireAuth";
import RequireAdmin from "../../components/RequireAdmin";
import {
  approveEvent,
  fetchAdminPendingEvents,
  rejectEvent,
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

export default function AdministrationApprovalsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loadPending = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchAdminPendingEvents();
      setEvents(Array.isArray(list) ? list : []);
    } catch (e) {
      setEvents([]);
      setError(e.message || "Could not load pending events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  async function handleApprove(id) {
    setBusyId(id);
    setToast("");
    setError("");
    try {
      await approveEvent(id);
      setToast("Event approved and published.");
      await loadPending();
    } catch (e) {
      setError(e.message || "Approve failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id) {
    setBusyId(id);
    setToast("");
    setError("");
    try {
      await rejectEvent(id);
      setToast("Event returned to draft for the organizer.");
      await loadPending();
    } catch (e) {
      setError(e.message || "Reject failed.");
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
              <h1 className={styles.title}>Pending approvals</h1>
              <p className={styles.subtitle}>
                Review events submitted for moderation. Approving publishes them; rejecting sends them
                back to draft so the organizer can revise.
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

            {loading && <p className={styles.loading}>Loading pending events…</p>}

            {!loading && !error && events.length === 0 && (
              <div className={styles.empty}>No events are waiting for approval.</div>
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
                        <p className={styles.meta}>{formatWhen(event.starts_at, event.ends_at)}</p>
                        <p className={styles.meta}>
                          {event.location?.trim()
                            ? event.location.trim()
                            : event.venue_type === "online"
                              ? "Online event"
                              : "—"}
                        </p>
                        {event.description?.trim() ? (
                          <p className={styles.meta}>{event.description.trim().slice(0, 280)}</p>
                        ) : null}
                      </div>
                      <Link href={`/event?id=${event.id}`} className={styles.link}>
                        Open detail
                      </Link>
                    </div>

                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.btnApprove}
                        disabled={busyId !== null}
                        onClick={() => handleApprove(event.id)}
                      >
                        {busyId === event.id ? "Working…" : "Approve & publish"}
                      </button>
                      <button
                        type="button"
                        className={styles.btnReject}
                        disabled={busyId !== null}
                        onClick={() => handleReject(event.id)}
                      >
                        {busyId === event.id ? "Working…" : "Reject (send to draft)"}
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

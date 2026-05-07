"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SearchBar from "../../components/SearchBar";
import SidePanel from "../../components/SidePanel";
import { deleteEvent, fetchCategories, fetchMyOrganizedEvents } from "../../lib/events";
import RequireAuth from "../components/RequireAuth";
import styles from "./page.module.css";

function formatScheduleLine(startsAt, endsAt) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";
  const datePart = start.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeFmt = { hour: "numeric", minute: "2-digit" };
  return `${datePart} · ${start.toLocaleString("en-US", timeFmt)} – ${end.toLocaleString(
    "en-US",
    timeFmt
  )}`;
}

function formatLocationSummary(event) {
  const loc = event.location?.trim();
  if (event.venue_type === "online") {
    return event.online_url?.trim() ? "Online event" : "Online";
  }
  if (event.venue_type === "hybrid") {
    return loc ? `${loc} · + online` : "Hybrid";
  }
  return loc || "—";
}

function statusLabel(status) {
  const map = {
    draft: "Draft",
    pending_approval: "Pending approval",
    published: "Published",
    cancelled: "Cancelled",
  };
  return map[status] ?? status;
}

function normalizeCategoryLabel(name) {
  return (name || "").trim().toLowerCase();
}

function isWithinDateRange(iso, startDate, endDate) {
  if (!startDate && !endDate) return true;
  const eventDate = new Date(iso);
  if (Number.isNaN(eventDate.getTime())) return false;

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`);
    if (eventDate < start) return false;
  }
  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999`);
    if (eventDate > end) return false;
  }
  return true;
}

export default function YourEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isForbidden, setIsForbidden] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [eventQuery, setEventQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [allCategories, setAllCategories] = useState([]);
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchMyOrganizedEvents()
      .then((list) => {
        if (!cancelled) {
          setEvents(Array.isArray(list) ? list : []);
          setIsForbidden(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setEvents([]);
          setIsForbidden(err.code === "FORBIDDEN");
          setError(err.message || "Could not load events.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((list) => {
        if (!cancelled) {
          setAllCategories(Array.isArray(list) ? list : []);
        }
      })
      .catch(() => {
        if (!cancelled) setAllCategories([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const publishedCount = events.filter((e) => e.status === "published").length;
    const draftReviewCount = events.filter((e) =>
      ["draft", "pending_approval"].includes(e.status)
    ).length;
    return {
      publishedCount,
      draftReviewCount,
      total: events.length,
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const eventTerm = eventQuery.trim().toLowerCase();
    const locationTerm = locationQuery.trim().toLowerCase();

    return events.filter((event) => {
      const title = event.title?.toLowerCase() ?? "";
      const description = event.description?.toLowerCase() ?? "";
      const categoryName = event.category?.name?.toLowerCase() ?? "";
      const location = event.location?.toLowerCase() ?? "";

      const matchesEvent =
        !eventTerm ||
        title.includes(eventTerm) ||
        description.includes(eventTerm) ||
        categoryName.includes(eventTerm);
      const matchesLocation = !locationTerm || location.includes(locationTerm);
      const matchesCategory =
        selectedCategory === "all" ||
        normalizeCategoryLabel(event.category?.name) === selectedCategory;
      const matchesDate = isWithinDateRange(event.starts_at, dateRangeStart, dateRangeEnd);

      return matchesEvent && matchesLocation && matchesCategory && matchesDate;
    });
  }, [events, eventQuery, locationQuery, selectedCategory, dateRangeStart, dateRangeEnd]);

  const categoryFilters = useMemo(() => {
    const seen = new Set();
    const unique = allCategories
      .map((category) => category?.name?.trim() || "")
      .filter((name) => {
        const key = normalizeCategoryLabel(name);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((name) => ({
        value: normalizeCategoryLabel(name),
        label: name,
      }));

    return [
      { value: "all", label: "All" },
      ...unique,
    ];
  }, [allCategories]);

  function handleDateRangeChange(start, end) {
    setDateRangeStart(start);
    setDateRangeEnd(end);
  }

  const statusTone = {
    published: styles.published,
    draft: styles.draft,
    pending_approval: styles.pending,
    cancelled: styles.cancelled,
  };

  async function handleDelete(event) {
    setError("");
    const ok = window.confirm(
      `Delete "${event.title}"? This cannot be undone.`
    );
    if (!ok) return;
    try {
      setDeletingId(event.id);
      await deleteEvent(event.id);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
    } catch (err) {
      setError(err.message || "Could not delete event.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <RequireAuth>
      <div className={styles.yourEventsLayout}>
        <SidePanel />

        <main className={styles.content}>
          <SearchBar
            eventPlaceholder="Search your events..."
            locationPlaceholder="Search by location..."
            onEventSearchChange={setEventQuery}
            onLocationSearchChange={setLocationQuery}
            eventSearchValue={eventQuery}
            locationSearchValue={locationQuery}
            categoryFilters={categoryFilters}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            dateRangeStart={dateRangeStart}
            dateRangeEnd={dateRangeEnd}
            onDateRangeChange={handleDateRangeChange}
          />

          <section className={styles.headerSection}>
            <h1 className={styles.title}>Your Events</h1>
            <p className={styles.subtitle}>
              Events you create and manage as this account (organizers and admins).
            </p>
          </section>

          {error && (
            <p className={styles.bannerError} role="alert">
              {error}{" "}
              {isForbidden ? (
                <Link href="/settings" className={styles.inlineLink}>
                  Switch account type in settings
                </Link>
              ) : null}
            </p>
          )}

          {loading && <p className={styles.loadingLine}>Loading your events…</p>}

          {!loading && !error && (
            <section className={styles.statGrid}>
              <article className={styles.statCard}>
                <p className={styles.statLabel}>Published</p>
                <p className={styles.statValue}>{stats.publishedCount}</p>
              </article>
              <article className={styles.statCard}>
                <p className={styles.statLabel}>Draft or pending review</p>
                <p className={styles.statValue}>{stats.draftReviewCount}</p>
              </article>
              <article className={styles.statCard}>
                <p className={styles.statLabel}>Total events</p>
                <p className={styles.statValue}>{stats.total}</p>
              </article>
            </section>
          )}

          {!loading && !error && events.length === 0 && (
            <p className={styles.emptyState}>
              You have not created any events yet.{" "}
              <Link href="/create-event" className={styles.inlineLink}>
                Create an event
              </Link>
            </p>
          )}

          {!loading && !error && events.length > 0 && filteredEvents.length === 0 && (
            <p className={styles.emptyState}>No events match your current search.</p>
          )}

          {!loading && !error && filteredEvents.length > 0 && (
            <section className={styles.listSection}>
              <div className={styles.listHeader}>
                <h2 className={styles.listTitle}>Event library</h2>
                <Link href="/create-event" className={styles.createLink}>
                  + New event
                </Link>
              </div>

              <div className={styles.eventList}>
                {filteredEvents.map((event) => (
                  <article key={event.id} className={styles.eventCard}>
                    <div className={styles.eventTopRow}>
                      <h3 className={styles.eventTitle}>{event.title}</h3>
                      <span
                        className={`${styles.statusPill} ${
                          statusTone[event.status] ?? styles.draft
                        }`}
                      >
                        {statusLabel(event.status)}
                      </span>
                    </div>
                    <p className={styles.metaLine}>{formatLocationSummary(event)}</p>
                    <p className={styles.metaLine}>
                      {formatScheduleLine(event.starts_at, event.ends_at)}
                    </p>
                    {event.category?.name ? (
                      <p className={styles.metaLine}>Category · {event.category.name}</p>
                    ) : null}
                    <p className={styles.metaLine}>
                      {event.capacity == null
                        ? "No capacity limit set"
                        : `Capacity · ${event.capacity}`}
                    </p>

                    <div className={styles.actions}>
                      <Link href={`/event?id=${event.id}`} className={styles.primaryLink}>
                        View
                      </Link>
                      <Link href={`/edit-event?id=${event.id}`} className={styles.secondaryLink}>
                        Edit
                      </Link>
                      <Link
                        href={`/manage-attendees?event=${event.id}`}
                        className={styles.secondaryLink}
                      >
                        Registrations
                      </Link>
                      <button
                        type="button"
                        className={styles.secondaryLink}
                        onClick={() => handleDelete(event)}
                        disabled={deletingId === event.id}
                      >
                        {deletingId === event.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </RequireAuth>
  );
}

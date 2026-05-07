"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { getStoredUser } from "../../lib/auth";
import { fetchEvent, registerForEvent, unregisterFromEvent } from "../../lib/events";
import { geocodeAddress } from "../../lib/geocoding";
import { buildGoogleCalendarUrl } from "../../lib/googleCalendar";
import styles from "./page.module.css";

const EventMap = dynamic(() => import("./EventMap.jsx"), { ssr: false });

const STATUS_BADGE = {
  published: styles.badgePublished,
  draft: styles.badgeDraft,
  pending_approval: styles.badgePending,
  cancelled: styles.badgeCancelled,
};

function formatStatus(status) {
  if (!status) return "";
  const labels = {
    draft: "Draft",
    published: "Published",
    pending_approval: "Pending approval",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status;
}

function formatDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatCapacity(capacity) {
  if (capacity == null) return "No limit set";
  return String(capacity);
}

function organizerSummary(event) {
  const id = event.organizer_id ?? event.organizer;
  const name =
    event.organizer_username ??
    (typeof event.organizer === "object" && event.organizer?.username
      ? event.organizer.username
      : null);
  if (name != null) return name;
  if (id != null) return `User #${id}`;
  return "—";
}

export default function EventDetailClient({ eventId }) {
  const searchParams = useSearchParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registerBusy, setRegisterBusy] = useState(false);
  const [user, setUser] = useState(null);
  const [resolvedCoords, setResolvedCoords] = useState(null);
  const currentEventId =
    searchParams?.get("id") ?? (eventId == null ? null : String(eventId));

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    // Work around App Router/history edge cases where query-param navigation can
    // leave this page in a stale "loading" state after back/forward.
    function handleHistoryNavigation() {
      window.location.reload();
    }

    window.addEventListener("popstate", handleHistoryNavigation);
    return () => {
      window.removeEventListener("popstate", handleHistoryNavigation);
    };
  }, []);

  const load = useCallback(async () => {
    if (!currentEventId || Number.isNaN(Number(currentEventId))) {
      setEvent(null);
      setLoading(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    setLoading(true);
    setError("");
    try {
      const data = await fetchEvent(currentEventId, { signal: controller.signal });
      setEvent(data);
    } catch (e) {
      if (e?.name === "AbortError") {
        setError("Loading timed out. Please retry.");
        setEvent(null);
        return;
      }
      setEvent(null);
      setError(e.message || "Could not load event.");
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [currentEventId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const hasLatitude =
      event?.latitude !== null &&
      event?.latitude !== undefined &&
      event?.latitude !== "" &&
      Number.isFinite(Number(event?.latitude));
    const hasLongitude =
      event?.longitude !== null &&
      event?.longitude !== undefined &&
      event?.longitude !== "" &&
      Number.isFinite(Number(event?.longitude));
    const canUseAddressFallback =
      event &&
      (event.venue_type === "in_person" || event.venue_type === "hybrid") &&
      !hasLatitude &&
      !hasLongitude &&
      typeof event.location === "string" &&
      event.location.trim().length >= 3;
    if (!canUseAddressFallback) {
      setResolvedCoords(null);
      return;
    }

    let cancelled = false;
    geocodeAddress(event.location.trim())
      .then((bestMatch) => {
        if (!cancelled) {
          setResolvedCoords(
            bestMatch
              ? { latitude: bestMatch.latitude, longitude: bestMatch.longitude }
              : null
          );
        }
      })
      .catch(() => {
        if (!cancelled) setResolvedCoords(null);
      });
    return () => {
      cancelled = true;
    };
  }, [event]);

  async function handleRegister() {
    if (!event) return;
    setRegisterError("");
    setRegisterBusy(true);
    try {
      const updated = await registerForEvent(event.id);
      setEvent(updated);
    } catch (e) {
      setRegisterError(e.message || "Registration failed.");
    } finally {
      setRegisterBusy(false);
    }
  }

  async function handleUnregister() {
    if (!event) return;
    setRegisterError("");
    setRegisterBusy(true);
    try {
      await unregisterFromEvent(event.id);
      await load();
    } catch (e) {
      setRegisterError(e.message || "Could not unregister.");
    } finally {
      setRegisterBusy(false);
    }
  }

  const missingId = !currentEventId || Number.isNaN(Number(currentEventId));

  if (missingId) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <Link href="/dashboard" className={styles.back}>
            ← Back to dashboard
          </Link>
          <div className={styles.notFound}>
            <h1>Choose an event</h1>
            <p>
              Open an event from the dashboard or upcoming list (for example{" "}
              <Link href="/dashboard">Browse upcoming events</Link>).
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <Link href="/dashboard" className={styles.back}>
            ← Back to dashboard
          </Link>
          <p className={styles.loadingText}>Loading event…</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <Link href="/dashboard" className={styles.back}>
            ← Back to dashboard
          </Link>
          <div className={styles.notFound}>
            <h1>Event not found</h1>
            <p>{error || "No event matches that id."}</p>
            <Link href="/dashboard" className={styles.back}>
              ← Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const badgeClass = STATUS_BADGE[event.status] ?? styles.badgeDraft;
  const desc = event.description?.trim();
  const onlineUrl = event.online_url?.trim() || "";
  const categoryName =
    event.category && typeof event.category === "object" && typeof event.category.name === "string"
      ? event.category.name.trim()
      : "";
  const isAttendee = String(user?.role || "").toLowerCase() === "attendee";
  const isOrganizer = Boolean(user && Number(user.id) === Number(event.organizer_id));
  const isPublished = event.status === "published";
  const atCapacity =
    event.spots_remaining !== null &&
    event.spots_remaining !== undefined &&
    event.spots_remaining <= 0 &&
    !event.user_has_rsvp;

  const latitude =
    event.latitude == null || event.latitude === ""
      ? resolvedCoords?.latitude ?? null
      : Number(event.latitude);
  const longitude =
    event.longitude == null || event.longitude === ""
      ? resolvedCoords?.longitude ?? null
      : Number(event.longitude);
  const canShowMap =
    (event.venue_type === "in_person" || event.venue_type === "hybrid") &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);
  const googleMapsUrl = canShowMap
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : null;

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <Link href="/dashboard" className={styles.back}>
          ← Back to dashboard
        </Link>

        <header className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.statusRow}>
              {!isAttendee ? (
                <span className={`${styles.badge} ${badgeClass}`}>
                  {formatStatus(event.status)}
                </span>
              ) : null}
              {categoryName ? (
                <span className={styles.categoryBadge}>{categoryName}</span>
              ) : null}
              {!isAttendee ? <span className={styles.eventId}>Event id · {event.id}</span> : null}
            </div>
            <h1 className={styles.title}>{event.title}</h1>
          </div>
        </header>

        <section className={styles.rsvpCard} aria-label="Register or unregister">
          <p className={styles.sectionLabel}>Attend</p>
          {registerError ? <p className={styles.errorText}>{registerError}</p> : null}

          {!user ? (
            <p className={styles.rsvpBody}>
              <Link href="/login" className={styles.inlineLink}>
                Sign in
              </Link>{" "}
              to register. Published events you join appear on{" "}
              <Link href="/calender" className={styles.inlineLink}>
                Your Calendar
              </Link>
              .
            </p>
          ) : null}

          {user && isOrganizer ? (
            <p className={styles.rsvpMuted}>You’re organizing this event.</p>
          ) : null}

          {user && !isOrganizer && isPublished && event.user_has_rsvp ? (
            <div className={styles.rsvpActions}>
              <p className={styles.rsvpSuccess}>You’re registered.</p>
              <div className={styles.rsvpButtonRow}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={registerBusy}
                  onClick={handleUnregister}
                >
                  {registerBusy ? "Updating…" : "Unregister"}
                </button>
                <Link href="/calender" className={styles.secondaryLink}>
                  View on Your Calendar
                </Link>
              </div>
            </div>
          ) : null}

          {user && !isOrganizer && isPublished && !event.user_has_rsvp ? (
            <div className={styles.rsvpActions}>
              {atCapacity ? (
                <p className={styles.rsvpMuted}>This event is at capacity.</p>
              ) : (
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={registerBusy}
                  onClick={handleRegister}
                >
                  {registerBusy ? "Saving…" : "Register"}
                </button>
              )}
              <p className={styles.rsvpHint}>
                After you register, this event is listed on{" "}
                <Link href="/calender" className={styles.inlineLink}>
                  Your Calendar
                </Link>
                .
              </p>
            </div>
          ) : null}

          {user && !isOrganizer && !isPublished ? (
            <p className={styles.rsvpMuted}>Registration opens when the event is published.</p>
          ) : null}

          {isPublished ? (
            <p className={styles.calendarAdd}>
              <button
                type="button"
                className={styles.textButton}
                onClick={() => {
                  window.open(
                    buildGoogleCalendarUrl(event),
                    "_blank",
                    "noopener,noreferrer"
                  );
                }}
              >
                Add to Google Calendar
              </button>
              <span className={styles.rsvpMutedInline}>
                {" "}
                (opens Google — no registration required)
              </span>
            </p>
          ) : null}
        </section>

        <section className={styles.detailCard} aria-label="Event details">
          <p className={styles.sectionLabel}>Details</p>
          <dl className={styles.dl}>
            {!isAttendee ? (
              <div>
                <dt className={styles.dt}>id</dt>
                <dd className={styles.dd}>{event.id}</dd>
              </div>
            ) : null}
            <div>
              <dt className={styles.dt}>organizer</dt>
              <dd className={styles.dd}>{organizerSummary(event)}</dd>
            </div>
            <div>
              <dt className={styles.dt}>category</dt>
              <dd className={styles.dd}>{categoryName || "—"}</dd>
            </div>
            <div>
              <dt className={styles.dt}>title</dt>
              <dd className={styles.dd}>{event.title}</dd>
            </div>
            <div>
              <dt className={styles.dt}>description</dt>
              {desc ? (
                <dd className={styles.ddBody}>{desc}</dd>
              ) : (
                <dd className={styles.ddMuted}>No description.</dd>
              )}
            </div>
            <div>
              <dt className={styles.dt}>location</dt>
              <dd className={styles.dd}>
                {event.location?.trim() ? event.location.trim() : "—"}
              </dd>
            </div>
            {onlineUrl ? (
              <div>
                <dt className={styles.dt}>online_url</dt>
                <dd className={styles.dd}>
                  <a
                    href={onlineUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.inlineLink}
                  >
                    {onlineUrl}
                  </a>
                </dd>
              </div>
            ) : null}
            <div>
              <dt className={styles.dt}>starts at</dt>
              <dd className={styles.dd}>{formatDateTime(event.starts_at)}</dd>
            </div>
            <div>
              <dt className={styles.dt}>ends at</dt>
              <dd className={styles.dd}>{formatDateTime(event.ends_at)}</dd>
            </div>
            {!isAttendee ? (
              <div>
                <dt className={styles.dt}>status</dt>
                <dd className={styles.dd}>{event.status}</dd>
              </div>
            ) : null}
            <div>
              <dt className={styles.dt}>capacity</dt>
              <dd className={styles.dd}>{formatCapacity(event.capacity)}</dd>
            </div>
            {"rsvp_count" in event ? (
              <div>
                <dt className={styles.dt}>Registrations</dt>
                <dd className={styles.dd}>{event.rsvp_count}</dd>
              </div>
            ) : null}
            <div>
              <dt className={styles.dt}>created at</dt>
              <dd className={styles.dd}>{formatDateTime(event.created_at)}</dd>
            </div>
            <div>
              <dt className={styles.dt}>updated at</dt>
              <dd className={styles.dd}>{formatDateTime(event.updated_at)}</dd>
            </div>
          </dl>
        </section>

        {canShowMap ? (
          <section className={styles.mapCard} aria-label="Event location map">
            <p className={styles.sectionLabel}>Location map</p>
            <div className={styles.mapWrap}>
              <EventMap
                latitude={latitude}
                longitude={longitude}
                locationLabel={event.location?.trim() ? event.location.trim() : null}
              />
            </div>
            {googleMapsUrl ? (
              <a
                className={styles.mapLink}
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open in Google Maps
              </a>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

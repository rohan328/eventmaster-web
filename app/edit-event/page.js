"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SearchBar from "../../components/SearchBar";
import SidePanel from "../../components/SidePanel";
import RequireAuth from "../components/RequireAuth";
import RequireOrganizer from "../components/RequireOrganizer";
import {
  fetchCategories,
  fetchEvent,
  mapApiErrorsToFormKeys,
  parseValidationErrors,
  updateEvent,
} from "../../lib/events";
import {
  formatCoordinateForApi,
  geocodeAddress,
  searchAddressSuggestions,
} from "../../lib/geocoding";
import DatetimeLocalInput from "../../components/DatetimeLocalInput";
import styles from "../create-event/page.module.css";

function newScheduleRow(seed) {
  return {
    key:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now() + Math.random()),
    title: seed?.title || "",
    startsAt: seed?.startsAt || "",
    endsAt: seed?.endsAt || "",
  };
}

function isoToLocalDatetime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function localDatetimeToIso(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function initialFormState() {
  return {
    title: "",
    categoryId: "",
    venueType: "in_person",
    location: "",
    onlineUrl: "",
    latitude: "",
    longitude: "",
    coverImage: "",
    startsAt: "",
    endsAt: "",
    status: "draft",
    capacity: "",
    description: "",
    isFree: true,
    price: "",
    currency: "USD",
  };
}

export default function EditEventPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("id");

  const [form, setForm] = useState(() => initialFormState());
  const [scheduleRows, setScheduleRows] = useState(() => []);
  const [categories, setCategories] = useState([]);
  const [categoriesLoadError, setCategoriesLoadError] = useState("");
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [savedSummary, setSavedSummary] = useState(null);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [locationLookupBusy, setLocationLookupBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((list) => {
        if (!cancelled) setCategories(list);
      })
      .catch(() => {
        if (!cancelled) {
          setCategoriesLoadError(
            "Categories could not be loaded. Refresh the page or try again."
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingEvent(true);
    setLoadError("");
    setSavedSummary(null);

    if (!eventId) {
      setLoadingEvent(false);
      setLoadError("Missing event id.");
      return;
    }

    fetchEvent(eventId)
      .then((evt) => {
        if (cancelled) return;
        setForm({
          title: evt.title || "",
          categoryId: evt.category?.id ? String(evt.category.id) : "",
          venueType: evt.venue_type || "in_person",
          location: evt.location || "",
          onlineUrl: evt.online_url || "",
          latitude: evt.latitude == null ? "" : String(evt.latitude),
          longitude: evt.longitude == null ? "" : String(evt.longitude),
          coverImage: evt.cover_image || "",
          startsAt: isoToLocalDatetime(evt.starts_at),
          endsAt: isoToLocalDatetime(evt.ends_at),
          status: evt.status || "draft",
          capacity: evt.capacity == null ? "" : String(evt.capacity),
          description: evt.description || "",
          isFree: Boolean(evt.is_free),
          price: evt.price == null ? "" : String(evt.price),
          currency: evt.currency || "USD",
        });

        const rows = Array.isArray(evt.schedule_items) ? evt.schedule_items : [];
        setScheduleRows(
          rows.map((row) =>
            newScheduleRow({
              title: row?.title || "",
              startsAt: isoToLocalDatetime(row?.starts_at),
              endsAt: isoToLocalDatetime(row?.ends_at),
            })
          )
        );
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || "Could not load event.");
      })
      .finally(() => {
        if (!cancelled) setLoadingEvent(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    const canLookup = form.venueType === "in_person" || form.venueType === "hybrid";
    const query = form.location.trim();
    if (!canLookup || query.length < 3) {
      setLocationSuggestions([]);
      setLocationLookupBusy(false);
      return;
    }

    const controller = new AbortController();
    setLocationLookupBusy(true);
    const timeoutId = setTimeout(async () => {
      try {
        const list = await searchAddressSuggestions(query, { signal: controller.signal, limit: 5 });
        setLocationSuggestions(list);
      } catch {
        setLocationSuggestions([]);
      } finally {
        setLocationLookupBusy(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [form.location, form.venueType]);

  function applyLocationSuggestion(suggestion) {
    const lat = formatCoordinateForApi(suggestion.latitude);
    const lng = formatCoordinateForApi(suggestion.longitude);
    updateField("location", suggestion.label);
    updateField("latitude", lat ?? "");
    updateField("longitude", lng ?? "");
    setLocationSuggestions([]);
  }

  function updateField(field, value) {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setGeneralError("");
    setSavedSummary(null);
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateScheduleRow(index, key, value) {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.schedule_items;
      return next;
    });
    setScheduleRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  }

  function addScheduleRow() {
    setScheduleRows((rows) => [...rows, newScheduleRow()]);
  }

  function removeScheduleRow(index) {
    setScheduleRows((rows) => rows.filter((_, i) => i !== index));
  }

  function buildPayload() {
    const capacityRaw = form.capacity.trim();
    const capacity = capacityRaw === "" ? null : Number.parseInt(capacityRaw, 10);
    const latRaw = form.latitude.trim();
    const lngRaw = form.longitude.trim();
    let latitude = null;
    let longitude = null;
    if (latRaw !== "" && lngRaw !== "") {
      latitude = formatCoordinateForApi(latRaw) ?? latRaw;
      longitude = formatCoordinateForApi(lngRaw) ?? lngRaw;
    }

    const schedule_items = scheduleRows
      .map((row) => {
        const starts_at = localDatetimeToIso(row.startsAt);
        const ends_at = localDatetimeToIso(row.endsAt);
        const title = row.title.trim();
        if (!title && !starts_at && !ends_at) return null;
        return { title, starts_at, ends_at };
      })
      .filter(Boolean)
      .filter((row) => row.starts_at && row.ends_at && row.title);

    return {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.categoryId ? Number.parseInt(form.categoryId, 10) : null,
      venue_type: form.venueType,
      location: form.location.trim(),
      online_url: form.onlineUrl.trim(),
      latitude,
      longitude,
      cover_image: form.coverImage.trim(),
      starts_at: localDatetimeToIso(form.startsAt),
      ends_at: localDatetimeToIso(form.endsAt),
      status: form.status,
      capacity: Number.isFinite(capacity) ? capacity : null,
      is_free: form.isFree,
      price: form.isFree || form.price.trim() === "" ? null : form.price.trim(),
      currency: form.currency,
      schedule_items,
    };
  }

  async function handleUpdate(event) {
    event.preventDefault();
    setSaveState("saving");
    setFieldErrors({});
    setGeneralError("");
    setSavedSummary(null);

    const payload = buildPayload();
    if (
      (payload.venue_type === "in_person" || payload.venue_type === "hybrid") &&
      payload.location &&
      (payload.latitude == null || payload.longitude == null)
    ) {
      const bestMatch = await geocodeAddress(payload.location).catch(() => null);
      if (bestMatch) {
        const lat = formatCoordinateForApi(bestMatch.latitude);
        const lng = formatCoordinateForApi(bestMatch.longitude);
        payload.latitude = lat;
        payload.longitude = lng;
        setForm((current) => ({
          ...current,
          latitude: lat ?? "",
          longitude: lng ?? "",
        }));
      }
    }

    try {
      const updated = await updateEvent(eventId, payload);
      setSaveState("saved");
      setSavedSummary({
        id: updated.id,
        title: updated.title,
        status: updated.status,
      });
    } catch (err) {
      setSaveState("idle");
      if (err.body) {
        const { fieldErrors: raw, general } = parseValidationErrors(err.body);
        setFieldErrors(mapApiErrorsToFormKeys(raw));
        setGeneralError(general || "");
      } else {
        setGeneralError(err.message || "Could not update event.");
      }
    }
  }

  const locationRequired = form.venueType === "in_person" || form.venueType === "hybrid";
  const onlineRequired = form.venueType === "online" || form.venueType === "hybrid";

  const pageTitle = useMemo(() => {
    if (loadingEvent) return "Edit event";
    return form.title?.trim() ? `Edit: ${form.title}` : "Edit event";
  }, [loadingEvent, form.title]);

  return (
    <RequireAuth>
      <RequireOrganizer>
        <div className={styles.createEventLayout}>
          <SidePanel />

          <main className={styles.content}>
            <SearchBar eventPlaceholder="Search your events..." locationPlaceholder="Search event venues..." />

            <section className={styles.headerSection}>
              <h1 className={styles.title}>{pageTitle}</h1>
              <p className={styles.subtitle}>
                Update your event details, schedule, and visibility.
              </p>
            </section>

            {categoriesLoadError && (
              <p className={styles.bannerError} role="alert">
                {categoriesLoadError}
              </p>
            )}
            {loadError && (
              <p className={styles.bannerError} role="alert">
                {loadError}{" "}
                <Link href="/your-events" className={styles.inlineLink}>
                  Back to your events
                </Link>
              </p>
            )}
            {generalError && (
              <p className={styles.bannerError} role="alert">
                {generalError}
              </p>
            )}
            {savedSummary && (
              <p className={styles.bannerSuccess} role="status">
                Event <strong>{savedSummary.title}</strong> ({savedSummary.status}) was updated.{" "}
                <Link href="/your-events" className={styles.inlineLink}>
                  Back to your events
                </Link>
              </p>
            )}

            {loadingEvent ? (
              <p>Loading event…</p>
            ) : (
              <form className={styles.form} onSubmit={handleUpdate}>
                <article className={styles.card}>
                  <h2 className={styles.cardTitle}>Basics &amp; discovery</h2>
                  <p className={styles.cardDescription}>
                    Title, category, and listing image help attendees find your event.
                  </p>

                  <div className={styles.gridTwo}>
                    <label className={styles.field}>
                      <span>Event title</span>
                      <input
                        value={form.title}
                        onChange={(e) => updateField("title", e.target.value)}
                        placeholder="Startup Seminar & Technical Convention 2026"
                        required
                        aria-invalid={Boolean(fieldErrors.title)}
                      />
                      {fieldErrors.title && (
                        <span className={styles.fieldError}>{fieldErrors.title}</span>
                      )}
                    </label>

                    <label className={styles.field}>
                      <span>Category</span>
                      <select
                        value={form.categoryId}
                        onChange={(e) => updateField("categoryId", e.target.value)}
                        required
                        disabled={categories.length === 0}
                        aria-invalid={Boolean(fieldErrors.categoryId)}
                      >
                        <option value="">Select a category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.categoryId && (
                        <span className={styles.fieldError}>{fieldErrors.categoryId}</span>
                      )}
                    </label>

                    <label className={`${styles.field} ${styles.gridFull}`}>
                      <span>Cover image URL</span>
                      <input
                        type="url"
                        value={form.coverImage}
                        onChange={(e) => updateField("coverImage", e.target.value)}
                        placeholder="https://example.com/banner.jpg"
                        aria-invalid={Boolean(fieldErrors.coverImage)}
                      />
                      {fieldErrors.coverImage && (
                        <span className={styles.fieldError}>{fieldErrors.coverImage}</span>
                      )}
                    </label>
                  </div>
                </article>

                <article className={styles.card}>
                  <h2 className={styles.cardTitle}>Venue &amp; map</h2>
                  <p className={styles.cardDescription}>
                    In-person and hybrid events need an address; online events need a link. Optional coordinates power map pins.
                  </p>

                  <div className={styles.gridTwo}>
                    <label className={styles.field}>
                      <span>Format</span>
                      <select
                        value={form.venueType}
                        onChange={(e) => updateField("venueType", e.target.value)}
                      >
                        <option value="in_person">In person</option>
                        <option value="online">Online</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </label>

                    <label className={styles.field}>
                      <span>Physical location</span>
                      <input
                        value={form.location}
                        onChange={(e) => updateField("location", e.target.value)}
                        placeholder="San Mateo, CA or full address"
                        required={locationRequired}
                        aria-invalid={Boolean(fieldErrors.location)}
                      />
                      {fieldErrors.location && (
                        <span className={styles.fieldError}>{fieldErrors.location}</span>
                      )}
                      {locationLookupBusy ? (
                        <span className={styles.locationHint}>Searching addresses…</span>
                      ) : null}
                      {locationSuggestions.length > 0 ? (
                        <div className={styles.locationSuggestions}>
                          {locationSuggestions.map((item) => (
                            <button
                              key={`${item.latitude}-${item.longitude}-${item.label}`}
                              type="button"
                              className={styles.locationSuggestionButton}
                              onClick={() => applyLocationSuggestion(item)}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </label>

                    <label className={styles.field}>
                      <span>Online URL</span>
                      <input
                        type="url"
                        value={form.onlineUrl}
                        onChange={(e) => updateField("onlineUrl", e.target.value)}
                        placeholder="https://zoom.us/j/… or stream URL"
                        required={onlineRequired}
                        aria-invalid={Boolean(fieldErrors.onlineUrl)}
                      />
                      {fieldErrors.onlineUrl && (
                        <span className={styles.fieldError}>{fieldErrors.onlineUrl}</span>
                      )}
                    </label>

                    <label className={styles.field}>
                      <span>Latitude (optional)</span>
                      <input
                        inputMode="decimal"
                        value={form.latitude}
                        onChange={(e) => updateField("latitude", e.target.value)}
                        placeholder="37.4419"
                        aria-invalid={Boolean(fieldErrors.latitude)}
                      />
                      {fieldErrors.latitude && (
                        <span className={styles.fieldError}>{fieldErrors.latitude}</span>
                      )}
                    </label>

                    <label className={styles.field}>
                      <span>Longitude (optional)</span>
                      <input
                        inputMode="decimal"
                        value={form.longitude}
                        onChange={(e) => updateField("longitude", e.target.value)}
                        placeholder="-122.1430"
                        aria-invalid={Boolean(fieldErrors.longitude)}
                      />
                      {fieldErrors.longitude && (
                        <span className={styles.fieldError}>{fieldErrors.longitude}</span>
                      )}
                    </label>
                  </div>
                </article>

                <article className={styles.card}>
                  <h2 className={styles.cardTitle}>Schedule</h2>
                  <p className={styles.cardDescription}>
                    Main start and end define the event window. Add optional agenda rows for sessions or segments.
                  </p>

                  <div className={styles.gridTwo}>
                    <label className={styles.field}>
                      <span>Start</span>
                      <DatetimeLocalInput
                        value={form.startsAt}
                        onChange={(e) => updateField("startsAt", e.target.value)}
                        required
                        aria-invalid={Boolean(fieldErrors.startsAt)}
                      />
                      {fieldErrors.startsAt && (
                        <span className={styles.fieldError}>{fieldErrors.startsAt}</span>
                      )}
                    </label>
                    <label className={styles.field}>
                      <span>End</span>
                      <DatetimeLocalInput
                        value={form.endsAt}
                        onChange={(e) => updateField("endsAt", e.target.value)}
                        required
                        aria-invalid={Boolean(fieldErrors.endsAt)}
                      />
                      {fieldErrors.endsAt && (
                        <span className={styles.fieldError}>{fieldErrors.endsAt}</span>
                      )}
                    </label>
                  </div>

                  {fieldErrors.schedule_items && (
                    <p className={styles.bannerError}>{fieldErrors.schedule_items}</p>
                  )}

                  <div className={styles.scheduleSection}>
                    <div className={styles.scheduleHeader}>
                      <span className={styles.scheduleTitle}>Agenda (optional)</span>
                      <button
                        type="button"
                        className={styles.addSlotButton}
                        onClick={addScheduleRow}
                      >
                        + Add slot
                      </button>
                    </div>
                    {scheduleRows.length === 0 && (
                      <p className={styles.scheduleHint}>
                        No agenda rows yet. Use “Add slot” for multi-part programs.
                      </p>
                    )}
                    {scheduleRows.map((row, index) => (
                      <div key={row.key} className={styles.scheduleRow}>
                        <label className={styles.field}>
                          <span>Session title</span>
                          <input
                            value={row.title}
                            onChange={(e) =>
                              updateScheduleRow(index, "title", e.target.value)
                            }
                            placeholder="Keynote"
                          />
                        </label>
                        <label className={styles.field}>
                          <span>Starts</span>
                          <DatetimeLocalInput
                            value={row.startsAt}
                            onChange={(e) =>
                              updateScheduleRow(index, "startsAt", e.target.value)
                            }
                          />
                        </label>
                        <label className={styles.field}>
                          <span>Ends</span>
                          <DatetimeLocalInput
                            value={row.endsAt}
                            onChange={(e) =>
                              updateScheduleRow(index, "endsAt", e.target.value)
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className={styles.removeSlotButton}
                          onClick={() => removeScheduleRow(index)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </article>

                <article className={styles.card}>
                  <h2 className={styles.cardTitle}>Capacity, visibility &amp; ticketing</h2>
                  <p className={styles.cardDescription}>
                    Capacity limits attendance. Ticketing supports free events or mock paid pricing for demos.
                  </p>

                  <div className={styles.gridTwo}>
                    <label className={styles.field}>
                      <span>Capacity</span>
                      <input
                        type="number"
                        min="1"
                        value={form.capacity}
                        onChange={(e) => updateField("capacity", e.target.value)}
                        placeholder="Leave blank for no limit"
                        aria-invalid={Boolean(fieldErrors.capacity)}
                      />
                      {fieldErrors.capacity && (
                        <span className={styles.fieldError}>{fieldErrors.capacity}</span>
                      )}
                    </label>

                    <label className={styles.field}>
                      <span>Visibility / moderation</span>
                      <select
                        value={form.status}
                        onChange={(e) => updateField("status", e.target.value)}
                        aria-invalid={Boolean(fieldErrors.status)}
                      >
                        <option value="draft">Draft (only you)</option>
                        <option value="pending_approval">Pending approval (admin review)</option>
                        <option value="published">Published</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      {fieldErrors.status && (
                        <span className={styles.fieldError}>{fieldErrors.status}</span>
                      )}
                    </label>

                    <label className={`${styles.checkboxField} ${styles.gridFull}`}>
                      <input
                        type="checkbox"
                        checked={form.isFree}
                        onChange={(e) => updateField("isFree", e.target.checked)}
                      />
                      <span>This is a free event</span>
                    </label>

                    {!form.isFree && (
                      <>
                        <label className={styles.field}>
                          <span>Price ({form.currency})</span>
                          <input
                            inputMode="decimal"
                            value={form.price}
                            onChange={(e) => updateField("price", e.target.value)}
                            placeholder="25.00"
                            aria-invalid={Boolean(fieldErrors.price)}
                          />
                          {fieldErrors.price && (
                            <span className={styles.fieldError}>{fieldErrors.price}</span>
                          )}
                        </label>
                        <label className={styles.field}>
                          <span>Currency</span>
                          <select
                            value={form.currency}
                            onChange={(e) => updateField("currency", e.target.value)}
                          >
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                          </select>
                        </label>
                      </>
                    )}
                  </div>
                </article>

                <article className={styles.card}>
                  <h2 className={styles.cardTitle}>Description</h2>
                  <p className={styles.cardDescription}>
                    Full detail for the event page — agenda highlights, speakers, and expectations.
                  </p>

                  <label className={styles.field}>
                    <span>Description</span>
                    <textarea
                      value={form.description}
                      onChange={(e) => updateField("description", e.target.value)}
                      placeholder="Tell people what makes this event worth attending."
                      rows={6}
                      aria-invalid={Boolean(fieldErrors.description)}
                    />
                    {fieldErrors.description && (
                      <span className={styles.fieldError}>{fieldErrors.description}</span>
                    )}
                  </label>
                </article>

                <div className={styles.actions}>
                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={saveState === "saving"}
                  >
                    {saveState === "saving" ? "Saving…" : "Save changes"}
                  </button>
                  {savedSummary && (
                    <Link href={`/event?id=${savedSummary.id}`} className={styles.inlineLink}>
                      View event
                    </Link>
                  )}
                </div>
              </form>
            )}
          </main>
        </div>
      </RequireOrganizer>
    </RequireAuth>
  );
}


"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import EventCard from "../../components/EventCard";
import SearchBar from "../../components/SearchBar";
import SkeletonCard from "../../components/SkeletonCard";
import SidePanel from "../../components/SidePanel";
import { fetchCategories, fetchUpcomingEvents } from "../../lib/events";
import RequireAuth from "../components/RequireAuth";
import styles from "./page.module.css";

const RECOMMENDED_DISPLAY_LIMIT = 4;
const UPCOMING_DISPLAY_LIMIT = 8;
const SKELETON_PLACEHOLDERS = 8;

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

export default function DashboardPage() {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [upcomingError, setUpcomingError] = useState("");
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [eventQuery, setEventQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [allCategories, setAllCategories] = useState([]);
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");

  useEffect(() => {
    let cancelled = false;
    setUpcomingLoading(true);
    setUpcomingError("");
    fetchUpcomingEvents()
      .then((list) => {
        if (cancelled) return;
        const arr = Array.isArray(list) ? list : [];
        setUpcomingEvents(arr);
      })
      .catch(() => {
        if (!cancelled) {
          setUpcomingError("Could not load upcoming events.");
          setUpcomingEvents([]);
        }
      })
      .finally(() => {
        if (!cancelled) setUpcomingLoading(false);
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

  const filteredUpcomingEvents = useMemo(() => {
    const eventTerm = eventQuery.trim().toLowerCase();
    const locationTerm = locationQuery.trim().toLowerCase();

    return upcomingEvents.filter((event) => {
      const title = event.title?.toLowerCase() ?? "";
      const description = event.description?.toLowerCase() ?? "";
      const location = event.location?.toLowerCase() ?? "";
      const categoryName = event.category?.name?.toLowerCase() ?? "";

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
  }, [upcomingEvents, eventQuery, locationQuery, selectedCategory, dateRangeStart, dateRangeEnd]);

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

  const visibleUpcomingEvents = useMemo(() => {
    if (showAllUpcoming) return filteredUpcomingEvents;
    return filteredUpcomingEvents.slice(0, UPCOMING_DISPLAY_LIMIT);
  }, [filteredUpcomingEvents, showAllUpcoming]);

  function handleDateRangeChange(start, end) {
    setDateRangeStart(start);
    setDateRangeEnd(end);
  }

  return (
    <RequireAuth>
      <div className={styles.dashboardLayout}>
        <SidePanel />

        <main className={styles.content}>
          <SearchBar
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

          <section>
            <h1 className={styles.sectionTitle}>Recommended Events</h1>
            <div className={styles.recommendedGrid}>
              {upcomingLoading &&
                Array.from({ length: RECOMMENDED_DISPLAY_LIMIT }).map((_, index) => (
                  <SkeletonCard key={`rec-sk-${index}`} />
                ))}

              {!upcomingLoading &&
                filteredUpcomingEvents
                  .slice(0, RECOMMENDED_DISPLAY_LIMIT)
                  .map((event) => (
                  <Link
                    key={event.id}
                    href={`/event?id=${event.id}`}
                    className={styles.eventCardLink}
                  >
                    <EventCard event={event} />
                  </Link>
                ))}

              {!upcomingLoading &&
                filteredUpcomingEvents.length === 0 &&
                !upcomingError && (
                <p className={styles.upcomingInlineMessage}>
                  No events match your current search.
                </p>
              )}
            </div>
          </section>

          <section className={styles.upcomingSection}>
            <div className={styles.upcomingHeader}>
              <h2 className={styles.sectionTitle}>Upcoming Events</h2>
              {filteredUpcomingEvents.length > UPCOMING_DISPLAY_LIMIT ? (
                <button
                  type="button"
                  className={styles.viewAllButton}
                  onClick={() => setShowAllUpcoming((current) => !current)}
                >
                  {showAllUpcoming ? "View Less" : "View All"}
                </button>
              ) : null}
            </div>

            {upcomingError && (
              <p className={styles.upcomingInlineMessage} role="alert">
                {upcomingError}
              </p>
            )}

            <div className={styles.upcomingGrid}>
              {upcomingLoading &&
                Array.from({ length: SKELETON_PLACEHOLDERS }).map((_, index) => (
                  <SkeletonCard key={`sk-${index}`} />
                ))}

              {!upcomingLoading &&
                !upcomingError &&
                filteredUpcomingEvents.length === 0 && (
                  <p className={styles.upcomingInlineMessage}>
                    No events match your current search.
                  </p>
                )}

              {!upcomingLoading &&
                visibleUpcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/event?id=${event.id}`}
                    className={styles.eventCardLink}
                  >
                    <EventCard event={event} />
                  </Link>
                ))}
            </div>
          </section>
        </main>
      </div>
    </RequireAuth>
  );
}

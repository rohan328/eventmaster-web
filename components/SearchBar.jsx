"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuthTokens, getStoredUser } from "../lib/auth";
import styles from "./SearchBar.module.css";

export default function SearchBar({
  eventPlaceholder = "Search an event...",
  locationPlaceholder = "Search a location...",
  eventValue,
  onEventChange,
  locationValue,
  onLocationChange,
  profileLabel = "johnnyapples@gmail.com",
  onSignOut,
  eventSearchValue = "",
  locationSearchValue = "",
  onEventSearchChange,
  onLocationSearchChange,
  categoryFilters = [],
  selectedCategory = "all",
  onCategoryChange,
  dateRangeStart = "",
  dateRangeEnd = "",
  onDateRangeChange,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [draftDateStart, setDraftDateStart] = useState(dateRangeStart);
  const [draftDateEnd, setDraftDateEnd] = useState(dateRangeEnd);
  const [currentProfileLabel, setCurrentProfileLabel] = useState(profileLabel);
  const dropdownRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    function handleOutsideClick(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    setDraftDateStart(dateRangeStart);
    setDraftDateEnd(dateRangeEnd);
  }, [dateRangeStart, dateRangeEnd]);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) return;
    setCurrentProfileLabel(user.email || user.username || profileLabel);
  }, [profileLabel]);

  async function handleSignOut() {
    setIsMenuOpen(false);

    try {
      clearAuthTokens();
      if (onSignOut) {
        await onSignOut();
      }
    } catch (error) {
      console.error("Sign out handler failed:", error);
    } finally {
      router.replace("/login");
    }
  }

  function handleAccountSettings() {
    setIsMenuOpen(false);
    router.push("/settings");
  }

  function handleEventInputChange(event) {
    const value = event.target.value;
    if (typeof onEventSearchChange === "function") {
      onEventSearchChange(value);
      return;
    }
    onEventChange?.(value);
  }

  function handleLocationInputChange(event) {
    const value = event.target.value;
    if (typeof onLocationSearchChange === "function") {
      onLocationSearchChange(value);
      return;
    }
    onLocationChange?.(value);
  }

  function handleDateStartChange(event) {
    setDraftDateStart(event.target.value);
  }

  function handleDateEndChange(event) {
    setDraftDateEnd(event.target.value);
  }

  function clearDateRange() {
    onDateRangeChange?.("", "");
  }

  function applyDateRange() {
    onDateRangeChange?.(draftDateStart, draftDateEnd);
    setIsDateModalOpen(false);
  }

  function closeDateModal() {
    setDraftDateStart(dateRangeStart);
    setDraftDateEnd(dateRangeEnd);
    setIsDateModalOpen(false);
  }

  function formatShortDate(value) {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getMonth() + 1}/${date.getDate()}/${String(date.getFullYear()).slice(-2)}`;
  }

  const dateRangeLabel =
    dateRangeStart && dateRangeEnd
      ? `${formatShortDate(dateRangeStart)} - ${formatShortDate(dateRangeEnd)}`
      : "Date range";

  const uniqueCategoryFilters = useMemo(() => {
    const seenLabels = new Set();
    return categoryFilters.filter((category) => {
      if (!category || typeof category.label !== "string") return false;
      const key = category.label.trim().toLowerCase();
      if (!key || seenLabels.has(key)) return false;
      seenLabels.add(key);
      return true;
    });
  }, [categoryFilters]);

  const resolvedEventValue =
    typeof onEventSearchChange === "function" ? eventSearchValue : (eventValue ?? "");
  const resolvedLocationValue =
    typeof onLocationSearchChange === "function" ? locationSearchValue : (locationValue ?? "");

  return (
    <div className={styles.searchBarBlock}>
      <header className={styles.topBar}>
        <input
          className={styles.searchInput}
          placeholder={eventPlaceholder}
          value={resolvedEventValue}
          onChange={handleEventInputChange}
        />
        <input
          className={styles.searchInput}
          placeholder={locationPlaceholder}
          value={resolvedLocationValue}
          onChange={handleLocationInputChange}
        />
        <div className={styles.profileDropdown} ref={dropdownRef}>
          <button
            type="button"
            className={styles.profileButton}
            onClick={() => setIsMenuOpen((current) => !current)}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
          >
            <span className={styles.chevron}></span>
            {currentProfileLabel}
          </button>

          {isMenuOpen && (
            <div className={styles.dropdownMenu} role="menu" aria-label="Profile menu">
              <button
                type="button"
                className={`${styles.menuItem} ${styles.settingsItem}`}
                role="menuitem"
                onClick={handleAccountSettings}
              >
                <span className={styles.menuIcon}>o</span>
                Account Settings
              </button>
              <button type="button" className={styles.menuItem} role="menuitem" onClick={handleSignOut}>
                <span className={styles.menuIcon}>]</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {uniqueCategoryFilters.length > 0 && (
        <div className={styles.categoryFilters} role="tablist" aria-label="Event category filters">
          {uniqueCategoryFilters.map((category) => (
            <button
              key={category.value}
              type="button"
              className={`${styles.categoryButton} ${
                selectedCategory === category.value ? styles.categoryButtonActive : ""
              }`}
              onClick={() => onCategoryChange?.(category.value)}
              aria-pressed={selectedCategory === category.value}
            >
              {category.label}
            </button>
          ))}

          <div className={styles.dateFilterWrap}>
            <button
              type="button"
              className={`${styles.categoryButton} ${
                dateRangeStart || dateRangeEnd ? styles.categoryButtonActive : ""
              }`}
              onClick={() => setIsDateModalOpen(true)}
              aria-expanded={isDateModalOpen}
              aria-controls="date-range-popup"
            >
              {dateRangeLabel}
            </button>
          </div>
        </div>
      )}

      {isDateModalOpen && (
        <div className={styles.dateModalOverlay} role="presentation" onClick={closeDateModal}>
          <div
            id="date-range-popup"
            className={styles.dateModal}
            role="dialog"
            aria-modal="true"
            aria-label="Select date range"
            onClick={(event) => event.stopPropagation()}
          >
            <p className={styles.dateModalTitle}>Select date range</p>
            <label className={styles.dateField}>
              <span>From</span>
              <input type="date" value={draftDateStart} onChange={handleDateStartChange} />
            </label>
            <label className={styles.dateField}>
              <span>To</span>
              <input type="date" value={draftDateEnd} onChange={handleDateEndChange} />
            </label>
            <div className={styles.dateModalActions}>
              <button type="button" className={styles.clearDateButton} onClick={clearDateRange}>
                Clear
              </button>
              <button type="button" className={styles.dateSecondaryButton} onClick={closeDateModal}>
                Cancel
              </button>
              <button type="button" className={styles.datePrimaryButton} onClick={applyDateRange}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

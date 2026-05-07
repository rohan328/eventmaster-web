"use client";

import { useRef } from "react";
import styles from "./DatetimeLocalInput.module.css";

function CalendarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

/**
 * Native datetime-local with a visible calendar control that opens the browser date/time picker.
 */
export default function DatetimeLocalInput({
  value,
  onChange,
  required,
  "aria-invalid": ariaInvalid,
  className = "",
  ...rest
}) {
  const inputRef = useRef(null);

  function openPicker() {
    const input = inputRef.current;
    if (!input) return;
    try {
      if (typeof input.showPicker === "function") {
        input.showPicker();
        return;
      }
    } catch {
      /* not allowed or unsupported */
    }
    input.focus();
    input.click();
  }

  return (
    <div className={`${styles.wrap} ${className}`.trim()}>
      <input
        ref={inputRef}
        type="datetime-local"
        value={value}
        onChange={onChange}
        required={required}
        aria-invalid={ariaInvalid}
        className={styles.input}
        {...rest}
      />
      <button
        type="button"
        className={styles.iconButton}
        onClick={openPicker}
        aria-label="Open date and time picker"
      >
        <CalendarIcon />
      </button>
    </div>
  );
}

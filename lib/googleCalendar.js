function toGoogleDate(isoDate) {
  return new Date(isoDate).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/**
 * Opens Google Calendar “create event” with prefilled fields (no OAuth required).
 */
export function buildGoogleCalendarUrl(event) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toGoogleDate(event.starts_at)}/${toGoogleDate(event.ends_at)}`,
    details: event.description || "Saved from Eventmaster",
    location: event.location || "",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

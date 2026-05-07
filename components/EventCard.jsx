"use client";

import dynamic from "next/dynamic";
import styles from "./EventCard.module.css";

const EventMap = dynamic(() => import("../app/event/EventMap.jsx"), { ssr: false });

const STATUS_STYLES = {
  draft: styles.statusDraft,
  pending_approval: styles.statusDraft,
  published: styles.statusPublished,
  cancelled: styles.statusCancelled,
};

function formatDateBox(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { month: "—", day: "?" };
  }
  return {
    month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    day: String(d.getDate()),
  };
}

function formatSchedule(startsAt, endsAt) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "";
  }
  const datePart = start.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeFmt = { hour: "numeric", minute: "2-digit" };
  const startTime = start.toLocaleString("en-US", timeFmt);
  const endTime = end.toLocaleString("en-US", timeFmt);
  return `${datePart} · ${startTime} – ${endTime}`;
}

function formatStatus(status) {
  if (!status) return "";
  const map = {
    draft: "Draft",
    pending_approval: "Pending approval",
    published: "Published",
    cancelled: "Cancelled",
  };
  return map[status] ?? status;
}

function organizerLabel(event) {
  if (event.organizer_username) return event.organizer_username;
  const o = event.organizer;
  if (o && typeof o === "object" && o.username) return o.username;
  return null;
}

function categoryLabel(event) {
  const c = event.category;
  if (c && typeof c === "object" && typeof c.name === "string") {
    const name = c.name.trim();
    return name || null;
  }
  return null;
}

const US_STATE_ABBREVIATIONS = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};

function shortLocationLabel(location) {
  const raw = String(location || "").trim();
  if (!raw) return null;
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 2) return raw;

  let stateIndex = -1;
  let stateAbbr = null;
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const token = parts[i];
    const normalized = token.toLowerCase();
    if (US_STATE_ABBREVIATIONS[normalized]) {
      stateIndex = i;
      stateAbbr = US_STATE_ABBREVIATIONS[normalized];
      break;
    }
    if (/^[A-Z]{2}$/.test(token)) {
      stateIndex = i;
      stateAbbr = token;
      break;
    }
  }

  if (stateIndex > 0 && stateAbbr) {
    for (let i = stateIndex - 1; i >= 0; i -= 1) {
      const cityCandidate = parts[i];
      if (/county$/i.test(cityCandidate)) continue;
      if (/^\d{5}(?:-\d{4})?$/.test(cityCandidate)) continue;
      return `${cityCandidate}, ${stateAbbr}`;
    }
  }

  return parts.slice(0, 2).join(", ");
}

export default function EventCard({ event }) {
  const { month, day } = formatDateBox(event.starts_at);
  const statusClass =
    STATUS_STYLES[event.status] ?? styles.statusDraft;
  const schedule = formatSchedule(event.starts_at, event.ends_at);
  const organizer = organizerLabel(event);
  const category = categoryLabel(event);
  const location = shortLocationLabel(event.location);
  const capacityText =
    event.capacity == null ? "No capacity limit" : `Max ${event.capacity} attendees`;
  const latitude = event.latitude == null ? null : Number(event.latitude);
  const longitude = event.longitude == null ? null : Number(event.longitude);
  const hasMap =
    (event.venue_type === "in_person" || event.venue_type === "hybrid") &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  return (
    <article className={styles.card}>
      <div className={`${styles.banner} ${hasMap ? styles.bannerWithMap : ""}`}>
        {hasMap ? (
          <div className={styles.bannerMap}>
            <EventMap
              latitude={latitude}
              longitude={longitude}
              locationLabel={event.location?.trim() ? event.location.trim() : null}
              height={160}
            />
          </div>
        ) : null}
        <div className={styles.dateBox}>
          <span className={styles.dateMonth}>{month}</span>
          <span className={styles.dateDay}>{day}</span>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.tags}>
          <span className={`${styles.tag} ${statusClass}`}>
            {formatStatus(event.status)}
          </span>
          {category ? (
            <span className={`${styles.tag} ${styles.tagCategory}`}>{category}</span>
          ) : null}
          {location ? (
            <span className={styles.tag}>{location}</span>
          ) : null}
          <span className={styles.tag}>{capacityText}</span>
        </div>

        <h3 className={styles.title}>{event.title}</h3>

        {event.description?.trim() ? (
          <p className={styles.description}>{event.description.trim()}</p>
        ) : null}

        {schedule ? <p className={styles.schedule}>{schedule}</p> : null}

        {organizer ? (
          <p className={styles.organizer}>Organizer · {organizer}</p>
        ) : null}
      </div>
    </article>
  );
}

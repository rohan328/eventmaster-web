import { API_BASE_URL, getAccessToken } from "./auth";

/**
 * Maps DRF validation keys to create-event form field keys for inline errors.
 */
export function mapApiErrorsToFormKeys(fieldErrors) {
  const keyMap = {
    category: "categoryId",
    venue_type: "venueType",
    online_url: "onlineUrl",
    cover_image: "coverImage",
    starts_at: "startsAt",
    ends_at: "endsAt",
    schedule_items: "schedule_items",
    is_free: "isFree",
  };
  const out = {};
  for (const [k, v] of Object.entries(fieldErrors)) {
    out[keyMap[k] || k] = v;
  }
  return out;
}

export function parseValidationErrors(data) {
  if (!data || typeof data !== "object") {
    return { fieldErrors: {}, general: "Request failed." };
  }
  const fieldErrors = {};
  let general = null;
  for (const [key, value] of Object.entries(data)) {
    if (key === "detail" && typeof value === "string") {
      general = value;
      continue;
    }
    if (key === "non_field_errors" && Array.isArray(value) && value[0]) {
      general = String(value[0]);
      continue;
    }
    if (Array.isArray(value) && value[0] !== undefined && value[0] !== null) {
      fieldErrors[key] = String(value[0]);
    } else if (typeof value === "string") {
      fieldErrors[key] = value;
    }
  }
  return { fieldErrors, general };
}

export async function fetchAdminAllEvents() {
  const access = getAccessToken();
  if (!access) {
    const err = new Error("You are not signed in.");
    err.code = "NO_TOKEN";
    throw err;
  }

  const response = await fetch(`${API_BASE_URL}/events/admin/all/`, {
    headers: {
      Authorization: `Bearer ${access}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 403) {
    const err = new Error("Administrator access required.");
    err.code = "FORBIDDEN";
    throw err;
  }
  if (!response.ok) {
    const msg =
      typeof data.detail === "string" ? data.detail : "Could not load events.";
    throw new Error(msg);
  }
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function fetchAdminPendingEvents() {
  const access = getAccessToken();
  if (!access) {
    const err = new Error("You are not signed in.");
    err.code = "NO_TOKEN";
    throw err;
  }

  const response = await fetch(`${API_BASE_URL}/events/admin/pending/`, {
    headers: {
      Authorization: `Bearer ${access}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 403) {
    const err = new Error("Administrator access required.");
    err.code = "FORBIDDEN";
    throw err;
  }
  if (!response.ok) {
    const msg =
      typeof data.detail === "string" ? data.detail : "Could not load pending events.";
    throw new Error(msg);
  }
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function approveEvent(eventId) {
  const access = getAccessToken();
  if (!access) throw new Error("You are not signed in.");

  const response = await fetch(`${API_BASE_URL}/events/${eventId}/approve/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string" ? data.detail : "Could not approve event."
    );
  }
  return data;
}

export async function rejectEvent(eventId) {
  const access = getAccessToken();
  if (!access) throw new Error("You are not signed in.");

  const response = await fetch(`${API_BASE_URL}/events/${eventId}/reject/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string" ? data.detail : "Could not reject event."
    );
  }
  return data;
}

export async function fetchMyOrganizedEvents() {
  const access = getAccessToken();
  if (!access) {
    const err = new Error("You are not signed in.");
    err.code = "NO_TOKEN";
    throw err;
  }

  const response = await fetch(`${API_BASE_URL}/events/`, {
    headers: {
      Authorization: `Bearer ${access}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 403) {
    const err = new Error(
      "Only organizer and admin accounts can view events they organize."
    );
    err.code = "FORBIDDEN";
    err.status = 403;
    throw err;
  }
  if (!response.ok) {
    const msg =
      typeof data.detail === "string" ? data.detail : "Could not load your events.";
    throw new Error(msg);
  }
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function fetchUpcomingEvents() {
  const response = await fetch(`${API_BASE_URL}/events/upcoming/`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg =
      typeof data.detail === "string"
        ? data.detail
        : "Could not load upcoming events.";
    throw new Error(msg);
  }
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function fetchCategories() {
  const response = await fetch(`${API_BASE_URL}/events/categories/`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg =
      typeof data.detail === "string" ? data.detail : "Could not load categories.";
    throw new Error(msg);
  }
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function fetchEvent(eventId, options = {}) {
  const access = getAccessToken();
  const headers = {};
  if (access) headers.Authorization = `Bearer ${access}`;

  const response = await fetch(`${API_BASE_URL}/events/${eventId}/`, {
    headers,
    signal: options.signal,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 404) {
    const err = new Error(
      typeof data.detail === "string" ? data.detail : "Event not found."
    );
    err.code = "NOT_FOUND";
    throw err;
  }
  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string" ? data.detail : "Could not load event."
    );
  }
  return data;
}

export async function fetchMyRegisteredEvents() {
  const access = getAccessToken();
  if (!access) {
    const err = new Error("You are not signed in.");
    err.code = "NO_TOKEN";
    throw err;
  }

  const response = await fetch(`${API_BASE_URL}/events/my-rsvps/`, {
    headers: {
      Authorization: `Bearer ${access}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Could not load your registered events."
    );
  }
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function registerForEvent(eventId) {
  const access = getAccessToken();
  if (!access) {
    const err = new Error("You are not signed in.");
    err.code = "NO_TOKEN";
    throw err;
  }

  const response = await fetch(`${API_BASE_URL}/events/${eventId}/rsvp/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string" ? data.detail : "Could not complete registration."
    );
  }
  return data;
}

export async function unregisterFromEvent(eventId) {
  const access = getAccessToken();
  if (!access) {
    const err = new Error("You are not signed in.");
    err.code = "NO_TOKEN";
    throw err;
  }

  const response = await fetch(`${API_BASE_URL}/events/${eventId}/rsvp/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${access}`,
    },
  });

  if (response.status === 204) return;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string" ? data.detail : "Could not unregister."
    );
  }
}

export async function fetchEventRegistrations(eventId) {
  const access = getAccessToken();
  if (!access) {
    const err = new Error("You are not signed in.");
    err.code = "NO_TOKEN";
    throw err;
  }

  const response = await fetch(`${API_BASE_URL}/events/${eventId}/registrations/`, {
    headers: {
      Authorization: `Bearer ${access}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 404) {
    const err = new Error(
      typeof data.detail === "string" ? data.detail : "Event not found."
    );
    err.code = "NOT_FOUND";
    throw err;
  }
  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Could not load registrations for this event."
    );
  }
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function cancelRegistrationForUser(eventId, userId) {
  const access = getAccessToken();
  if (!access) {
    const err = new Error("You are not signed in.");
    err.code = "NO_TOKEN";
    throw err;
  }

  const response = await fetch(
    `${API_BASE_URL}/events/${eventId}/registrations/${userId}/`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${access}`,
      },
    }
  );

  if (response.status === 204) return;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Could not cancel this registration."
    );
  }
}

export async function createEvent(payload) {
  const access = getAccessToken();
  if (!access) {
    const err = new Error("You are not signed in.");
    err.body = { detail: err.message };
    throw err;
  }

  const response = await fetch(`${API_BASE_URL}/events/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error("Could not create event.");
    err.status = response.status;
    err.body = data;
    throw err;
  }
  return data;
}

export async function updateEvent(eventId, payload) {
  const access = getAccessToken();
  if (!access) {
    const err = new Error("You are not signed in.");
    err.body = { detail: err.message };
    throw err;
  }

  const response = await fetch(`${API_BASE_URL}/events/${eventId}/manage/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error("Could not update event.");
    err.status = response.status;
    err.body = data;
    throw err;
  }
  return data;
}

export async function deleteEvent(eventId) {
  const access = getAccessToken();
  if (!access) {
    const err = new Error("You are not signed in.");
    err.code = "NO_TOKEN";
    throw err;
  }

  const response = await fetch(`${API_BASE_URL}/events/${eventId}/manage/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${access}`,
    },
  });

  if (response.status === 204) return;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg =
      typeof data.detail === "string" ? data.detail : "Could not delete event.";
    throw new Error(msg);
  }
}

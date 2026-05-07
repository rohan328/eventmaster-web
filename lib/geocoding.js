const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

export function formatCoordinateForApi(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric.toFixed(6);
}

function toSuggestion(row) {
  const latitude = Number.parseFloat(row?.lat);
  const longitude = Number.parseFloat(row?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const label = typeof row?.display_name === "string" ? row.display_name.trim() : "";
  if (!label) return null;
  return { label, latitude, longitude };
}

export async function searchAddressSuggestions(query, { signal, limit = 5 } = {}) {
  const q = String(query || "").trim();
  if (!q) return [];
  const url = `${NOMINATIM_BASE}/search?format=jsonv2&addressdetails=1&limit=${limit}&q=${encodeURIComponent(q)}`;
  const response = await fetch(url, {
    signal,
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Address lookup failed.");
  }
  const data = await response.json().catch(() => []);
  if (!Array.isArray(data)) return [];
  return data.map(toSuggestion).filter(Boolean);
}

export async function geocodeAddress(query, options = {}) {
  const list = await searchAddressSuggestions(query, { ...options, limit: 1 });
  return list[0] || null;
}

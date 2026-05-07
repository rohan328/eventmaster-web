const ACCESS_TOKEN_KEY = "eventmaster_access_token";
const REFRESH_TOKEN_KEY = "eventmaster_refresh_token";
const USER_KEY = "eventmaster_user";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

function getErrorMessage(data, fallbackMessage) {
  if (!data || typeof data !== "object") return fallbackMessage;

  const firstValue = Object.values(data)[0];
  if (Array.isArray(firstValue) && firstValue[0]) return String(firstValue[0]);
  if (typeof data.detail === "string") return data.detail;

  return fallbackMessage;
}

async function jsonRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Request failed."));
  }

  return data;
}

export function setAuthTokens({ access, refresh }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function login({ username, password }) {
  return jsonRequest("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function register(payload) {
  return jsonRequest("/auth/register/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function refreshAccessToken(refresh) {
  return jsonRequest("/auth/token/refresh/", {
    method: "POST",
    body: JSON.stringify({ refresh }),
  });
}

export async function fetchMe(accessToken) {
  return jsonRequest("/auth/me/", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function patchMe(accessToken, body) {
  return jsonRequest("/auth/me/", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export { API_BASE_URL };

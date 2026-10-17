import { refreshKeycloak } from "./keycloak";
import type { Session } from "./types";

const ACCESS = "apex.access";
const REFRESH = "apex.refresh";
const EMAIL = "apex.email";
const ROLE = "apex.role";

export function formatMyr(cents: number) {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(cents / 100);
}

export function session(): Session | null {
  const accessToken = localStorage.getItem(ACCESS);
  const refreshToken = localStorage.getItem(REFRESH);
  const email = localStorage.getItem(EMAIL);
  const role = localStorage.getItem(ROLE);
  if (!accessToken || !refreshToken || !email || !role) return null;
  return { accessToken, refreshToken, email, role };
}

export function saveSession(data: { accessToken: string; refreshToken: string; email: string; role: string }) {
  localStorage.setItem(ACCESS, data.accessToken);
  localStorage.setItem(REFRESH, data.refreshToken);
  localStorage.setItem(EMAIL, data.email);
  localStorage.setItem(ROLE, data.role);
  window.dispatchEvent(new Event("apex-auth"));
}

export function clearSession() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  localStorage.removeItem(EMAIL);
  localStorage.removeItem(ROLE);
  localStorage.removeItem("apex.idp");
  window.dispatchEvent(new Event("apex-auth"));
}

export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  const token = localStorage.getItem(ACCESS);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(path, { ...options, headers });
  if (response.status === 401 && retry && localStorage.getItem(REFRESH) && !path.startsWith("/api/auth/")) {
    if (localStorage.getItem("apex.idp") === "keycloak") {
      const next = await refreshKeycloak(localStorage.getItem(REFRESH) || "");
      if (next) {
        saveSession(next);
        return api(path, options, false);
      }
      clearSession();
    } else {
      const refreshed = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: localStorage.getItem(REFRESH) })
      });
      if (refreshed.ok) {
        const body = await refreshed.json();
        saveSession(body.data);
        return api(path, options, false);
      }
      clearSession();
    }
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false) {
    throw new Error(body?.error?.message || `Request failed (${response.status})`);
  }
  return body.data as T;
}

export async function download(path: string, filename: string) {
  const headers = new Headers();
  const token = localStorage.getItem(ACCESS);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(path, { headers });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message || `Request failed (${response.status})`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

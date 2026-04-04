import type { AuthPayload } from "./types";

const AUTH_STORAGE_KEY = "mass-transcriptor-auth";
let memoryAuth: string | null = null;

function storage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    const candidate = window.localStorage as Partial<Storage>;
    if (typeof candidate.getItem === "function" && typeof candidate.setItem === "function") {
      return candidate as Storage;
    }
  }
  if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
    const candidate = globalThis.localStorage as Partial<Storage>;
    if (
      candidate &&
      typeof candidate.getItem === "function" &&
      typeof candidate.setItem === "function" &&
      typeof candidate.removeItem === "function"
    ) {
      return candidate as Storage;
    }
  }
  return null;
}

export function saveAuth(payload: AuthPayload) {
  const value = JSON.stringify(payload);
  const target = storage();
  if (target) {
    target.setItem(AUTH_STORAGE_KEY, value);
    return;
  }
  memoryAuth = value;
}

export function getAuth(): AuthPayload | null {
  const target = storage();
  const raw = target ? target.getItem(AUTH_STORAGE_KEY) : memoryAuth;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthPayload;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return getAuth()?.access_token ?? null;
}

export function clearAuth() {
  const target = storage();
  if (target) {
    target.removeItem(AUTH_STORAGE_KEY);
  }
  memoryAuth = null;
}

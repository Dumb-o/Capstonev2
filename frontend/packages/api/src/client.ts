export const DEFAULT_API_BASE = "http://localhost:8000/api";

function readEnvApiBase() {
  if (typeof window === "undefined") return DEFAULT_API_BASE;
  const base =
    (import.meta.env.VITE_API_URL as string | undefined) ||
    (globalThis as any).__FREELEDGER_API__ ||
    DEFAULT_API_BASE;
  return base;
}

export function getApiBase() {
  if (typeof window !== "undefined") return readEnvApiBase();
  return DEFAULT_API_BASE;
}

export async function api(path, options = {}) {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("access_token")
      : null;
  const base = getApiBase();
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let detail = text;
    try {
      const json = JSON.parse(text);
      detail = json.detail || text;
    } catch {}
    const error = new Error(detail);
    (error as any).status = response.status;
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

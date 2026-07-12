const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const error = new Error(body?.error ?? "Request failed");
    error.details = body?.details;
    throw error;
  }
  return { data: body, cache: response.headers.get("X-Cache") };
}

export function buildQuery(values) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== "" && value !== undefined && value !== null) search.set(key, value);
  }
  return search.toString();
}

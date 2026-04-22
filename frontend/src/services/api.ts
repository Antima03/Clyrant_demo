/**
 * Thin HTTP client — baseURL driven by VITE_API_URL.
 * Used only by services/*.ts. Components must import from services/, never from here.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export interface ApiError extends Error {
  status: number
}

async function request<T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string | number | undefined> },
): Promise<T> {
  const url = new URL(
    BASE_URL.startsWith('http') ? path.replace(/^\//, '') : path,
    BASE_URL.startsWith('http') ? BASE_URL + '/' : window.location.origin + BASE_URL,
  )

  if (init?.query) {
    for (const [k, v] of Object.entries(init.query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
    }
  }

  const res = await fetch(url.toString(), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })

  if (!res.ok) {
    const err: ApiError = Object.assign(new Error(`HTTP ${res.status}`), {
      status: res.status,
    })
    throw err
  }
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string, query?: Record<string, string | number | undefined>) =>
    request<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
}

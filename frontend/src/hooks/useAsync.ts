import { useEffect, useRef, useState } from 'react'

/**
 * Minimal `useAsync` for service calls that depend on filters.
 * Keeps Landing presentational components simple; swap for React Query later if needed.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    let cancelled = false
    setLoading(true)
    setError(null)
    fn()
      .then((v) => {
        if (!cancelled) setData(v)
      })
      .catch((e) => {
        if (cancelled) return
        if (e instanceof DOMException && e.name === 'AbortError') return
        setError(e instanceof Error ? e : new Error(String(e)))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      ac.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error, signal: abortRef.current?.signal } as const
}

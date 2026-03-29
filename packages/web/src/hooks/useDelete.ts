import { useCallback, useState } from 'react'

type UseDeleteResult = {
  remove: (url: string) => Promise<void>
  deleting: boolean
  error: string | null
}

export function useDelete(): UseDeleteResult {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remove = useCallback(async (url: string): Promise<void> => {
    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(url, { method: 'DELETE' })

      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(json.error ?? `HTTP ${res.status}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setDeleting(false)
    }
  }, [])

  return { remove, deleting, error }
}

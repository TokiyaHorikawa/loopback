import { useCallback, useState } from 'react'

type UseSubmitResult<TBody, TResponse> = {
  submit: (body: TBody) => Promise<TResponse>
  submitting: boolean
  error: string | null
}

export function useSubmit<TBody, TResponse>(
  url: string,
  method: 'POST' | 'PUT' = 'POST',
): UseSubmitResult<TBody, TResponse> {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(
    async (body: TBody): Promise<TResponse> => {
      setSubmitting(true)
      setError(null)

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
          throw new Error(json.error ?? `HTTP ${res.status}`)
        }

        return (await res.json()) as TResponse
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        throw err
      } finally {
        setSubmitting(false)
      }
    },
    [url, method],
  )

  return { submit, submitting, error }
}

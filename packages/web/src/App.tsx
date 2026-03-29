import { useEffect, useState } from 'react'

import { Header } from './components/Header'
import { NextAction } from './components/NextAction'
import { ChatPage } from './pages/ChatPage'
import { GoalDetailPage } from './pages/GoalDetailPage'
import { GoalsPage } from './pages/GoalsPage'
import { ReviewDetailPage } from './pages/ReviewDetailPage'
import { ReviewsPage } from './pages/ReviewsPage'

type Page =
  | { kind: 'goals' }
  | { kind: 'reviews' }
  | { kind: 'goal-detail'; id: number }
  | { kind: 'review-detail'; id: number }
  | { kind: 'chat'; prompt?: string }

function getPageFromHash(): Page {
  const raw = window.location.hash.slice(1)
  const [hash, query] = raw.split('?') as [string, string | undefined]
  const params = new URLSearchParams(query)

  const goalMatch = hash.match(/^goals\/(\d+)$/)
  if (goalMatch) return { kind: 'goal-detail', id: Number(goalMatch[1]) }
  const reviewMatch = hash.match(/^reviews\/(\d+)$/)
  if (reviewMatch) return { kind: 'review-detail', id: Number(reviewMatch[1]) }
  if (hash === 'reviews') return { kind: 'reviews' }
  if (hash === 'chat') return { kind: 'chat', prompt: params.get('prompt') ?? undefined }
  return { kind: 'goals' }
}

export function App() {
  const [page, setPage] = useState<Page>(getPageFromHash)

  useEffect(() => {
    const onHashChange = () => setPage(getPageFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const currentTab =
    page.kind === 'chat' ? 'chat' : page.kind.startsWith('review') ? 'reviews' : 'goals'

  return (
    <>
      <Header currentPage={currentTab} />
      <main className="main">
        {page.kind !== 'chat' && <NextAction />}
        {page.kind === 'goals' && <GoalsPage />}
        {page.kind === 'reviews' && <ReviewsPage />}
        {page.kind === 'goal-detail' && <GoalDetailPage id={page.id} />}
        {page.kind === 'review-detail' && <ReviewDetailPage id={page.id} />}
        {page.kind === 'chat' && <ChatPage key={page.prompt ?? ''} initialPrompt={page.prompt} />}
      </main>
    </>
  )
}

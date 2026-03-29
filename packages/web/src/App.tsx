import { useEffect, useState } from 'react'

import { Header } from './components/Header'
import { NextAction } from './components/NextAction'
import { GoalsPage } from './pages/GoalsPage'
import { ReviewsPage } from './pages/ReviewsPage'

type Page = 'goals' | 'reviews'

function getPageFromHash(): Page {
  return window.location.hash === '#reviews' ? 'reviews' : 'goals'
}

export function App() {
  const [page, setPage] = useState<Page>(getPageFromHash)

  useEffect(() => {
    const onHashChange = () => setPage(getPageFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return (
    <>
      <Header currentPage={page} />
      <main className="main">
        <NextAction />
        {page === 'goals' ? <GoalsPage /> : <ReviewsPage />}
      </main>
    </>
  )
}

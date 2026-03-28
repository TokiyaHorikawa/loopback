type HeaderProps = {
  currentPage: 'goals' | 'reviews'
}

export function Header({ currentPage }: HeaderProps) {
  return (
    <header className="header">
      <h1 className="header-title">Loopback</h1>
      <nav className="header-nav">
        <a href="#goals" className={`nav-tab ${currentPage === 'goals' ? 'nav-tab-active' : ''}`}>
          目標
        </a>
        <a
          href="#reviews"
          className={`nav-tab ${currentPage === 'reviews' ? 'nav-tab-active' : ''}`}
        >
          ふりかえり
        </a>
      </nav>
    </header>
  )
}

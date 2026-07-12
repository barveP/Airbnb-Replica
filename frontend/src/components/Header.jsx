export function Header({ user, view, onView, onLogin, onLogout }) {
  return (
    <header className="site-header">
      <button className="brand" onClick={() => onView("explore")} aria-label="Go to Explore">
        <span className="brand-mark">⌂</span> StayFinder
      </button>
      <nav aria-label="Primary navigation">
        <button className={view === "explore" ? "active" : ""} onClick={() => onView("explore")}>Explore</button>
        {user?.role === "guest" && (
          <button className={view === "trips" ? "active" : ""} onClick={() => onView("trips")}>My trips</button>
        )}
        {user?.role === "host" && (
          <button className={view === "host" ? "active" : ""} onClick={() => onView("host")}>Host dashboard</button>
        )}
        {user ? (
          <div className="account-menu">
            <span>{user.name} · {user.role}</span>
            <button className="button ghost" onClick={onLogout}>Log out</button>
          </div>
        ) : (
          <button className="button dark" onClick={onLogin}>Demo login</button>
        )}
      </nav>
    </header>
  );
}

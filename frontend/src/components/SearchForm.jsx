export function SearchForm({ filters, onChange, onSearch, loading }) {
  return (
    <form className="search-bar" onSubmit={onSearch}>
      <label>
        <span>Where</span>
        <input aria-label="Location" value={filters.location} onChange={(e) => onChange("location", e.target.value)} placeholder="City or country" />
      </label>
      <label>
        <span>Check in</span>
        <input aria-label="Check in" type="date" value={filters.checkIn} onChange={(e) => onChange("checkIn", e.target.value)} />
      </label>
      <label>
        <span>Check out</span>
        <input aria-label="Check out" type="date" value={filters.checkOut} onChange={(e) => onChange("checkOut", e.target.value)} />
      </label>
      <label>
        <span>Guests</span>
        <input aria-label="Guests" type="number" min="1" max="20" value={filters.guests} onChange={(e) => onChange("guests", e.target.value)} />
      </label>
      <button className="search-button" disabled={loading} aria-label="Search properties">{loading ? "…" : "⌕"}</button>
    </form>
  );
}

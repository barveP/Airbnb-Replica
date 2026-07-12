export function Trips({ reservations, loading, onCancel }) {
  return (
    <main className="page-shell dashboard-page">
      <div className="page-heading"><div><p className="eyebrow">Guest workspace</p><h1>My trips</h1><p className="muted">Confirmed and cancelled reservations from PostgreSQL.</p></div></div>
      {loading ? <p className="empty-state">Loading trips…</p> : (
        <div className="trip-grid">
          {reservations.map((reservation) => (
            <article className="trip-card" key={reservation.id}>
              <img src={reservation.property.imageUrl} alt={reservation.property.title} />
              <div>
                <span className={`status ${reservation.status}`}>{reservation.status}</span>
                <h2>{reservation.property.title}</h2>
                <p>{reservation.property.city}, {reservation.property.country}</p>
                <p className="trip-dates">{reservation.checkIn} → {reservation.checkOut} · {reservation.guests} guest{reservation.guests > 1 ? "s" : ""}</p>
                <div className="trip-footer"><strong>${reservation.totalPrice.toLocaleString()} total</strong>{reservation.status === "confirmed" && <button className="button danger" onClick={() => onCancel(reservation)}>Cancel</button>}</div>
              </div>
            </article>
          ))}
          {!reservations.length && <p className="empty-state">No trips yet. Explore a property and reserve it.</p>}
        </div>
      )}
    </main>
  );
}

import { useState } from "react";

function futureDate(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function BookingModal({ property, busy, onBook, onClose }) {
  const [values, setValues] = useState({ checkIn: futureDate(30), checkOut: futureDate(33), guests: 1 });
  const nights = Math.max(0, Math.round((new Date(values.checkOut) - new Date(values.checkIn)) / 86_400_000));
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="modal booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title" onSubmit={(e) => { e.preventDefault(); onBook(values); }} onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Close reservation" onClick={onClose}>×</button>
        <p className="eyebrow">Confirm your stay</p>
        <h2 id="booking-title">{property.title}</h2>
        <div className="form-grid">
          <label>Check in<input required type="date" value={values.checkIn} onChange={(e) => setValues({ ...values, checkIn: e.target.value })} /></label>
          <label>Check out<input required type="date" value={values.checkOut} onChange={(e) => setValues({ ...values, checkOut: e.target.value })} /></label>
          <label>Guests<input required type="number" min="1" max={property.capacity} value={values.guests} onChange={(e) => setValues({ ...values, guests: Number(e.target.value) })} /></label>
        </div>
        <div className="price-line"><span>${property.pricePerNight.toLocaleString()} × {nights} nights</span><strong>${(property.pricePerNight * nights).toLocaleString()}</strong></div>
        <button className="button coral full" disabled={busy}>{busy ? "Reserving…" : "Confirm reservation"}</button>
      </form>
    </div>
  );
}

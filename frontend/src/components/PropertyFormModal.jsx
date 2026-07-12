import { useState } from "react";

function dateFromNow(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const emptyProperty = {
  title: "",
  description: "",
  city: "",
  country: "United States",
  pricePerNight: 200,
  capacity: 2,
  bedrooms: 1,
  imageUrl: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=80",
  availableFrom: dateFromNow(0),
  availableTo: dateFromNow(365),
  status: "published",
};

export function PropertyFormModal({ property, busy, onSave, onClose }) {
  const [values, setValues] = useState(property ? { ...property } : emptyProperty);
  const field = (name) => ({
    value: values[name],
    onChange: (event) => setValues({ ...values, [name]: event.target.value }),
  });

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="modal property-form" role="dialog" aria-modal="true" aria-labelledby="property-form-title" onSubmit={(e) => { e.preventDefault(); onSave(values); }} onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Close property form" onClick={onClose}>×</button>
        <p className="eyebrow">Host tools</p>
        <h2 id="property-form-title">{property ? "Edit property" : "Add a property"}</h2>
        <div className="form-grid two-column">
          <label className="wide">Title<input required minLength="3" {...field("title")} /></label>
          <label>City<input required {...field("city")} /></label>
          <label>Country<input required {...field("country")} /></label>
          <label>Price per night ($)<input required type="number" min="1" {...field("pricePerNight")} /></label>
          <label>Guest capacity<input required type="number" min="1" {...field("capacity")} /></label>
          <label>Bedrooms<input required type="number" min="1" {...field("bedrooms")} /></label>
          <label>Status<select {...field("status")}><option value="published">Published</option><option value="draft">Draft</option></select></label>
          <label>Available from<input required type="date" {...field("availableFrom")} /></label>
          <label>Available to<input required type="date" {...field("availableTo")} /></label>
          <label className="wide">Image URL<input required type="url" {...field("imageUrl")} /></label>
          <label className="wide">Description<textarea required minLength="20" rows="4" {...field("description")} /></label>
        </div>
        <button className="button coral full" disabled={busy}>{busy ? "Saving…" : property ? "Save changes" : "Create property"}</button>
      </form>
    </div>
  );
}

export function HostDashboard({ properties, loading, onAdd, onEdit, onDelete }) {
  return (
    <main className="page-shell dashboard-page">
      <div className="page-heading">
        <div><p className="eyebrow">Host workspace</p><h1>Your properties</h1><p className="muted">Manage the inventory exposed through REST and GraphQL search.</p></div>
        <button className="button coral" onClick={onAdd}>+ Add property</button>
      </div>
      {loading ? <p className="empty-state">Loading properties…</p> : (
        <div className="management-list">
          {properties.map((property) => (
            <article className="management-card" key={property.id}>
              <img src={property.imageUrl} alt="" />
              <div className="management-details">
                <span className={`status ${property.status}`}>{property.status}</span>
                <h2>{property.title}</h2>
                <p>{property.city}, {property.country} · ${property.pricePerNight}/night · {property.capacity} guests</p>
              </div>
              <div className="management-actions">
                <button className="button ghost" onClick={() => onEdit(property)}>Edit</button>
                <button className="button danger" onClick={() => onDelete(property)}>Delete</button>
              </div>
            </article>
          ))}
          {!properties.length && <p className="empty-state">No properties yet. Add the first one.</p>}
        </div>
      )}
    </main>
  );
}

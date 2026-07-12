export function PropertyCard({ property, user, onReserve }) {
  return (
    <article className="property-card">
      <div className="property-image-wrap">
        <img src={property.imageUrl} alt={property.title} className="property-image" />
        <span className="capacity-pill">{property.capacity} guests</span>
      </div>
      <div className="property-body">
        <div className="property-heading">
          <div>
            <p className="location">{property.city}, {property.country}</p>
            <h3>{property.title}</h3>
          </div>
          <span className="rating">★ 4.9</span>
        </div>
        <p className="property-description">{property.description}</p>
        <div className="property-footer">
          <p><strong>${property.pricePerNight.toLocaleString()}</strong> night · {property.bedrooms} bd</p>
          {user?.role === "guest" && <button className="button dark" onClick={() => onReserve(property)}>Reserve</button>}
        </div>
      </div>
    </article>
  );
}

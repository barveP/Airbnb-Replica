function dateOnly(value) {
  if (!value) return value;
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

export function mapUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

export function mapProperty(row) {
  return {
    id: row.id,
    hostId: row.host_id,
    hostName: row.host_name,
    title: row.title,
    description: row.description,
    city: row.city,
    country: row.country,
    pricePerNight: row.price_per_night_cents / 100,
    capacity: row.capacity,
    bedrooms: row.bedrooms,
    imageUrl: row.image_url,
    availableFrom: dateOnly(row.available_from),
    availableTo: dateOnly(row.available_to),
    status: row.status,
  };
}

export function mapReservation(row) {
  return {
    id: row.id,
    propertyId: row.property_id,
    guestId: row.guest_id,
    checkIn: dateOnly(row.check_in),
    checkOut: dateOnly(row.check_out),
    guests: row.guests,
    totalPrice: row.total_price_cents / 100,
    status: row.status,
    property: row.title
      ? mapProperty({ ...row, id: row.property_id, status: row.property_status })
      : undefined,
  };
}

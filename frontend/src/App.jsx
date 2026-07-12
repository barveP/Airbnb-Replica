import { useCallback, useEffect, useState } from "react";
import { api, buildQuery } from "./api.js";
import { BookingModal } from "./components/BookingModal.jsx";
import { Header } from "./components/Header.jsx";
import { HostDashboard } from "./components/HostDashboard.jsx";
import { LoginModal } from "./components/LoginModal.jsx";
import { PropertyCard } from "./components/PropertyCard.jsx";
import { PropertyFormModal } from "./components/PropertyFormModal.jsx";
import { SearchForm } from "./components/SearchForm.jsx";
import { Trips } from "./components/Trips.jsx";

function readSession() {
  try { return JSON.parse(localStorage.getItem("stayfinder-session")) ?? null; }
  catch { return null; }
}

export function App() {
  const [session, setSession] = useState(readSession);
  const [view, setView] = useState("explore");
  const [properties, setProperties] = useState([]);
  const [hostProperties, setHostProperties] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [filters, setFilters] = useState({ location: "", checkIn: "", checkOut: "", guests: 1 });
  const [cacheStatus, setCacheStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [bookingProperty, setBookingProperty] = useState(null);
  const [propertyForm, setPropertyForm] = useState(false);
  const [flash, setFlash] = useState(null);

  const showError = (error) => setFlash({ type: "error", text: error.message });

  const search = useCallback(async (event) => {
    event?.preventDefault();
    if (Boolean(filters.checkIn) !== Boolean(filters.checkOut)) {
      setFlash({ type: "error", text: "Choose both check-in and check-out dates." });
      return;
    }
    setLoading(true);
    try {
      const result = await api(`/api/properties?${buildQuery(filters)}`);
      setProperties(result.data);
      setCacheStatus(result.cache);
    } catch (error) { showError(error); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { search(); }, []); // initial inventory load

  const loadHostProperties = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    try { setHostProperties((await api("/api/properties/mine", { token: session.token })).data); }
    catch (error) { showError(error); }
    finally { setLoading(false); }
  }, [session]);

  const loadReservations = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    try { setReservations((await api("/api/reservations", { token: session.token })).data); }
    catch (error) { showError(error); }
    finally { setLoading(false); }
  }, [session]);

  useEffect(() => {
    if (view === "host") loadHostProperties();
    if (view === "trips") loadReservations();
  }, [view, loadHostProperties, loadReservations]);

  async function login(email) {
    setBusy(true);
    try {
      const result = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password: "password123" }) });
      setSession(result.data);
      localStorage.setItem("stayfinder-session", JSON.stringify(result.data));
      setLoginOpen(false);
      setView(result.data.user.role === "host" ? "host" : "explore");
      setFlash({ type: "success", text: `Signed in as ${result.data.user.name}.` });
    } catch (error) { showError(error); }
    finally { setBusy(false); }
  }

  function logout() {
    localStorage.removeItem("stayfinder-session");
    setSession(null);
    setView("explore");
  }

  async function book(values) {
    setBusy(true);
    try {
      await api("/api/reservations", { method: "POST", token: session.token, body: JSON.stringify({ propertyId: bookingProperty.id, ...values }) });
      setBookingProperty(null);
      setFlash({ type: "success", text: "Reservation confirmed." });
      setView("trips");
    } catch (error) { showError(error); }
    finally { setBusy(false); }
  }

  async function cancel(reservation) {
    setBusy(true);
    try {
      await api(`/api/reservations/${reservation.id}`, { method: "DELETE", token: session.token });
      await loadReservations();
      setFlash({ type: "success", text: "Reservation cancelled and dates released." });
    } catch (error) { showError(error); }
    finally { setBusy(false); }
  }

  async function saveProperty(values) {
    setBusy(true);
    const editing = propertyForm?.id;
    try {
      await api(editing ? `/api/properties/${editing}` : "/api/properties", {
        method: editing ? "PUT" : "POST",
        token: session.token,
        body: JSON.stringify(values),
      });
      setPropertyForm(false);
      await loadHostProperties();
      setFlash({ type: "success", text: editing ? "Property updated." : "Property created." });
    } catch (error) { showError(error); }
    finally { setBusy(false); }
  }

  async function removeProperty(property) {
    if (!window.confirm(`Delete ${property.title}?`)) return;
    try {
      await api(`/api/properties/${property.id}`, { method: "DELETE", token: session.token });
      await loadHostProperties();
      setFlash({ type: "success", text: "Property deleted." });
    } catch (error) { showError(error); }
  }

  const user = session?.user;
  return (
    <div className="app">
      <Header user={user} view={view} onView={setView} onLogin={() => setLoginOpen(true)} onLogout={logout} />
      {flash && <div className={`flash ${flash.type}`} role="status"><span>{flash.text}</span><button aria-label="Dismiss message" onClick={() => setFlash(null)}>×</button></div>}

      {view === "explore" && (
        <main>
          <section className="hero">
            <div className="hero-content">
              <p className="eyebrow light">Thoughtful stays, clearly built</p>
              <h1>Find a place that<br />feels like a story.</h1>
              <p>Search live inventory, check availability, and reserve a stay through a complete full-stack flow.</p>
            </div>
          </section>
          <div className="search-shell"><SearchForm filters={filters} loading={loading} onChange={(key, value) => setFilters({ ...filters, [key]: value })} onSearch={search} /></div>
          <section className="page-shell listing-section">
            <div className="section-heading">
              <div><p className="eyebrow">Curated homes</p><h2>{filters.location ? `Stays near ${filters.location}` : "Places worth the detour"}</h2></div>
              {cacheStatus && <span className={`cache-badge ${cacheStatus.toLowerCase()}`}>Redis {cacheStatus}</span>}
            </div>
            {loading && !properties.length ? <p className="empty-state">Finding available homes…</p> : (
              <div className="property-grid">{properties.map((property) => <PropertyCard key={property.id} property={property} user={user} onReserve={setBookingProperty} />)}</div>
            )}
            {!loading && !properties.length && <p className="empty-state">No available properties match those filters.</p>}
            {!user && <section className="demo-callout"><div><p className="eyebrow light">Try the complete workflow</p><h2>Switch between guest and host views.</h2><p>Seeded accounts make the prototype reviewable without registration setup.</p></div><button className="button pale" onClick={() => setLoginOpen(true)}>Open demo login</button></section>}
          </section>
        </main>
      )}
      {view === "host" && <HostDashboard properties={hostProperties} loading={loading} onAdd={() => setPropertyForm({})} onEdit={setPropertyForm} onDelete={removeProperty} />}
      {view === "trips" && <Trips reservations={reservations} loading={loading || busy} onCancel={cancel} />}

      {loginOpen && <LoginModal busy={busy} onLogin={login} onClose={() => setLoginOpen(false)} />}
      {bookingProperty && <BookingModal property={bookingProperty} busy={busy} onBook={book} onClose={() => setBookingProperty(null)} />}
      {propertyForm && <PropertyFormModal property={propertyForm.id ? propertyForm : null} busy={busy} onSave={saveProperty} onClose={() => setPropertyForm(false)} />}
    </div>
  );
}

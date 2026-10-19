import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Compass,
  LocateFixed,
  MapPin,
  Navigation,
  ParkingCircle,
  RefreshCw,
  Search,
  UserRound,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import MapView from '../components/MapView';
import BookingModal from '../components/BookingModal';
import { getCities, getPlaces, getStates } from '../data/locations';

const DEFAULT_FILTERS = {
  lat: '28.6139',
  lng: '77.2090',
  startTime: '',
  endTime: '',
};

const fieldClassName =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100';

const formatDateTime = (value) => {
  if (!value) return 'Time not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time not available';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const formatPrice = (value) => Number(value || 0).toLocaleString('en-IN');

const getCoordinates = (space) => {
  const coordinates = space?.location?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const [lng, lat] = coordinates.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const getDirectionsUrl = (space) => {
  const point = getCoordinates(space);
  const destination = point
    ? `${point.lat},${point.lng}`
    : space?.address || '';
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
};

const DriverDashboard = () => {
  const { user, isDriver } = useAuth();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [locationForm, setLocationForm] = useState({ state: '', city: '', place: '' });
  const [spaces, setSpaces] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [bookingsError, setBookingsError] = useState('');

  const now = Date.now();
  const activeBookings = bookings.filter(
    (booking) => new Date(booking.startTime).getTime() <= now && new Date(booking.endTime).getTime() > now
  );
  const upcomingBookings = bookings
    .filter((booking) => new Date(booking.startTime).getTime() > now)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  const fetchSpaces = async (overrides = {}) => {
    const query = { ...filters, ...overrides };
    if (!query.lat || !query.lng) {
      setNotice({ type: 'error', text: 'Choose a location before searching.' });
      return;
    }
    if (Boolean(query.startTime) !== Boolean(query.endTime)) {
      setNotice({ type: 'error', text: 'Choose both a start time and an end time, or clear both fields.' });
      return;
    }
    if (query.startTime && new Date(query.endTime) <= new Date(query.startTime)) {
      setNotice({ type: 'error', text: 'The end time must be after the start time.' });
      return;
    }

    setFilters(query);
    setNotice(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({ lat: query.lat, lng: query.lng });
      if (query.startTime && query.endTime) {
        params.set('startTime', query.startTime);
        params.set('endTime', query.endTime);
      }
      const { data } = await api.get(`/api/spaces/search?${params.toString()}`);
      setSpaces(Array.isArray(data) ? data : []);
    } catch (error) {
      setNotice({
        type: 'error',
        text: error.response?.data?.message || 'We could not load parking nearby. Please try again.',
      });
      setSpaces([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    setBookingsLoading(true);
    setBookingsError('');
    try {
      const { data } = await api.get('/api/bookings/driver');
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      setBookingsError(error.response?.data?.message || 'Your bookings could not be loaded.');
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    if (!isDriver) return;
    fetchSpaces(DEFAULT_FILTERS);
    fetchBookings();
    // Load the initial dashboard once the driver role is available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDriver]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setNotice({ type: 'error', text: 'Location access is not available in this browser. Choose a place from the list instead.' });
      return;
    }

    setLocating(true);
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocationForm({ state: '', city: '', place: '' });
        fetchSpaces({ lat: String(coords.latitude), lng: String(coords.longitude) });
        setLocating(false);
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Choose a place manually or allow location access in your browser.'
          : 'Your location could not be read. Choose a place manually and try again.';
        setNotice({ type: 'error', text: message });
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleLocationReset = () => {
    setLocationForm({ state: '', city: '', place: '' });
    fetchSpaces(DEFAULT_FILTERS);
  };

  const handleBook = async ({ startTime, endTime }) => {
    if (!selectedSpace) return;
    setBookingLoading(true);
    setNotice(null);
    try {
      await api.post('/api/bookings/create', {
        spaceId: selectedSpace._id,
        startTime,
        endTime,
        simulatePayment: true,
      });
      setNotice({ type: 'success', text: 'Booking confirmed. You can find it under Your parking.' });
      setSelectedSpace(null);
      await Promise.all([fetchSpaces(), fetchBookings()]);
    } catch (error) {
      setNotice({
        type: 'error',
        text: error.response?.data?.message || 'Booking could not be completed. Please try again.',
      });
    } finally {
      setBookingLoading(false);
    }
  };

  if (!isDriver) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-12 sm:px-6 lg:py-20">
        <section className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid md:grid-cols-[1.1fr_.9fr]">
            <div className="p-8 sm:p-12">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-sky-600">ParkBandhu for drivers</p>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-park-navy sm:text-4xl">Parking made easier.</h1>
              <p className="mt-4 max-w-lg leading-7 text-slate-600">Sign in with a driver account to find nearby spaces, compare hourly prices, and manage your reservations.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {!user && <Link to="/register" className="rounded-full bg-park-blue px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-500">Create driver account</Link>}
                <Link to="/login" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-sky-300 hover:text-sky-700">Sign in</Link>
              </div>
            </div>
            <div className="flex min-h-64 items-center justify-center bg-gradient-to-br from-sky-100 via-cyan-50 to-emerald-50 p-8">
              <div className="max-w-xs rounded-3xl border border-white bg-white/90 p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700"><ParkingCircle size={25} /></div>
                <h2 className="mt-5 text-xl font-extrabold text-park-navy">Find a spot. Park with ease.</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Explore verified parking listings and see their locations on the map.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const greetingName = user?.name?.trim().split(/\s+/)[0] || 'Driver';

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-300 px-6 py-8 text-white shadow-[0_18px_50px_rgba(14,165,233,.18)] sm:px-9 sm:py-10">
          <div className="absolute -right-10 -top-24 h-72 w-72 rounded-full border-[36px] border-white/10" aria-hidden="true" />
          <div className="absolute -bottom-32 right-48 h-64 w-64 rounded-full bg-white/10" aria-hidden="true" />
          <div className="relative flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 text-sm font-bold text-white/90"><Compass size={17} /> DRIVER DASHBOARD</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Good to see you, {greetingName}.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/90 sm:text-base">Find a verified parking spot near your destination and keep your upcoming reservations close at hand.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={handleUseMyLocation} disabled={locating} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-sky-700 shadow-sm transition hover:bg-sky-50 disabled:cursor-wait disabled:opacity-70">
                <LocateFixed size={17} className={locating ? 'animate-pulse' : ''} />{locating ? 'Finding you…' : 'Use my location'}
              </button>
              <Link to="/driver/profile" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20">
                <UserRound size={17} /> My account
              </Link>
            </div>
          </div>
        </section>

        <section aria-label="Parking overview" className="-mt-4 relative grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-500">Nearby spaces</p><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><MapPin size={18} /></span></div>
            <p className="mt-3 text-2xl font-black text-park-navy">{loading ? '…' : spaces.length}</p><p className="mt-1 text-xs text-slate-500">Available for your current search</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-500">Active parking</p><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={18} /></span></div>
            <p className="mt-3 text-2xl font-black text-park-navy">{bookingsLoading ? '…' : activeBookings.length}</p><p className="mt-1 text-xs text-slate-500">Reservations happening now</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-500">Upcoming trips</p><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><CalendarDays size={18} /></span></div>
            <p className="mt-3 text-2xl font-black text-park-navy">{bookingsLoading ? '…' : upcomingBookings.length}</p><p className="mt-1 text-xs text-slate-500">Future parking reservations</p>
          </div>
        </section>

        {notice && (
          <div role={notice.type === 'error' ? 'alert' : 'status'} className={`mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${notice.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
            {notice.type === 'error' ? <MapPin size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
            <p>{notice.text}</p>
          </div>
        )}

        <section id="search" className="mt-7 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-sky-700">Plan your parking</p>
              <h2 className="mt-1.5 text-2xl font-black tracking-tight text-park-navy">Where are you headed?</h2>
              <p className="mt-1 text-sm text-slate-500">Choose an area and optional arrival times to find a suitable space.</p>
            </div>
            <button type="button" onClick={handleUseMyLocation} disabled={locating} className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-sky-200 px-4 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-50 disabled:opacity-60 sm:self-auto">
              <LocateFixed size={16} /> {locating ? 'Finding location…' : 'Near me'}
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <label className="text-xs font-bold text-slate-600">State / region
              <select value={locationForm.state} onChange={(event) => {
                setLocationForm({ state: event.target.value, city: '', place: '' });
                setFilters((current) => ({ ...current, ...DEFAULT_FILTERS }));
              }} className={fieldClassName}>
                <option value="">Select a region</option>
                {getStates().map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">City
              <select value={locationForm.city} disabled={!locationForm.state} onChange={(event) => {
                const city = event.target.value;
                const firstPlace = getPlaces(locationForm.state, city)[0];
                setLocationForm((current) => ({ ...current, city, place: '' }));
                setFilters((current) => ({ ...current, lat: firstPlace ? String(firstPlace.lat) : DEFAULT_FILTERS.lat, lng: firstPlace ? String(firstPlace.lng) : DEFAULT_FILTERS.lng }));
              }} className={fieldClassName}>
                <option value="">Select a city</option>
                {getCities(locationForm.state).map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">Area / landmark
              <select value={locationForm.place} disabled={!locationForm.city} onChange={(event) => {
                const place = event.target.value;
                const match = getPlaces(locationForm.state, locationForm.city).find((item) => item.name === place);
                setLocationForm((current) => ({ ...current, place }));
                if (match) setFilters((current) => ({ ...current, lat: String(match.lat), lng: String(match.lng) }));
              }} className={fieldClassName}>
                <option value="">Select an area</option>
                {getPlaces(locationForm.state, locationForm.city).map((place) => <option key={place.name} value={place.name}>{place.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">From (optional)
              <input type="datetime-local" value={filters.startTime} onChange={(event) => setFilters((current) => ({ ...current, startTime: event.target.value }))} className={fieldClassName} />
            </label>
            <label className="text-xs font-bold text-slate-600">Until (optional)
              <input type="datetime-local" value={filters.endTime} onChange={(event) => setFilters((current) => ({ ...current, endTime: event.target.value }))} className={fieldClassName} />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={() => fetchSpaces()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-full bg-park-blue px-6 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-sky-500 disabled:cursor-wait disabled:opacity-60">
              {loading ? <RefreshCw size={17} className="animate-spin" /> : <Search size={17} />}{loading ? 'Searching…' : 'Search parking'}
            </button>
            <button type="button" onClick={handleLocationReset} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60">
              <RefreshCw size={16} /> Reset search
            </button>
            <p className="ml-auto flex items-center gap-1.5 text-xs text-slate-500"><MapPin size={14} className="text-sky-600" />{locationForm.place || locationForm.city || 'New Delhi'}</p>
          </div>
        </section>

        <section id="parking-map" className="mt-8 grid items-start gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex items-center justify-between gap-3 px-2 pb-3 pt-1 sm:px-3">
              <div><h2 className="text-lg font-extrabold text-park-navy">Parking map</h2><p className="mt-0.5 text-xs text-slate-500">Select a pin to see its hourly rate</p></div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700"><MapPin size={13} />{spaces.length} {spaces.length === 1 ? 'space' : 'spaces'}</span>
            </div>
            <MapView spaces={spaces} center={[Number(filters.lat) || 28.6139, Number(filters.lng) || 77.209]} height="min(62vh, 560px)" />
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">Verified host listings</p><h2 className="mt-1 text-xl font-black text-park-navy">Nearby spaces</h2></div>
              <button type="button" aria-label="Refresh parking results" onClick={() => fetchSpaces()} disabled={loading} className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /></button>
            </div>

            <div className="mt-4 max-h-[min(62vh,560px)] space-y-3 overflow-y-auto pr-1">
              {loading && spaces.length === 0 ? (
                <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl bg-slate-50 text-center"><RefreshCw className="animate-spin text-sky-600" size={23} /><p className="mt-3 text-sm font-semibold text-slate-600">Finding available spaces…</p></div>
              ) : spaces.length === 0 ? (
                <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm"><ParkingCircle size={24} /></div>
                  <h3 className="mt-4 font-bold text-park-navy">No spaces found here yet</h3>
                  <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">Try another area or search without times to see more listings.</p>
                  <button type="button" onClick={handleUseMyLocation} className="mt-3 text-sm font-bold text-sky-700 hover:text-sky-800">Search near me</button>
                </div>
              ) : spaces.map((space) => (
                <article key={space._id} className="overflow-hidden rounded-2xl border border-slate-200 transition hover:border-sky-200 hover:shadow-sm">
                  {space.photos?.[0] && <img src={space.photos[0]} alt="Parking space" loading="lazy" className="h-32 w-full object-cover" />}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><h3 className="line-clamp-2 font-bold leading-5 text-park-navy">{space.address || 'Parking space'}</h3><p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500"><MapPin size={13} className="shrink-0 text-sky-600" />Verified host listing</p></div>
                      <p className="shrink-0 text-right text-lg font-black text-park-navy">₹{formatPrice(space.pricePerHour)}<span className="block text-[10px] font-semibold text-slate-500">per hour</span></p>
                    </div>
                    {space.availability?.[0] && <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><Clock3 size={14} className="text-sky-600" />{space.availability[0].day}, {space.availability[0].startTime}–{space.availability[0].endTime}{space.availability.length > 1 ? ` · +${space.availability.length - 1} times` : ''}</p>}
                    <div className="mt-4 flex gap-2">
                      <button type="button" onClick={() => setSelectedSpace(space)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-park-blue px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-500">Book this spot <ArrowRight size={15} /></button>
                      <a href={getDirectionsUrl(space)} target="_blank" rel="noreferrer" aria-label="Open directions in Google Maps" className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"><Navigation size={16} /></a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="your-parking" className="mt-8 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">Your reservations</p><h2 className="mt-1 text-2xl font-black tracking-tight text-park-navy">Your parking</h2><p className="mt-1 text-sm text-slate-500">Keep track of current and upcoming parking.</p></div>
            <Link to="/driver/profile" className="inline-flex items-center gap-1.5 self-start text-sm font-bold text-sky-700 transition hover:text-sky-800 sm:self-auto">View booking history <ArrowUpRight size={16} /></Link>
          </div>

          {bookingsError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{bookingsError}</p>}
          {bookingsLoading && bookings.length === 0 ? (
            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500"><RefreshCw size={16} className="animate-spin" />Loading your bookings…</div>
          ) : activeBookings.length === 0 && upcomingBookings.length === 0 ? (
            <div className="mt-5 flex flex-col items-start gap-3 rounded-2xl bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sky-700 shadow-sm"><CalendarDays size={19} /></span><div><h3 className="font-bold text-park-navy">No upcoming parking</h3><p className="mt-1 text-sm text-slate-500">When you book a space, its time and location will appear here.</p></div></div>
              <a href="#search" className="text-sm font-bold text-sky-700 hover:text-sky-800">Find a parking spot <ArrowRight size={14} className="ml-1 inline" /></a>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {[...activeBookings, ...upcomingBookings].slice(0, 4).map((booking) => {
                const isActive = activeBookings.some((item) => item._id === booking._id);
                const space = booking.spaceId;
                return (
                  <article key={booking._id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-sky-500'}`} />{isActive ? 'Active now' : 'Upcoming'}</span>
                      <span className="text-xs font-semibold text-slate-500">{booking.paymentStatus || 'Booking'}</span>
                    </div>
                    <h3 className="mt-3 font-extrabold text-park-navy">{space?.address || 'Parking reservation'}</h3>
                    <div className="mt-2 grid gap-1.5 text-sm text-slate-600 sm:grid-cols-2">
                      <p className="flex items-start gap-2"><CalendarDays size={15} className="mt-0.5 shrink-0 text-sky-600" />{formatDateTime(booking.startTime)}</p>
                      <p className="flex items-start gap-2"><Clock3 size={15} className="mt-0.5 shrink-0 text-sky-600" />Until {formatDateTime(booking.endTime)}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <p className="text-sm text-slate-500">Total <span className="ml-1 font-extrabold text-park-navy">₹{formatPrice(booking.totalCost)}</span></p>
                      <a href={getDirectionsUrl(space)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-700 hover:text-sky-800">Directions <ArrowUpRight size={15} /></a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {selectedSpace && <BookingModal space={selectedSpace} onClose={() => setSelectedSpace(null)} onConfirm={handleBook} isSubmitting={bookingLoading} />}
    </main>
  );
};

export default DriverDashboard;

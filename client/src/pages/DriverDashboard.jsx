import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import MapView from '../components/MapView';
import SpaceCard from '../components/SpaceCard';
import BookingModal from '../components/BookingModal';
import { locationData, getStates, getCities, getPlaces } from '../data/locations';

const DriverDashboard = () => {
  const { user, isDriver } = useAuth();
  const [filters, setFilters] = useState({
    lat: '28.6139',
    lng: '77.2090',
    startTime: '',
    endTime: '',
  });
  const [locationForm, setLocationForm] = useState({
    state: '',
    city: '',
    place: '',
  });
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [bookingStatus, setBookingStatus] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [activeBookings, setActiveBookings] = useState([]);

  const fetchSpaces = async () => {
    setLoading(true);
    setBookingStatus('');
    try {
      const params = new URLSearchParams({
        lat: filters.lat,
        lng: filters.lng,
      });
      if (filters.startTime && filters.endTime) {
        params.append('startTime', filters.startTime);
        params.append('endTime', filters.endTime);
      }
      const { data } = await api.get(`/api/spaces/search?${params.toString()}`);
      setSpaces(data);
    } catch (error) {
      setBookingStatus(error.response?.data?.message || 'Unable to fetch spaces');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveBookings = async () => {
    try {
      const { data } = await api.get('/api/bookings/driver');
      const now = new Date();
      const active = data.filter(
        (booking) => new Date(booking.endTime) > now && new Date(booking.startTime) <= now
      );
      setActiveBookings(active);
    } catch (error) {
      console.error('Error fetching active bookings:', error);
    }
  };

  useEffect(() => {
    fetchSpaces();
    if (isDriver) {
      fetchActiveBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDriver]);

  const handleBook = async ({ startTime, endTime }) => {
    setBookingLoading(true);
    setBookingStatus('');
    try {
      await api.post('/api/bookings/create', {
        spaceId: selectedSpace._id,
        startTime,
        endTime,
        simulatePayment: true,
      });
      setBookingStatus('Booking confirmed and payment captured (Test Mode).');
      setSelectedSpace(null);
      fetchSpaces();
      fetchActiveBookings();
    } catch (error) {
      setBookingStatus(error.response?.data?.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  if (!isDriver) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-10 flex flex-col md:flex-row gap-10 items-center">
          <div className="flex-1 space-y-4 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-black text-park-navy">
              Driver access required
            </h2>
            <p className="text-slate-500 text-sm md:text-base">
              Login with a driver account to search and book nearby verified parking spaces in
              real-time.
            </p>
            <ul className="text-left text-sm text-slate-600 space-y-2 inline-block">
              <li>• Live map view of available spots around you.</li>
              <li>• Instant booking with secure payments.</li>
              <li>• Clear directions to your reserved parking bay.</li>
            </ul>
            <div className="pt-4 flex flex-wrap items-center justify-center md:justify-start gap-3">
              {!user && (
                <Link
                  to="/register"
                  className="px-6 py-3 rounded-full bg-park-blue text-white font-semibold"
                >
                  Create driver account
                </Link>
              )}
              <Link
                to="/login"
                className="px-6 py-3 text-sm font-semibold text-park-blue underline underline-offset-4"
              >
                Login as driver
              </Link>
            </div>
          </div>
          <div className="flex-1 w-full">
            <div className="rounded-3xl border border-dashed border-park-blue bg-park-sky/40 p-6 text-center">
              <p className="text-xs font-semibold text-park-blue uppercase tracking-[0.25em] mb-2">
                Driver preview
              </p>
              <p className="text-sm text-slate-600">
                Once logged in as a driver, this page will show a live map with markers for
                available host spaces plus a list you can filter by time.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const openGoogleMaps = (space) => {
    if (!space?.location?.coordinates) return;
    const [lng, lat] = space.location.coordinates;
    const destination = space.address 
      ? encodeURIComponent(space.address)
      : `${lat},${lng}`;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      {/* Active Sessions */}
      {activeBookings.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-3xl p-6 shadow-sm border border-emerald-200">
          <h2 className="text-2xl font-black text-park-navy mb-4">Active Parking Sessions</h2>
          <div className="space-y-4">
            {activeBookings.map((booking) => {
              const [lng, lat] = booking.spaceId?.location?.coordinates || [];
              return (
                <div
                  key={booking._id}
                  className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-sm"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-park-navy mb-2">
                        {booking.spaceId?.address || 'Parking Space'}
                      </h3>
                      <div className="space-y-1 text-sm text-slate-600">
                        <p>
                          <span className="font-semibold">Until:</span>{' '}
                          {new Date(booking.endTime).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                        <p>
                          <span className="font-semibold">Amount Paid:</span> ₹{booking.totalCost}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openGoogleMaps(booking.spaceId)}
                      className="px-6 py-3 rounded-full bg-park-blue text-white font-semibold hover:bg-indigo-600 transition flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Get Directions
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-2xl font-black text-park-navy mb-4">Search nearby parking</h2>
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">State</label>
              <select
                value={locationForm.state}
                onChange={(e) => {
                  setLocationForm({ state: e.target.value, city: '', place: '' });
                  setFilters((prev) => ({ ...prev, lat: '28.6139', lng: '77.2090' }));
                }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white"
              >
                <option value="">Select State</option>
                {getStates().map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">City/Area</label>
              <select
                value={locationForm.city}
                onChange={(e) => {
                  setLocationForm((prev) => ({ ...prev, city: e.target.value, place: '' }));
                  setFilters((prev) => ({ ...prev, lat: '28.6139', lng: '77.2090' }));
                }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white"
                disabled={!locationForm.state}
              >
                <option value="">Select City</option>
                {getCities(locationForm.state).map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Place/Landmark</label>
              <select
                value={locationForm.place}
                onChange={(e) => {
                  const placeName = e.target.value;
                  setLocationForm((prev) => ({ ...prev, place: placeName }));
                  if (placeName) {
                    const places = getPlaces(locationForm.state, locationForm.city);
                    const selectedPlace = places.find((p) => p.name === placeName);
                    if (selectedPlace) {
                      setFilters((prev) => ({
                        ...prev,
                        lat: selectedPlace.lat.toString(),
                        lng: selectedPlace.lng.toString(),
                      }));
                    }
                  }
                }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white"
                disabled={!locationForm.city}
              >
                <option value="">Select Place</option>
                {getPlaces(locationForm.state, locationForm.city).map((place) => (
                  <option key={place.name} value={place.name}>
                    {place.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Start Time</label>
              <input
                type="datetime-local"
                name="startTime"
                value={filters.startTime}
                onChange={(e) => setFilters((prev) => ({ ...prev, startTime: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">End Time</label>
              <input
                type="datetime-local"
                name="endTime"
                value={filters.endTime}
                onChange={(e) => setFilters((prev) => ({ ...prev, endTime: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchSpaces}
              className="px-6 py-3 rounded-full bg-park-blue text-white font-semibold hover:bg-indigo-600"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            {locationForm.place && (
              <p className="text-xs text-slate-500">
                Searching near: <span className="font-semibold">{locationForm.place}</span>
              </p>
            )}
          </div>
        </div>
        {bookingStatus && <p className="text-sm text-park-blue mt-3">{bookingStatus}</p>}
      </div>
      {!selectedSpace && (
        <MapView
          spaces={spaces}
          center={[Number(filters.lat) || 28.6139, Number(filters.lng) || 77.209]}
          height="420px"
        />
      )}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-park-navy">Available Spots</h3>
        {spaces.length === 0 ? (
          <p className="text-slate-500 text-sm">No verified spots in this radius/timeframe.</p>
        ) : (
          spaces.map((space) => (
            <SpaceCard key={space._id} space={space} onBook={() => setSelectedSpace(space)} />
          ))
        )}
      </div>
      {selectedSpace && (
        <BookingModal
          space={selectedSpace}
          onClose={() => setSelectedSpace(null)}
          onConfirm={handleBook}
          isSubmitting={bookingLoading}
        />
      )}
    </div>
  );
};

export default DriverDashboard;


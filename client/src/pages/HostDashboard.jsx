import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import SpaceCard from '../components/SpaceCard';
import { getStates, getCities, getPlaces, formatAddress } from '../data/locations';

const defaultSlot = {
  day: '',
  startTime: '',
  endTime: '',
  startDateTime: '',
  endDateTime: '',
};

const HostDashboard = () => {
  const { user, isHost, socket } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ moneyCollected: 0, bookingsCount: 0 });
  const [spaces, setSpaces] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [offlineCount, setOfflineCount] = useState({});
  const [form, setForm] = useState({
    address: '',
    pricePerHour: {
      bike: '',
      car: '',
      suv: ''
    },
    capacity: {
      bike: 0,
      car: 0,
      suv: 0
    },
    photos: ['https://placehold.co/600x400?text=PARKBANDHU'],
  });
  const [locationForm, setLocationForm] = useState({
    state: '',
    city: '',
    place: '',
  });
  const [slots, setSlots] = useState([defaultSlot]);
  const [message, setMessage] = useState('');
  const [kycStatus, setKycStatus] = useState('pending');
  const [showKycModal, setShowKycModal] = useState(false);

  // Get current date/time in format required for datetime-local input
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const fetchSpaces = async () => {
    try {
      const { data } = await api.get('/api/spaces/mine');
      setSpaces(data);
      // Initialize offlineCount for each space
      const counts = {};
      data.forEach((space) => {
        counts[space._id] = 0;
      });
      setOfflineCount(counts);
    } catch (error) {
      console.error(error);
    }
  };

  const handleWalkIn = (spaceId, capacity, increment) => {
    setOfflineCount((prev) => {
      const currentCount = prev[spaceId] || 0;
      const newCount = currentCount + increment;
      
      if (newCount < 0) return prev;
      if (newCount > capacity) return prev;
      
      return { ...prev, [spaceId]: newCount };
    });
  };

  const fetchBookings = async () => {
    try {
      console.log('Fetching host bookings...');
      const { data } = await api.get('/api/bookings/host');
      console.log('Response data:', data);
      if (!Array.isArray(data)) {
        console.error('Invalid bookings response - expected array, got:', typeof data, data);
        setBookings([]);
        return;
      }
      console.log('Fetched bookings:', data);
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings - full error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      setMessage(`Error fetching bookings: ${error.response?.status || 'unknown'} - ${error.response?.data?.message || error.message}`);
      setBookings([]);
    }
  };

  const fetchSummary = async () => {
    try {
      const { data } = await api.get('/api/bookings/host/summary');
      setSummary(data);
    } catch (err) {
      console.error('Unable to fetch summary', err);
    }
  };

  const fetchKycStatus = async () => {
    try {
      const { data } = await api.get('/api/auth/kyc-status');
      setKycStatus(data.kyc_status || 'pending');
    } catch (err) {
      console.error('Unable to fetch KYC status', err);
      setKycStatus('pending');
    }
  };

  useEffect(() => {
    if (isHost && user) {
      fetchSpaces();
      fetchBookings();
      fetchKycStatus();
      
      // Auto-refresh bookings every 10 seconds
      const bookingInterval = setInterval(() => {
        fetchBookings();
      }, 10000);
      
      return () => clearInterval(bookingInterval);
    }
  }, [isHost, user]);

  // listen for real-time booking events
  useEffect(() => {
    if (!socket || !isHost || !user) return;

    const onNew = (booking) => {
      const hostId = booking.hostId?._id || booking.hostId;
      if (String(hostId) === String(user._id)) {
        setBookings((prev) => [booking, ...prev]);
        fetchSummary();
      }
    };

    const onDeleted = ({ _id }) => {
      setBookings((prev) => prev.filter((b) => b._id !== _id));
      fetchSummary();
    };

    socket.on('booking:new', onNew);
    socket.on('booking:deleted', onDeleted);

    // fetch summary initially
    fetchSummary();

    return () => {
      socket.off('booking:new', onNew);
      socket.off('booking:deleted', onDeleted);
    };
  }, [socket, isHost, user]);

  const handleDeleteBooking = async (id) => {
    if (!window.confirm('Delete booking? This cannot be undone.')) return;
    try {
      await api.delete(`/api/bookings/${id}`);
      setBookings((prev) => prev.filter((b) => b._id !== id));
      fetchSummary();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Unable to delete booking');
    }
  };

  const handleChangePrice = async (spaceId) => {
    const value = prompt('Enter new price per hour (INR)');
    if (!value) return;
    const price = Number(value);
    if (Number.isNaN(price) || price <= 0) { alert('Invalid price'); return; }
    try {
      await api.put(`/api/spaces/${spaceId}/price`, { price });
      fetchSpaces();
      alert('Price updated');
    } catch (err) {
      console.error('Update price failed', err);
      alert('Unable to update price');
    }
  };

  const handleSlotChange = (index, key, value) => {
    setSlots((prev) =>
      prev.map((slot, i) => {
        if (i !== index) return slot;

        if (key === 'startDateTime') {
          if (!value) {
            return { ...slot, startDateTime: '', day: '', startTime: '' };
          }
          const [, timePart] = value.split('T');
          const dateObj = new Date(value);
          const weekday =
            Number.isNaN(dateObj.getTime())
              ? ''
              : dateObj.toLocaleDateString('en-IN', { weekday: 'long' });

          return {
            ...slot,
            startDateTime: value,
            day: weekday,
            startTime: timePart,
          };
        }

        if (key === 'endDateTime') {
          if (!value) {
            return { ...slot, endDateTime: '', endTime: '' };
          }
          const [, timePart] = value.split('T');
          return {
            ...slot,
            endDateTime: value,
            endTime: timePart,
          };
        }

        return { ...slot, [key]: value };
      })
    );
  };

  const addSlot = () => setSlots((prev) => [...prev, defaultSlot]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check KYC status before allowing submission
    if (kycStatus !== 'verified') {
      setShowKycModal(true);
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    // Validate that all availability slots are in the future
    const now = new Date();
    for (const slot of slots) {
      if (slot.startDateTime) {
        const start = new Date(slot.startDateTime);
        if (start < now) {
          setMessage('Start date and time cannot be in the past. Please select future dates.');
          setLoading(false);
          return;
        }
      }
      if (slot.endDateTime) {
        const end = new Date(slot.endDateTime);
        if (end < now) {
          setMessage('End date and time cannot be in the past. Please select future dates.');
          setLoading(false);
          return;
        }
      }
      if (slot.startDateTime && slot.endDateTime) {
        const start = new Date(slot.startDateTime);
        const end = new Date(slot.endDateTime);
        if (end <= start) {
          setMessage('End date and time must be after start date and time.');
          setLoading(false);
          return;
        }
      }
    }
    
    try {
      await api.post('/api/spaces/create', {
        ...form,
        pricePerHour: Number(form.pricePerHour),
        availability: slots,
      });
      setForm({ address: '', pricePerHour: '', photos: form.photos });
      setSlots([defaultSlot]);
      setMessage('Parking space submitted! Pending verification.');
      fetchSpaces();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to create space');
    } finally {
      setLoading(false);
    }
  };

  if (!isHost) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-10 flex flex-col md:flex-row gap-10 items-center">
          <div className="flex-1 space-y-4 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-black text-park-navy">
              Become a PARKBANDHU Host
            </h2>
            <p className="text-slate-500 text-sm md:text-base">
              List your private parking bays, housing society spots, or office lots and earn from
              every hour they stay occupied.
            </p>
            <ul className="text-left text-sm text-slate-600 space-y-2 inline-block">
              <li>• Simple onboarding and one-time setup.</li>
              <li>• You control pricing and availability.</li>
              <li>• Drivers discover you through live search.</li>
            </ul>
            <div className="pt-4 flex flex-wrap items-center justify-center md:justify-start gap-3">
              {!user && (
                <Link
                  to="/register"
                  className="px-6 py-3 rounded-full bg-park-blue text-white font-semibold"
                >
                  Create host account
                </Link>
              )}
              <Link
                to="/login"
                className="px-6 py-3 text-sm font-semibold text-park-blue underline underline-offset-4"
              >
                Login as host
              </Link>
            </div>
          </div>
          <div className="flex-1 w-full">
            <div className="rounded-3xl border border-dashed border-emerald-300 bg-emerald-50/60 p-6 text-center">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-[0.25em] mb-2">
                Host preview
              </p>
              <p className="text-sm text-slate-600">
                As a host you'll see a full dashboard here with your listed spaces, earnings, and
                upcoming bookings.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-2xl font-black text-park-navy mb-4">List a Parking Space</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-600 mb-2">Location</label>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">State</label>
                <select
                  value={locationForm.state}
                  onChange={(e) => {
                    setLocationForm({ state: e.target.value, city: '', place: '' });
                    setForm((prev) => ({ ...prev, address: '' }));
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white"
                  required
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
                    setForm((prev) => ({ ...prev, address: '' }));
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white"
                  disabled={!locationForm.state}
                  required
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
                      const fullAddress = formatAddress(locationForm.state, locationForm.city, placeName);
                      setForm((prev) => ({ ...prev, address: fullAddress }));
                    }
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white"
                  disabled={!locationForm.city}
                  required
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
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Full Address (Auto-filled)</label>
              <textarea
                name="address"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
                rows={2}
                required
                placeholder="Address will be auto-filled when you select a place above, or enter manually"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Price per hour (₹)</label>
            <input
              type="number"
              name="pricePerHour"
              min="10"
              value={form.pricePerHour}
              onChange={(e) => setForm((prev) => ({ ...prev, pricePerHour: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-600">Availability</label>
            {slots.map((slot, index) => (
              <div key={`slot-${index}`} className="grid md:grid-cols-2 gap-3">
                <div>
                  <span className="block text-xs font-semibold text-slate-500 mb-1">
                    Start date &amp; time
                  </span>
                  <input
                    type="datetime-local"
                    value={slot.startDateTime || ''}
                    onChange={(e) => {
                      handleSlotChange(index, 'startDateTime', e.target.value);
                      // If end time is before new start time, update end time
                      if (slot.endDateTime && e.target.value && new Date(e.target.value) >= new Date(slot.endDateTime)) {
                        const newEnd = new Date(e.target.value);
                        newEnd.setHours(newEnd.getHours() + 1);
                        handleSlotChange(index, 'endDateTime', newEnd.toISOString().slice(0, 16));
                      }
                    }}
                    min={getCurrentDateTime()}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-500 mb-1">
                    End date &amp; time
                  </span>
                  <input
                    type="datetime-local"
                    value={slot.endDateTime || ''}
                    onChange={(e) => handleSlotChange(index, 'endDateTime', e.target.value)}
                    min={slot.startDateTime || getCurrentDateTime()}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addSlot}
              className="text-sm font-semibold text-park-blue"
            >
              + Add Slot
            </button>
          </div>
          {message && <p className="text-sm text-park-blue">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-full bg-park-mint text-park-navy font-semibold hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Publish Listing'}
          </button>
        </form>
      </div>
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-park-navy">Your Listings</h3>
        {spaces.length === 0 ? (
          <p className="text-slate-500 text-sm">No spaces yet. Add your first listing above.</p>
        ) : (
          <div className="space-y-4">
            {spaces.map((space) => (
              <div key={space._id} className="space-y-3">
                <SpaceCard space={space} />
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-blue-900 mb-3">Walk-in Manager</h4>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-blue-700 font-semibold">Walk-in Count:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleWalkIn(space._id, space.capacity, -1)}
                        className="w-8 h-8 rounded-full bg-red-500 text-white font-bold hover:bg-red-600 transition"
                      >
                        −
                      </button>
                      <span className="w-12 text-center text-lg font-bold text-blue-900">
                        {offlineCount[space._id] || 0}
                      </span>
                      <button
                        onClick={() => handleWalkIn(space._id, space.capacity, 1)}
                        className="w-8 h-8 rounded-full bg-green-500 text-white font-bold hover:bg-green-600 transition"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-2 text-center">
                    <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Total Occupied</p>
                    <p className="text-2xl font-bold text-blue-600">{(offlineCount[space._id] || 0)} / {space.capacity || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => handleChangePrice(space._id)} className="text-xs px-3 py-1 rounded-full bg-park-blue text-white">Change price</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-xl font-bold text-park-navy mb-4 flex items-center justify-between">
          <span>Booking Dashboard (Soon...) ({bookings.length})</span>
          <button
            onClick={fetchBookings}
            className="ml-4 px-3 py-1 rounded-full bg-park-blue text-white text-xs font-semibold hover:bg-indigo-600 transition"
            title="Refresh bookings"
          >
            Refresh
          </button>
        </h3>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-slate-600">Today's collected: <span className="font-bold text-park-blue">₹{summary.moneyCollected || 0}</span> — Bookings: <span className="font-semibold">{summary.bookingsCount || 0}</span></div>
        </div>

        {loading && bookings.length === 0 ? (
          <p className="text-slate-500 text-sm">Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <p className="text-slate-500 text-sm">No bookings yet. Bookings will appear here once drivers book your spaces.</p>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking._id}
                className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-park-blue text-white flex items-center justify-center text-sm font-semibold">
                        {booking.driverId?.name?.[0]?.toUpperCase() || 'D'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-park-navy">
                          {booking.driverId?.name || 'Unknown Driver'}
                        </h4>
                        <p className="text-xs text-slate-500">{booking.driverId?.email || ''}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold">Location:</span> {booking.spaceId?.address || 'N/A'}
                      </p>
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold">Start:</span>{' '}
                        {new Date(booking.startTime).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold">End:</span>{' '}
                        {new Date(booking.endTime).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-park-blue">₹{booking.totalCost}</p>
                      <p className="text-xs text-slate-500">Total Amount</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          booking.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {booking.paymentStatus}
                      </span>
                    </div>
                    {booking.razorpayPaymentId && (
                      <p className="text-xs text-slate-400">ID: {booking.razorpayPaymentId}</p>
                    )}
                    <div className="pt-2">
                      <button onClick={() => handleDeleteBooking(booking._id)} className="text-xs px-3 py-1 rounded-full bg-rose-500 text-white">Delete</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KYC Verification Modal */}
      {showKycModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 mb-4">
                <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Identity Verification Required</h3>
              <p className="text-sm text-gray-600 mb-6">
                To ensure safety, hosts must verify their ID before listing.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowKycModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowKycModal(false);
                    navigate('/host-kyc');
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Verify Identity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostDashboard;

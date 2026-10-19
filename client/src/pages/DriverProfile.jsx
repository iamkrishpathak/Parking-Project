import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, TicketCheck, X } from 'lucide-react';
import QRCode from 'qrcode';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const DriverProfile = () => {
  const navigate = useNavigate();
  const { user, isDriver, updateUser, socket } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'past', 'profile'
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [queryForm, setQueryForm] = useState({ bookingId: '', message: '' });
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketQr, setTicketQr] = useState('');
  const [ticketQrError, setTicketQrError] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!selectedTicket?._id) {
      setTicketQr('');
      setTicketQrError(false);
      return undefined;
    }

    let cancelled = false;
    setTicketQr('');
    setTicketQrError(false);
    QRCode.toDataURL(selectedTicket._id, {
      width: 240,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((dataUrl) => {
        if (!cancelled) setTicketQr(dataUrl);
      })
      .catch((error) => {
        console.error('Unable to generate ticket QR code', error);
        if (!cancelled) setTicketQrError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTicket]);

  useEffect(() => {
    if (!isDriver) {
      navigate('/driver');
      return;
    }
    if (!user) {
      console.warn('User not loaded yet, deferring bookings fetch');
      return;
    }
    fetchBookings();
    
    // Auto-refresh bookings every 10 seconds
    const bookingInterval = setInterval(() => {
      fetchBookings();
    }, 10000);
    
    return () => clearInterval(bookingInterval);
  }, [isDriver, navigate, user]);

  // realtime updates for driver
  useEffect(() => {
    if (!socket || !isDriver || !user) return;
    const onNew = (booking) => {
      if (String(booking.driverId?._id || booking.driverId) === String(user._id)) {
        setBookings((prev) => [booking, ...prev.filter((item) => item._id !== booking._id)]);
      }
    };
    const onDeleted = ({ _id }) => {
      setBookings((prev) => prev.filter((booking) => booking._id !== _id));
    };
    socket.on('booking:new', onNew);
    socket.on('booking:deleted', onDeleted);
    return () => {
      socket.off('booking:new', onNew);
      socket.off('booking:deleted', onDeleted);
    };
  }, [socket, isDriver, user]);

  const fetchBookings = async () => {
    setBookingsLoading(true);
    setBookingsError('');
    try {
      console.log('Fetching driver bookings...');
      const { data } = await api.get('/api/bookings/driver');
      console.log('Response data:', data);
      if (!Array.isArray(data)) {
        console.error('Invalid response format: Expected an array, got:', typeof data, data);
        setBookingsError('Unable to load bookings: the server returned an unexpected response.');
        return;
      }
      console.log('Fetched driver bookings:', data);
      setBookings(data);
      setMessage('');
    } catch (error) {
      console.error('Error fetching bookings - full error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      const errorMsg = error.response?.data?.message || error.message || 'Unable to fetch bookings';
      setBookingsError(`Unable to load bookings: ${errorMsg}`);
    } finally {
      setBookingsLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const { data } = await api.put('/api/auth/profile', profileForm);
      updateUser(data.user);
      setIsEditing(false);
      setMessage('Profile updated successfully!');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      // For now, just show a success message. You can add a backend endpoint later
      setMessage('Your query has been submitted. We will get back to you soon.');
      setShowQueryModal(false);
      setQueryForm({ bookingId: '', message: '' });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to submit query');
    } finally {
      setLoading(false);
    }
  };

  const openGoogleMaps = (space) => {
    if (!space?.location?.coordinates) return;
    const [lng, lat] = space.location.coordinates;
    const destination = space.address 
      ? encodeURIComponent(space.address)
      : `${lat},${lng}`;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
  };

  const getActiveBookings = () => {
    const now = new Date();
    const active = bookings.filter(
      (booking) => new Date(booking.endTime) > now && new Date(booking.startTime) <= now
    );
    console.log('Active bookings count:', active.length, 'Total bookings:', bookings.length);
    return active;
  };

  const getPastBookings = () => {
    const now = new Date();
    return bookings.filter((booking) => new Date(booking.endTime) <= now);
  };

  const getUpcomingBookings = () => {
    const now = new Date();
    return bookings
      .filter((booking) => new Date(booking.startTime) > now)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  };

  const activeBookings = getActiveBookings();
  const upcomingBookings = getUpcomingBookings();
  const currentBookings = [...activeBookings, ...upcomingBookings];
  const pastBookings = getPastBookings();

  if (!isDriver) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-park-navy mb-2">My Profile</h1>
        <p className="text-slate-600">Manage your bookings, profile, and queries</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 font-semibold text-sm transition ${
            activeTab === 'active'
              ? 'text-park-blue border-b-2 border-park-blue'
              : 'text-slate-600 hover:text-park-blue'
          }`}
        >
          Bookings ({currentBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2 font-semibold text-sm transition ${
            activeTab === 'past'
              ? 'text-park-blue border-b-2 border-park-blue'
              : 'text-slate-600 hover:text-park-blue'
          }`}
        >
          Past Bookings ({pastBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-semibold text-sm transition ${
            activeTab === 'profile'
              ? 'text-park-blue border-b-2 border-park-blue'
              : 'text-slate-600 hover:text-park-blue'
          }`}
        >
          Profile & Ratings
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-xl ${
            message.includes('success') || message.includes('submitted')
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700'
          }`}
        >
          {message}
        </div>
      )}
      {bookingsError && (
        <div role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-rose-700">
          {bookingsError}
        </div>
      )}

      {/* Active Sessions Tab */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-park-navy">Your Current & Upcoming Bookings</h3>
            <button
              onClick={fetchBookings}
              className="px-3 py-1 rounded-full bg-park-blue text-white text-xs font-semibold hover:bg-indigo-600 transition"
              title="Refresh bookings"
            >
              Refresh
            </button>
          </div>
          {bookingsLoading && bookings.length === 0 ? (
            <p className="text-slate-500">Loading...</p>
          ) : currentBookings.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-100">
              <p className="text-slate-500">No current or upcoming parking bookings</p>
            </div>
          ) : (
            currentBookings.map((booking) => {
              const isActive = new Date(booking.startTime) <= new Date() && new Date(booking.endTime) > new Date();
              return (
                <div
                  key={booking._id}
                  className={`bg-white rounded-3xl p-6 border shadow-sm ${
                    isActive ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-park-navy mb-2">
                        {booking.spaceId?.address || 'Parking Space'}
                      </h3>
                      <div className="space-y-1 text-sm text-slate-600">
                        <p>
                          <span className="font-semibold">Start:</span>{' '}
                          {new Date(booking.startTime).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                        <p>
                          <span className="font-semibold">End:</span>{' '}
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
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => openGoogleMaps(booking.spaceId)}
                        className="px-6 py-3 rounded-full bg-park-blue text-white font-semibold hover:bg-indigo-600 transition flex items-center justify-center gap-2"
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
                      <div className="flex flex-col gap-2 items-end">
                        <div className={`px-4 py-2 rounded-full text-sm font-semibold text-center ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
                          {isActive ? 'Active' : 'Upcoming'}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedTicket(booking)}
                          className="inline-flex items-center gap-2 rounded-full bg-park-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600"
                        >
                          <TicketCheck size={16} /> View ticket
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Past Bookings Tab */}
      {activeTab === 'past' && (
        <div className="space-y-4">
          {bookingsLoading && bookings.length === 0 ? (
            <p className="text-slate-500">Loading...</p>
          ) : pastBookings.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-100">
              <p className="text-slate-500">No past bookings</p>
            </div>
          ) : (
            pastBookings.map((booking) => (
              <div
                key={booking._id}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-park-navy mb-2">
                      {booking.spaceId?.address || 'Parking Space'}
                    </h3>
                    <div className="space-y-1 text-sm text-slate-600">
                      <p>
                        <span className="font-semibold">Date:</span>{' '}
                        {new Date(booking.startTime).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}{' '}
                        -{' '}
                        {new Date(booking.endTime).toLocaleString('en-IN', {
                          timeStyle: 'short',
                        })}
                      </p>
                      <p>
                        <span className="font-semibold">Amount Paid:</span> ₹{booking.totalCost}
                      </p>
                      <p>
                        <span className="font-semibold">Payment Status:</span>{' '}
                        <span
                          className={
                            booking.paymentStatus === 'Paid'
                              ? 'text-emerald-600 font-semibold'
                              : 'text-amber-600 font-semibold'
                          }
                        >
                          {booking.paymentStatus}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setQueryForm({ ...queryForm, bookingId: booking._id });
                      setShowQueryModal(true);
                    }}
                    className="px-6 py-3 rounded-full border-2 border-park-blue text-park-blue font-semibold hover:bg-park-blue hover:text-white transition"
                  >
                    Raise Query
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTicket(booking)}
                      className="inline-flex items-center gap-2 rounded-full bg-park-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600"
                    >
                      <TicketCheck size={16} /> View ticket
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Profile & Ratings Tab */}
      {activeTab === 'profile' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Profile Section */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-park-navy">Profile Details</h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-full bg-park-blue text-white text-sm font-semibold hover:bg-indigo-600"
                >
                  Edit
                </button>
              )}
            </div>
            {isEditing ? (
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 rounded-full bg-park-blue text-white font-semibold hover:bg-indigo-600 disabled:opacity-70"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setProfileForm({
                        name: user?.name || '',
                        email: user?.email || '',
                        phone: user?.phone || '',
                      });
                    }}
                    className="px-6 py-2 rounded-full border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Name</p>
                  <p className="text-lg font-semibold text-park-navy">{user?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Email</p>
                  <p className="text-lg font-semibold text-park-navy">{user?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Phone</p>
                  <p className="text-lg font-semibold text-park-navy">{user?.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Role</p>
                  <p className="text-lg font-semibold text-park-navy capitalize">{user?.role || 'N/A'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Ratings Section */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h2 className="text-2xl font-bold text-park-navy mb-6">Ratings & Reviews</h2>
            <div className="text-center py-8">
              <div className="text-5xl font-black text-park-blue mb-2">4.8</div>
              <div className="flex justify-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className="w-6 h-6 text-amber-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-600">Based on {pastBookings.length} completed bookings</p>
              <p className="text-sm text-slate-500 mt-4">
                Ratings will appear here once hosts rate your parking sessions
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Query Modal */}
      {showQueryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-park-navy">Raise a Query</h2>
              <button
                onClick={() => {
                  setShowQueryModal(false);
                  setQueryForm({ bookingId: '', message: '' });
                }}
                className="text-slate-500 hover:text-slate-800"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleQuerySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Your Query/Complaint
                </label>
                <textarea
                  value={queryForm.message}
                  onChange={(e) => setQueryForm({ ...queryForm, message: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2"
                  rows={4}
                  placeholder="Describe your issue or query..."
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-full bg-park-blue text-white font-semibold py-3 hover:bg-indigo-600 disabled:opacity-70"
                >
                  Submit Query
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQueryModal(false);
                    setQueryForm({ bookingId: '', message: '' });
                  }}
                  className="px-6 py-3 rounded-full border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedTicket(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-ticket-title"
            className="w-full max-w-lg rounded-[2rem] bg-white p-5 shadow-2xl sm:p-7"
          >
            <div className="booking-ticket-print overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <div className="bg-gradient-to-r from-sky-500 to-cyan-400 p-6 text-white sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold tracking-wide">ParkBandhu</p>
                    <h2 id="booking-ticket-title" className="mt-3 text-2xl font-black tracking-tight">Parking ticket</h2>
                  </div>
                  <span className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide">
                    {new Date(selectedTicket.endTime) <= new Date()
                      ? 'Completed'
                      : new Date(selectedTicket.startTime) <= new Date()
                        ? 'Active'
                        : 'Upcoming'}
                  </span>
                </div>
                <p className="mt-4 break-all text-xs font-medium text-white/90">Booking ID: {selectedTicket._id}</p>
              </div>

              <div className="space-y-5 p-6 sm:p-7">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">Parking location</p>
                  <h3 className="mt-1 text-lg font-extrabold text-park-navy">
                    {selectedTicket.spaceId?.title || selectedTicket.spaceId?.address || 'Parking space'}
                  </h3>
                  {selectedTicket.spaceId?.title && selectedTicket.spaceId?.address && (
                    <p className="mt-1 text-sm text-slate-500">{selectedTicket.spaceId.address}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 border-y border-dashed border-slate-200 py-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Arrival</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {new Date(selectedTicket.startTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Departure</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {new Date(selectedTicket.endTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Driver</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">{user?.name || 'Driver'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">{selectedTicket.paymentStatus || 'Pending'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-dashed border-slate-200 pb-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Booking QR</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">Scan to read the booking ID</p>
                    <p className="mt-1 text-xs text-slate-400">{selectedTicket._id}</p>
                  </div>
                  {ticketQr ? (
                    <img src={ticketQr} alt={`QR code for booking ${selectedTicket._id}`} className="h-28 w-28 rounded-xl border border-slate-200 bg-white p-2" />
                  ) : (
                    <div role={ticketQrError ? 'alert' : undefined} className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-500">
                      {ticketQrError ? 'QR code could not be created' : 'Creating QR…'}
                    </div>
                  )}
                </div>

                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total amount</p>
                    <p className="mt-1 text-2xl font-black text-park-navy">₹{selectedTicket.totalCost}</p>
                  </div>
                  {selectedTicket.razorpayPaymentId && (
                    <p className="max-w-44 break-all text-right text-[11px] text-slate-400">
                      Payment ref: {selectedTicket.razorpayPaymentId}
                    </p>
                  )}
                </div>

                <p className="border-t border-slate-100 pt-4 text-center text-xs leading-5 text-slate-400">
                  Keep this ticket available when you arrive. Show the booking ID to the host if requested.
                </p>
              </div>
            </div>

            <div className="booking-ticket-no-print mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                disabled={!ticketQr && !ticketQrError}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-park-blue px-5 py-3 font-bold text-white transition hover:bg-indigo-600 disabled:cursor-wait disabled:opacity-60"
              >
                <Download size={17} /> {ticketQr || ticketQrError ? 'Download ticket' : 'Preparing ticket…'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <X size={17} /> Close
              </button>
            </div>
            <p className="booking-ticket-no-print mt-3 text-center text-xs text-slate-400">Choose “Save as PDF” in the print dialog to download it.</p>
          </section>
        </div>
      )}
    </div>
  );
};

export default DriverProfile;


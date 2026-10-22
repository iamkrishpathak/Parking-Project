import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  History,
  MapPin,
  RefreshCw,
  Search,
  Star,
  TicketCheck,
  UserRound,
  X,
} from 'lucide-react';
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
  const userInitial = user?.name?.trim()?.[0]?.toUpperCase() || 'D';

  if (!isDriver) return null;

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-white via-blue-50 to-white px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <section className="relative isolate mb-7 overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-white via-sky-50 to-cyan-50 p-6 shadow-sm sm:p-9">
          <div aria-hidden="true" className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl" />
          <div aria-hidden="true" className="absolute -bottom-28 left-1/3 h-48 w-72 rounded-full bg-cyan-100/70 blur-3xl" />
          <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/90 px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-sky-700 shadow-sm">
                <UserRound size={14} /> Driver account
              </div>
              <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-park-navy sm:text-4xl">
                Your parking, <span className="bg-gradient-to-r from-sky-500 via-park-blue to-indigo-400 bg-clip-text text-transparent">all in one place.</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                Manage your reservations, find your ticket, and keep your ParkBandhu profile up to date.
              </p>
              <button
                type="button"
                onClick={() => navigate('/driver')}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-park-blue px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-500"
              >
                Find parking <ArrowRight size={16} />
              </button>
            </div>
            <div className="flex w-full items-center gap-4 rounded-2xl border border-white bg-white/90 p-4 shadow-sm backdrop-blur-sm md:w-auto md:min-w-60">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-park-blue text-xl font-black text-white shadow-md shadow-sky-200">
                {userInitial}
              </div>
              <div className="min-w-0">
                <p className="truncate font-extrabold text-park-navy">{user?.name || 'Driver'}</p>
                <p className="mt-0.5 truncate text-sm text-slate-500">{user?.email || 'ParkBandhu driver'}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-sky-700">
                  <CheckCircle2 size={13} /> Driver account
                </span>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Booking summary" className="mb-7 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Active now', value: activeBookings.length, hint: 'Reservations in progress', icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
            { label: 'Upcoming', value: upcomingBookings.length, hint: 'Your next parking plans', icon: CalendarDays, tone: 'text-sky-700 bg-sky-50' },
            { label: 'Completed', value: pastBookings.length, hint: 'Past reservations', icon: History, tone: 'text-indigo-600 bg-indigo-50' },
          ].map(({ label, value, hint, icon: Icon, tone }) => (
            <article key={label} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-park-navy">{value}</p>
                  <p className="mt-1 text-xs text-slate-500">{hint}</p>
                </div>
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon size={20} /></span>
              </div>
            </article>
          ))}
        </section>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-blue-100 bg-white p-2 shadow-sm">
        <button
          onClick={() => setActiveTab('active')}
          className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            activeTab === 'active'
              ? 'bg-park-blue text-white shadow-md shadow-sky-100'
              : 'text-slate-600 hover:bg-sky-50 hover:text-sky-700'
          }`}
        >
          Bookings ({currentBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            activeTab === 'past'
              ? 'bg-park-blue text-white shadow-md shadow-sky-100'
              : 'text-slate-600 hover:bg-sky-50 hover:text-sky-700'
          }`}
        >
          Past Bookings ({pastBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            activeTab === 'profile'
              ? 'bg-park-blue text-white shadow-md shadow-sky-100'
              : 'text-slate-600 hover:bg-sky-50 hover:text-sky-700'
          }`}
        >
          Profile & Ratings
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-2xl border p-4 text-sm font-medium ${
            message.includes('success') || message.includes('submitted')
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {message}
        </div>
      )}
      {bookingsError && (
        <div role="alert" className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {bookingsError}
        </div>
      )}

      {/* Active Sessions Tab */}
      {activeTab === 'active' && (
        <section className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-sky-600">Your reservations</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-park-navy">Current & upcoming bookings</h2>
            </div>
            <button
              type="button"
              onClick={fetchBookings}
              disabled={bookingsLoading}
              className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-sky-700 transition hover:border-sky-200 hover:bg-sky-50 disabled:cursor-wait disabled:opacity-60 sm:self-auto"
              title="Refresh bookings"
            >
              <RefreshCw size={16} className={bookingsLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
          {bookingsLoading && bookings.length === 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[0, 1].map((item) => <div key={item} className="h-52 animate-pulse rounded-3xl bg-slate-100" />)}
            </div>
          ) : currentBookings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-blue-200 bg-gradient-to-br from-sky-50/80 to-white px-6 py-12 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm"><Search size={23} /></span>
              <h3 className="mt-4 text-lg font-extrabold text-park-navy">No bookings here yet</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Your active and upcoming parking reservations will appear here.</p>
              <button type="button" onClick={() => navigate('/driver')} className="mt-5 inline-flex items-center gap-2 rounded-full bg-park-blue px-5 py-3 text-sm font-bold text-white shadow-md shadow-sky-100 transition hover:-translate-y-0.5 hover:bg-sky-500">
                Find a parking space <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {currentBookings.map((booking) => {
              const isActive = new Date(booking.startTime) <= new Date() && new Date(booking.endTime) > new Date();
              return (
                <div
                  key={booking._id}
                  className="group flex h-full flex-col rounded-3xl border border-blue-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg hover:shadow-blue-100/60 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><MapPin size={19} /></span>
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-lg font-extrabold leading-snug text-park-navy">{booking.spaceId?.title || booking.spaceId?.address || 'Parking Space'}</h3>
                        {booking.spaceId?.title && booking.spaceId?.address && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{booking.spaceId.address}</p>}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>
                      {isActive ? 'Active now' : 'Upcoming'}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50/80 p-4 sm:grid-cols-2">
                    <div className="flex items-start gap-2.5 text-sm">
                      <CalendarDays size={16} className="mt-0.5 shrink-0 text-sky-600" />
                      <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Arrival</p><p className="mt-1 font-bold text-slate-700">{new Date(booking.startTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p></div>
                    </div>
                    <div className="flex items-start gap-2.5 text-sm">
                      <Clock3 size={16} className="mt-0.5 shrink-0 text-sky-600" />
                      <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Departure</p><p className="mt-1 font-bold text-slate-700">{new Date(booking.endTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p></div>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total paid</p><p className="mt-0.5 text-xl font-black text-park-navy">₹{booking.totalCost}</p></div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <button type="button" onClick={() => openGoogleMaps(booking.spaceId)} className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-50">
                        <MapPin size={16} /> Directions
                      </button>
                      <button type="button" onClick={() => setSelectedTicket(booking)} className="inline-flex items-center justify-center gap-2 rounded-full bg-park-blue px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-100 transition hover:bg-sky-500">
                        <TicketCheck size={16} /> View ticket
                      </button>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </section>
      )}

      {/* Past Bookings Tab */}
      {activeTab === 'past' && (
        <section className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6">
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-sky-600">Your history</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-park-navy">Past bookings</h2>
          </div>
          {bookingsLoading && bookings.length === 0 ? (
            <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((item) => <div key={item} className="h-44 animate-pulse rounded-3xl bg-slate-100" />)}</div>
          ) : pastBookings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-blue-200 bg-gradient-to-br from-sky-50/80 to-white px-6 py-12 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm"><History size={23} /></span>
              <h3 className="mt-4 text-lg font-extrabold text-park-navy">Your completed trips will show here</h3>
              <p className="mt-2 text-sm text-slate-500">There are no past bookings to display yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {pastBookings.map((booking) => (
              <div
                key={booking._id}
                className="flex h-full flex-col rounded-3xl border border-blue-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg hover:shadow-blue-100/60 sm:p-6"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><MapPin size={19} /></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-lg font-extrabold leading-snug text-park-navy">{booking.spaceId?.title || booking.spaceId?.address || 'Parking Space'}</h3>
                    {booking.spaceId?.title && booking.spaceId?.address && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{booking.spaceId.address}</p>}
                  </div>
                </div>
                <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50/80 p-4 sm:grid-cols-2">
                  <div className="flex items-start gap-2.5 text-sm"><CalendarDays size={16} className="mt-0.5 shrink-0 text-sky-600" /><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Date</p><p className="mt-1 font-bold text-slate-700">{new Date(booking.startTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p></div></div>
                  <div className="flex items-start gap-2.5 text-sm"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment</p><p className={`mt-1 font-bold ${booking.paymentStatus === 'Paid' ? 'text-emerald-700' : 'text-amber-700'}`}>{booking.paymentStatus || 'Pending'}</p></div></div>
                </div>
                <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total paid</p><p className="mt-0.5 text-xl font-black text-park-navy">₹{booking.totalCost}</p></div>
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <button type="button" onClick={() => { setQueryForm({ ...queryForm, bookingId: booking._id }); setShowQueryModal(true); }} className="rounded-full border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-50">Raise query</button>
                    <button type="button" onClick={() => setSelectedTicket(booking)} className="inline-flex items-center justify-center gap-2 rounded-full bg-park-blue px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-100 transition hover:bg-sky-500"><TicketCheck size={16} /> View ticket</button>
                  </div>
                </div>
              </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Profile & Ratings Tab */}
      {activeTab === 'profile' && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Profile Section */}
          <section className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[.18em] text-sky-600">Your account</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-park-navy">Profile details</h2>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="rounded-full bg-park-blue px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-100 transition hover:-translate-y-0.5 hover:bg-sky-500"
                >
                  Edit
                </button>
              )}
            </div>
            {isEditing ? (
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-600">Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-park-navy outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-600">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-park-navy outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-600">Phone</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-park-navy outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-full bg-park-blue px-6 py-3 font-bold text-white shadow-md shadow-sky-100 transition hover:bg-sky-500 disabled:opacity-70"
                  >
                    {loading ? 'Saving…' : 'Save changes'}
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
                    className="rounded-full border border-blue-100 px-6 py-3 font-bold text-slate-600 transition hover:bg-sky-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                {[
                  ['Name', user?.name || 'N/A'],
                  ['Email', user?.email || 'N/A'],
                  ['Phone', user?.phone || 'Not provided'],
                  ['Role', user?.role || 'N/A'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-slate-50/80 px-4 py-3.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-1 break-words font-bold capitalize text-park-navy">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Ratings Section */}
          <section className="relative isolate overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-white via-sky-50 to-cyan-50 p-6 shadow-sm sm:p-8">
            <div aria-hidden="true" className="absolute -right-12 -top-14 -z-10 h-44 w-44 rounded-full bg-sky-200/40 blur-3xl" />
            <div className="mb-7">
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-sky-600">Driver feedback</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-park-navy">Ratings & reviews</h2>
            </div>
            <div className="rounded-3xl border border-white bg-white/85 px-5 py-8 text-center shadow-sm backdrop-blur-sm">
              <div className="text-5xl font-black tracking-tight text-park-blue">4.8</div>
              <div className="mt-3 flex justify-center gap-1" aria-label="4.8 out of 5 stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} size={20} fill="currentColor" className="text-amber-400" />
                ))}
              </div>
              <p className="mt-3 font-semibold text-slate-600">Based on {pastBookings.length} completed bookings</p>
              <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-slate-500">
                Ratings will appear here once hosts rate your parking sessions
              </p>
            </div>
          </section>
        </div>
      )}

      {/* Query Modal */}
      {showQueryModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6">
          <div className="my-auto w-full max-w-md rounded-[1.5rem] border border-blue-100 bg-white p-5 shadow-2xl sm:rounded-[2rem] sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[.18em] text-sky-600">Booking support</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-park-navy">Raise a query</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowQueryModal(false);
                  setQueryForm({ bookingId: '', message: '' });
                }}
                aria-label="Close query form"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-100 text-slate-500 transition hover:bg-sky-50 hover:text-sky-700"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleQuerySubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-600">
                  Your query or complaint
                </label>
                <textarea
                  value={queryForm.message}
                  onChange={(e) => setQueryForm({ ...queryForm, message: e.target.value })}
                  className="w-full resize-y rounded-2xl border border-blue-100 bg-white px-4 py-3 text-park-navy outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                  rows={4}
                  placeholder="Describe your issue or query..."
                  required
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-full bg-park-blue py-3 font-bold text-white shadow-md shadow-sky-100 transition hover:bg-sky-500 disabled:opacity-70"
                >
                  {loading ? 'Submitting…' : 'Submit query'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQueryModal(false);
                    setQueryForm({ bookingId: '', message: '' });
                  }}
                  className="rounded-full border border-blue-100 px-5 py-3 font-bold text-slate-600 transition hover:bg-sky-50"
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
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedTicket(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-ticket-title"
            className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-[1.5rem] bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2rem] sm:p-7"
          >
            <div className="booking-ticket-print overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <div className="bg-gradient-to-r from-sky-500 to-cyan-400 p-4 text-white sm:p-7">
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

              <div className="space-y-5 p-4 sm:p-7">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.16em] text-sky-700">Parking location</p>
                  <h3 className="mt-1 text-lg font-extrabold text-park-navy">
                    {selectedTicket.spaceId?.title || selectedTicket.spaceId?.address || 'Parking space'}
                  </h3>
                  {selectedTicket.spaceId?.title && selectedTicket.spaceId?.address && (
                    <p className="mt-1 text-sm text-slate-500">{selectedTicket.spaceId.address}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 border-y border-dashed border-slate-200 py-5 min-[420px]:grid-cols-2">
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

                <div className="flex flex-col items-start justify-between gap-4 border-b border-dashed border-slate-200 pb-5 min-[420px]:flex-row min-[420px]:items-center">
                  <div className="min-w-0">
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

            <div className="booking-ticket-no-print mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => window.print()}
                disabled={!ticketQr && !ticketQrError}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-park-blue px-5 py-3 font-bold text-white shadow-md shadow-sky-100 transition hover:bg-sky-500 disabled:cursor-wait disabled:opacity-60"
              >
                <Download size={17} /> {ticketQr || ticketQrError ? 'Download ticket' : 'Preparing ticket…'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-100 px-5 py-3 font-bold text-slate-600 transition hover:bg-sky-50"
              >
                <X size={17} /> Close
              </button>
            </div>
            <p className="booking-ticket-no-print mt-3 text-center text-xs text-slate-400">Choose “Save as PDF” in the print dialog to download it.</p>
          </section>
        </div>
      )}
      </div>
    </main>
  );
};

export default DriverProfile;


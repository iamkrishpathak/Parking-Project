import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getApiAssetUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import SpaceCard from '../components/SpaceCard';
import MapView from '../components/MapView';
import { getStates, getCities, getPlaces, formatAddress } from '../data/locations';
import { ArrowRight, Building2, CheckCircle2, CircleDollarSign, Clock3, ImagePlus, LoaderCircle, MapPin, ShieldCheck, Trash2 } from 'lucide-react';

const defaultSlot = {
  day: '',
  startTime: '',
  endTime: '',
};

const HostDashboard = () => {
  const { user, isHost, socket } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ moneyCollected: 0, bookingsCount: 0 });
  const [spaces, setSpaces] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState('');
  const [loading, setLoading] = useState(false);
  const [offlineCount, setOfflineCount] = useState({});
  const [form, setForm] = useState({
    title: '',
    description: '',
    address: '',
    latitude: '',
    longitude: '',
    propertyType: 'private_driveway',
    pricingByVehicle: { bike: '', car: '', suv: '' },
    capacityByVehicle: { bike: 0, car: 0, suv: 0 },
    physicalDetails: { lengthMeters: '', widthMeters: '', entranceWidthMeters: '' },
    authorizationEvidenceDescription: '',
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
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [authorizationDocuments, setAuthorizationDocuments] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [evidenceRequirements, setEvidenceRequirements] = useState({
    minimumPhotos: 2,
    minimumAuthorizationDocuments: 1,
    authorizationGuidance: 'Provide evidence that supports your authority to offer this parking space, such as ownership, a lease, or written permission.',
  });
  const [currentEvidence, setCurrentEvidence] = useState([]);
  const [editingSpaceId, setEditingSpaceId] = useState(null);
  const [deletingSpaceId, setDeletingSpaceId] = useState(null);
  const [uploadingPhotosSpaceId, setUploadingPhotosSpaceId] = useState('');
  const [listingPhotoUploadMessage, setListingPhotoUploadMessage] = useState({ spaceId: '', text: '', error: false });
  const photosInputRef = useRef(null);
  const authorizationInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/api/spaces/verification-requirements', { params: { propertyType: form.propertyType } })
      .then(({ data }) => { if (!cancelled) setEvidenceRequirements(data); })
      .catch(() => { if (!cancelled) setEvidenceRequirements({ minimumPhotos: 2, minimumAuthorizationDocuments: 1, authorizationGuidance: 'Provide evidence that supports your authority to offer this parking space, such as ownership, a lease, or written permission.' }); });
    return () => { cancelled = true; };
  }, [form.propertyType]);

  useEffect(() => {
    const previewUrls = photos.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(previewUrls);
    return () => previewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

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

  const uploadListingPhotos = async (space, selectedFiles, input) => {
    const files = Array.from(selectedFiles || []).slice(0, 5);
    if (!files.length) return;
    const uploadData = new FormData();
    files.forEach((file) => uploadData.append('photos', file));
    setUploadingPhotosSpaceId(space._id);
    setListingPhotoUploadMessage({ spaceId: space._id, text: 'Uploading photos…', error: false });
    try {
      const { data } = await api.post(`/api/spaces/${space._id}/listing-photos`, uploadData);
      await fetchSpaces();
      setListingPhotoUploadMessage({ spaceId: space._id, text: data.message || 'Photos added. Drivers can see them now.', error: false });
    } catch (error) {
      setListingPhotoUploadMessage({
        spaceId: space._id,
        text: error.response?.data?.message || 'Unable to upload photos. Please try again.',
        error: true,
      });
    } finally {
      setUploadingPhotosSpaceId('');
      if (input) input.value = '';
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
    setBookingsLoading(true);
    try {
      console.log('Fetching host bookings...');
      const { data } = await api.get('/api/bookings/host');
      console.log('Response data:', data);
      if (!Array.isArray(data)) {
        console.error('Invalid bookings response - expected array, got:', typeof data, data);
        setBookingsError('The server returned an unexpected bookings response.');
        return;
      }
      console.log('Fetched bookings:', data);
      setBookings(data);
      setBookingsError('');
    } catch (error) {
      console.error('Error fetching bookings - full error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      setBookingsError(`Could not load bookings: ${error.response?.data?.message || error.message}`);
    } finally {
      setBookingsLoading(false);
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
      setKycStatus(data.kycStatus || data.kyc_status || 'pending');
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
        setBookingsError('');
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
    if (!window.confirm('Cancel this future booking? The booking will be removed from active reservations.')) return;
    try {
      await api.delete(`/api/bookings/${id}`);
      setBookings((prev) => prev.filter((b) => b._id !== id));
      fetchSummary();
    } catch (err) {
      console.error('Cancellation failed', err);
      alert(err.response?.data?.message || 'Unable to cancel booking');
    }
  };

  const handleRemoveListing = async (space) => {
    const title = space.title || space.address || 'this listing';
    const confirmed = window.confirm(
      `Remove “${title}” from your listings? Drivers will no longer see it. Existing booking records will be kept.`
    );
    if (!confirmed) return;

    setDeletingSpaceId(space._id);
    try {
      const { data } = await api.delete(`/api/spaces/${space._id}`);
      setSpaces((current) => current.filter((item) => item._id !== space._id));
      setOfflineCount((current) => {
        const next = { ...current };
        delete next[space._id];
        return next;
      });
      if (editingSpaceId === space._id) resetListingForm();
      setMessage(data.message || 'Listing removed. Existing booking records were preserved.');
    } catch (error) {
      window.alert(error.response?.data?.message || 'Unable to remove this listing. Please try again.');
    } finally {
      setDeletingSpaceId(null);
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
    setSlots((prev) => prev.map((slot, i) => i === index ? { ...slot, [key]: value } : slot));
  };

  const addSlot = () => setSlots((prev) => [...prev, { ...defaultSlot }]);

  const startEditingSpace = (space) => {
    const [longitude, latitude] = space.location?.coordinates || ['', ''];
    setEditingSpaceId(space._id);
    setLocationForm({ state: '', city: '', place: '' });
    setForm({
      title: space.title || '',
      description: space.description || '',
      address: space.address || '',
      latitude: String(latitude),
      longitude: String(longitude),
      propertyType: space.propertyType || 'other',
      pricingByVehicle: space.pricingByVehicle || { bike: '', car: '', suv: '' },
      capacityByVehicle: space.capacityByVehicle || { bike: 0, car: 0, suv: 0 },
      physicalDetails: space.physicalDetails || { lengthMeters: '', widthMeters: '', entranceWidthMeters: '' },
      authorizationEvidenceDescription: space.authorizationEvidenceDescription || '',
    });
    setSlots(space.availability?.length ? space.availability : [{ ...defaultSlot }]);
    setPhotos([]);
    setAuthorizationDocuments([]);
    setCurrentEvidence(space.evidenceFiles || []);
    if (photosInputRef.current) photosInputRef.current.value = '';
    if (authorizationInputRef.current) authorizationInputRef.current.value = '';
    setMessage(`Editing “${space.title || space.address}”. Save and resubmit for review.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetListingForm = () => {
    setEditingSpaceId(null);
    setLocationForm({ state: '', city: '', place: '' });
    setForm({
      title: '', description: '', address: '', latitude: '', longitude: '', propertyType: 'private_driveway',
      pricingByVehicle: { bike: '', car: '', suv: '' },
      capacityByVehicle: { bike: 0, car: 0, suv: 0 },
      physicalDetails: { lengthMeters: '', widthMeters: '', entranceWidthMeters: '' },
      authorizationEvidenceDescription: '',
    });
    setSlots([{ ...defaultSlot }]);
    setPhotos([]);
    setAuthorizationDocuments([]);
    setCurrentEvidence([]);
    if (photosInputRef.current) photosInputRef.current.value = '';
    if (authorizationInputRef.current) authorizationInputRef.current.value = '';
  };

  const removeExistingEvidence = async (fileId) => {
    try {
      await api.delete(`/api/spaces/${editingSpaceId}/files/${fileId}`);
      setCurrentEvidence((previous) => previous.filter((file) => file._id !== fileId));
      setMessage('Evidence file removed. Upload a replacement if needed, then resubmit.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to remove evidence file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check KYC status before allowing submission
    if (kycStatus !== 'approved') {
      setShowKycModal(true);
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      const payload = {
        ...form,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        pricingByVehicle: Object.fromEntries(Object.entries(form.pricingByVehicle).map(([key, value]) => [key, Number(value)])),
        capacityByVehicle: Object.fromEntries(Object.entries(form.capacityByVehicle).map(([key, value]) => [key, Number(value)])),
        physicalDetails: Object.fromEntries(Object.entries(form.physicalDetails).map(([key, value]) => [key, Number(value)])),
        availability: slots,
      };
      const { data: space } = editingSpaceId
        ? await api.put(`/api/spaces/${editingSpaceId}`, payload)
        : await api.post('/api/spaces/create', payload);
      if (!editingSpaceId) setEditingSpaceId(space._id);
      if (photos.length || authorizationDocuments.length) {
        const uploadData = new FormData();
        photos.forEach((file) => uploadData.append('photos', file));
        authorizationDocuments.forEach((file) => uploadData.append('authorizationDocuments', file));
        setUploadProgress(0);
        const { data } = await api.post(`/api/spaces/${space._id}/files`, uploadData, {
          onUploadProgress: (event) => {
            if (event.total) setUploadProgress(Math.round((event.loaded / event.total) * 100));
          },
        });
        setCurrentEvidence((previous) => [...previous, ...(data.files || [])]);
        setUploadProgress(100);
      }
      await api.post(`/api/spaces/${space._id}/submit`);
      resetListingForm();
      setMessage('Listing sent for verification. It will stay hidden from drivers until approved.');
      fetchSpaces();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to create space');
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  if (!isHost) {
    return (
      <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-white via-blue-50 to-white px-4 py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-6xl space-y-7">
          <section className="relative isolate overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-white via-sky-50 to-cyan-50 p-6 shadow-sm sm:p-10">
            <div aria-hidden="true" className="absolute -right-12 -top-20 -z-10 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />
            <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_.9fr] lg:gap-12">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/90 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[.16em] text-sky-700 shadow-sm">
                  <Building2 size={15} /> ParkBandhu for hosts
                </div>
                <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-tight text-park-navy sm:text-5xl">
                  Put your parking space to work.
                </h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                  List a driveway, society bay, or office lot. Set your rates and availability, then manage bookings from one simple dashboard.
                </p>
                {user && (
                  <p className="mt-4 inline-flex items-start gap-2 rounded-2xl border border-blue-100 bg-white/80 px-4 py-3 text-sm leading-5 text-slate-600">
                    <ShieldCheck size={17} className="mt-0.5 shrink-0 text-sky-600" />
                    You’re signed in as a {user.role}. Use a host account to manage listings.
                  </p>
                )}
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/register?role=host" className="inline-flex items-center gap-2 rounded-full bg-park-blue px-6 py-3 text-sm font-bold text-white shadow-md shadow-sky-100 transition hover:bg-sky-500">
                    Register as a host <ArrowRight size={16} />
                  </Link>
                  <Link to="/login?role=host" className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-6 py-3 text-sm font-bold text-sky-700 transition hover:bg-sky-50">
                    Sign in as a host
                  </Link>
                </div>
              </div>

              <aside className="rounded-[1.75rem] border border-white bg-white/90 p-5 shadow-lg shadow-blue-100/50 backdrop-blur-sm sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[.18em] text-sky-600">Your host toolkit</p>
                    <h2 className="mt-1 text-xl font-black text-park-navy">Everything in one place</h2>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700"><Building2 size={21} /></span>
                </div>
                <div className="mt-5 space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl border border-blue-50 bg-sky-50/60 p-3.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sky-700 shadow-sm"><CircleDollarSign size={19} /></span>
                    <div><p className="text-sm font-bold text-park-navy">Choose your rates</p><p className="text-xs text-slate-500">Set prices for each vehicle type.</p></div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-blue-50 bg-sky-50/60 p-3.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sky-700 shadow-sm"><Clock3 size={19} /></span>
                    <div><p className="text-sm font-bold text-park-navy">Control availability</p><p className="text-xs text-slate-500">Choose when drivers can book.</p></div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-blue-50 bg-sky-50/60 p-3.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sky-700 shadow-sm"><CheckCircle2 size={19} /></span>
                    <div><p className="text-sm font-bold text-park-navy">Track your bookings</p><p className="text-xs text-slate-500">See reservations and listing status.</p></div>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section aria-label="How hosting works" className="grid gap-4 md:grid-cols-3">
            {[
              { title: 'Create your listing', body: 'Add the location, vehicle capacity, pricing, and clear photos.', icon: MapPin },
              { title: 'Get verified', body: 'Submit property evidence so drivers can trust your space.', icon: ShieldCheck },
              { title: 'Welcome drivers', body: 'Manage approved listings and keep an eye on bookings.', icon: CheckCircle2 },
            ].map(({ title, body, icon: Icon }, index) => (
              <article key={title} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Icon size={20} /></span>
                  <span className="text-sm font-extrabold text-sky-300">0{index + 1}</span>
                </div>
                <h3 className="mt-4 font-extrabold text-park-navy">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-500">{body}</p>
              </article>
            ))}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-white via-blue-50 to-white px-4 py-8 sm:px-6 lg:py-12">
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-white via-sky-50 to-cyan-50 p-6 shadow-sm sm:p-8">
        <div aria-hidden="true" className="absolute -right-10 -top-16 -z-10 h-52 w-52 rounded-full bg-sky-200/40 blur-3xl" />
        <p className="text-xs font-extrabold uppercase tracking-[.2em] text-sky-700">Host dashboard</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-park-navy sm:text-4xl">Manage your parking space</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Create a listing, keep availability current, and follow the bookings made by drivers.</p>
        <Link to="/host/profile" className="mt-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-5 py-2.5 text-sm font-bold text-sky-700 shadow-sm transition hover:bg-sky-50">
          Host profile <span aria-hidden="true">→</span>
        </Link>
      </section>
      <div className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-black text-park-navy mb-2">{editingSpaceId ? 'Update a Parking Space' : 'List a Parking Space'}</h2>
        {kycStatus !== 'approved' && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Host verification: {kycStatus.replace('_', ' ')}</p>
            <p className="mt-1">Host KYC must be approved before you can submit a parking listing.</p>
            <Link to="/host-kyc" className="mt-2 inline-block font-semibold text-park-blue hover:underline">View or submit host verification</Link>
          </div>
        )}
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
                    setForm((prev) => ({ ...prev, address: '', latitude: '', longitude: '' }));
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
                    setForm((prev) => ({ ...prev, address: '', latitude: '', longitude: '' }));
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
                    const selectedPlace = getPlaces(locationForm.state, locationForm.city).find((place) => place.name === placeName);
                    const fullAddress = selectedPlace ? formatAddress(locationForm.state, locationForm.city, placeName) : '';
                    setForm((prev) => ({
                      ...prev,
                      address: fullAddress,
                      latitude: selectedPlace ? String(selectedPlace.lat) : '',
                      longitude: selectedPlace ? String(selectedPlace.lng) : '',
                    }));
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
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Listing title</label>
              <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2" maxLength={120} required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Property category</label>
              <select value={form.propertyType} onChange={(e) => setForm((prev) => ({ ...prev, propertyType: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2">
                <option value="private_driveway">Private driveway</option>
                <option value="residential_society">Residential society</option>
                <option value="commercial_lot">Commercial parking lot</option>
                <option value="office_lot">Office lot</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Describe the parking space</label>
            <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2" rows={3} maxLength={3000} required placeholder="Access instructions, surface, lighting, and anything drivers should know" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Latitude</label>
              <input type="number" step="any" min="-90" max="90" value={form.latitude} onChange={(e) => setForm((prev) => ({ ...prev, latitude: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Longitude</label>
              <input type="number" step="any" min="-180" max="180" value={form.longitude} onChange={(e) => setForm((prev) => ({ ...prev, longitude: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2" required />
            </div>
          </div>
          <p className="-mt-2 text-xs text-slate-500">Use the parking entrance coordinates. You can copy them from Google Maps by dropping a pin.</p>
          {Number.isFinite(Number(form.latitude)) && form.latitude !== '' && Number.isFinite(Number(form.longitude)) && form.longitude !== '' && <div className="mt-3">
            <p className="mb-2 text-sm font-semibold text-slate-600">Map preview of the submitted entrance location</p>
            <MapView spaces={[{ address: form.address || 'Parking entrance', location: { coordinates: [Number(form.longitude), Number(form.latitude)] } }]} center={[Number(form.latitude), Number(form.longitude)]} height="240px" />
          </div>}
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">Vehicle capacity and hourly price</label>
            <div className="grid md:grid-cols-3 gap-3">
              {['bike', 'car', 'suv'].map((vehicle) => (
                <div key={vehicle} className="rounded-xl border border-slate-200 p-3">
                  <p className="mb-2 font-semibold capitalize text-park-navy">{vehicle}</p>
                  <label className="mb-1 block text-xs text-slate-500">Spaces</label>
                  <input type="number" min="0" step="1" value={form.capacityByVehicle[vehicle]} onChange={(e) => setForm((prev) => ({ ...prev, capacityByVehicle: { ...prev.capacityByVehicle, [vehicle]: e.target.value } }))} className="mb-2 w-full border border-slate-200 rounded-lg px-3 py-2" />
                  <label className="mb-1 block text-xs text-slate-500">₹ per hour</label>
                  <input type="number" min="0" step="1" value={form.pricingByVehicle[vehicle]} onChange={(e) => setForm((prev) => ({ ...prev, pricingByVehicle: { ...prev.pricingByVehicle, [vehicle]: e.target.value } }))} className="w-full border border-slate-200 rounded-lg px-3 py-2" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">Approximate dimensions (metres)</label>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                ['lengthMeters', 'Space length'],
                ['widthMeters', 'Space width'],
                ['entranceWidthMeters', 'Entrance width'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="mb-1 block text-xs text-slate-500">{label}</label>
                  <input type="number" min="0.1" max="100" step="0.1" value={form.physicalDetails[key]} onChange={(e) => setForm((prev) => ({ ...prev, physicalDetails: { ...prev.physicalDetails, [key]: e.target.value } }))} className="w-full border border-slate-200 rounded-xl px-3 py-2" required />
                </div>
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Space photos</label>
              <input ref={photosInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={(e) => setPhotos(Array.from(e.target.files || []).slice(0, 5))} className="w-full text-sm" />
              <p className="mt-1 text-xs text-slate-500">Upload at least {evidenceRequirements.minimumPhotos} clear photos showing the parking area, entrance/access road, boundaries, and available slots. Up to 5 images, 8 MB each.</p>
              {photos.length > 0 && <>
                <p className="mt-1 text-xs text-park-blue">Selected: {photos.map((file) => file.name).join(', ')}</p>
                <div className="mt-2 flex flex-wrap gap-2">{photos.map((file, index) => <figure key={`${file.name}-${index}`} className="w-20">
                  {photoPreviews[index] && <img src={photoPreviews[index]} alt={`Preview of ${file.name}`} className="h-16 w-20 rounded-lg border border-slate-200 object-cover" />}
                  <figcaption className="truncate text-[10px] text-slate-500">{file.name}</figcaption>
                </figure>)}</div>
              </>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Property authorization evidence</label>
              <input ref={authorizationInputRef} type="file" accept="image/jpeg,image/png,image/gif,application/pdf" multiple onChange={(e) => setAuthorizationDocuments(Array.from(e.target.files || []).slice(0, 3))} className="w-full text-sm" />
              <p className="mt-1 text-xs text-slate-500">{evidenceRequirements.authorizationGuidance} Upload at least {evidenceRequirements.minimumAuthorizationDocuments} file{evidenceRequirements.minimumAuthorizationDocuments === 1 ? '' : 's'} (up to 3 files, 8 MB each). An identity document alone does not establish property rights.</p>
              {authorizationDocuments.length > 0 && <p className="mt-1 text-xs text-park-blue">Selected: {authorizationDocuments.map((file) => file.name).join(', ')}</p>}
            </div>
          </div>
          {editingSpaceId && currentEvidence.length > 0 && <div className="rounded-xl border border-slate-200 p-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">Evidence already on file</p>
            <div className="space-y-2">
              {currentEvidence.map((file) => <div key={file._id} className="flex items-center justify-between gap-3 text-sm"><span className="truncate">{file.purpose === 'space_photo' ? 'Photo' : 'Authorization'} · {file.originalName}</span><button type="button" onClick={() => removeExistingEvidence(file._id)} className="shrink-0 font-semibold text-rose-600">Remove</button></div>)}
            </div>
          </div>}
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">What does your authorization evidence show?</label>
            <textarea value={form.authorizationEvidenceDescription} onChange={(e) => setForm((prev) => ({ ...prev, authorizationEvidenceDescription: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2" rows={2} maxLength={1000} required placeholder="Briefly describe the permission or authorization evidence provided" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-600">Availability</label>
            {slots.map((slot, index) => (
              <div key={`slot-${index}`} className="grid md:grid-cols-4 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Day</label>
                  <select value={slot.day} onChange={(e) => handleSlotChange(index, 'day', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2" required>
                    <option value="">Select day</option>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => <option key={day}>{day}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">From</label>
                  <input type="time" value={slot.startTime} onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2" required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Until</label>
                  <input type="time" value={slot.endTime} onChange={(e) => handleSlotChange(index, 'endTime', e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2" required />
                </div>
                {slots.length > 1 && <button type="button" onClick={() => setSlots((prev) => prev.filter((_, slotIndex) => slotIndex !== index))} className="self-end px-3 py-2 text-sm font-semibold text-rose-600">Remove time</button>}
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
          {uploadProgress !== null && <div aria-label="Evidence upload progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={uploadProgress} className="rounded-xl bg-slate-100 p-3">
            <div className="mb-1 flex justify-between text-xs text-slate-600"><span>Uploading verification evidence…</span><span>{uploadProgress}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-park-blue transition-all" style={{ width: `${uploadProgress}%` }} /></div>
          </div>}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="submit"
              disabled={loading || kycStatus !== 'approved'}
              className="min-h-12 rounded-full bg-park-blue px-6 py-3 font-bold text-white hover:bg-sky-500 disabled:opacity-60"
            >
              {loading ? 'Submitting...' : editingSpaceId ? 'Save changes and resubmit' : 'Submit for verification'}
            </button>
            {editingSpaceId && <button type="button" onClick={resetListingForm} className="min-h-12 rounded-full border border-slate-200 px-6 py-3 font-semibold text-slate-600">Cancel edit</button>}
          </div>
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
                <div className={`rounded-xl border p-4 ${space.verification?.status === 'approved' ? 'border-emerald-200 bg-emerald-50' : space.verification?.status === 'rejected' || space.verification?.status === 'action_required' ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold capitalize text-park-navy">Verification: {(space.verification?.status || 'draft').replace('_', ' ')}</p>
                      {space.verification?.reason && <p className="mt-1 text-sm text-slate-700">Admin feedback: {space.verification.reason}</p>}
                      {space.verification?.status === 'pending' && <p className="mt-1 text-sm text-slate-600">Your listing is hidden from drivers while it is reviewed.</p>}
                      {space.verification?.status === 'approved' && <p className="mt-1 text-sm text-slate-600">Editing will hide this listing from drivers until you resubmit it and it is approved again.</p>}
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      {['rejected', 'action_required', 'draft', 'approved'].includes(space.verification?.status) && (
                        <button type="button" onClick={() => startEditingSpace(space)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-park-blue shadow-sm">Edit and resubmit</button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveListing(space)}
                        disabled={deletingSpaceId === space._id}
                        aria-label={`Remove listing ${space.title || space.address}`}
                        title="Remove listing"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                      >
                        {deletingSpaceId === space._id ? <LoaderCircle size={18} className="animate-spin" /> : <Trash2 size={18} />}
                      </button>
                    </div>
                  </div>
                  {space.evidenceFiles?.length > 0 && <p className="mt-2 text-xs text-slate-600">Evidence on file: {space.evidenceFiles.map((file) => file.originalName).join(', ')}</p>}
                </div>
                {space.verification?.status === 'approved' && <section className="rounded-xl border border-blue-100 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-park-navy">Listing photos</h4>
                      <p className="mt-1 text-xs text-slate-500">Add up to 5 display photos. They appear in driver search as soon as the upload finishes, without another review.</p>
                    </div>
                    <label className={`inline-flex cursor-pointer items-center gap-2 rounded-full bg-park-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 ${uploadingPhotosSpaceId === space._id ? 'cursor-wait opacity-60' : ''}`}>
                      {uploadingPhotosSpaceId === space._id ? <LoaderCircle size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                      {uploadingPhotosSpaceId === space._id ? 'Uploading…' : 'Add photos'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        multiple
                        disabled={Boolean(uploadingPhotosSpaceId)}
                        onChange={(event) => uploadListingPhotos(space, event.target.files, event.target)}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  {space.photos?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">
                    {space.photos.slice(0, 5).map((photo, index) => <img key={`${space._id}-${photo}-${index}`} src={getApiAssetUrl(photo)} alt={`${space.title || 'Parking space'} view ${index + 1}`} loading="lazy" className="h-16 w-20 rounded-lg border border-slate-200 object-cover" />)}
                  </div>}
                  {listingPhotoUploadMessage.spaceId === space._id && <p role={listingPhotoUploadMessage.error ? 'alert' : 'status'} className={`mt-2 text-sm ${listingPhotoUploadMessage.error ? 'text-rose-600' : 'text-emerald-700'}`}>{listingPhotoUploadMessage.text}</p>}
                </section>}
                {space.verification?.status === 'approved' && <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
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
                </div>}
                {space.verification?.status === 'approved' && <div className="flex gap-2 justify-end">
                  <button onClick={() => handleChangePrice(space._id)} className="text-xs px-3 py-1 rounded-full bg-park-blue text-white">Change price</button>
                </div>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-xl font-bold text-park-navy mb-4 flex items-center justify-between">
          <span>Bookings ({bookings.length})</span>
          <button
            onClick={fetchBookings}
            className="ml-4 px-3 py-1 rounded-full bg-park-blue text-white text-xs font-semibold hover:bg-sky-500 transition"
            title="Refresh bookings"
          >
            Refresh
          </button>
        </h3>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-slate-600">Today's collected: <span className="font-bold text-park-blue">₹{summary.moneyCollected || 0}</span> — Bookings: <span className="font-semibold">{summary.bookingsCount || 0}</span></div>
        </div>

        {bookingsError && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{bookingsError}</p>}

        {bookingsLoading && bookings.length === 0 ? (
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
                      <button onClick={() => handleDeleteBooking(booking._id)} className="text-xs px-3 py-1 rounded-full bg-rose-500 text-white">Cancel booking</button>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="my-auto w-full max-w-md rounded-[1.5rem] border border-blue-100 bg-white p-5 shadow-2xl sm:rounded-[2rem] sm:p-6">
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
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => setShowKycModal(false)}
                  className="flex-1 rounded-full border border-blue-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-sky-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowKycModal(false);
                    navigate('/host-kyc');
                  }}
                  className="flex-1 rounded-full bg-park-blue px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-500"
                >
                  Verify Identity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </main>
  );
};

export default HostDashboard;

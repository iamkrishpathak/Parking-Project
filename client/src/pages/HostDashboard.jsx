import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import SpaceCard from '../components/SpaceCard';
import MapView from '../components/MapView';
import { getStates, getCities, getPlaces, formatAddress } from '../data/locations';

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
            {user && (
              <p className="pt-2 text-sm text-slate-500">
                You are signed in as a {user.role}. Host features require an account registered as a host.
              </p>
            )}
            <div className="pt-4 flex flex-wrap items-center justify-center md:justify-start gap-3">
              <Link
                to="/register?role=host"
                className="px-6 py-3 rounded-full bg-park-blue text-white font-semibold"
              >
                {user ? 'Create a host account' : 'Create host account'}
              </Link>
              {!user && (
                <Link
                  to="/login?role=host"
                  className="px-6 py-3 text-sm font-semibold text-park-blue underline underline-offset-4"
                >
                  Login as host
                </Link>
              )}
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
          <button
            type="submit"
            disabled={loading || kycStatus !== 'approved'}
            className="px-6 py-3 rounded-full bg-park-mint text-park-navy font-semibold hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? 'Submitting...' : editingSpaceId ? 'Save changes and resubmit' : 'Submit for verification'}
          </button>
          {editingSpaceId && <button type="button" onClick={resetListingForm} className="ml-3 px-6 py-3 rounded-full border border-slate-200 text-slate-600 font-semibold">Cancel edit</button>}
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
                    {['rejected', 'action_required', 'draft', 'approved'].includes(space.verification?.status) && (
                      <button type="button" onClick={() => startEditingSpace(space)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-park-blue shadow-sm">Edit and resubmit</button>
                    )}
                  </div>
                  {space.evidenceFiles?.length > 0 && <p className="mt-2 text-xs text-slate-600">Evidence on file: {space.evidenceFiles.map((file) => file.originalName).join(', ')}</p>}
                </div>
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
            className="ml-4 px-3 py-1 rounded-full bg-park-blue text-white text-xs font-semibold hover:bg-indigo-600 transition"
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

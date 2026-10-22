import { useState } from 'react';

const BookingModal = ({ space, onClose, onConfirm, isSubmitting }) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // 'pending', 'processing', 'success', 'failed'
  const [bookingError, setBookingError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

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

  const calculateCost = () => {
    if (!startTime || !endTime) return 0;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationHours = Math.max((end - start) / (1000 * 60 * 60), 1);
    return Math.round(durationHours * space.pricePerHour * 100) / 100;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate dates are not in the past
    // Add 1 minute buffer to allow bookings very close to current time
    const now = new Date();
    const bufferMinutes = 1;
    const minStartTime = new Date(now.getTime() + bufferMinutes * 60 * 1000);
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (start < minStartTime) {
      const minTime = minStartTime.toLocaleString('en-IN', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
      alert(`Start time must be at least 1 minute in the future. Minimum time: ${minTime}`);
      return;
    }
    
    if (end <= start) {
      alert('End time must be after start time.');
      return;
    }
    
    // Ensure minimum booking duration is at least 1 hour
    const durationHours = (end - start) / (1000 * 60 * 60);
    if (durationHours < 0.5) {
      alert('Minimum booking duration is 30 minutes.');
      return;
    }
    
    setShowPayment(true);
    setPaymentStatus('processing');
    setBookingError('');
    try {
      const booking = await onConfirm({ startTime, endTime });
      setConfirmedBooking(booking);
      setPaymentStatus('success');
      window.setTimeout(onClose, 1500);
    } catch (error) {
      setBookingError(error.message || 'Booking could not be completed. Please try again.');
      setPaymentStatus('failed');
    }
  };

  if (!space) return null;

  if (showPayment && paymentStatus === 'processing') {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-4 backdrop-blur-sm sm:items-center sm:py-6">
        <div className="my-auto w-full max-w-md rounded-[1.5rem] border border-blue-100 bg-white p-5 text-center shadow-2xl sm:rounded-[2rem] sm:p-8">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-park-blue border-t-transparent rounded-full animate-spin"></div>
            <h2 className="text-2xl font-bold text-park-navy mb-2">Confirming Reservation</h2>
            <p className="text-slate-500">Please wait while we reserve this space...</p>
          </div>
          <div className="space-y-2 rounded-2xl bg-slate-50/80 p-4 text-left">
            <div className="flex flex-wrap justify-between gap-1 text-sm">
              <span className="text-slate-600">Parking Space:</span>
              <span className="min-w-0 break-words text-right font-semibold">{space.address}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-1 text-sm">
              <span className="text-slate-600">Duration:</span>
              <span className="font-semibold">
                {startTime && endTime
                  ? `${Math.max(
                      Math.round((new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60) * 10) / 10,
                      1
                    )} hours`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex flex-wrap justify-between gap-1 text-sm">
              <span className="text-slate-600">Price per hour:</span>
              <span className="font-semibold">₹{space.pricePerHour}</span>
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-1 border-t border-slate-200 pt-2">
              <span className="text-lg font-bold text-park-navy">Total Amount:</span>
              <span className="text-lg font-bold text-park-blue">₹{calculateCost()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showPayment && paymentStatus === 'failed') {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-4 backdrop-blur-sm sm:items-center sm:py-6">
        <div role="alert" className="my-auto w-full max-w-md rounded-[1.5rem] border border-blue-100 bg-white p-5 text-center shadow-2xl sm:rounded-[2rem] sm:p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-park-navy">Booking not confirmed</h2>
          <p className="mt-3 text-sm text-rose-700">{bookingError}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onClose} className="flex-1 rounded-full border border-blue-100 py-3 font-bold text-slate-700 transition hover:bg-sky-50">Close</button>
            <button type="button" onClick={() => { setShowPayment(false); setPaymentStatus('pending'); setBookingError(''); }} className="flex-1 rounded-full bg-park-blue py-3 font-bold text-white transition hover:bg-sky-500">Try again</button>
          </div>
        </div>
      </div>
    );
  }

  const openGoogleMaps = () => {
    if (!space?.location?.coordinates) return;
    
    // Coordinates are stored as [lng, lat] in MongoDB
    const [lng, lat] = space.location.coordinates;
    
    // Google Maps URL for directions
    // Using the address if available, otherwise coordinates
    const destination = space.address 
      ? encodeURIComponent(space.address)
      : `${lat},${lng}`;
    
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    
    // Try to open in Google Maps app first (mobile), fallback to web
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
  };

  if (showPayment && paymentStatus === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-4 backdrop-blur-sm sm:items-center sm:py-6">
        <div className="my-auto w-full max-w-md rounded-[1.5rem] border border-blue-100 bg-white p-5 text-center shadow-2xl sm:rounded-[2rem] sm:p-8">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-park-navy mb-2">Reservation Confirmed</h2>
            <p className="text-slate-500">Your space is reserved. Payment has not been collected.</p>
          </div>
          <div className="mb-4 space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-left">
            <div className="flex flex-wrap justify-between gap-1 text-sm">
              <span className="text-slate-600">Total amount:</span>
              <span className="font-semibold text-emerald-700">₹{confirmedBooking?.totalCost ?? calculateCost()}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-1 text-sm">
              <span className="text-slate-600">Payment status:</span>
              <span className="font-semibold text-amber-700">{confirmedBooking?.paymentStatus || 'Pending'}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-1 border-t border-emerald-200 pt-2 text-sm">
              <span className="text-slate-600">Location:</span>
              <span className="ml-2 min-w-0 break-words text-right font-semibold text-emerald-700">{space.address}</span>
            </div>
          </div>
          <button
            onClick={openGoogleMaps}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-park-blue py-3 font-bold text-white shadow-sm transition hover:bg-sky-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Get Directions on Google Maps
          </button>
          <p className="text-xs text-slate-400">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-4 backdrop-blur-sm sm:items-center sm:py-6">
      <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[1.5rem] border border-blue-100 bg-white p-5 shadow-2xl sm:rounded-[2rem] sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-sky-600">Reserve your space</p>
            <h2 className="mt-1 text-xl font-black leading-snug text-park-navy">Book {space.address}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close booking form" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-100 text-slate-500 transition hover:bg-sky-50 hover:text-sky-700">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Start Time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                // If end time is before new start time, update end time
                if (endTime && e.target.value && new Date(e.target.value) >= new Date(endTime)) {
                  const newEnd = new Date(e.target.value);
                  newEnd.setHours(newEnd.getHours() + 1);
                  setEndTime(newEnd.toISOString().slice(0, 16));
                }
              }}
              min={getCurrentDateTime()}
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">End Time</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              min={startTime || getCurrentDateTime()}
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
              required
            />
          </div>
          <p className="text-sm text-slate-500">
            Payments run in Razorpay Test Mode — simulated success ensures quick demos.
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-park-blue py-3 font-bold text-white shadow-sm transition hover:bg-sky-500 disabled:cursor-wait disabled:opacity-70"
          >
            {isSubmitting ? 'Processing...' : 'Pay & Confirm'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;


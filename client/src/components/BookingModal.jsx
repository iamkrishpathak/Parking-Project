import { useState } from 'react';

const BookingModal = ({ space, onClose, onConfirm, isSubmitting }) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // 'pending', 'processing', 'success', 'failed'

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
    // Simulate payment processing
    setTimeout(() => {
      setPaymentStatus('success');
      // After showing success, proceed with booking
      setTimeout(() => {
        onConfirm({ startTime, endTime });
        // Close modal after a brief delay to show success message
        setTimeout(() => {
          onClose();
        }, 1500);
      }, 2000);
    }, 2000);
  };

  if (!space) return null;

  if (showPayment && paymentStatus === 'processing') {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-park-blue border-t-transparent rounded-full animate-spin"></div>
            <h2 className="text-2xl font-bold text-park-navy mb-2">Processing Payment</h2>
            <p className="text-slate-500">Please wait while we process your payment...</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Parking Space:</span>
              <span className="font-semibold">{space.address}</span>
            </div>
            <div className="flex justify-between text-sm">
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
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Price per hour:</span>
              <span className="font-semibold">₹{space.pricePerHour}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between">
              <span className="text-lg font-bold text-park-navy">Total Amount:</span>
              <span className="text-lg font-bold text-park-blue">₹{calculateCost()}</span>
            </div>
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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-park-navy mb-2">Payment Successful!</h2>
            <p className="text-slate-500">Your booking has been confirmed.</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Amount Paid:</span>
              <span className="font-semibold text-emerald-700">₹{calculateCost()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Payment ID:</span>
              <span className="font-semibold text-emerald-700">
                {`pay_${Math.random().toString(36).substr(2, 14)}`}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-emerald-200">
              <span className="text-slate-600">Location:</span>
              <span className="font-semibold text-emerald-700 truncate ml-2">{space.address}</span>
            </div>
          </div>
          <button
            onClick={openGoogleMaps}
            className="w-full mb-3 rounded-full bg-park-blue text-white font-semibold py-3 hover:bg-indigo-600 transition flex items-center justify-center gap-2"
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-park-navy">Book {space.address}</h2>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-800">
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
            className="w-full rounded-full bg-park-mint text-park-navy font-semibold py-3 hover:bg-emerald-400 disabled:opacity-70"
          >
            {isSubmitting ? 'Processing...' : 'Pay & Confirm'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;


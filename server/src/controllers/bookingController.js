const crypto = require('crypto');
const mongoose = require('mongoose');
const Space = require('../models/Space');
const Booking = require('../models/Booking');
const socketUtil = require('../utils/socket');
const { isListingPublic } = require('../utils/spaceVerification');

const INDIA_TIME_ZONE = 'Asia/Kolkata';
const ACTIVE_BOOKING_QUERY = { bookingStatus: { $ne: 'cancelled' } };

const getIndiaDateParts = (date) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: INDIA_TIME_ZONE,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map(({ type, value }) => [type, value]));
};

const getMinutes = (time) => {
  if (typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const isInsideAvailability = (space, start, end) => {
  const startParts = getIndiaDateParts(start);
  const endParts = getIndiaDateParts(end);
  if (startParts.year !== endParts.year || startParts.month !== endParts.month || startParts.day !== endParts.day) return false;

  const startMinutes = Number(startParts.hour) * 60 + Number(startParts.minute);
  const endMinutes = Number(endParts.hour) * 60 + Number(endParts.minute);
  const slots = space.availability?.length ? space.availability : space.availabilitySchedule || [];
  return slots.some((slot) => {
    const slotStart = getMinutes(slot.startTime);
    const slotEnd = getMinutes(slot.endTime);
    return slot.day === startParts.weekday && slotStart !== null && slotEnd !== null &&
      startMinutes >= slotStart && endMinutes <= slotEnd && endMinutes > startMinutes;
  });
};

const vehicleCapacityFor = (space, vehicleType) => Number(
  Number(space.capacityByVehicle?.[vehicleType]) > 0
    ? space.capacityByVehicle[vehicleType]
    : typeof space.capacity === 'object' && space.capacity !== null && Object.prototype.hasOwnProperty.call(space.capacity, vehicleType)
      ? space.capacity[vehicleType]
      : space.capacity
);

const hourlyRateFor = (space, vehicleType) => Number(
  Number(space.pricingByVehicle?.[vehicleType]) > 0
    ? space.pricingByVehicle[vehicleType]
    : typeof space.pricePerHour === 'object' && space.pricePerHour !== null && Object.prototype.hasOwnProperty.call(space.pricePerHour, vehicleType)
      ? space.pricePerHour[vehicleType]
      : space.pricePerHour
);

const acquireBookingLock = async (spaceId, lockToken) => {
  const now = new Date();
  return Space.findOneAndUpdate(
    {
      _id: spaceId,
      verificationStatus: 'approved',
      isPublished: true,
      isArchived: { $ne: true },
      $or: [
        { bookingLockUntil: { $exists: false } },
        { bookingLockUntil: { $lte: now } },
      ],
    },
    { $set: { bookingLockToken: lockToken, bookingLockUntil: new Date(now.getTime() + 30_000) } },
    { new: true }
  );
};

const clearBookingLock = async (spaceId, lockToken) => {
  await Space.updateOne(
    { _id: spaceId, bookingLockToken: lockToken },
    { $unset: { bookingLockToken: 1, bookingLockUntil: 1 } }
  );
};

const redactUnverifiedPayment = (booking) => {
  const plain = booking.toObject ? booking.toObject() : { ...booking };
  if (!plain.paymentVerifiedAt) {
    plain.paymentStatus = 'Pending';
    delete plain.razorpayPaymentId;
  }
  return plain;
};

exports.createBooking = async (req, res) => {
  let lockToken;
  try {
    const { spaceId, startTime, endTime, vehicleType = 'car' } = req.body || {};
    if (!spaceId || !startTime || !endTime) {
      return res.status(400).json({ message: 'spaceId, startTime, endTime required' });
    }
    if (!mongoose.isValidObjectId(spaceId)) {
      return res.status(400).json({ message: 'Invalid parking space ID' });
    }
    if (!['bike', 'car', 'suv'].includes(vehicleType)) {
      return res.status(400).json({ message: 'Unsupported vehicle type' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      return res.status(400).json({ message: 'Valid startTime and endTime values are required' });
    }
    
    if (start <= now || end <= now) {
      return res.status(400).json({ message: 'Start/End time cannot be in the past' });
    }
    
    if (start >= end) {
      return res.status(400).json({ message: 'endTime must be after startTime' });
    }
    if (end - start < 30 * 60 * 1000) {
      return res.status(400).json({ message: 'Bookings must be at least 30 minutes long' });
    }
    if (start - now > 90 * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ message: 'Bookings can be made up to 90 days in advance' });
    }

    const existingSpace = await Space.findById(spaceId);
    if (!existingSpace) {
      return res.status(404).json({ message: 'Space not found' });
    }
    if (!isListingPublic(existingSpace)) {
      return res.status(404).json({ message: 'This parking space is not available for booking' });
    }
    // Serialize bookings per space so simultaneous requests cannot both pass
    // an overlap/capacity check against the same stale snapshot.
    lockToken = crypto.randomUUID();
    const lockedSpace = await acquireBookingLock(spaceId, lockToken);
    if (!lockedSpace) {
      return res.status(409).json({ message: 'This space is being booked or is no longer available. Refresh and try again.' });
    }

    if (!isListingPublic(lockedSpace)) {
      return res.status(404).json({ message: 'This parking space is not available for booking' });
    }
    if (!isInsideAvailability(lockedSpace, start, end)) {
      return res.status(400).json({ message: 'Requested time is not available for this space.' });
    }

    const vehicleCapacity = vehicleCapacityFor(lockedSpace, vehicleType);
    if (!Number.isFinite(vehicleCapacity) || vehicleCapacity <= 0) {
      return res.status(409).json({ message: `This space does not accept ${vehicleType} bookings` });
    }
    const hourlyRate = hourlyRateFor(lockedSpace, vehicleType);
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
      return res.status(409).json({ message: 'This parking space does not have a valid hourly price for this vehicle type' });
    }

    const vehicleFilter = vehicleType === 'car'
      ? { $or: [{ vehicleType: 'car' }, { vehicleType: { $exists: false } }] }
      : { vehicleType };
    const overlapFilter = {
      spaceId,
      startTime: { $lt: end },
      endTime: { $gt: start },
      ...ACTIVE_BOOKING_QUERY,
      ...vehicleFilter,
    };
    const existingReservation = await Booking.exists({
      driverId: req.user._id,
      spaceId,
      startTime: start,
      endTime: end,
      ...ACTIVE_BOOKING_QUERY,
      ...vehicleFilter,
    });
    if (existingReservation) {
      return res.status(409).json({ message: 'You already have a reservation for this exact time' });
    }

    const overlappingReservations = await Booking.countDocuments(overlapFilter);
    if (overlappingReservations >= vehicleCapacity) {
      return res.status(409).json({ message: 'This parking space is at full capacity for the selected time' });
    }

    // The app has no payment-provider callback yet. Ignore client-supplied
    // payment flags and always record payment as pending until a verified
    // provider webhook confirms collection.
    const durationHours = Math.max((end - start) / (1000 * 60 * 60), 1);
    const totalCost = Math.round(durationHours * hourlyRate * 100) / 100;
    const booking = await Booking.create({
      driverId: req.user._id,
      spaceId: lockedSpace._id,
      hostId: lockedSpace.hostId,
      startTime: start,
      endTime: end,
      totalCost,
      paymentStatus: 'Pending',
      bookingStatus: 'confirmed',
      vehicleType,
    });

    const populated = redactUnverifiedPayment(await Booking.findById(booking._id)
      .populate('driverId', 'name email')
      .populate('spaceId', 'address location')
      .populate('hostId', 'name email'));

    const io = socketUtil.getIO();
    if (io) {
      try {
        io.to(String(lockedSpace.hostId)).emit('booking:new', populated);
        io.to(String(req.user._id)).emit('booking:new', populated);
      } catch (err) {
        console.error('Socket emit error', err.message);
      }
    }

    res.status(201).json(populated);
  } catch (error) {
    console.error('Create booking error', error.message);
    res.status(500).json({ message: 'Unable to create booking' });
  } finally {
    if (lockToken && req.body?.spaceId) {
      try {
        await clearBookingLock(req.body.spaceId, lockToken);
      } catch (error) {
        console.error('Unable to release booking lock:', error.message);
      }
    }
  }
};

exports.getHostBookings = async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const bookings = await Booking.find({ hostId: req.user._id })
      .populate('spaceId')
      .populate('driverId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json(bookings.filter((booking) => booking.bookingStatus !== 'cancelled').map(redactUnverifiedPayment));
  } catch (error) {
    console.error('Get host bookings error', error.message);
    res.status(500).json({ message: 'Unable to fetch bookings' });
  }
};

exports.getDriverBookings = async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const bookings = await Booking.find({ driverId: req.user._id })
      .populate('spaceId')
      .populate('hostId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json(bookings.filter((booking) => booking.bookingStatus !== 'cancelled').map(redactUnverifiedPayment));
  } catch (error) {
    console.error('Get driver bookings error', error.message);
    res.status(500).json({ message: 'Unable to fetch bookings' });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }
    const Booking = require('../models/Booking');
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const isDriver = booking.driverId.toString() === req.user._id.toString();
    const isHost = booking.hostId.toString() === req.user._id.toString();
    if (!isDriver && !isHost && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }
    if (booking.bookingStatus === 'cancelled') {
      return res.json({ message: 'Booking is already cancelled' });
    }
    if (booking.startTime <= new Date()) {
      return res.status(409).json({ message: 'Bookings cannot be cancelled after their start time' });
    }
    if (booking.paymentVerifiedAt) {
      return res.status(409).json({ message: 'A verified payment requires a refund workflow before cancellation' });
    }

    booking.bookingStatus = 'cancelled';
    booking.cancelledAt = new Date();
    await booking.save();
    
    // Emit socket event for real-time updates
    const io = socketUtil.getIO();
    if (io) {
      try {
        io.to(String(booking.hostId)).emit('booking:deleted', { _id: booking._id });
        io.to(String(booking.driverId)).emit('booking:deleted', { _id: booking._id });
      } catch (err) {
        console.error('Socket emit error', err.message);
      }
    }

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Delete booking error', error.message);
    res.status(500).json({ message: 'Unable to delete booking' });
  }
};

exports.getHostSummary = async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const bookings = await Booking.find({
      hostId: req.user._id,
      paymentStatus: 'Paid',
      paymentVerifiedAt: { $ne: null },
      bookingStatus: { $ne: 'cancelled' },
    });
    const moneyCollected = bookings.reduce((sum, booking) => sum + (booking.totalCost || booking.totalPrice || 0), 0);
    const bookingsCount = bookings.length;
    
    res.json({
      moneyCollected,
      bookingsCount
    });
  } catch (error) {
    console.error('Get host summary error', error.message);
    res.status(500).json({ message: 'Unable to fetch summary' });
  }
};

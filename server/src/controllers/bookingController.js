exports.createBooking = async (req, res) => {
  try {
    const { spaceId, startTime, endTime, vehicleType = 'car', simulatePayment = true } = req.body;
    if (!spaceId || !startTime || !endTime) {
      return res.status(400).json({ message: 'spaceId, startTime, endTime required' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();
    
    if (start < now || end < now) {
      return res.status(400).json({ message: 'Start/End time cannot be in the past' });
    }
    
    if (start >= end) {
      return res.status(400).json({ message: 'endTime must be after startTime' });
    }

    // Validate availability slot
    const space = await Space.findById(spaceId);
    if (!space) {
      return res.status(404).json({ message: 'Space not found' });
    }

    const requestedDay = start.toLocaleDateString('en-IN', { weekday: 'long' });
    const slotFound = space.availability.some(slot => {
      if (slot.day !== requestedDay) return false;
      const slotDate = new Date(start);
      const [slotStartHour, slotStartMin] = slot.startTime.split(":").map(Number);
      const [slotEndHour, slotEndMin] = slot.endTime.split(":").map(Number);
      const slotStart = new Date(slotDate);
      slotStart.setHours(slotStartHour, slotStartMin, 0, 0);
      const slotEnd = new Date(slotDate);
      slotEnd.setHours(slotEndHour, slotEndMin, 0, 0);
      return start >= slotStart && end <= slotEnd;
    });
    if (!slotFound) {
      return res.status(400).json({ message: 'Requested time is not available for this space.' });
    }

    // Check for time conflicts
    const conflict = await hasConflict({ spaceId, startTime: start, endTime: end });
    if (conflict) {
      return res.status(409).json({ message: 'Time slot already booked' });
    }

    // Atomic update: increment current_bookings only if below capacity for vehicle type
    const vehicleCapacity = space.capacity[vehicleType] || space.capacity.car;
    const updatedSpace = await Space.findOneAndUpdate(
      {
        _id: spaceId,
        [`current_bookings.${vehicleType}`]: { $lt: vehicleCapacity }
      },
      {
        $inc: { [`current_bookings.${vehicleType}`]: 1 }
      },
      { new: true }
    );

    if (!updatedSpace) {
      return res.status(409).json({ message: 'Space is at full capacity for this vehicle type' });
    }

    // Calculate cost and process payment
    const durationHours = Math.max((end - start) / (1000 * 60 * 60), 1);
    const totalCost = Math.round(durationHours * space.pricePerHour * 100) / 100;

    let paymentStatus = 'Pending';
    let razorpayPaymentId = null;

    if (simulatePayment) {
      const payment = await simulateRazorpayPayment({
        amount: totalCost * 100,
        currency: 'INR',
      });
      paymentStatus = 'Paid';
      razorpayPaymentId = payment.paymentId;
    }

    // Create booking
    const booking = await Booking.create({
      driverId: req.user._id,
      spaceId: updatedSpace._id,
      hostId: updatedSpace.hostId,
      startTime: start,
      endTime: end,
      totalCost,
      paymentStatus,
      razorpayPaymentId,
      vehicleType,
    });

    const populated = await Booking.findById(booking._id)
      .populate('driverId', 'name email')
      .populate('spaceId', 'address location')
      .populate('hostId', 'name email');

    const io = socketUtil.getIO();
    if (io) {
      try {
        io.to(String(updatedSpace.hostId)).emit('booking:new', populated);
        io.to(String(req.user._id)).emit('booking:new', populated);
      } catch (err) {
        console.error('Socket emit error', err.message);
      }
    }

    res.status(201).json(populated);
  } catch (error) {
    console.error('Create booking error', error.message);
    res.status(500).json({ message: 'Unable to create booking' });
  }
};

exports.getHostBookings = async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const bookings = await Booking.find({ hostId: req.user._id })
      .populate('spaceId')
      .populate('driverId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json(bookings);
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
    res.json(bookings);
  } catch (error) {
    console.error('Get driver bookings error', error.message);
    res.status(500).json({ message: 'Unable to fetch bookings' });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user is host or admin
    if (booking.hostId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this booking' });
    }

    await Booking.findByIdAndDelete(req.params.id);
    
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

    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Delete booking error', error.message);
    res.status(500).json({ message: 'Unable to delete booking' });
  }
};

exports.getHostSummary = async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const bookings = await Booking.find({ hostId: req.user._id, paymentStatus: 'Paid' });
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

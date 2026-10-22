const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    spaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Space',
      required: true,
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    vehicleType: {
      type: String,
      enum: ['bike', 'car', 'suv'],
      default: 'car',
      required: true,
    },
    bookingStatus: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
      index: true,
    },
    cancelledAt: { type: Date, default: null },
    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid'],
      default: 'Pending',
    },
    razorpayPaymentId: {
      type: String,
    },
    // Only a verified payment callback may set this field. A client request
    // or generated placeholder ID is never evidence that money was collected.
    paymentVerifiedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({ spaceId: 1, startTime: 1, endTime: 1, bookingStatus: 1 });
bookingSchema.index({ driverId: 1, startTime: -1 });
bookingSchema.index({ hostId: 1, startTime: -1 });

module.exports = mongoose.model('Booking', bookingSchema);


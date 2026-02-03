const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false }
);

const capacitySchema = new mongoose.Schema(
  {
    bike: { type: Number, default: 0, min: 0 },
    car: { type: Number, default: 0, min: 0 },
    suv: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const priceSchema = new mongoose.Schema(
  {
    bike: { type: Number, required: true, min: 0 },
    car: { type: Number, required: true, min: 0 },
    suv: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const spaceSchema = new mongoose.Schema(
  {
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    photos: {
      type: [String],
      default: ['https://placehold.co/600x400?text=Parking+Spot'],
    },
    capacity: capacitySchema,
    pricePerHour: priceSchema,
    accessType: {
      type: String,
      enum: ['self_service', 'meet_greet', 'marshal'],
      default: 'meet_greet',
    },
    availabilitySchedule: [availabilitySchema],
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

spaceSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Space', spaceSchema);

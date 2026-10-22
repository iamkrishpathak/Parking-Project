const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false }
);

const vehicleAmountsSchema = new mongoose.Schema(
  {
    bike: { type: Number, default: 0, min: 0 },
    car: { type: Number, default: 0, min: 0 },
    suv: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const reviewEntrySchema = new mongoose.Schema(
  {
    action: { type: String, enum: ['draft_created', 'draft_updated', 'submitted', 'under_review', 'approved', 'rejected', 'changes_requested', 'resubmitted'], required: true },
    reason: { type: String, trim: true, maxlength: 2000 },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const checkSchema = new mongoose.Schema(
  {
    propertyAuthorization: { type: String, enum: ['pending', 'approved', 'action_required'], default: 'pending' },
    location: { type: String, enum: ['pending', 'approved', 'action_required'], default: 'pending' },
    physicalSpace: { type: String, enum: ['pending', 'approved', 'action_required'], default: 'pending' },
  },
  { _id: false }
);

const spaceSchema = new mongoose.Schema(
  {
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, trim: true, maxlength: 120, default: '' },
    description: { type: String, trim: true, maxlength: 3000, default: '' },
    propertyType: {
      type: String,
      enum: ['private_driveway', 'residential_society', 'commercial_lot', 'office_lot', 'other'],
      default: 'other',
    },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    // Mixed preserves older documents that stored these as either numbers or per-vehicle objects.
    pricePerHour: { type: mongoose.Schema.Types.Mixed, default: 0 },
    capacity: { type: mongoose.Schema.Types.Mixed, default: 1 },
    pricingByVehicle: { type: vehicleAmountsSchema, default: () => ({}) },
    capacityByVehicle: { type: vehicleAmountsSchema, default: () => ({}) },
    currentBookings: { type: vehicleAmountsSchema, default: () => ({}) },
    // Short-lived atomic mutex used while validating and creating a booking.
    bookingLockToken: { type: String, select: false },
    bookingLockUntil: { type: Date, select: false },
    availability: { type: [availabilitySchema], default: [] },
    availabilitySchedule: { type: [availabilitySchema], default: [] },
    photos: { type: [String], default: [] },
    physicalDetails: {
      lengthMeters: { type: Number, min: 0 },
      widthMeters: { type: Number, min: 0 },
      entranceWidthMeters: { type: Number, min: 0 },
    },
    authorizationEvidenceDescription: { type: String, trim: true, maxlength: 1000, default: '' },
    verificationStatus: {
      type: String,
      enum: ['draft', 'pending', 'under_review', 'action_required', 'approved', 'rejected'],
      default: 'draft',
      index: true,
    },
    verificationChecks: { type: checkSchema, default: () => ({}) },
    reviewerNotes: { type: String, trim: true, maxlength: 2000, default: '' },
    rejectionReason: { type: String, trim: true, maxlength: 2000, default: '' },
    submittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    submissionVersion: { type: Number, default: 0 },
    reviewHistory: { type: [reviewEntrySchema], default: [] },
    isPublished: { type: Boolean, default: false, index: true },
    isArchived: { type: Boolean, default: false, index: true },
    // Kept for compatibility with older clients/data. New authorization uses verificationStatus.
    isVerified: { type: Boolean, default: false },
    accessType: { type: String, enum: ['self_service', 'meet_greet', 'marshal'], default: 'meet_greet' },
  },
  { timestamps: true }
);

spaceSchema.index({ location: '2dsphere' });
spaceSchema.index({ verificationStatus: 1, isPublished: 1, createdAt: -1 });

module.exports = mongoose.model('Space', spaceSchema);

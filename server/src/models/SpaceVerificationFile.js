const mongoose = require('mongoose');

const spaceVerificationFileSchema = new mongoose.Schema(
  {
    spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    purpose: { type: String, enum: ['space_photo', 'listing_photo', 'property_authorization'], required: true },
    originalName: { type: String, required: true, maxlength: 255 },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 1 },
    privateKey: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SpaceVerificationFile', spaceVerificationFileSchema);

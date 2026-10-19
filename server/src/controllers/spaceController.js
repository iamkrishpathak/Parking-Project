const fs = require('fs');
const path = require('path');
const Space = require('../models/Space');
const SpaceFile = require('../models/SpaceVerificationFile');
const Booking = require('../models/Booking');
const {
  isHostKycApproved,
  isListingPublic,
  canHostEditListing,
  publicListingFilter,
  getEvidenceRequirements,
} = require('../utils/spaceVerification');
const { storePrivateFile, getPrivateFilePath } = require('../utils/privateFileStorage');

const VEHICLE_TYPES = ['bike', 'car', 'suv'];
const PROPERTY_TYPES = ['private_driveway', 'residential_society', 'commercial_lot', 'office_lot', 'other'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const parseAmounts = (amounts, integer = false) => {
  const parsed = {};
  for (const vehicleType of VEHICLE_TYPES) {
    const value = Number(amounts?.[vehicleType] ?? 0);
    if (!Number.isFinite(value) || value < 0 || value > (integer ? 500 : 1_000_000) || (integer && !Number.isInteger(value))) return null;
    parsed[vehicleType] = value;
  }
  return parsed;
};

const readPricing = (space) => {
  const rates = space.pricingByVehicle?.toObject?.() || space.pricingByVehicle || {};
  const legacy = space.pricePerHour?.toObject?.() || space.pricePerHour;
  const hasVehicleRates = VEHICLE_TYPES.some((vehicleType) => Number(rates[vehicleType]) > 0);
  return {
    bike: Number(hasVehicleRates ? rates.bike : typeof legacy === 'object' ? legacy?.bike : legacy) || 0,
    car: Number(hasVehicleRates ? rates.car : typeof legacy === 'object' ? legacy?.car : legacy) || 0,
    suv: Number(hasVehicleRates ? rates.suv : typeof legacy === 'object' ? legacy?.suv : legacy) || 0,
  };
};

const readCapacity = (space) => {
  const capacities = space.capacityByVehicle?.toObject?.() || space.capacityByVehicle || {};
  const legacy = space.capacity?.toObject?.() || space.capacity;
  const hasVehicleCapacity = VEHICLE_TYPES.some((vehicleType) => Number(capacities[vehicleType]) > 0);
  return {
    bike: Number(hasVehicleCapacity ? capacities.bike : typeof legacy === 'object' ? legacy?.bike : 0) || 0,
    car: Number(hasVehicleCapacity ? capacities.car : typeof legacy === 'object' ? legacy?.car : legacy) || 0,
    suv: Number(hasVehicleCapacity ? capacities.suv : typeof legacy === 'object' ? legacy?.suv : 0) || 0,
  };
};

const toPublicSpace = (space, photoFiles = [], { includeAuthorizationEvidence = false } = {}) => {
  const plain = space.toObject ? space.toObject() : { ...space };
  const rates = readPricing(plain);
  const capacities = readCapacity(plain);
  const availability = plain.availability?.length ? plain.availability : plain.availabilitySchedule || [];
  const { reviewerNotes, rejectionReason, reviewHistory, verificationChecks, reviewedBy, hostId, authorizationEvidenceDescription, ...safe } = plain;
  return {
    ...safe,
    pricePerHour: rates.car || rates.suv || rates.bike || 0,
    pricingByVehicle: rates,
    capacity: capacities.bike + capacities.car + capacities.suv || Number(plain.capacity) || 0,
    capacityByVehicle: capacities,
    availability,
    photos: [
      ...(plain.photos || []),
      ...photoFiles.map((file) => `/api/spaces/public/${plain._id}/photos/${file._id}`),
    ],
    verification: {
      status: plain.verificationStatus || (plain.isVerified ? 'pending' : 'draft'),
      submittedAt: plain.submittedAt || null,
      reviewedAt: plain.reviewedAt || null,
      reason: safe.verificationStatus === 'rejected' || safe.verificationStatus === 'action_required'
        ? (rejectionReason || reviewerNotes || '')
        : '',
    },
    ...(includeAuthorizationEvidence ? { authorizationEvidenceDescription } : {}),
  };
};

const findOwnedSpace = async (req, res) => {
  const space = await Space.findById(req.params.id);
  if (!space) {
    res.status(404).json({ message: 'Parking space not found' });
    return null;
  }
  if (String(space.hostId) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403).json({ message: 'You can only access your own parking space' });
    return null;
  }
  return space;
};

const validateListingBody = (body) => {
  const { title, description, address, propertyType, pricingByVehicle, capacityByVehicle, availability } = body || {};
  if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 120) return 'A listing title between 3 and 120 characters is required';
  if (typeof description !== 'string' || description.trim().length < 15 || description.trim().length > 3000) return 'Add a description between 15 and 3000 characters';
  if (typeof address !== 'string' || address.trim().length < 8 || address.trim().length > 500) return 'A complete address is required';
  if (!PROPERTY_TYPES.includes(propertyType)) return 'Choose a valid property category';
  const prices = parseAmounts(pricingByVehicle);
  const capacities = parseAmounts(capacityByVehicle, true);
  if (!prices || !capacities) return 'Enter valid non-negative prices and whole-number capacities';
  const enabledVehicles = VEHICLE_TYPES.filter((type) => capacities[type] > 0);
  if (!enabledVehicles.length) return 'At least one parking space capacity is required';
  if (enabledVehicles.some((type) => prices[type] <= 0)) return 'Set a positive hourly price for each vehicle type with capacity';
  if (!Array.isArray(availability) || availability.length === 0 || availability.length > 30) return 'Add at least one availability time';
  for (const slot of availability) {
    const validTime = (value) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    if (!WEEKDAYS.includes(slot?.day) || !validTime(slot?.startTime) || !validTime(slot?.endTime) || slot.startTime >= slot.endTime) {
      return 'Each availability time needs a weekday and valid start/end times';
    }
  }
  const lat = Number(body.latitude ?? body.location?.coordinates?.[1]);
  const lng = Number(body.longitude ?? body.location?.coordinates?.[0]);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) return 'Enter valid GPS latitude and longitude';
  const dimensions = body.physicalDetails || {};
  for (const key of ['lengthMeters', 'widthMeters', 'entranceWidthMeters']) {
    const value = Number(dimensions[key]);
    if (!Number.isFinite(value) || value <= 0 || value > 100) return 'Enter valid parking dimensions and entrance width';
  }
  return null;
};

exports.getVerificationRequirements = async (req, res) => {
  const propertyType = PROPERTY_TYPES.includes(req.query.propertyType) ? req.query.propertyType : 'other';
  return res.json(getEvidenceRequirements(propertyType));
};

exports.createSpace = async (req, res) => {
  try {
    if (!isHostKycApproved(req.user)) {
      return res.status(403).json({ message: 'Complete and receive approval for host KYC before listing a parking space' });
    }
    const validationError = validateListingBody(req.body || {});
    if (validationError) return res.status(400).json({ message: validationError });

    const prices = parseAmounts(req.body.pricingByVehicle);
    const capacities = parseAmounts(req.body.capacityByVehicle, true);
    const latitude = Number(req.body.latitude ?? req.body.location?.coordinates?.[1]);
    const longitude = Number(req.body.longitude ?? req.body.location?.coordinates?.[0]);
    const space = await Space.create({
      hostId: req.user._id,
      title: req.body.title.trim(),
      description: req.body.description.trim(),
      propertyType: req.body.propertyType,
      address: req.body.address.trim(),
      location: { type: 'Point', coordinates: [longitude, latitude] },
      pricePerHour: prices.car || prices.suv || prices.bike,
      capacity: Object.values(capacities).reduce((total, value) => total + value, 0),
      pricingByVehicle: prices,
      capacityByVehicle: capacities,
      availability: req.body.availability,
      availabilitySchedule: req.body.availability,
      physicalDetails: req.body.physicalDetails,
      authorizationEvidenceDescription: String(req.body.authorizationEvidenceDescription || '').trim().slice(0, 1000),
      verificationStatus: 'draft',
      isPublished: false,
      reviewHistory: [{ action: 'draft_created', reason: 'Draft created by host' }],
    });
    return res.status(201).json(toPublicSpace(space));
  } catch (error) {
    console.error('Create parking listing error:', error.message);
    return res.status(500).json({ message: 'Unable to create parking listing' });
  }
};

exports.updateSpace = async (req, res) => {
  try {
    const space = await findOwnedSpace(req, res);
    if (!space) return;
    if (!canHostEditListing(space)) return res.status(409).json({ message: 'This listing cannot be edited in its current state' });
    if (!isHostKycApproved(req.user)) return res.status(403).json({ message: 'Only KYC-approved hosts can edit a listing' });
    const validationError = validateListingBody(req.body || {});
    if (validationError) return res.status(400).json({ message: validationError });
    const prices = parseAmounts(req.body.pricingByVehicle);
    const capacities = parseAmounts(req.body.capacityByVehicle, true);
    const latitude = Number(req.body.latitude ?? req.body.location?.coordinates?.[1]);
    const longitude = Number(req.body.longitude ?? req.body.location?.coordinates?.[0]);
    Object.assign(space, {
      title: req.body.title.trim(),
      description: req.body.description.trim(),
      propertyType: req.body.propertyType,
      address: req.body.address.trim(),
      location: { type: 'Point', coordinates: [longitude, latitude] },
      pricePerHour: prices.car || prices.suv || prices.bike,
      capacity: Object.values(capacities).reduce((total, value) => total + value, 0),
      pricingByVehicle: prices,
      capacityByVehicle: capacities,
      availability: req.body.availability,
      availabilitySchedule: req.body.availability,
      physicalDetails: req.body.physicalDetails,
      authorizationEvidenceDescription: String(req.body.authorizationEvidenceDescription || '').trim().slice(0, 1000),
    });
    if (space.verificationStatus === 'approved') {
      // Unpublish immediately, then let the host upload any replacement evidence and resubmit.
      space.verificationStatus = 'draft';
      space.isPublished = false;
      space.isVerified = false;
      space.verificationChecks = { propertyAuthorization: 'pending', location: 'pending', physicalSpace: 'pending' };
      space.reviewerNotes = '';
      space.rejectionReason = '';
      space.reviewedAt = null;
      space.reviewedBy = null;
      space.submittedAt = null;
      space.reviewHistory.push({ action: 'draft_updated', reason: 'Material listing details changed; host must resubmit' });
    } else {
      space.verificationStatus = 'draft';
      space.isPublished = false;
    }
    await space.save();
    const files = await SpaceFile.find({ spaceId: space._id, purpose: 'space_photo' }).select('_id purpose mimeType originalName size createdAt');
    return res.json({ ...toPublicSpace(space, files), evidenceFiles: await getEvidenceSummary(space._id) });
  } catch (error) {
    console.error('Update parking listing error:', error.message);
    return res.status(500).json({ message: 'Unable to update parking listing' });
  }
};

const getEvidenceSummary = async (spaceId) => {
  const files = await SpaceFile.find({ spaceId }).select('_id purpose mimeType originalName size createdAt');
  return files.map((file) => ({
    _id: file._id,
    purpose: file.purpose,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    uploadedAt: file.createdAt,
  }));
};

exports.uploadSpaceFiles = async (req, res) => {
  const newlySavedPaths = [];
  try {
    const space = await findOwnedSpace(req, res);
    if (!space) return;
    if (!['draft', 'action_required', 'rejected'].includes(space.verificationStatus)) {
      return res.status(409).json({ message: 'Files can only be changed before a listing is submitted or after changes are requested' });
    }
    if (!isHostKycApproved(req.user)) return res.status(403).json({ message: 'Only KYC-approved hosts can upload listing evidence' });
    const photoFiles = req.files?.photos || [];
    const authorizationFiles = req.files?.authorizationDocuments || [];
    if (!photoFiles.length && !authorizationFiles.length) return res.status(400).json({ message: 'Choose listing photos or property authorization evidence to upload' });
    if (photoFiles.length > 5 || authorizationFiles.length > 3) return res.status(400).json({ message: 'Upload up to 5 space photos and 3 authorization documents' });
    const [existingPhotos, existingDocuments] = await Promise.all([
      SpaceFile.countDocuments({ spaceId: space._id, purpose: 'space_photo' }),
      SpaceFile.countDocuments({ spaceId: space._id, purpose: 'property_authorization' }),
    ]);
    if (existingPhotos + photoFiles.length > 5 || existingDocuments + authorizationFiles.length > 3) {
      return res.status(400).json({ message: 'A listing may have up to 5 photos and 3 authorization documents total' });
    }
    const records = [];
    for (const file of photoFiles) {
      const saved = await storePrivateFile(file.buffer, 'image', file.originalname);
      newlySavedPaths.push(path.join(saved.directory, saved.privateKey));
      records.push({ spaceId: space._id, ownerId: space.hostId, purpose: 'space_photo', ...saved });
    }
    for (const file of authorizationFiles) {
      const saved = await storePrivateFile(file.buffer, 'document', file.originalname);
      newlySavedPaths.push(path.join(saved.directory, saved.privateKey));
      records.push({ spaceId: space._id, ownerId: space.hostId, purpose: 'property_authorization', ...saved });
    }
    const created = await SpaceFile.insertMany(records);
    return res.status(201).json({ files: created.map(({ _id, purpose, originalName, mimeType, size, createdAt }) => ({ _id, purpose, originalName, mimeType, size, uploadedAt: createdAt })) });
  } catch (error) {
    await Promise.all(newlySavedPaths.map((filePath) => fs.promises.unlink(filePath).catch(() => {})));
    const clientMessage = /invalid|unsupported/i.test(error.message) ? error.message : 'Unable to store the uploaded files';
    console.error('Space file upload error:', error.message);
    return res.status(400).json({ message: clientMessage });
  }
};

exports.submitSpaceForReview = async (req, res) => {
  try {
    const space = await findOwnedSpace(req, res);
    if (!space) return;
    if (!isHostKycApproved(req.user)) return res.status(403).json({ message: 'Only KYC-approved hosts can submit a listing' });
    if (!['draft', 'action_required', 'rejected'].includes(space.verificationStatus)) {
      return res.status(409).json({ message: 'This listing is not ready for submission' });
    }
    const [photoCount, authorizationCount] = await Promise.all([
      SpaceFile.countDocuments({ spaceId: space._id, purpose: 'space_photo' }),
      SpaceFile.countDocuments({ spaceId: space._id, purpose: 'property_authorization' }),
    ]);
    const requirements = getEvidenceRequirements(space.propertyType);
    if (photoCount < requirements.minimumPhotos) return res.status(400).json({ message: `Upload at least ${requirements.minimumPhotos} photos showing the parking area, entrance, access road, boundaries, and available slots` });
    if (authorizationCount < requirements.minimumAuthorizationDocuments) return res.status(400).json({ message: `Upload at least ${requirements.minimumAuthorizationDocuments} document${requirements.minimumAuthorizationDocuments === 1 ? '' : 's'} supporting your authorization to offer this space` });
    if (!space.authorizationEvidenceDescription?.trim()) return res.status(400).json({ message: 'Describe the authorization evidence you uploaded' });
    space.verificationStatus = 'pending';
    space.isPublished = false;
    space.isVerified = false;
    space.verificationChecks = { propertyAuthorization: 'pending', location: 'pending', physicalSpace: 'pending' };
    space.reviewerNotes = '';
    space.rejectionReason = '';
    space.reviewedAt = null;
    space.reviewedBy = null;
    space.submittedAt = new Date();
    space.submissionVersion += 1;
    space.reviewHistory.push({ action: space.submissionVersion > 1 ? 'resubmitted' : 'submitted' });
    await space.save();
    return res.json({ message: 'Listing submitted for parking space verification', space: toPublicSpace(space) });
  } catch (error) {
    console.error('Submit parking listing error:', error.message);
    return res.status(500).json({ message: 'Unable to submit listing for review' });
  }
};

exports.getHostedSpaces = async (req, res) => {
  try {
    const spaces = await Space.find({ hostId: req.user._id }).sort({ createdAt: -1 });
    const spaceIds = spaces.map((space) => space._id);
    const evidenceFiles = await SpaceFile.find({ spaceId: { $in: spaceIds } })
      .select('_id spaceId purpose mimeType originalName size createdAt');
    const result = spaces.map((space) => {
      const files = evidenceFiles.filter((file) => String(file.spaceId) === String(space._id));
      return { ...toPublicSpace(space, [], { includeAuthorizationEvidence: true }), evidenceFiles: files.map(({ _id, purpose, originalName, mimeType, size, createdAt }) => ({ _id, purpose, originalName, mimeType, size, uploadedAt: createdAt })) };
    });
    res.json(result);
  } catch (error) {
    console.error('Fetch host spaces error:', error.message);
    res.status(500).json({ message: 'Unable to load spaces' });
  }
};

exports.getSpaceEvidence = async (req, res) => {
  try {
    const space = await findOwnedSpace(req, res);
    if (!space) return;
    return res.json({ files: await getEvidenceSummary(space._id) });
  } catch (error) {
    console.error('Fetch space evidence error:', error.message);
    return res.status(500).json({ message: 'Unable to load space evidence' });
  }
};

exports.streamSpaceEvidence = async (req, res) => {
  try {
    const space = await findOwnedSpace(req, res);
    if (!space) return;
    const file = await SpaceFile.findOne({ _id: req.params.fileId, spaceId: space._id }).select('+privateKey');
    if (!file) return res.status(404).json({ message: 'Evidence file not found' });
    const category = file.purpose === 'space_photo' ? 'image' : 'document';
    const filePath = getPrivateFilePath(category, file.privateKey);
    if (!filePath) return res.status(404).json({ message: 'Evidence file not found' });
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `${file.mimeType === 'application/pdf' ? 'attachment' : 'inline'}; filename="${encodeURIComponent(file.originalName)}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    return res.sendFile(filePath, (error) => {
      if (error && !res.headersSent) res.status(404).json({ message: 'Evidence file not found' });
    });
  } catch (error) {
    console.error('Stream space evidence error:', error.message);
    return res.status(500).json({ message: 'Unable to retrieve evidence file' });
  }
};

exports.deleteSpaceEvidence = async (req, res) => {
  try {
    if (req.user.role !== 'host') return res.status(403).json({ message: 'Only the listing host can change uploaded evidence' });
    const space = await findOwnedSpace(req, res);
    if (!space) return;
    if (space.verificationStatus === 'approved' && String(space.hostId) === String(req.user._id)) {
      space.verificationStatus = 'draft';
      space.isPublished = false;
      space.isVerified = false;
      space.verificationChecks = { propertyAuthorization: 'pending', location: 'pending', physicalSpace: 'pending' };
      space.reviewerNotes = '';
      space.rejectionReason = '';
      space.reviewedAt = null;
      space.reviewedBy = null;
      space.submittedAt = null;
      space.reviewHistory.push({ action: 'draft_updated', reason: 'Host replaced listing evidence; resubmission required' });
      await space.save();
    }
    if (!['draft', 'action_required', 'rejected'].includes(space.verificationStatus)) {
      return res.status(409).json({ message: 'Evidence can only be replaced before submission or after changes are requested' });
    }
    const file = await SpaceFile.findOne({ _id: req.params.fileId, spaceId: space._id }).select('+privateKey');
    if (!file) return res.status(404).json({ message: 'Evidence file not found' });
    const category = file.purpose === 'space_photo' ? 'image' : 'document';
    const filePath = getPrivateFilePath(category, file.privateKey);
    await file.deleteOne();
    if (filePath) await fs.promises.unlink(filePath).catch(() => {});
    return res.status(204).end();
  } catch (error) {
    console.error('Delete space evidence error:', error.message);
    return res.status(500).json({ message: 'Unable to remove evidence file' });
  }
};

exports.streamPublicSpacePhoto = async (req, res) => {
  try {
    const space = await Space.findById(req.params.id);
    if (!space || !isListingPublic(space)) return res.status(404).json({ message: 'Photo not found' });
    const file = await SpaceFile.findOne({ _id: req.params.fileId, spaceId: space._id, purpose: 'space_photo' }).select('+privateKey');
    if (!file) return res.status(404).json({ message: 'Photo not found' });
    const filePath = getPrivateFilePath('image', file.privateKey);
    if (!filePath) return res.status(404).json({ message: 'Photo not found' });
    res.set({ 'Content-Type': file.mimeType, 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=86400' });
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Serve listing photo error:', error.message);
    return res.status(404).json({ message: 'Photo not found' });
  }
};

exports.updatePrice = async (req, res) => {
  try {
    const space = await findOwnedSpace(req, res);
    if (!space) return;
    if (space.verificationStatus !== 'approved' || !space.isPublished) return res.status(409).json({ message: 'Only an approved listing can change its price' });
    const price = Number(req.body.price);
    if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ message: 'Price must be a positive amount' });
    const rates = readPricing(space);
    rates.car = price;
    space.pricingByVehicle = rates;
    space.pricePerHour = price;
    if (space.verificationStatus === 'approved') {
      space.verificationStatus = 'pending';
      space.isPublished = false;
      space.isVerified = false;
      space.verificationChecks = { propertyAuthorization: 'pending', location: 'pending', physicalSpace: 'pending' };
      space.reviewerNotes = '';
      space.rejectionReason = '';
      space.reviewedAt = null;
      space.reviewedBy = null;
      space.submittedAt = new Date();
      space.submissionVersion += 1;
      space.reviewHistory.push({ action: 'resubmitted', reason: 'Listing price changed' });
    }
    await space.save();
    return res.json(toPublicSpace(space));
  } catch (error) {
    console.error('Update price error:', error.message);
    return res.status(500).json({ message: 'Unable to update price' });
  }
};

exports.searchSpaces = async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ message: 'Valid lat and lng query params are required' });
    }
    const hasStartTime = req.query.startTime !== undefined;
    const hasEndTime = req.query.endTime !== undefined;
    if (hasStartTime !== hasEndTime) return res.status(400).json({ message: 'startTime and endTime must be provided together' });
    const requestedStart = hasStartTime ? new Date(req.query.startTime) : null;
    const requestedEnd = hasEndTime ? new Date(req.query.endTime) : null;
    if (requestedStart && (!Number.isFinite(requestedStart.getTime()) || !Number.isFinite(requestedEnd.getTime()) || requestedStart >= requestedEnd)) {
      return res.status(400).json({ message: 'A valid startTime and endTime range is required' });
    }
    const query = {
      ...publicListingFilter(),
      location: { $near: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: 5000 } },
    };
    const spaces = await Space.find(query);
    const publicPhotoFiles = await SpaceFile.find({ spaceId: { $in: spaces.map((space) => space._id) }, purpose: 'space_photo' })
      .select('_id spaceId purpose mimeType');
    let visibleSpaces = spaces;
    const start = requestedStart;
    const end = requestedEnd;
    if (start && end) {
      const overlappingBookings = await Booking.find({
        spaceId: { $in: spaces.map((space) => space._id) },
        startTime: { $lt: end },
        endTime: { $gt: start },
      }).select('spaceId');
      const bookedIds = new Set(overlappingBookings.map((booking) => String(booking.spaceId)));
      visibleSpaces = spaces.filter((space) => !bookedIds.has(String(space._id)));
    }
    return res.json(visibleSpaces.map((space) => toPublicSpace(space, publicPhotoFiles.filter((file) => String(file.spaceId) === String(space._id)))));
  } catch (error) {
    console.error('Search spaces error:', error.message);
    return res.status(500).json({ message: 'Unable to search spaces' });
  }
};

exports.getBookableSpace = async (spaceId) => {
  const space = await Space.findById(spaceId);
  if (!space || !isListingPublic(space)) return null;
  return space;
};

exports.helpers = { parseAmounts, readPricing, readCapacity, toPublicSpace, validateListingBody };

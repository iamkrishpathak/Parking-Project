const User = require('../models/User');
const Space = require('../models/Space');
const SpaceFile = require('../models/SpaceVerificationFile');
const { isHostKycApproved, reviewReasonError, getEvidenceRequirements } = require('../utils/spaceVerification');
const { getPrivateFilePath } = require('../utils/privateFileStorage');
const { toPublicSpace } = require('./spaceController').helpers;

const getFilesForSpace = async (spaceId) => {
  const files = await SpaceFile.find({ spaceId }).select('_id purpose originalName mimeType size createdAt');
  return files.map((file) => ({
    _id: file._id,
    purpose: file.purpose,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    uploadedAt: file.createdAt,
    downloadUrl: `/api/admin/parking-spaces/${spaceId}/files/${file._id}`,
  }));
};

const getReviewHistoryBySpace = async (spaces) => {
  const historyBySpace = new Map();
  const entries = spaces.flatMap((space) => (space.reviewHistory || []).map((entry) => ({
    spaceId: String(space._id),
    entry: entry.toObject ? entry.toObject() : { ...entry },
  })));
  const reviewerIds = [...new Set(entries.map(({ entry }) => entry.reviewerId && String(entry.reviewerId)).filter(Boolean))];
  const reviewers = reviewerIds.length
    ? await User.find({ _id: { $in: reviewerIds } }).select('name email')
    : [];
  const reviewersById = new Map(reviewers.map((reviewer) => [String(reviewer._id), { _id: reviewer._id, name: reviewer.name, email: reviewer.email }]));
  for (const { spaceId, entry } of entries) {
    const review = { ...entry, reviewer: entry.reviewerId ? reviewersById.get(String(entry.reviewerId)) || null : null };
    if (!historyBySpace.has(spaceId)) historyBySpace.set(spaceId, []);
    historyBySpace.get(spaceId).push(review);
  }
  return historyBySpace;
};

exports.getPendingVerifications = async (_req, res) => {
  try {
    const pendingUsers = await User.find({ role: 'host', kycStatus: 'pending' })
      .select('-password -googleId -passwordResetToken -passwordResetExpires -passwordResetRequestedAt -__v');
    pendingUsers.forEach((user) => user.kycDocuments.forEach((document) => {
      document.url = `/api/auth/kyc/${user._id}/documents/${encodeURIComponent(document.filename)}`;
    }));
    res.status(200).json(pendingUsers);
  } catch (error) {
    console.error('Error fetching pending verifications:', error.message);
    res.status(500).json({ message: 'Error fetching pending verifications' });
  }
};

exports.verifyUserKYC = async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }
    if (status === 'rejected' && !String(reason || '').trim()) {
      return res.status(400).json({ message: 'A reason is required when rejecting host KYC' });
    }
    const user = await User.findOneAndUpdate(
      { _id: req.params.userId, role: 'host' },
      { $set: { kycStatus: status, isVerified: status === 'approved', verificationNotes: status === 'rejected' ? String(reason).trim() : '' } },
      { new: true, runValidators: true }
    ).select('-password -googleId -passwordResetToken -passwordResetExpires -passwordResetRequestedAt -kycDocuments -__v');
    if (!user) return res.status(404).json({ message: 'Host account not found' });
    return res.status(200).json({ message: `Host KYC ${status} successfully`, user });
  } catch (error) {
    console.error('Error verifying user KYC:', error.message);
    return res.status(500).json({ message: 'Error verifying user KYC' });
  }
};

exports.getPendingParkingSpaces = async (req, res) => {
  const legacyResponse = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) {
      return this.statusCode >= 400
        ? res.status(this.statusCode).json(payload)
        : res.json(Array.isArray(payload?.data) ? payload.data : payload);
    },
  };
  return exports.getAllParkingSpaces({ ...req, query: { ...req.query, status: 'pending', page: undefined, limit: 100 } }, legacyResponse);
};

exports.reviewParkingSpace = async (req, res) => {
  try {
    const decision = req.body.decision || req.body.status;
    const normalizedDecision = decision === 'request_changes' ? 'action_required' : decision;
    const reason = String(req.body.reason || '').trim();
    const reasonError = reviewReasonError(normalizedDecision, reason);
    if (reasonError) return res.status(400).json({ message: reasonError });

    const space = await Space.findById(req.params.spaceId).populate('hostId', 'name email phone role kycStatus');
    if (!space) return res.status(404).json({ message: 'Parking space not found' });
    if (String(space.hostId?._id || space.hostId) === String(req.user._id)) {
      return res.status(403).json({ message: 'Admins cannot review a listing they own' });
    }
    if (!['pending', 'under_review'].includes(space.verificationStatus)) {
      return res.status(409).json({ message: 'Only submitted listings can be reviewed. The host must resubmit requested or rejected changes first.' });
    }
    if (normalizedDecision === 'under_review' && space.verificationStatus !== 'pending') {
      return res.status(409).json({ message: 'Only pending listings can be moved under review' });
    }
    const allowedCheckStatuses = ['pending', 'approved', 'action_required'];
    const checks = req.body.verificationChecks || {};
    const checkNames = ['propertyAuthorization', 'location', 'physicalSpace'];
    const normalizedChecks = Object.fromEntries(checkNames.map((name) => [name, checks[name]]));
    if (['approved', 'action_required'].includes(normalizedDecision) && checkNames.some((name) => !allowedCheckStatuses.includes(normalizedChecks[name]))) {
      return res.status(400).json({ message: 'Set a valid review status for property authorization, location, and physical space' });
    }
    if (normalizedDecision === 'approved' && checkNames.some((name) => normalizedChecks[name] !== 'approved')) {
      return res.status(400).json({ message: 'Approve each property authorization, location, and physical-space check before publishing' });
    }
    if (normalizedDecision === 'action_required' && !checkNames.some((name) => normalizedChecks[name] === 'action_required')) {
      return res.status(400).json({ message: 'Mark at least one review check as requiring changes' });
    }
    if (normalizedDecision === 'approved') {
      if (!isHostKycApproved(space.hostId)) return res.status(409).json({ message: 'The host must have approved KYC before a listing can be approved' });
      const requirements = getEvidenceRequirements(space.propertyType);
      const [photoCount, documentCount] = await Promise.all([
        SpaceFile.countDocuments({ spaceId: space._id, purpose: 'space_photo' }),
        SpaceFile.countDocuments({ spaceId: space._id, purpose: 'property_authorization' }),
      ]);
      if (photoCount < requirements.minimumPhotos || documentCount < requirements.minimumAuthorizationDocuments) {
        return res.status(409).json({ message: `Listing needs at least ${requirements.minimumPhotos} photos and ${requirements.minimumAuthorizationDocuments} authorization document(s) before approval` });
      }
    }

    const previousStatus = space.verificationStatus;
    space.verificationStatus = normalizedDecision;
    space.reviewerNotes = ['approved', 'under_review'].includes(normalizedDecision) ? '' : reason;
    space.rejectionReason = normalizedDecision === 'rejected' ? reason : '';
    space.reviewedBy = req.user._id;
    space.reviewedAt = new Date();
    space.isVerified = normalizedDecision === 'approved';
    space.isPublished = normalizedDecision === 'approved';
    if (['approved', 'action_required'].includes(normalizedDecision)) space.verificationChecks = normalizedChecks;
    space.reviewHistory.push({
      action: normalizedDecision === 'under_review' ? 'under_review' : normalizedDecision === 'approved' ? 'approved' : normalizedDecision === 'rejected' ? 'rejected' : 'changes_requested',
      reason: ['approved', 'under_review'].includes(normalizedDecision) ? '' : reason,
      reviewerId: req.user._id,
    });
    await space.save();
    const reviewHistoryBySpace = await getReviewHistoryBySpace([space]);
    return res.json({
      message: `Parking space ${normalizedDecision === 'action_required' ? 'returned for changes' : normalizedDecision}`,
      parkingSpace: { ...toPublicSpace(space, [], { includeAuthorizationEvidence: true }), host: space.hostId, priorStatus: previousStatus, verificationChecks: space.verificationChecks, reviewHistory: reviewHistoryBySpace.get(String(space._id)) || [], evidenceFiles: await getFilesForSpace(space._id) },
    });
  } catch (error) {
    console.error('Error reviewing parking space:', error.message);
    return res.status(500).json({ message: 'Error reviewing parking space' });
  }
};

exports.getParkingSpaceDetails = async (req, res) => {
  try {
    const space = await Space.findById(req.params.spaceId).populate('hostId', 'name email phone role kycStatus');
    if (!space) return res.status(404).json({ message: 'Parking space not found' });
    const reviewHistoryBySpace = await getReviewHistoryBySpace([space]);
    return res.json({ ...toPublicSpace(space, [], { includeAuthorizationEvidence: true }), host: space.hostId, verificationChecks: space.verificationChecks, reviewHistory: reviewHistoryBySpace.get(String(space._id)) || [], evidenceFiles: await getFilesForSpace(space._id) });
  } catch (error) {
    console.error('Error fetching parking space details:', error.message);
    return res.status(500).json({ message: 'Unable to fetch parking space details' });
  }
};

exports.streamParkingSpaceFile = async (req, res) => {
  try {
    const file = await SpaceFile.findOne({ _id: req.params.fileId, spaceId: req.params.spaceId }).select('+privateKey');
    if (!file) return res.status(404).json({ message: 'Verification evidence not found' });
    const category = file.purpose === 'space_photo' ? 'image' : 'document';
    const filePath = getPrivateFilePath(category, file.privateKey);
    if (!filePath) return res.status(404).json({ message: 'Verification evidence not found' });
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `${file.mimeType === 'application/pdf' ? 'attachment' : 'inline'}; filename="${encodeURIComponent(file.originalName)}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    return res.sendFile(filePath, (error) => {
      if (error && !res.headersSent) res.status(404).json({ message: 'Verification evidence not found' });
    });
  } catch (error) {
    console.error('Error streaming parking evidence:', error.message);
    return res.status(500).json({ message: 'Unable to retrieve verification evidence' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const filter = req.query.role ? { role: req.query.role } : {};
    const users = await User.find(filter)
      .select('-password -googleId -passwordResetToken -passwordResetExpires -passwordResetRequestedAt -kycDocuments -__v')
      .sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error.message);
    return res.status(500).json({ message: 'Error fetching users' });
  }
};

exports.getAllParkingSpaces = async (req, res) => {
  try {
    const { status } = req.query;
    const search = String(req.query.search || '').trim().slice(0, 100);
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = status ? { verificationStatus: status } : {};
    if (status && !['draft', 'pending', 'under_review', 'action_required', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid listing verification status' });
    }
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matchingHosts = await User.find({ role: 'host', $or: [{ name: { $regex: escapedSearch, $options: 'i' } }, { email: { $regex: escapedSearch, $options: 'i' } }] }).select('_id');
      filter.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { address: { $regex: escapedSearch, $options: 'i' } },
        { hostId: { $in: matchingHosts.map((host) => host._id) } },
      ];
    }
    if (req.query.submittedFrom || req.query.submittedTo) {
      const dateFilter = {};
      if (req.query.submittedFrom) {
        const dateValue = String(req.query.submittedFrom);
        const from = new Date(`${dateValue}T00:00:00.000Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || !Number.isFinite(from.getTime()) || from.toISOString().slice(0, 10) !== dateValue) return res.status(400).json({ message: 'Invalid submitted-from date' });
        dateFilter.$gte = from;
      }
      if (req.query.submittedTo) {
        const dateValue = String(req.query.submittedTo);
        const to = new Date(`${dateValue}T00:00:00.000Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || !Number.isFinite(to.getTime()) || to.toISOString().slice(0, 10) !== dateValue) return res.status(400).json({ message: 'Invalid submitted-to date' });
        to.setUTCDate(to.getUTCDate() + 1);
        dateFilter.$lt = to;
      }
      if (dateFilter.$gte && dateFilter.$lt && dateFilter.$gte >= dateFilter.$lt) {
        return res.status(400).json({ message: 'Submitted-from date must be on or before submitted-to date' });
      }
      filter.submittedAt = dateFilter;
    }
    const [total, spaces] = await Promise.all([
      Space.countDocuments(filter),
      Space.find(filter).populate('hostId', 'name email phone role kycStatus').sort({ submittedAt: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ]);
    const files = await SpaceFile.find({ spaceId: { $in: spaces.map((space) => space._id) } })
      .select('_id spaceId purpose originalName mimeType size createdAt');
    const reviewHistoryBySpace = await getReviewHistoryBySpace(spaces);
    const data = spaces.map((space) => ({
      ...toPublicSpace(space, [], { includeAuthorizationEvidence: true }),
      verificationChecks: space.verificationChecks,
      host: space.hostId,
      reviewHistory: reviewHistoryBySpace.get(String(space._id)) || [],
      reviewedBy: reviewHistoryBySpace.get(String(space._id))?.slice(-1)[0]?.reviewer || null,
      evidenceFiles: files.filter((file) => String(file.spaceId) === String(space._id)).map((file) => ({
        _id: file._id,
        purpose: file.purpose,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        uploadedAt: file.createdAt,
        downloadUrl: `/api/admin/parking-spaces/${space._id}/files/${file._id}`,
      })),
    }));
    return res.json({ data, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Error fetching parking spaces:', error.message);
    return res.status(500).json({ message: 'Error fetching parking spaces' });
  }
};

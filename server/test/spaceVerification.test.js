process.env.JWT_SECRET = 'space-verification-test-secret-with-32-byte-minimum';
process.env.PRIVATE_UPLOADS_DIR = require('path').join(require('os').tmpdir(), `parkbandhu-tests-${process.pid}`);

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const Space = require('../src/models/Space');
const SpaceFile = require('../src/models/SpaceVerificationFile');
const User = require('../src/models/User');
const spaceController = require('../src/controllers/spaceController');
const bookingController = require('../src/controllers/bookingController');
const adminController = require('../src/controllers/adminController');
const authController = require('../src/controllers/authController');
const authMiddleware = require('../src/middleware/authMiddleware');
const { identifyFile } = require('../src/utils/privateFileStorage');
const {
  isHostKycApproved,
  isListingPublic,
  canHostEditListing,
  reviewReasonError,
  publicListingFilter,
  getEvidenceRequirements,
} = require('../src/utils/spaceVerification');

const originalMethods = new Map();
const mockMethod = (target, key, replacement) => {
  if (!originalMethods.has(`${target.modelName || target.name}.${key}`)) {
    originalMethods.set(`${target.modelName || target.name}.${key}`, [target, key, target[key]]);
  }
  target[key] = replacement;
};

const mockResponse = () => ({
  statusCode: 200,
  body: null,
  headers: {},
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  set(headers) { Object.assign(this.headers, headers); return this; },
  sendFile(filePath, callback) { this.sentFile = filePath; callback?.(); return this; },
});

after(() => {
  for (const [target, key, original] of originalMethods.values()) target[key] = original;
});

test('a host must have approved KYC and a listing must be approved and published', () => {
  assert.equal(isHostKycApproved({ role: 'host', kycStatus: 'approved' }), true);
  assert.equal(isHostKycApproved({ role: 'host', kycStatus: 'pending' }), false);
  assert.equal(isHostKycApproved({ role: 'admin', kycStatus: 'approved' }), false);
  assert.equal(isListingPublic({ verificationStatus: 'approved', isPublished: true }), true);
  assert.equal(isListingPublic({ verificationStatus: 'approved', isPublished: false }), false);
  assert.equal(isListingPublic({ verificationStatus: 'pending', isPublished: true }), false);
  assert.deepEqual(publicListingFilter(), { verificationStatus: 'approved', isPublished: true });
});

test('only draft, rejected, or changes-requested listings can be edited', () => {
  for (const status of ['draft', 'rejected', 'action_required']) assert.equal(canHostEditListing({ verificationStatus: status }), true);
  assert.equal(canHostEditListing({ verificationStatus: 'pending' }), false);
});

test('review requires a reason for a rejection or change request', () => {
  assert.equal(reviewReasonError('approved', ''), null);
  assert.match(reviewReasonError('rejected', ''), /reason is required/i);
  assert.match(reviewReasonError('action_required', '   '), /reason is required/i);
  assert.equal(reviewReasonError('action_required', 'Please show the entrance.'), null);
  assert.equal(reviewReasonError('under_review', ''), null);
  assert.match(reviewReasonError('hold', ''), /Decision must be/i);
});

test('space evidence requirements can be configured per property type', () => {
  const previous = process.env.SPACE_VERIFICATION_REQUIREMENTS_JSON;
  process.env.SPACE_VERIFICATION_REQUIREMENTS_JSON = JSON.stringify({
    default: { minimumPhotos: 2, minimumAuthorizationDocuments: 1 },
    residential_society: { minimumPhotos: 3, minimumAuthorizationDocuments: 2, authorizationGuidance: 'Provide property-manager permission.' },
  });
  assert.deepEqual(getEvidenceRequirements('residential_society'), {
    minimumPhotos: 3,
    minimumAuthorizationDocuments: 2,
    authorizationGuidance: 'Provide property-manager permission.',
  });
  assert.equal(getEvidenceRequirements('private_driveway').minimumPhotos, 2);
  if (previous === undefined) delete process.env.SPACE_VERIFICATION_REQUIREMENTS_JSON;
  else process.env.SPACE_VERIFICATION_REQUIREMENTS_JSON = previous;
});

test('upload content is checked by file signature, not claimed MIME type', () => {
  assert.deepEqual(identifyFile(Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'image'), { extension: 'jpg', mimeType: 'image/jpeg' });
  assert.deepEqual(identifyFile(Buffer.from('%PDF-1.7'), 'document'), { extension: 'pdf', mimeType: 'application/pdf' });
  assert.equal(identifyFile(Buffer.from('<html>not a pdf</html>'), 'document'), null);
  assert.equal(identifyFile(Buffer.from('%PDF-1.7'), 'image'), null);
});

test('new Space documents default to unpublished draft state', () => {
  const space = new Space({ hostId: '507f1f77bcf86cd799439011', address: '10 Example Road', location: { type: 'Point', coordinates: [77, 28] } });
  assert.equal(space.verificationStatus, 'draft');
  assert.equal(space.isPublished, false);
  assert.equal(space.isVerified, false);
});

test('unapproved host cannot create a parking listing', async () => {
  let createCalled = false;
  mockMethod(Space, 'create', async () => { createCalled = true; });
  const res = mockResponse();
  await spaceController.createSpace({ user: { _id: 'host-1', role: 'host', kycStatus: 'pending' }, body: {} }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(createCalled, false);
});

test('an administrator cannot submit a listing as though they were a KYC-approved host', async () => {
  const space = { _id: 'space-admin', hostId: 'admin-1', verificationStatus: 'draft' };
  mockMethod(Space, 'findById', async () => space);
  let countCalled = false;
  mockMethod(SpaceFile, 'countDocuments', async () => { countCalled = true; return 3; });
  const res = mockResponse();
  await spaceController.submitSpaceForReview({ params: { id: 'space-admin' }, user: { _id: 'admin-1', role: 'admin' } }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(countCalled, false);
});

test('a driver explicitly choosing host sign-in is converted to an unverified host', async () => {
  const user = {
    _id: 'user-7', email: 'driver@example.test', name: 'Driver', password: 'hash', role: 'driver',
    kycStatus: 'approved', isVerified: true,
    comparePassword: async () => true,
    save: async () => {},
    toObject() { return { _id: this._id, email: this.email, name: this.name, role: this.role, kycStatus: this.kycStatus, isVerified: this.isVerified }; },
  };
  mockMethod(User, 'findOne', () => ({ select: async () => user }));
  const res = mockResponse();
  await authController.login({ body: { email: user.email, password: 'correct-password', role: 'host' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(user.role, 'host');
  assert.equal(user.kycStatus, 'pending');
  assert.equal(user.isVerified, false);
  assert.equal(res.body.user.role, 'host');
});

test('public registration cannot grant the admin role', async () => {
  mockMethod(User, 'findOne', async () => null);
  let createCalled = false;
  mockMethod(User, 'create', async () => { createCalled = true; });
  const res = mockResponse();
  await authController.register({ body: { name: 'Attacker', email: 'attacker@example.test', password: 'password', role: 'admin' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(createCalled, false);
});

test('malformed coordinates and listing data are rejected before persistence', async () => {
  let createCalled = false;
  mockMethod(Space, 'create', async () => { createCalled = true; });
  const res = mockResponse();
  await spaceController.createSpace({
    user: { _id: 'host-1', role: 'host', kycStatus: 'approved' },
    body: { address: 'Some full address', title: 'Spot', description: 'Long enough description', propertyType: 'other', latitude: 'NaN', longitude: 77 },
  }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(createCalled, false);
});

test('a newly created listing stays a private draft', async () => {
  let saved;
  mockMethod(Space, 'create', async (data) => { saved = data; return { ...data, _id: 'space-1' }; });
  const res = mockResponse();
  await spaceController.createSpace({
    user: { _id: 'host-1', role: 'host', kycStatus: 'approved' },
    body: {
      title: 'Covered parking bay', description: 'Covered parking with a lit entrance and direct road access.', address: '10 Example Road, Pune',
      propertyType: 'private_driveway', latitude: 18.52, longitude: 73.85,
      pricingByVehicle: { bike: 20, car: 40, suv: 55 }, capacityByVehicle: { bike: 1, car: 2, suv: 1 },
      physicalDetails: { lengthMeters: 5, widthMeters: 2.5, entranceWidthMeters: 3 },
      authorizationEvidenceDescription: 'Written permission from the property owner.',
      availability: [{ day: 'Monday', startTime: '08:00', endTime: '18:00' }],
    },
  }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(saved.verificationStatus, 'draft');
  assert.equal(saved.isPublished, false);
  assert.equal(res.body.verification.status, 'draft');
});

test('submission moves a complete draft to pending without publishing it', async () => {
  const space = {
    _id: 'space-2', hostId: 'host-1', verificationStatus: 'draft', isPublished: false, isVerified: false,
    authorizationEvidenceDescription: 'Permission document from society management.', submissionVersion: 0, reviewHistory: [],
    save: async () => {},
  };
  mockMethod(Space, 'findById', async () => space);
  mockMethod(SpaceFile, 'countDocuments', async ({ purpose }) => purpose === 'space_photo' ? 2 : 1);
  const res = mockResponse();
  await spaceController.submitSpaceForReview({ params: { id: 'space-2' }, user: { _id: 'host-1', role: 'host', kycStatus: 'approved' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(space.verificationStatus, 'pending');
  assert.equal(space.isPublished, false);
  assert.equal(space.submissionVersion, 1);
});

test('public search always filters to approved and published listings', async () => {
  let capturedQuery;
  mockMethod(Space, 'find', async (query) => { capturedQuery = query; return []; });
  mockMethod(SpaceFile, 'find', () => ({ select: async () => [] }));
  const res = mockResponse();
  await spaceController.searchSpaces({ query: { lat: '28.6', lng: '77.2' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(capturedQuery.verificationStatus, 'approved');
  assert.equal(capturedQuery.isPublished, true);
  assert.deepEqual(res.body, []);
});

test('booking rejects a listing that is not approved and published', async () => {
  mockMethod(Space, 'findById', async () => ({ verificationStatus: 'pending', isPublished: false }));
  const res = mockResponse();
  await bookingController.createBooking({ body: { spaceId: 'space-3', startTime: '2030-06-01T10:00:00.000Z', endTime: '2030-06-01T11:00:00.000Z' } }, res);
  assert.equal(res.statusCode, 404);
});

test('listing approval independently checks host KYC and publishes only on approval', async () => {
  const space = {
    _id: 'space-4', hostId: { _id: 'host-1', name: 'Host', email: 'host@example.test', role: 'host', kycStatus: 'approved' },
    verificationStatus: 'pending', isPublished: false, isVerified: false, reviewHistory: [],
    save: async () => {},
  };
  mockMethod(Space, 'findById', () => ({ populate: async () => space }));
  mockMethod(SpaceFile, 'countDocuments', async ({ purpose }) => purpose === 'space_photo' ? 2 : 1);
  mockMethod(User, 'find', () => ({ select: async () => [{ _id: 'admin-1', name: 'Reviewer', email: 'reviewer@example.test' }] }));
  const res = mockResponse();
  await adminController.reviewParkingSpace({
    params: { spaceId: 'space-4' },
    body: { decision: 'approved', verificationChecks: { propertyAuthorization: 'approved', location: 'approved', physicalSpace: 'approved' } },
    user: { _id: 'admin-1' },
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(space.verificationStatus, 'approved');
  assert.equal(space.isPublished, true);
  assert.equal(res.body.parkingSpace.reviewHistory[0].reviewer.name, 'Reviewer');
});

test('an admin cannot publish a listing until every verification check is approved', async () => {
  const space = {
    _id: 'space-4d', hostId: { _id: 'host-1', role: 'host', kycStatus: 'approved' },
    verificationStatus: 'pending', isPublished: false, reviewHistory: [], save: async () => {},
  };
  mockMethod(Space, 'findById', () => ({ populate: async () => space }));
  const res = mockResponse();
  await adminController.reviewParkingSpace({
    params: { spaceId: 'space-4d' },
    body: { decision: 'approved', verificationChecks: { propertyAuthorization: 'approved', location: 'pending', physicalSpace: 'approved' } },
    user: { _id: 'admin-3' },
  }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(space.isPublished, false);
});

test('admin can mark a submitted listing under review without publishing it', async () => {
  const space = {
    _id: 'space-4b', hostId: { _id: 'host-1', role: 'host', kycStatus: 'approved' },
    verificationStatus: 'pending', isPublished: false, isVerified: false, reviewHistory: [],
    save: async () => {},
  };
  mockMethod(Space, 'findById', () => ({ populate: async () => space }));
  mockMethod(User, 'find', () => ({ select: async () => [{ _id: 'admin-2', name: 'Reviewer', email: 'reviewer@example.test' }] }));
  const res = mockResponse();
  await adminController.reviewParkingSpace({ params: { spaceId: 'space-4b' }, body: { decision: 'under_review' }, user: { _id: 'admin-2' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(space.verificationStatus, 'under_review');
  assert.equal(space.isPublished, false);
});

test('an admin cannot review a listing that belongs to their own account', async () => {
  const space = { _id: 'space-4c', hostId: { _id: 'admin-owner', role: 'admin' }, verificationStatus: 'pending' };
  mockMethod(Space, 'findById', () => ({ populate: async () => space }));
  const res = mockResponse();
  await adminController.reviewParkingSpace({ params: { spaceId: 'space-4c' }, body: { decision: 'approved' }, user: { _id: 'admin-owner' } }, res);
  assert.equal(res.statusCode, 403);
});

test('rejecting a listing without a reason fails before loading a record', async () => {
  let lookupCalled = false;
  mockMethod(Space, 'findById', () => { lookupCalled = true; });
  const res = mockResponse();
  await adminController.reviewParkingSpace({ params: { spaceId: 'space-5' }, body: { decision: 'rejected' }, user: { _id: 'admin-1' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(lookupCalled, false);
});

test('host cannot retrieve another host’s private listing evidence', async () => {
  mockMethod(Space, 'findById', async () => ({ _id: 'space-6', hostId: 'owner-1' }));
  let lookupCalled = false;
  mockMethod(SpaceFile, 'findOne', () => { lookupCalled = true; });
  const res = mockResponse();
  await spaceController.streamSpaceEvidence({ params: { id: 'space-6', fileId: 'file-1' }, user: { _id: 'host-2', role: 'host' } }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(lookupCalled, false);
});

test('non-admin roles are denied admin routes', async () => {
  mockMethod(User, 'findById', async () => ({ _id: 'host-3', role: 'host' }));
  const token = jwt.sign({ id: 'host-3' }, process.env.JWT_SECRET);
  const res = mockResponse();
  let nextCalled = false;
  await authMiddleware(['admin'])({ headers: { authorization: `Bearer ${token}` } }, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('a host cannot fetch another account’s identity documents', async () => {
  const res = mockResponse();
  let lookupCalled = false;
  mockMethod(User, 'findById', () => { lookupCalled = true; });
  await authController.streamKycDocument({ params: { userId: 'owner-1', filename: 'private.pdf' }, user: { _id: 'host-2', role: 'host' } }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(lookupCalled, false);
});

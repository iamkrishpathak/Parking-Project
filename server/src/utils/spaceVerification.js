const LISTING_STATUSES = ['draft', 'pending', 'under_review', 'action_required', 'approved', 'rejected'];
const REVIEW_DECISIONS = ['under_review', 'approved', 'rejected', 'action_required'];
const DEFAULT_EVIDENCE_REQUIREMENTS = Object.freeze({
  minimumPhotos: 2,
  minimumAuthorizationDocuments: 1,
  authorizationGuidance: 'Provide evidence that supports your authority to offer this parking space. Examples may include ownership, a lease, or written permission from the owner or property manager.',
});

const getEvidenceRequirements = (propertyType) => {
  let configured = {};
  try {
    const parsed = JSON.parse(process.env.SPACE_VERIFICATION_REQUIREMENTS_JSON || '{}');
    configured = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    configured = {};
  }
  const configuredOverrides = configured[propertyType] || configured.default || {};
  const overrides = configuredOverrides && typeof configuredOverrides === 'object' && !Array.isArray(configuredOverrides)
    ? configuredOverrides
    : {};
  const boundedInteger = (value, fallback, minimum, maximum) => {
    const number = Number(value);
    return Number.isInteger(number) && number >= minimum && number <= maximum ? number : fallback;
  };
  const guidance = typeof overrides.authorizationGuidance === 'string' && overrides.authorizationGuidance.trim()
    ? overrides.authorizationGuidance.trim().slice(0, 500)
    : DEFAULT_EVIDENCE_REQUIREMENTS.authorizationGuidance;
  return {
    minimumPhotos: boundedInteger(overrides.minimumPhotos, DEFAULT_EVIDENCE_REQUIREMENTS.minimumPhotos, 1, 5),
    minimumAuthorizationDocuments: boundedInteger(overrides.minimumAuthorizationDocuments, DEFAULT_EVIDENCE_REQUIREMENTS.minimumAuthorizationDocuments, 1, 3),
    authorizationGuidance: guidance,
  };
};

const isHostKycApproved = (user) => user?.role === 'host' && user?.kycStatus === 'approved';

const isListingPublic = (space) =>
  space?.verificationStatus === 'approved' && space?.isPublished === true && space?.isArchived !== true;

const canHostEditListing = (space) =>
  ['draft', 'action_required', 'rejected', 'approved'].includes(space?.verificationStatus);

const reviewReasonError = (decision, reason) => {
  if (!REVIEW_DECISIONS.includes(decision)) return 'Decision must be under_review, approved, rejected, or action_required';
  if (['rejected', 'action_required'].includes(decision) && (typeof reason !== 'string' || !reason.trim())) {
    return 'A reason is required when rejecting a listing or requesting changes';
  }
  if (typeof reason === 'string' && reason.trim().length > 2000) return 'Review reason must be 2000 characters or fewer';
  return null;
};

const publicListingFilter = () => ({ verificationStatus: 'approved', isPublished: true, isArchived: { $ne: true } });

module.exports = {
  LISTING_STATUSES,
  REVIEW_DECISIONS,
  DEFAULT_EVIDENCE_REQUIREMENTS,
  getEvidenceRequirements,
  isHostKycApproved,
  isListingPublic,
  canHostEditListing,
  reviewReasonError,
  publicListingFilter,
};

# Parking space verification

ParkBandhu keeps host KYC and parking-space approval separate. Host KYC approval lets a host create a listing; each listing remains private until an admin approves it. Approval publishes that listing, and both public search and booking enforce the approved-and-published state on the server.

## Workflow

1. A host completes the existing KYC review.
2. A KYC-approved host creates a listing draft with its address, coordinates, category, vehicle pricing and capacity, availability, dimensions, photos, and property-authorization evidence.
3. The host submits the draft. It becomes `pending` and stays unpublished.
4. An admin can move it to `under_review`, approve and publish it, reject it, or request changes. Rejection and change requests require a reason.
5. The host edits rejected or change-requested listings and submits again. Editing an approved listing unpublishes it and requires another review.

The admin dashboard's **Parking Space Verification** tab includes status, host/location search, submitted-date filters, pagination, secure evidence previews, Google Maps preview, and reviewer history. The separate host KYC panel remains intact.

## Evidence requirements configuration

The backend defaults to two listing photos and one property-authorization document. Configure property-specific thresholds and host guidance in `server/.env` with `SPACE_VERIFICATION_REQUIREMENTS_JSON`:

```dotenv
SPACE_VERIFICATION_REQUIREMENTS_JSON={"default":{"minimumPhotos":2,"minimumAuthorizationDocuments":1},"residential_society":{"minimumPhotos":3,"minimumAuthorizationDocuments":1,"authorizationGuidance":"Provide permission from the society or property manager."}}
```

Supported property-type keys are `private_driveway`, `residential_society`, `commercial_lot`, `office_lot`, and `other`. A missing key falls back to `default`, then to the built-in defaults. Photo minimums can be 1–5; authorization-document minimums can be 1–3. The host form retrieves the active values from `GET /api/spaces/verification-requirements?propertyType=...`, and the server enforces them at submission and approval.

## Private evidence storage

Listing photos and authorization documents are stored under `server/private-uploads` by default, or under `PRIVATE_UPLOADS_DIR`. Keep this directory outside any static web root and mount durable private storage in production. The server checks file signatures and size, generates opaque filenames, and streams evidence only to the listing owner or an authenticated admin. Approved listing photos are served through a separate endpoint that first checks the listing is approved and published.

The current upload pipeline accepts JPEG, PNG, GIF, and WebP for space photos, plus JPEG, PNG, GIF, and PDF for authorization evidence, at up to 8 MB per file. Video upload is not enabled by the existing upload pipeline. The MVP relies on manual admin review; coordinates and photos are evidence to inspect, not proof of ownership. Configure the Google Maps JavaScript API key in `client/.env` using `REACT_APP_GOOGLE_MAPS_API_KEY` to render the map preview; otherwise the existing component shows setup guidance and a Google Maps link remains available.

## API overview

| Method and path | Purpose |
| --- | --- |
| `POST /api/spaces/create` | Create an unpublished listing draft (host KYC required) |
| `PUT /api/spaces/:id` | Update a host-owned draft or returned listing |
| `POST /api/spaces/:id/files` | Upload private photos and authorization documents |
| `POST /api/spaces/:id/submit` | Submit complete evidence for review |
| `GET /api/spaces/mine` | Get a host's own listings and verification statuses |
| `GET /api/admin/parking-spaces` | Paginated admin listing queue with filters |
| `GET /api/admin/parking-spaces/:spaceId` | Get listing details and secure evidence references |
| `PUT /api/admin/parking-spaces/:spaceId/review` | Start review, approve, reject, or request changes |
| `GET /api/admin/parking-spaces/:spaceId/files/:fileId` | Stream evidence to an authenticated admin |
| `GET /api/spaces/search` | Public search, restricted to approved and published listings |

Admin routes use the existing admin authentication middleware. The legacy `GET /api/admin/parking-spaces/pending` route still returns an array for the older dashboard client.

## Run and verify

Start the existing server and client as usual. Run the backend workflow tests with:

```sh
cd server && npm test
```

Run client tests and build with:

```sh
cd client && CI=true npm test -- --watchAll=false
cd client && npm run build
```

No database reset or migration is needed. Existing listing documents without a verification status remain excluded from public search until the host adds the required evidence, resubmits, and an admin reviews and approves them.

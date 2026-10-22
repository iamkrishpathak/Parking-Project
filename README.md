# ParkBandhu

ParkBandhu is a full-stack parking marketplace. Drivers search verified parking spaces and make reservations; hosts list spaces and manage availability; admins review host identity checks and parking-space evidence.

This README consolidates the project setup, architecture, workflows, API reference, Google services, security work, troubleshooting, and deployment notes previously spread across project Markdown files. It describes the current implementation and calls out unfinished production work instead of treating the MVP as production-ready.

## Current product

### Driver experience

- Search for parking by region, city, and area/landmark, with optional start and end times.
- View approved and published spaces on Google Maps and in nearby listing results.
- See vehicle-specific prices, capacity, availability, and photos.
- Book and cancel eligible reservations.
- Review active and upcoming reservations in the driver dashboard/profile.
- Open a reservation ticket with a QR code and download the ticket.
- Receive booking updates through authenticated Socket.IO connections.

Search only returns spaces that have passed admin review and are published. Results can also be empty when the selected area or time does not match a listing's location, schedule, vehicle type, or remaining capacity. The map is a visual aid; it does not make unapproved listings bookable.

### Host experience

- Register and sign in with a host account, or use Google sign-in.
- Complete host KYC before creating listings.
- Create a listing with address and map coordinates, property type, photos, vehicle-specific price/capacity, availability, dimensions, and property-authorization evidence.
- Submit listing evidence for a separate admin review.
- Track listing status and reviewer feedback, edit returned listings, resubmit, update prices, and remove/archive listings.
- Add photos to an already-approved listing; those photos appear with the listing without restarting its verification.
- View bookings, occupancy, and profile details.

Host KYC and listing verification are different reviews. A host with approved KYC can submit a space, but drivers will not see it until an admin approves and publishes that individual listing.

### Admin experience

- Review host KYC separately from parking-space verification.
- Inspect private evidence, search and filter submissions, and approve, reject, or request changes with a reason.
- Review a location preview and reviewer history for parking-space submissions.
- Manage users and parking-space listings through admin-only API routes.

### Authentication and account support

- Local registration and login for driver and host roles.
- Google Sign-In using Google Identity Services and a backend-verified ID token.
- Email verification for local accounts before booking or managing listings.
- Forgot-password and reset-password flow using one-time, expiring links.
- Role-specific dashboards and profile routes.

### Interface and maps

The interface uses a shared ParkBandhu visual system: blue/cyan actions, light backgrounds, rounded white cards, and consistent type. Responsive layout improvements cover the landing pages, dashboards, forms, and profiles for phone and tablet use. Test important flows on the actual target devices before launch.

Google Maps JavaScript API replaced the earlier Leaflet map integration. The frontend key is public by design, so it must be restricted by allowed website origins and enabled APIs in Google Cloud.

## Decisions considered and outcomes

| Consideration | Outcome |
| --- | --- |
| Separate driver and host journeys | Role-specific registration links, dashboards, profiles, and listing/booking permissions are in place. |
| Host identity versus listing trust | Kept host KYC and each parking-space evidence review as separate admin decisions. |
| Leaflet versus Google Maps | The project now renders Google Maps for search and verification previews. Configure a Maps key and billing/usage controls in Google Cloud. |
| Booking visibility and host updates | Driver and host booking APIs are separate; booking events are sent to each account's private Socket.IO room. |
| Ticket actions | The reservation UI presents a single ticket action; the ticket contains a QR code and a download option. |
| Post-approval photos | Hosts can add listing photos after approval without a second verification submission. Changes to core listing details or price can still unpublish/return a listing for review according to the affected workflow. |
| Password abuse | Password rules are implemented both in the client and the server. CAPTCHA/bot challenge was discussed but is not implemented. |
| Payments | A simulated “paid” flow was removed. There is no production payment gateway or verified payment webhook yet, so bookings remain unpaid/pending until one is integrated. |

## Six security improvements in the current hardening pass

1. **Password policy:** Registration and password reset require at least 8 characters, a lowercase letter, uppercase letter, number, and symbol. Passwords are limited to 72 UTF-8 bytes for bcrypt safety. The server enforces the rule even if a client is bypassed.
2. **JWT signing key:** The API fails to start unless JWT_SECRET is configured with at least 32 bytes. A unique key is required for each environment. Rotating it invalidates existing sessions.
3. **Verified email gate:** Local verification links are random, stored as hashes, expire after 24 hours, and are single-use. Booking and host listing mutations require a verified email. Google-verified accounts count as verified.
4. **Private real-time channels:** Socket connections require a valid JWT and existing account. A socket joins only its authenticated account room; clients cannot subscribe to another user's booking events by choosing an ID.
5. **Booking integrity:** Booking creation validates inputs and time windows, checks overlapping bookings against vehicle capacity while serializing requests for a space, and ignores payment claims from the browser. Ownership and cancellation rules are checked on the server.
6. **Abuse and payment controls:** Sensitive endpoints have request throttles and the API adds baseline response security headers. The payment simulator was removed: a booking is not treated as paid without server-verified payment evidence.

These changes reduce common account, booking, and data-exposure risks. They do not replace a security review, production-grade distributed rate limiting, payment provider integration, monitoring, or a deployment-specific security policy. The earlier “highest priority before real bookings” item remains relevant: complete the payment and production-readiness work below before accepting real money.

## Technology and architecture

- **Frontend:** React 18, React Router, Axios, Tailwind CSS, Framer Motion, Google Maps JavaScript API, Socket.IO client, QR code generation.
- **Backend:** Node.js, Express 5, MongoDB/Mongoose, JWT, bcryptjs, Nodemailer, Multer, Google Auth Library, Socket.IO.
- **Data and files:** MongoDB stores users, spaces, bookings, and private-file metadata. Evidence files are stored outside the public static web root and streamed through authenticated endpoints.

    Browser (React :3000)
      ├─ REST requests with Authorization: Bearer <ParkBandhu JWT>
      ├─ Google Identity Services login → POST /api/auth/google
      ├─ Google Maps JavaScript API
      └─ Authenticated Socket.IO connection
                 │
                 ▼
    Express API (:5001 in local .env)
      ├─ /api/auth      registration, sessions, email, profiles, host KYC
      ├─ /api/spaces    listing creation, review submission, search, photos
      ├─ /api/bookings  reservations and booking summaries
      ├─ /api/admin     admin-only verification and user operations
      ├─ MongoDB        user, space, booking, and evidence metadata
      └─ Private file storage (not served as a public directory)

The server has / and /health health-check endpoints. The root API response identifies the service; /health returns status and a timestamp.

### Main source locations

    client/src/
      App.js                    Route table
      api/client.js             Axios base URL and auth header
      context/AuthContext.js    ParkBandhu session state
      components/               Shared UI, maps, tickets, admin review panels
      pages/                    Home, login/register, driver/host/admin pages
      utils/                    Client-side helpers

    server/
      server.js                 Express, CORS, security headers, Socket.IO, startup
      scripts/createAdmin.js    Optional admin bootstrap from environment
      src/config/               MongoDB connection
      src/controllers/          Auth, space, booking, and admin behavior
      src/middleware/           Auth, roles, uploads, verification, rate limits
      src/models/               User, Space, Booking, evidence metadata
      src/routes/               REST route definitions
      src/utils/                JWT, email, private files, socket, validation
      test/                     Backend tests

### Frontend routes

| Route | Purpose |
| --- | --- |
| / | Public home page |
| /login, /register | Sign in and create a driver or host account |
| /forgot-password, /reset-password | Request and complete password reset |
| /verify-email | Consume an email-verification link |
| /driver, /driver/profile | Driver dashboard and account/booking profile |
| /host, /host/profile, /host-kyc | Host dashboard, profile, and KYC submission |
| /admin | Admin KYC and parking-space review |

The app also contains visual/demo routes for UI components.

## Getting started locally

### Requirements

- Node.js 18 or newer and npm.
- MongoDB local instance or MongoDB Atlas database.
- Google OAuth Web client ID for Google Sign-In.
- Google Maps API key for interactive maps.
- SMTP credentials if email verification and password reset emails should be delivered.

### 1. Configure the API

    cd server
    cp .env.example .env

Set values in server/.env. At minimum, configure:

    PORT=5001
    NODE_ENV=development
    CLIENT_URL=http://localhost:3000
    CORS_ORIGIN=http://localhost:3000
    MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
    JWT_SECRET=<at-least-32-random-bytes>
    GOOGLE_CLIENT_ID=<same-web-client-id-used-by-client>

Generate a development signing secret with:

    openssl rand -hex 32

Do not paste real secrets into Git, source files, screenshots, or support messages. Use separate secrets for development, staging, and production.

### 2. Configure the frontend

From client/, create client/.env based on client/.env.example:

    REACT_APP_API_URL=http://localhost:5001
    REACT_APP_GOOGLE_CLIENT_ID=<same-web-client-id-used-by-server>
    REACT_APP_GOOGLE_MAPS_API_KEY=<restricted-browser-maps-key>
    REACT_APP_GOOGLE_MAP_ID=DEMO_MAP_ID

REACT_APP_* values are embedded in the browser build. Never put a Google OAuth client secret, SMTP password, MongoDB password, admin password, or JWT signing secret in the client environment.

### 3. Install dependencies

    cd server
    npm install

    cd ../client
    npm install

### 4. Run the app

Open two terminals from the project root:

    # Terminal 1
    cd server
    npm start

    # Terminal 2
    cd client
    npm start

The API uses PORT from server/.env (the example sets 5001; the server code's fallback when unset is 5000). The React development server normally uses http://localhost:3000. Open that address in the browser.

Available scripts:

| Directory | Command | Purpose |
| --- | --- | --- |
| server | npm start | Start API |
| server | npm run dev | Start API with nodemon |
| server | npm test | Run backend Node tests |
| client | npm start | Start React development server |
| client | npm run build | Create optimized production build |
| client | npm test | Run React test runner |

### Optional admin bootstrap

On API startup, the project runs server/scripts/createAdmin.js. If ADMIN_PASSWORD is unset, it skips creating/synchronizing an admin. If configured, it creates the account or synchronizes that account's password from the environment. Configure a unique, strong password and a controlled ADMIN_EMAIL; do not rely on example or historical credentials.

## Environment reference

### Server (server/.env)

| Variable | Purpose |
| --- | --- |
| PORT | API port; set to 5001 for the local client configuration. |
| NODE_ENV | Runtime mode. |
| CLIENT_URL | Frontend URL used to construct verification/reset links and CORS allowlist. |
| CORS_ORIGIN | Additional allowed frontend origin(s); comma-separated values are supported. Do not use * for a credentialed production app. |
| PUBLIC_API_URL | Public API base URL for deployment/configuration where used. |
| MONGODB_URI | MongoDB connection string. Restrict database network access and credentials. |
| JWT_SECRET | Private token signing key; at least 32 bytes. |
| GOOGLE_CLIENT_ID | Google OAuth Web client ID; same audience as the frontend. |
| EMAIL_HOST, EMAIL_PORT | SMTP server and port. |
| EMAIL_USER, EMAIL_PASSWORD | SMTP login; use a provider app password where required. |
| EMAIL_FROM | Sender address shown to recipients. |
| ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME | Optional admin bootstrap values. Keep the password secret. |
| SPACE_VERIFICATION_REQUIREMENTS_JSON | Per-property evidence minimums and host guidance. |
| PRIVATE_UPLOADS_DIR | Optional durable private file storage location; keep outside public/static directories. |

### Client (client/.env)

| Variable | Purpose |
| --- | --- |
| REACT_APP_API_URL | API base URL, e.g. http://localhost:5001. |
| REACT_APP_GOOGLE_CLIENT_ID | Public Google OAuth Web client ID. |
| REACT_APP_GOOGLE_MAPS_API_KEY | Browser Maps key. Restrict by website origin and API. |
| REACT_APP_GOOGLE_MAP_ID | Google map style/ID; DEMO_MAP_ID can be used for local development. |

Restart the appropriate development server after changing environment variables. Rebuild/redeploy the frontend after changing build-time client variables.

## Google services setup

### Google Sign-In

1. In Google Cloud Console, select the intended project and create a Web application OAuth client.
2. Add the exact frontend origin under Authorized JavaScript origins. Locally this is http://localhost:3000; do not append /login, /register, or the API port.
3. Add the production HTTPS frontend origin as well when deploying.
4. Put the same client ID in client/.env as REACT_APP_GOOGLE_CLIENT_ID and in server/.env as GOOGLE_CLIENT_ID.
5. Restart/rebuild the client and restart the API.
6. If the OAuth app is in testing mode, add the intended accounts as test users. Complete Google's consent and verification requirements before broad release.

The app uses Google's popup credential callback; a redirect URI is not part of this implementation. Google verifies the browser origin; ParkBandhu's CORS setting independently controls browser access to the API. For Error 400: origin_mismatch, compare the exact scheme, hostname, and port shown by Google with the OAuth client's authorized JavaScript origins.

Google returns an ID token to the browser. The API verifies its signature, audience, and verified-email claim before linking/creating a ParkBandhu account and issuing the app's own JWT.

### Google Maps

1. Enable Maps JavaScript API in the correct Google Cloud project.
2. Create a browser API key.
3. Restrict it to the exact local and production website origins and to the Maps JavaScript API.
4. Set REACT_APP_GOOGLE_MAPS_API_KEY and optionally REACT_APP_GOOGLE_MAP_ID in the client environment.
5. Restart locally or rebuild/redeploy after changing the key.
6. Configure quotas, billing alerts, and usage limits before production. Google Maps Platform usage may incur charges; review current Google Maps Platform pricing and terms in Google Cloud.

The Maps key is necessarily visible in a browser bundle; origin/API restrictions and usage controls are the security boundary. It is not a server secret.

## Account, email, and password flows

### Registration and sign-in

- Registration permits driver or host roles; the server rejects other role values.
- Passwords are hashed by the server using bcrypt.
- Google registration/sign-in sends Google's credential to POST /api/auth/google; the backend validates it and handles an existing account with the same email according to the Google account-linking flow.
- Admin is not a public registration role.

### Email verification

Local registration generates a random single-use token. Only its SHA-256 hash is stored, and the link expires after 24 hours. Configure working SMTP and CLIENT_URL to deliver a usable link. Users may request a resend; a cooldown and API throttle limit repeated requests. Google-verified accounts are marked verified.

An unverified local account may authenticate but cannot create a booking or manage host listings until its email is verified. This helps keep the search and account experience available while protecting higher-impact actions.

### Forgot and reset password

- Request a link from /forgot-password; API endpoint is POST /api/auth/forgot-password.
- Responses do not reveal whether an email has an account.
- Reset links expire after 30 minutes, are single-use, and the stored token is hashed.
- Reset requests have a per-account cooldown and endpoint rate limit.
- SMTP must work. Check server logs for delivery errors, inbox spam/junk, sender configuration, and provider app-password rules.

## Host KYC and parking-space review

### Host identity/KYC

1. The host submits identity and address evidence from /host-kyc.
2. Uploads accept the configured image/PDF types and are limited to 10 MB per file; the API requires both identity and address files.
3. Evidence is stored privately and reviewed in the admin KYC panel.
4. An admin approves/rejects the host or requests additional documents. Rejections and document requests can include notes; notifications are sent when SMTP is configured.
5. Only KYC-approved hosts can create, edit, submit, or add listing photos through the protected host workflows.

The client uses the authenticated Axios API for multipart upload and lets Axios set the multipart boundary. If an upload says the token is invalid, sign in again, confirm the API URL, and inspect the request's Bearer header and server logs; do not manually force a malformed multipart content type.

### Parking-space verification

Host KYC approval does not automatically approve any listing. Each space follows this lifecycle:

    draft → pending → under_review → approved/published
                         ├─ rejected
                         └─ action_required → host edits → resubmitted

The host creates a draft with location, category/property type, description, vehicle-specific capacity and rates, availability, dimensions, photos, and property authorization. The host submits the required evidence; the listing remains unpublished until admin approval. Editing an approved listing's core details or price can return it to draft/pending review and hide it from drivers until approved again.

The admin Parking Space Verification panel supports status and location/host search, submitted-date filters, pagination, a map preview, private evidence review, and review history. Admin decisions can approve/publish, reject, or request changes with notes.

Default evidence requirements are two space photos and one property-authorization document. SPACE_VERIFICATION_REQUIREMENTS_JSON can override requirements for private_driveway, residential_society, commercial_lot, office_lot, and other; missing configurations fall back to default and then built-in defaults. Photo minimums are 1–5 and authorization minimums are 1–3.

Listing photos and authorization evidence are stored under server/private-uploads by default or PRIVATE_UPLOADS_DIR. The upload pipeline stores opaque filenames, checks file signatures and size, and streams private evidence only to the owner or an authenticated admin. Approved public listing photos use a separate endpoint that checks approved/published state. Space photo/evidence upload accepts the configured image/PDF types up to 8 MB per file; video upload is not enabled. Evidence is for manual review and does not by itself prove ownership.

Hosts can add photos to an already approved listing using the listing-photo flow; they do not need to reopen the KYC or space-evidence review just to add those photos. The host's own listing photo endpoint is separate from private authorization evidence.

## Booking, tickets, and payments

- Booking creation is driver-only and requires verified email.
- The server checks that the space is approved and published, validates the requested time and vehicle type, and checks overlapping active reservations against the matching vehicle capacity.
- Booking creation uses a per-space lock around the capacity check/write so simultaneous requests do not all rely on the same stale count in one server process.
- Booking and host/driver summary endpoints use account ownership and role authorization.
- Cancellation is blocked after the start time and for a booking with verified payment; that case requires a refund workflow.
- Cancellation is a status change, not hard deletion, and sends real-time updates to the driver/host rooms.
- The ticket UI displays booking details and a QR code and offers a download action.

**Payment is not production-ready.** The simulator has been removed. A client cannot mark its reservation paid. New reservations are Pending; host paid totals include only records with a verified payment timestamp. Integrate a payment provider and verify signed server-to-server webhooks before marking any reservation paid or accepting real money. Add idempotency, refund/cancellation handling, webhook replay protection, and reconciliation as part of that integration.

## API reference

All API paths below are mounted at the root shown. Protected routes require Authorization: Bearer <token>; admin routes also require the admin role. The server returns JSON for unmatched routes and does not expose internal error stacks to the client.

### Authentication (/api/auth)

| Method | Path | Purpose/access |
| --- | --- | --- |
| POST | /register | Create driver or host account; password policy and request limit apply. |
| POST | /login | Local sign-in; request limit applies. |
| POST | /google | Verify Google ID token and sign in/register. |
| POST | /verify-email | Verify one-time email link token. |
| POST | /resend-verification | Authenticated driver/host; resend verification email. |
| POST | /forgot-password | Request reset email; response is account-enumeration resistant. |
| POST | /reset-password | Exchange valid reset token for a policy-compliant password. |
| PUT | /profile | Update current account profile; authenticated. |
| GET | /kyc-status | Host KYC status; host-authenticated. |
| POST | /kyc-upload | Host KYC document upload; host-authenticated. |
| GET | /kyc/:userId/documents/:filename | Stream KYC evidence under route authorization. |
| GET | /admin/pending-kyc | Admin-only pending host verification queue. |
| PUT | /admin/kyc/:kycId/status | Admin-only approve/reject host KYC. |
| PUT | /admin/kyc/:kycId/request-docs | Admin-only request additional host evidence. |

### Parking spaces (/api/spaces)

| Method | Path | Purpose/access |
| --- | --- | --- |
| GET | /verification-requirements | Read active listing evidence requirements. |
| POST | /create | Create host listing draft; host/admin plus verified email and host KYC. |
| GET | /mine | Read current host's listings and status. |
| PUT | /:id | Update host-owned draft/returned listing. |
| DELETE | /:id | Host remove/archive listing. |
| GET | /search | Public search of approved and published listings; throttled. |
| POST | /:id/files | Upload space photos and property-authorization evidence; authenticated host workflow. |
| POST | /:id/listing-photos | Add photos to approved listing. |
| POST | /:id/submit | Submit listing evidence for admin verification. |
| GET | /:id/files | Read evidence references subject to access checks. |
| GET | /:id/files/:fileId | Stream private evidence to owner/admin. |
| DELETE | /:id/files/:fileId | Remove evidence from an editable listing. |
| GET | /public/:id/photos/:fileId | Stream an approved, published listing photo. |
| PUT | /:id/price | Update listing price; approved-listing review rules apply. |

### Bookings (/api/bookings)

| Method | Path | Purpose/access |
| --- | --- | --- |
| POST | /create | Create driver booking; verified email, capacity/time checks, throttle. |
| GET | /driver | Current driver's bookings. |
| GET | /host | Host's bookings for their spaces. |
| GET | /host/summary | Host booking/earnings summary; verified payments only count as paid. |
| DELETE | /:id | Cancel an eligible booking; driver/host/admin authorization and ownership checks. |

### Admin (/api/admin)

| Method | Path | Purpose/access |
| --- | --- | --- |
| GET | /users | Admin-only user listing. |
| GET | /verifications/pending | Admin-only host KYC queue. |
| PUT | /verifications/user/:userId | Admin-only host KYC decision. |
| GET | /parking-spaces | Admin-only paginated/filterable listing review queue. |
| GET | /parking-spaces/pending | Legacy admin client pending-listings response. |
| GET | /parking-spaces/:spaceId | Admin-only listing detail. |
| GET | /parking-spaces/:spaceId/files/:fileId | Admin-only evidence stream. |
| PUT | /parking-spaces/:spaceId/review | Admin-only start review, approve, reject, or request changes. |

## Email delivery

The mail service uses Nodemailer/SMTP for account verification, password resets, and KYC notifications. Configure EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM, and CLIENT_URL in the API environment. For Gmail, use a Google App Password where required, not the account's regular password. EMAIL_USER is the SMTP login; EMAIL_FROM is the sender identity and can be the same address if the provider permits it.

The UI's generic “if an account exists, we sent a reset link” message is intentional for privacy. It does not prove an email was delivered. Verify SMTP acceptance in the server output/provider logs, recipient address, spam folder, and sender configuration.

## Troubleshooting

### API returns Route not found

Check the API route mount and method: password reset is POST http://localhost:5001/api/auth/forgot-password, not a browser page route. Check REACT_APP_API_URL, restart the API after code/config changes, and inspect the Network panel for the exact URL/method.

### Google error origin_mismatch

Add the exact frontend origin from Google's error details to the OAuth Web client Authorized JavaScript origins. Use scheme + hostname + port only; for local CRA use http://localhost:3000. The API port is not the browser origin. Confirm the client ID in frontend and server environments is the same.

### Google button says client ID is missing

Set REACT_APP_GOOGLE_CLIENT_ID in client/.env, then restart the React server. Set the same ID as GOOGLE_CLIENT_ID in the API environment.

### Maps do not load or show an empty map

Set a valid REACT_APP_GOOGLE_MAPS_API_KEY, enable Maps JavaScript API, check browser console restrictions/billing errors, and confirm the key's website restrictions include the current origin. An unavailable map does not imply that the server has no listings.

### Email does not arrive

Confirm SMTP is configured in the server environment, use an app password if required, check terminal/provider logs, inbox spam, recipient spelling, and CLIENT_URL. Reset links expire in 30 minutes; verification links expire in 24 hours. The generic reset success text intentionally does not reveal whether the account exists.

### Host cannot create or see a listing

Check the signed-in account role is host, the email is verified, and host KYC is approved. A listing must separately pass space verification and be published before it appears in driver search. Search also filters by location, time, vehicle type, and available capacity.

### Driver does not see a booking or host update

Check GET /api/bookings/driver for the driver and /api/bookings/host for the listing owner, verify the booking's times/status and correct logged-in account, and inspect the API and Socket.IO Network connections. Realtime requires an unexpired JWT; refresh/re-authenticate if the signing secret was rotated.

### KYC or evidence upload fails

Check supported format and size, use the authenticated request, and review server logs. Do not manually override FormData's multipart boundary. Private evidence should be streamed through the authenticated API rather than opened from a public upload folder.

### Admin dashboard does not show a request

Confirm the current user has role admin, the host/listing submitted successfully, and the relevant tab/status filter is selected. Host KYC and parking-space verification use separate queues.

## Deployment and operations checklist

Before public launch:

- [ ] Set production NODE_ENV, PORT, CLIENT_URL, and exact CORS_ORIGIN; use HTTPS and never use wildcard CORS for a credentialed public deployment.
- [ ] Set unique strong JWT_SECRET, SMTP, database credentials, OAuth IDs, and an admin bootstrap password in the hosting provider's secret store.
- [ ] Restrict MongoDB network access, use least-privilege credentials, enable automated backups, and test a restore.
- [ ] Put private uploads on durable private storage outside the public web root; set PRIVATE_UPLOADS_DIR and confirm owner/admin access checks.
- [ ] Configure the deployed Google OAuth origin and restricted Maps key; set quotas and billing alerts.
- [ ] Set a real SMTP sender/domain and verify account and reset email delivery.
- [ ] Use a shared rate-limit store (for example Redis) before multiple API instances; the current throttle buckets are in process memory and do not coordinate across instances.
- [ ] Integrate a payment provider with signed, idempotent server-side webhooks, refund behavior, and reconciliation before accepting real payments.
- [ ] Configure structured logs, uptime/error monitoring, retention, alerting, dependency updates, and an incident/rollback procedure.
- [ ] Exercise driver, host, admin, booking, cancellation, email, upload, and mobile/tablet flows in a staging environment.
- [ ] Review privacy, evidence-retention, account recovery, accessibility, and legal requirements for the deployment locations.

### Known limitations and next work

- No production payment gateway, payment webhook, or refund workflow is connected. Payment status remains pending until verified payment evidence exists.
- CAPTCHA or a managed bot challenge was considered but not implemented. Password rules and API throttles are present; rate limits are currently process-local.
- The MVP uses manual host/listing reviews. Uploaded evidence and map coordinates are inputs for human review, not automated proof of property ownership.
- Email delivery depends on a correctly configured SMTP provider.
- Private upload storage needs durable, access-controlled production storage and an explicit retention/backup policy.
- Search results depend on the selected location/time/vehicle and approved published status; no listing should be assumed to exist solely because the map can display nearby places.
- Responsive styling has been improved across key views; perform device/browser QA on real phones and tablets before claiming full compatibility.

## Change history and current result

Recent product and reliability work addressed issues raised during project development:

- Added forgot-password/reset-password backend and frontend flow after the API route was initially missing.
- Added Google Sign-In and documented OAuth origin/client configuration; replaced Leaflet maps with Google Maps.
- Built distinct host registration/login journeys, host profile, host listing removal, and host-side booking information.
- Added separate host KYC and listing verification workflows, private evidence viewing, review feedback, and resubmission.
- Improved driver search/map cards, booking visibility and updates, driver profile active/upcoming reservations, and downloadable QR tickets.
- Updated dashboard and pre-login landing experiences to share the home-page palette and typography, with responsive phone/tablet layouts.
- Enforced the password policy and applied the six security hardening changes listed above.

The current result is a more complete parking marketplace MVP with separate driver, host, and admin workflows, listing approval before public discovery, password/email protections, Google services, and clearer account/booking interfaces. Production readiness still depends on the unfinished items above; the project should not claim that money has been collected or that the implementation has received an independent security certification.

## Removed documentation

This file is the canonical project guide. Earlier standalone setup, KYC, architecture, token-fix, Google OAuth, deployment, quick-reference, and Create React App README files were consolidated here to avoid conflicting or stale instructions.

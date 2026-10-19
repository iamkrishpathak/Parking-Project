# Google Sign-In in ParkBandhu

This guide explains how Google Sign-In is configured, how a sign-in request moves through the app, and which files to change when extending it.

## How the flow works

1. The login or registration page renders the Google button.
2. Google Identity Services returns an ID-token credential to the browser callback.
3. The client sends that credential to `POST /api/auth/google`.
4. The API verifies the token with Google's public keys and checks that its audience is the configured OAuth client ID. It also requires a verified email address.
5. The API finds the user's Google-linked account, links an existing account with the same email, or creates a new account. It then returns ParkBandhu's own JWT and user object.
6. The client saves the ParkBandhu session through `AuthContext` and navigates to the user's role dashboard.

The Google ID token is used to establish identity. The app's own JWT is used for later API requests.

## Files involved

| File | Responsibility |
| --- | --- |
| `client/src/components/GoogleSignInButton.jsx` | Loads Google's Identity Services script, initializes the button with the frontend client ID, and passes the returned credential to the page. |
| `client/src/pages/Login.jsx` | Sends the credential to the API during sign-in and routes the user by role. |
| `client/src/pages/Register.jsx` | Sends the credential and selected `driver` or `host` role when creating an account. |
| `client/src/api/client.js` | Sets the API base URL; defaults to `http://localhost:5001`. |
| `client/src/context/AuthContext.js` | Stores the ParkBandhu JWT and user session in local storage. |
| `server/server.js` | Loads `server/.env`, configures CORS, and mounts the auth router at `/api/auth`. |
| `server/src/routes/authRoutes.js` | Declares `POST /google` on the auth router, producing `POST /api/auth/google`. |
| `server/src/controllers/authController.js` | Verifies the Google credential, handles account lookup/linking/creation, then issues the ParkBandhu JWT. |
| `server/src/models/User.js` | Stores `googleId` and `authProvider` alongside the regular user fields. |
| `server/package.json` | Includes `google-auth-library`, used by the API to verify ID tokens. |

## Local configuration

Create or update these files. Use the **same Web application OAuth client ID** in both places:

`client/.env`:

```env
REACT_APP_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

`server/.env`:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

The client ID is public configuration; do not put a client secret in the frontend. Keep actual `.env` files out of source control. The checked-in `.env.example` files contain placeholders only.

After changing either value, restart the client and server. Create React App reads `REACT_APP_*` variables when it starts/builds, so refreshing the browser alone does not reload a changed client ID.

## Google Cloud Console setup

1. Select the Google Cloud project that owns the OAuth client.
2. Open **Google Auth Platform → Clients** and create or edit a **Web application** client.
3. Under **Authorized JavaScript origins**, add the exact frontend origin:
   - Local development: `http://localhost:3000`
   - Production: `https://your-frontend-domain.example`
4. Save the client and use its client ID in both environment variables above.

An origin is the scheme, hostname, and port. Do not include a route such as `/login`. The API address (`http://localhost:5001`) is not the browser origin and does not go in this list. This implementation uses Google's popup credential callback, so the **Authorized JavaScript origins** setting is the relevant one; a redirect URI is not used by this flow.

For an app in Google's External testing mode, add the accounts that need to test it as test users. Follow Google's consent-screen and verification requirements before making sign-in available broadly.

## Deployment configuration

Configure environment variables in the hosting providers; do not commit production credentials or environment files.

- **Frontend hosting:** set `REACT_APP_GOOGLE_CLIENT_ID` to the Web client ID. Set `REACT_APP_API_URL` to the deployed API URL. Add the deployed frontend's HTTPS origin to the same OAuth client's **Authorized JavaScript origins**, then rebuild/redeploy the frontend after changing build-time variables.
- **Backend hosting:** set `GOOGLE_CLIENT_ID` to that same Web client ID. Configure `CLIENT_URL` or `CORS_ORIGIN` to allow the deployed frontend origin. This project declares `GOOGLE_CLIENT_ID` and the CORS variables in `render.yaml` for the Render API service.

Google's authorized JavaScript origin and the API's CORS origin are separate settings: the former is checked by Google during sign-in; the latter controls browser requests to the ParkBandhu API.

## Troubleshooting

- **The page says a client ID is missing:** check `REACT_APP_GOOGLE_CLIENT_ID` in `client/.env`, then restart the client.
- **Google shows `Error 400: origin_mismatch`:** read the origin in Google's error details and add that exact origin under **Authorized JavaScript origins** on the OAuth client whose client ID is in the frontend environment. Check scheme, hostname, and port; for local development it should be `http://localhost:3000`.
- **The API says Google sign-in is not configured:** check `GOOGLE_CLIENT_ID` in `server/.env` or the backend hosting environment, then restart/redeploy the API.
- **The API cannot verify the credential:** make sure the frontend and backend use the same client ID and that the frontend is sending the Google credential to `/api/auth/google`.
- **Sign-in reaches the API but returns an account error:** check whether the email is already linked to another Google account or whether the existing account can be linked by email.

## Where to make future changes

- To change the button's appearance or how Google's script is initialized, edit `client/src/components/GoogleSignInButton.jsx`.
- To change post-sign-in navigation or registration role behavior, edit `client/src/pages/Login.jsx` or `client/src/pages/Register.jsx`.
- To change token verification, email checks, or account linking, edit `server/src/controllers/authController.js`.
- To change the endpoint path, update `server/src/routes/authRoutes.js` and the matching client request.
- To change stored identity fields, update `server/src/models/User.js` and account for existing MongoDB records.

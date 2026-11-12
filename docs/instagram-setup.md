# Configure the real Instagram integration

## Status and prerequisites

This is an extension of the original demo, not a replacement. Demo Mode (`/dashboard`, `/reels`, `/studio`) requires no credentials. The real workspace is `/instagram`.

Live sign-in needs **both** a separately deployed always-on backend **and** a configured Meta application. A frontend deployment alone cannot hold private RAM sessions. When configuration is absent, the login button fails safely with a friendly explanation instead of asking for credentials or displaying fictional account data.

No real credentials are supplied with this repository. Never share secrets in chat, source control, screenshots, browser JavaScript, `VITE_*` variables, or public bug reports.

## Why this uses Unified Login

Primary Meta documentation checked **November 12, 2026** states that new apps cannot set up the older standalone Instagram Login API. The current route for a new app is **Instagram API with Unified Login**, built on Facebook Login for Business. It offers Instagram sign-in in Meta's official dialog; a Facebook Page is not required, but a **business portfolio is required**.

The user approved this current setup and the separate RAM-only backend. This integration therefore uses **Meta App ID + Meta App Secret + Configuration ID**, not the legacy Instagram-specific App ID/Secret. Do not copy a legacy tutorial's `graph.instagram.com` endpoints or `instagram_business_*` permissions into this implementation.

Official references:

- [Unified Login overview](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login)
- [Current setup guide](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started)
- [Standalone Login migration/new-app restriction](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/migration-guide)
- [Authentication and access tokens](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/authentication)

## 1. Create/configure your Meta app

In [Meta for Developers](https://developers.facebook.com/apps/):

1. Create a supported business app/use-case app owned by your Meta business portfolio. Add **Manage messaging & content on Instagram**. Use Facebook Login **for Business**, not the old consumer Facebook Login product.
2. Open **Use cases → Manage messaging & content on Instagram → Customize → API setup with Unified login**.
3. Under **Configure your app**, create/select a configuration labeled **Instagram Login Compatible**.
4. Edit its permissions. ReelCoach requires:
   - `instagram_basic` — profile and media access.
   - `instagram_manage_insights` — account/media performance metrics.
5. Meta's current default compatible configuration also marks `instagram_manage_messages` as required. The UI discloses this. **Do not enable message subscriptions**, and do not add publishing, comment-management, ad-management, ad-read, or event permissions unless Meta's actual configuration explicitly requires them. Remove optional permissions. ReelCoach does not implement any messaging, publishing, ad, or comment-management calls.
6. If Meta does not offer a configuration with this permission selection for your app, stop and review the current official setup requirements. Do not silently substitute an undocumented login flow. Mandatory permissions may require their own App Review justification even though ReelCoach does not use messaging; approval is not guaranteed.
7. Set the HTTPS **Redirect URL** to exactly:

   ```text
   https://reelcoach.vercel.app/api/instagram/callback
   ```

   Use your own canonical production origin if different. The value must match the backend's `APP_ORIGIN`, including scheme/host and callback path. Do not use wildcard/temporary preview URLs for production OAuth.

8. Copy the selected **Configuration ID** privately into the backend's `META_CONFIG_ID` secret/environment field. It is not itself a secret but is configured server-side.
9. Obtain the **Meta App ID** and **Meta App Secret** from **App settings → Basic**. Configure `META_APP_ID` and `META_APP_SECRET` on the private backend. These are **not** the older Instagram product-specific credentials.
10. Set the app website/domain to your frontend's domain. Supply your privacy policy and data-deletion instructions URL:

```text
https://reelcoach.vercel.app/what-reelcoach-can-see
https://reelcoach.vercel.app/what-reelcoach-can-see#disconnect
```

Review this page for your operator identity/contact details and applicable legal requirements before public launch; it describes the implemented data handling, not legal advice.

### Testing and public access

- Add your own professional account as an **Instagram Tester**. Accept the invite in Instagram on the web: **Settings → Website permissions → Apps and websites → Tester Invites** (labels may vary).
- Standard Access is for role/tester accounts. To connect unrelated users, request **Advanced Access** for every permission in the configuration through **App Review**, complete any business verification Meta requires, and switch the app to **Live** mode.
- Your users connect a **Creator or Business** Instagram account, share it through their business portfolio, and approve the permissions. Personal accounts can switch for free in Instagram's **Account type and tools → Switch to professional account** settings; professional accounts are public.
- If no account is shared, the UI explains professional-account setup rather than pretending it knows the account's type.
- Do not generate a long-lived test access token and paste it into the frontend or this repository. The implemented OAuth flow obtains the token server-side.

## 2. Deploy the RAM-only backend

Choose an always-on Node 22 host or VM/container host that can run **exactly one process/replica**, with HTTPS and no scale-to-zero. This is an additional hosting service, not a Vercel Function. The repository contains a `Dockerfile`; provisioning a paid service or choosing a provider is not performed automatically.

Backend-only variables:

| Variable                    | Where to obtain it / purpose                                         |
| --------------------------- | -------------------------------------------------------------------- |
| `META_APP_ID`               | Meta app → App settings → Basic → App ID                             |
| `META_APP_SECRET`           | Same page → App Secret; reveal/configure privately                   |
| `META_CONFIG_ID`            | Unified Login → Configure your app → chosen compatible configuration |
| `META_WEBHOOK_VERIFY_TOKEN` | Generate a separate random value of at least 32 characters           |
| `SESSION_TTL_SECONDS`       | `2700` by default; enforced range 300–3600 seconds                   |
| `PORT`                      | `8080` unless your host injects its own port                         |
| `NODE_ENV`                  | `production`                                                         |

Variables configured **on both the backend and Vercel**, identically:

| Variable                    | Value                                                                    |
| --------------------------- | ------------------------------------------------------------------------ |
| `APP_ORIGIN`                | `https://reelcoach.vercel.app` (or your exact canonical frontend origin) |
| `AUTH_BACKEND_PROXY_SECRET` | Independently generated random shared secret, at least 32 characters     |

Generate each random secret privately, once per purpose:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Build/start without Docker:

```sh
npm ci
npm run build:server
# Inject backend environment variables using your hosting provider's private settings.
npm run start:server
```

Container example (requires your own host/TLS ingress):

```sh
docker build -t reelcoach-auth .
# Keep this env file private; do not commit it or mount data volumes.
docker run --read-only --tmpfs /tmp --cap-drop ALL \
  --security-opt no-new-privileges --ulimit core=0 \
  --memory=512m --pids-limit=128 --env-file .env \
  -p 8080:8080 reelcoach-auth
```

Operational requirements:

- One replica, no Node cluster/PM2 multi-process mode, no independently load-balanced replicas. An in-memory Map is not shared between processes.
- Do not attach persistent data volumes, configure a database, serialize sessions, take memory/core dumps, or enable heap snapshot collection. Disable swap/core dumps where your host permits it.
- Disable request-body/header/cookie logging, full-query-string access logging, and HTTP tracing/APM capture of Meta requests/responses. The application itself logs only generic startup/configuration messages and never logs provider errors or credentials.
- Terminate HTTPS at your trusted host ingress. The API requires the shared proxy secret; do not put this secret in a browser, query string, public rewrite rule, or build output. `/health` returns only a generic readiness flag.
- Restarts/deployments/expiry intentionally discard sessions; users must reconnect. RAM-only operation trades availability and horizontal scalability for no persistence.
- No profile, reel, or insight cache is kept. Sessions contain only temporary authentication state: access token, allowed account IDs, selected ID, CSRF value, expiry, request counters, and cancellation controller.
- Disconnect removes the session synchronously, aborts pending work, and drops token references before acknowledging success. Late API results cannot rehydrate a disconnected account. This invalidates ReelCoach's current session, **not** Meta's external business authorization or sessions in unrelated browsers.
- If the backend is unreachable, the UI hides account data and retries disconnect. It never reports confirmed server deletion until acknowledged; all sessions expire within one hour regardless.

## 3. Configure Vercel (no Meta secret here)

In **Vercel Dashboard → ReelCoach project → Settings → Environment Variables**, add:

| Variable                    | Environment | Value                                                                      |
| --------------------------- | ----------- | -------------------------------------------------------------------------- |
| `APP_ORIGIN`                | Production  | Exact canonical frontend origin                                            |
| `AUTH_BACKEND_ORIGIN`       | Production  | HTTPS root of the always-on backend, e.g. `https://your-auth-host.example` |
| `AUTH_BACKEND_PROXY_SECRET` | Production  | Same private shared secret configured on backend                           |

**Do not put `META_APP_SECRET`, Meta access tokens, or any `VITE_*` secret on the frontend.** Only the separate RAM backend needs Meta credentials. Vercel's Node API function forwards an allowlisted `/api/instagram/*` surface to that backend and adds the proxy credential server-side. Access tokens never pass through Vercel or a browser.

Redeploy after changing environment variables. Keep production secrets disabled in untrusted Preview deployments. Use a separately configured backend and exact registered callback if you need a trusted staging environment.

`vercel.json` excludes `/api/` from the SPA rewrite, preserving both API endpoints and direct frontend links. Production Node API calls have bounded timeouts. Backend/Meta error payloads and headers are not blindly forwarded.

## 4. Optional webhook verification for Meta setup

The current setup guide includes webhook endpoint verification. Register:

```text
https://reelcoach.vercel.app/api/instagram/webhook
```

Use the private `META_WEBHOOK_VERIFY_TOKEN` you configured on the RAM backend. The GET verification route returns only Meta's numeric challenge after validating the verification token.

**Do not subscribe to messages, comments, or other account event fields, and do not call `subscribed_apps`.** This analytics integration polls only on user navigation/refresh. Webhook POST payloads are rejected; private-message ingestion is not implemented. Check any App Review requirements directly in your dashboard rather than adding unwanted data access.

## 5. Verify with your real professional account

After the backend and credentials are configured:

1. Click **Continue with Instagram** and read the permission disclosure.
2. Continue to Meta's official dialog; choose Instagram sign-in and share your professional account.
3. Check that the browser returns to `/instagram`, with your actual profile and follower count (or explicit unavailable values).
4. Browse reels, load older posts, and paste one of your own Reel permalinks. Try another account's link; detailed analysis must be refused.
5. Check missing/unsupported metrics, particularly watch time. No undocumented unit conversion should occur.
6. Use **Disconnect Instagram**. Confirm the profile disappears, cookies expire, and the previous session cannot load the API, including in another same-browser tab.
7. Test declined permissions, session expiry, and backend restart.
8. In browser DevTools, verify no response, DOM, script, localStorage, or sessionStorage contains a Meta access token or app secret. Authentication responses should contain only opaque session cookies and safe account DTOs.

## Local development

Copy `.env.example` to the gitignored `.env`, then configure privately. For local UI/backend tests use:

```text
APP_ORIGIN=http://localhost:5173
NODE_ENV=development
DEV_AUTH_BACKEND_ORIGIN=http://127.0.0.1:8080
```

Meta requires a registered HTTPS callback for real OAuth. Use a trusted HTTPS development origin/tunnel and adjust `APP_ORIGIN`/Meta redirect configuration together for actual sign-in; plain localhost is for server fixtures and UI development.

Start the backend with environment injection (Node 22 can load a private file):

```sh
npm run build:server
node --env-file=.env .server-dist/server/index.js
```

Vite's API proxy requires the shared secret in its process environment. Start it with Node's private env-file support:

```sh
node --env-file=.env node_modules/vite/bin/vite.js --port 5173
```

Never expose the Vite development server publicly with production credentials. `npm test` and browser fixtures run without Meta credentials and do not contact Instagram.

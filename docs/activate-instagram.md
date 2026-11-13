# Activate Instagram Login — follow these steps in order

## Why login currently stops

The live `/api/instagram/login` route returns `not_configured` **before contacting Meta** when the backend URL or shared credential is missing. Deploying the frontend does not create a Meta developer app or provision the separate backend.

You approved a **RAM-only backend with no database**. That requires an always-on process outside Vercel Functions. The option below uses Render; an existing suitable host is also fine. Do not switch to a database or put Instagram tokens in cookies to bypass this setup.

**Never send secrets in chat. Enter them only in Meta, Render, or Vercel's private settings.**

## Step 1 — Set up your Meta application

1. Use an Instagram **Creator or Business** account. Switching from a personal account is free in Instagram's **Account type and tools → Switch to professional account** settings. Professional accounts are public.
2. Open [Meta for Developers → My Apps](https://developers.facebook.com/apps/) and create/open the app for ReelCoach. It must be owned by your **Meta business portfolio** and use **Facebook Login for Business**. A Facebook Page is not required for the selected Unified Login flow.
3. Choose **Use cases → Manage messaging & content on Instagram → Customize → API setup with Unified login**.
4. Under **Configure your app**, create/select an **Instagram Login Compatible** configuration. Keep `instagram_basic` and add `instagram_manage_insights`. Meta's current default compatible setup also requires `instagram_manage_messages`. Remove optional publishing, comment-management, advertising, and event permissions. ReelCoach discloses the mandatory messaging permission but never uses it or subscribes to message events.
5. Set the **Redirect URL** to this exact value, with no extra trailing slash:

   ```text
   https://reelcoach.vercel.app/api/instagram/callback
   ```

6. Get these three values privately:

   | Value             | Where to find it                                                            |
   | ----------------- | --------------------------------------------------------------------------- |
   | `META_APP_ID`     | **App settings → Basic → App ID**                                           |
   | `META_APP_SECRET` | **App settings → Basic → App Secret**                                       |
   | `META_CONFIG_ID`  | The chosen Unified Login configuration's **Configuration ID** (`config_id`) |

   Use the **Meta app** credentials, not a legacy Instagram product App ID/Secret. If your dashboard does not offer the documented configuration, follow the [official setup guide](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started) rather than guessing a different login flow.

7. Supply these public URLs in Meta where requested:
   - Website: `https://reelcoach.vercel.app`
   - Privacy policy: `https://reelcoach.vercel.app/what-reelcoach-can-see`
   - Data-deletion instructions: `https://reelcoach.vercel.app/what-reelcoach-can-see#disconnect`

   Review/add your operator identity and contact information before public launch.

8. Add your own professional account as an **Instagram Tester**. Accept the invitation on Instagram's website under **Settings → Website permissions → Apps and websites → Tester Invites**.

Start with your own tester account. Accounts belonging to other people require Meta **App Review / Advanced Access**, any required business verification, and **Live** mode. Your own test account does not prove approval for public users.

## Step 2 — Deploy the private backend

### Guided Render option

**This creates a paid Starter web service. Review the current price in Render before approving it.** Render's Free service sleeps when idle and is unsuitable for keeping these RAM sessions reliably available. Restarts still end sessions even on a paid plan.

1. Open **[Deploy ReelCoach's backend on Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FKavya-634%2Freelcoach)**.
2. Sign in and authorize access to the repository if asked. The root [`render.yaml`](../render.yaml) defines the backend service.
3. Review the Blueprint: service **reelcoach-auth**, **Docker**, **Starter**, **one instance**, and **no database or persistent disk**.
4. Enter `META_APP_ID`, `META_APP_SECRET`, and `META_CONFIG_ID` from Step 1 into Render's private fields. Do not paste a Meta access token anywhere.
5. Approve deployment. Render generates two random values privately:
   - `AUTH_BACKEND_PROXY_SECRET` — used between Vercel and the backend.
   - `META_WEBHOOK_VERIFY_TOKEN` — used only for Meta webhook verification.
6. Wait for the service to become **Live**. Open its `/health` URL, such as `https://reelcoach-auth-xxxx.onrender.com/health`. It should return `{"ready":true}`. This confirms the process is running, **not** that Meta has accepted your credentials.
7. Copy the service's **HTTPS base URL** (without `/health` or a trailing path).
8. Open that Render service's **Environment** section. Privately copy the generated `AUTH_BACKEND_PROXY_SECRET`; you will paste it into Vercel in Step 3. Keep the value out of chat/screenshots/public files.

The Blueprint sets `APP_ORIGIN=https://reelcoach.vercel.app`, `NODE_ENV=production`, and a 45-minute session limit. It disables automatic deploys so every frontend edit does not restart your RAM sessions. After a backend code update, use Render's **Manual Deploy → Deploy latest commit**.

Keep one instance and no autoscaling. Do not enable HTTP body/header/cookie logging, Meta-request tracing, memory dumps, or persistent volumes. If using another host, follow the [full backend requirements](instagram-setup.md#2-deploy-the-ram-only-backend).

## Step 3 — Connect Vercel to that backend

Open **Vercel → ReelCoach project → Settings → Environment Variables**. Set these for **Production**:

| Name                        | Value                                                              |
| --------------------------- | ------------------------------------------------------------------ |
| `APP_ORIGIN`                | `https://reelcoach.vercel.app`                                     |
| `AUTH_BACKEND_ORIGIN`       | Render's HTTPS base URL from Step 2; no `/health` or `/api` suffix |
| `AUTH_BACKEND_PROXY_SECRET` | Exactly the generated secret from Render's Environment section     |

Do not add `META_APP_SECRET`, Meta access tokens, or `VITE_*` secrets to the frontend.

Then open **Deployments → latest production deployment → menu → Redeploy**. Saving environment variables alone does not change an already deployed function.

If you change the shared secret later, update it on **both** hosts, restart/redeploy the backend, and redeploy Vercel.

## Step 4 — Complete webhook verification if Meta asks

Use:

```text
Callback URL: https://reelcoach.vercel.app/api/instagram/webhook
Verify token: the private META_WEBHOOK_VERIFY_TOKEN from Render
```

Verify only. **Do not subscribe to message, comment, or other webhook fields.** This analytics integration does not ingest them.

## Step 5 — Test the full login

1. Open [ReelCoach](https://reelcoach.vercel.app), click **Continue with Instagram**, review the disclosure, then continue securely.
2. You should now reach Meta's official dialog on `facebook.com`, offering **Instagram sign-in**. This domain is expected for the Unified Login setup you selected.
3. Choose Instagram, select your business portfolio and professional account, and approve the required permissions.
4. You should return to `/instagram` and see your account—not Alex's demo profile.
5. Try one of your own Reel permalinks, then **Disconnect Instagram** and confirm that your account disappears. Demo Mode remains available separately.

## If something still fails

| What you see                                  | What to check                                                                                                                |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Setup required / `not_configured`**         | Production has both backend variables, the backend origin is an HTTPS base URL, and Vercel was redeployed after saving them. |
| **Temporarily unavailable before Meta opens** | Backend is Live, `/health` responds, and the shared secret matches on both hosts.                                            |
| **Meta says redirect URL is invalid**         | The exact callback in Step 1 matches the configuration and `APP_ORIGIN` on both hosts.                                       |
| **App unavailable / permission not allowed**  | Correct Configuration ID, accepted tester invite, development vs Live mode, and the necessary access levels.                 |
| **No eligible account shared**                | Creator/Business account, correct business portfolio, and the account actually selected during Meta onboarding.              |
| **Reconnect required after a restart**        | Expected for RAM-only sessions. Log in again; there is no saved token database.                                              |

After completing Steps 1–3, you can say **“configuration saved and redeployed”** so the live redirect can be checked again. A backend base URL is safe to share if needed; **never share its secrets**.

Sources checked November 13, 2026: [Meta's Unified Login setup](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started), [Render Blueprint reference](https://render.com/docs/blueprint-spec), [Deploy to Render](https://render.com/docs/deploy-to-render), [Render Free service limitations](https://render.com/docs/free).

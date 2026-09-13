# Google OAuth

Sign-in with Google is implemented but inert until you supply credentials — `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are blank in [`.example.env`](../backend/.example.env). The "Sign in with Google" buttons render either way; without credentials the flow fails at Google's consent screen.

## How the flow works

Worth understanding before configuring it, because the redirect URI has to match exactly.

1. The user clicks **Sign in with Google**. The frontend does a full browser navigation to `/api/v1/auth/google/login` ([`Login.tsx`](../frontend/src/pages/Auth/Login.tsx)) — not an axios call, since the browser has to follow redirects to Google.
2. The backend redirects to Google's consent screen, passing `GOOGLE_REDIRECT_URL` as the callback.
3. The user approves. Google redirects back to that URL with an authorization code.
4. [`google_auth.py`](../backend/app/router/v1/auth/google_auth.py) exchanges the code for a token, reads the profile, and resolves the account in three steps:
   - Known `google_id` → sign that user in.
   - No `google_id` but the email exists → **link** the Google ID to the existing account. This is what lets someone who registered with a password later sign in with Google.
   - Neither → create a new user with no password.
5. The backend sets `access_token` / `refresh_token` httpOnly cookies and redirects to `{FRONTEND_URL}/auth/callback`, which forwards to the user's destination.

## 1. Create a Google Cloud project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Project dropdown (top left) → **New Project**. Name it, create it, and make sure it's selected.

## 2. Configure the OAuth consent screen

Credentials can't be created until this exists.

1. **APIs & Services** → **OAuth consent screen**.
2. Choose **External** unless everyone signing in belongs to your Google Workspace organisation.
3. Fill in the app name, a user support email, and a developer contact email. Nothing else is required to start.
4. On the **Scopes** step, the defaults are enough — the backend requests `openid email profile`, all of which are non-sensitive and need no verification.
5. While the app is in **Testing**, only accounts you list as test users can sign in. Add your own Google account here, or you'll be blocked at the consent screen. Publishing the app removes that restriction.

## 3. Create OAuth credentials

1. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
2. Application type: **Web application**.
3. Under **Authorised redirect URIs**, add the callback for each environment you use:

   | Environment | Redirect URI |
   |---|---|
   | Local (compose stack) | `http://localhost:3000/api/v1/auth/google/callback` |
   | Production | `https://yourdomain.com/api/v1/auth/google/callback` |

4. Create. Google shows your **Client ID** and **Client secret** — copy both now; the secret can be re-downloaded but not re-displayed inline.

> **The redirect URI must match byte for byte.** A trailing slash, `http` vs `https`, `localhost` vs `127.0.0.1`, or a missing/wrong port all count as different URIs and produce `redirect_uri_mismatch`. Locally the frontend's Vite dev server serves the app directly on port `3000` (no reverse proxy in front of it), so `http://localhost:3000/...` is correct.

## 4. Configure the backend

In `backend/.env`:

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URL=http://localhost:3000/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

Both `GOOGLE_REDIRECT_URL` and `FRONTEND_URL` matter:

- **`GOOGLE_REDIRECT_URL`** is sent to Google and must match a URI registered in step 3.
- **`FRONTEND_URL`** is where the backend sends the browser *after* a successful sign-in (`{FRONTEND_URL}/auth/callback`). Get it wrong and the user authenticates successfully but lands nowhere.

`SESSION_SECRET_KEY` must also be set — authlib stores the OAuth state in a Starlette session, and [`main.py`](../backend/app/main.py) uses that value to sign the session cookie. Without it the callback fails on state verification.

> `.env` is copied into the image at build time, so rebuild after changing it: `docker compose -f compose/docker-compose.yml up --build`.

## 5. Test it

With the stack running, go to [http://localhost:3000/login](http://localhost:3000/login) and click **Sign in with Google**. On success you land on `/account`, signed in.

## Troubleshooting

The callback handler wraps everything in one `try`/`except` and returns a generic `400 Google authentication failed`, so the response body won't tell you much. **The real error is in the backend logs:**

```bash
docker compose -f compose/docker-compose.yml logs backend | grep "Google OAuth callback error"
```

| Symptom | Cause |
|---|---|
| `redirect_uri_mismatch` at Google | `GOOGLE_REDIRECT_URL` doesn't exactly match a registered URI. Compare character by character, including scheme and trailing slash |
| "Access blocked: app not verified" | Consent screen is in **Testing** and your account isn't on the test-user list |
| 400 immediately, logs mention state or session | `SESSION_SECRET_KEY` is unset or changed between the redirect and callback |
| Signs in but lands on a blank or wrong page | `FRONTEND_URL` is wrong — check it has no trailing slash |
| `invalid_client` | Client ID or secret is wrong, or belongs to a different Google Cloud project |

## Things worth knowing

**Accounts get linked by email.** If someone registers with a password and later signs in with Google using the same address, the Google ID is attached to their existing account rather than creating a duplicate. That's usually what you want, but it does mean control of the email address is treated as proof of ownership.

**Google-only accounts have no password.** `create_user_without_password` leaves the column null. Password login for such an account correctly returns 401 rather than erroring — there's a regression test covering exactly this in [`test_password_auth.py`](../backend/tests/integration/router/v1/auth/test_password_auth.py).

**Production needs its own credentials configured.** The Ansible template at [`environment_variables.yml`](../infrastructure/ansible/playbooks/environment_variables.yml) writes `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URL` and `FRONTEND_URL` from `group_vars/vm01.yml`. The production redirect URI — `https://yourdomain.com/api/v1/auth/google/callback` — has to be registered in the console alongside the localhost one, as in step 3.

**E2E tests don't cover this flow.** Completing a real Google sign-in requires driving Google's own consent screen, which isn't practical to automate. The integration tests mock `authorize_access_token` to cover the three account-resolution branches instead.
# Google OAuth setup (Google Cloud Console)

Enables **Continue with Google** on the login / sign-up panel. Takes about 10 minutes.

## 1. Create a project
1. Open https://console.cloud.google.com and sign in.
2. Top bar -> project picker -> **New Project** -> name it `Dhanwantari` -> **Create**, then select it.

## 2. Configure the OAuth consent screen
1. Menu -> **APIs & Services -> OAuth consent screen** (newer UI: **Google Auth Platform -> Branding**).
2. User type: **External** -> **Create**.
3. Fill in: App name `Dhanwantari`, User support email, Developer contact email -> Save.
4. **Scopes**: add `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` (these are the defaults; no sensitive scopes needed).
5. **Audience / Test users**: while the app is in **Testing**, only the Gmail accounts you add here can log in. Add your own and your testers' emails.
6. When ready for everyone: **Publish app** (basic email/profile scopes need no Google verification).

## 3. Create the OAuth client
1. **APIs & Services -> Credentials -> Create Credentials -> OAuth client ID**.
2. Application type: **Web application**, name `Dhanwantari web`.
3. **Authorized JavaScript origins**
   - `http://localhost:5173`
   - (production) `https://your-domain.com`
4. **Authorized redirect URIs** (must match exactly, no trailing slash)
   - `http://localhost:5173/auth/callback/google`
   - `http://localhost:5000/auth/callback/google` (only if you open the API directly, not through Vite)
   - (production) `https://your-domain.com/auth/callback/google`
5. **Create**, then copy the **Client ID** and **Client secret**.

> The path is always `/auth/callback/google` because Auth.js is mounted at `/auth/*` and the Vite dev proxy forwards it to the API.

## 4. Add the keys to the server
Edit `server/.env`:

```env
GOOGLE_CLIENT_ID=1234567890-xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
AUTH_SECRET=<openssl rand -base64 32>
CLIENT_URL=http://localhost:5173

# production only
# AUTH_URL=https://your-domain.com/auth
# NODE_ENV=production
```

If either Google key is empty the button is hidden and email/password login keeps working.
Never commit `.env` or the client secret.

## 5. Run and test
```bash
npm run server     # terminal 1
npm run client     # terminal 2
```
Open http://localhost:5173 -> **Login** -> **Continue with Google**.

## How accounts behave
| Situation | Result |
| --- | --- |
| Email already registered (patient or doctor) | Google account is linked to it; logs in with the existing role |
| New email, Google login | A **"Finish setting up"** screen asks: patient or doctor. Doctors add specialization, qualifications and licence. The account is created only after this, so a doctor is never registered as a patient by default |
| Same Google account later | Logs in directly as the role chosen above |
| Google email not verified | Login refused |
| Google-only account | Has no password; email/password login is not possible for it |
| Account created by mistake (e.g. doctor stuck as patient) | `npm run remove-user -- their@gmail.com`, then log in with Google again and choose doctor |

## Troubleshooting
| Error | Fix |
| --- | --- |
| `redirect_uri_mismatch` | The redirect URI in Google Console differs from the one in the error message. Copy that exact URI into **Authorized redirect URIs**; wait a few minutes. |
| `Error 403: access_denied` / "app not verified" | App is in Testing: add the account under **Test users**, or publish the app. |
| Button not visible | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` not set, or the server was not restarted. |
| Redirected to `/?error=Configuration` | Wrong client secret, or missing `AUTH_SECRET`. Check server logs. |
| Works locally, fails in production | Set `AUTH_URL=https://your-domain.com/auth`, add the production origin + redirect URI, serve over HTTPS, keep the app and `/auth` on the same domain so the session cookie is sent. |

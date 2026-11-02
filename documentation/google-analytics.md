# Google Analytics

Google Analytics 4 (GA4) loads only when a Measurement ID is set, which in practice means the production build. Locally, in tests and in CI there's no ID, so nothing loads. The tag is added by [`src/utils/analytics.ts`](../frontend/src/utils/analytics.ts) rather than hardcoded, so clones of this repo never send traffic to your property.

## 1. Create a GA4 property

1. Go to [Google Analytics](https://analytics.google.com/) and sign in.
2. **Admin** (bottom left) → **Create** → **Property**.
3. Give it a name, set your timezone and currency, and continue through the business questions.
4. When prompted to choose a platform, pick **Web**.
5. Enter your site URL and give the stream a name. Create it.

You'll land on the web stream details page.

## 2. Get your Measurement ID

On the stream details page, the **Measurement ID** is top-right, in the form `G-XXXXXXXXXX`.

It's not a secret — it ships in the client-side bundle and is visible to anyone viewing source.

## 3. Enable it in production

In GitHub, go to **Settings → Secrets and variables → Actions → Variables** and add `GA_MEASUREMENT_ID` with your Measurement ID. The next frontend deploy builds it in.

To remove analytics, delete the variable and redeploy.

## 4. Verify it's working

After the deploy, load the live site and check **Reports → Realtime** in GA. Your own visit should appear within about 30 seconds.

If nothing shows up:

- **Ad blockers block gtag.js.** uBlock Origin, Brave shields, and most privacy extensions stop the request entirely. Test in a clean browser profile.
- **Check the request actually fires.** DevTools → Network → filter `gtag` — you should see a request to `googletagmanager.com` returning 200.
- **Check the ID matches.** A typo'd Measurement ID fails silently; GA has no way to tell you data is arriving for a property that doesn't exist.

## Sending custom events

`window.gtag` is already typed in [`frontend/src/vite-env.d.ts`](../frontend/src/vite-env.d.ts), so you can call it from anywhere without extra setup:

```ts
window.gtag('event', 'sign_up', { method: 'password' });
```

Guard the call, since `window.gtag` is undefined wherever analytics isn't loaded:

```ts
window.gtag?.('event', 'sign_up', { method: 'password' });
```

## Things worth knowing

**Page views in a single-page app.** GA4's enhanced measurement tracks history changes automatically, so client-side navigation via React Router is generally recorded without extra work. If your reports show only the entry page, check that **Enhanced measurement** is on in the web stream settings.

**The ID is baked in at build time.** Changing the variable takes effect on the next frontend deploy, not immediately.

**The privacy policy already references this.** [`frontend/src/pages/PrivacyPolicy.tsx`](../frontend/src/pages/PrivacyPolicy.tsx) states that Google Analytics is in use and lists what it collects. If you don't set `GA_MEASUREMENT_ID`, that section is inaccurate and should be edited. If you enable it, check the listed items still match what your property collects.

**Consent.** This boilerplate ships no cookie-consent banner. GA4 sets cookies on load, which in the EU/UK generally requires consent before firing. If you have users in those regions, call `initAnalytics()` only after the user accepts, or look at [Google Consent Mode](https://developers.google.com/tag-platform/security/guides/consent) — that's a decision this boilerplate deliberately leaves to you.
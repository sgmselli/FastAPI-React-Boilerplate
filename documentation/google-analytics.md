# Google Analytics

Google Analytics 4 (GA4) is wired up but **disabled by default** — the snippet in [`frontend/index.html`](../frontend/index.html) is commented out. It ships that way deliberately: an enabled tag carries a Measurement ID, and a hardcoded one would send every clone's traffic to whoever's property that is.

## 1. Create a GA4 property

1. Go to [Google Analytics](https://analytics.google.com/) and sign in.
2. **Admin** (bottom left) → **Create** → **Property**.
3. Give it a name, set your timezone and currency, and continue through the business questions.
4. When prompted to choose a platform, pick **Web**.
5. Enter your site URL and give the stream a name. Create it.

You'll land on the web stream details page.

## 2. Get your Measurement ID

On the stream details page, the **Measurement ID** is top-right, in the form `G-XXXXXXXXXX`.

It's not a secret — it ships in your client-side HTML and is visible to anyone viewing source. There's no need to put it in `.env` or GitHub secrets.

## 3. Enable the tag

In [`frontend/index.html`](../frontend/index.html), uncomment the block near the bottom of `<body>` and replace **both** occurrences of `G-XXXXXXXXXX` with your Measurement ID:

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-XXXXXXXXXX');
</script>
```

Both matter: the first loads the library for that property, the second configures it. Changing only one sends data nowhere useful.

## 4. Verify it's working

Rebuild and load the site, then check **Reports → Realtime** in GA. Your own visit should appear within about 30 seconds.

If nothing shows up:

- **Ad blockers block gtag.js.** uBlock Origin, Brave shields, and most privacy extensions stop the request entirely. Test in a clean browser profile.
- **Check the request actually fires.** DevTools → Network → filter `gtag` — you should see a request to `googletagmanager.com` returning 200.
- **Check the ID matches.** A typo'd Measurement ID fails silently; GA has no way to tell you data is arriving for a property that doesn't exist.

## Sending custom events

`window.gtag` is already typed in [`frontend/src/vite-env.d.ts`](../frontend/src/vite-env.d.ts), so you can call it from anywhere without extra setup:

```ts
window.gtag('event', 'sign_up', { method: 'password' });
```

Guard the call if you want the app to work with the tag disabled, since `window.gtag` is undefined when the snippet is commented out:

```ts
window.gtag?.('event', 'sign_up', { method: 'password' });
```

## Things worth knowing

**Page views in a single-page app.** GA4's enhanced measurement tracks history changes automatically, so client-side navigation via React Router is generally recorded without extra work. If your reports show only the entry page, check that **Enhanced measurement** is on in the web stream settings.

**The tag is baked in at build time.** `index.html` is processed by Vite during `npm run build`, so the ID is fixed in the built output. Changing it means rebuilding and redeploying, not just editing an environment variable.

**Analytics run in E2E tests.** With the tag enabled, Playwright runs against the local stack will fire real page views and set `_ga` cookies. That pollutes your reports with automated traffic. Either leave the tag disabled locally, or filter internal traffic in GA's data settings.

**The privacy policy already references this.** [`frontend/src/pages/PrivacyPolicy.tsx`](../frontend/src/pages/PrivacyPolicy.tsx) states that Google Analytics is in use and lists what it collects. If you leave analytics disabled, that section is inaccurate and should be edited. If you enable it, check the listed items still match what your property collects.

**Consent.** This boilerplate ships no cookie-consent banner. GA4 sets cookies on load, which in the EU/UK generally requires consent before firing. If you have users in those regions, look at [Google Consent Mode](https://developers.google.com/tag-platform/security/guides/consent) and gate the snippet accordingly — that's a decision this boilerplate deliberately leaves to you.
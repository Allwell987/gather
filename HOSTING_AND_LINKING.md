Hosting your Privacy Policy and linking it in app stores

This file explains quick ways to host `PRIVACY.md` and link it in the App Store / Play Console and inside the app.

1) Option A — Publish via GitHub Pages (fast)

- Push the repo to GitHub (if not already).
- In GitHub repo Settings → Pages: select branch `main` (or `gh-pages`) and folder `/ (root)` or `/docs`.
- If you choose `/docs`, move `PRIVACY.md` into `/docs/PRIVACY.md` or keep it at root and configure accordingly.
- After Pages builds, your policy will be available at:

  https://<github-username>.github.io/<repo-name>/PRIVACY.md

  (If your Pages site has a custom domain, use that URL.)

- Example push commands:

```bash
git add PRIVACY.md
git commit -m "Add privacy policy"
git push origin main
```

2) Option B — Use GitHub Pages with a rendered HTML page (recommended for polished appearance)

- Create a simple `index.html` in `/docs` that includes the contents of `PRIVACY.md`, or use a GitHub Action to render Markdown to HTML.
- The hosted HTML is easier to link from store listings and opens cleanly in mobile browsers.

3) Link the policy in App Store / Play Console

- Apple App Store (App Store Connect):
  - Go to your app → App Information → Privacy Policy URL. Paste the public URL (HTTPS).
  - Under "App Privacy" add accurate data collection categories per Apple’s questionnaire.

- Google Play Console:
  - Go to your app → Main store listing → Privacy Policy. Paste the public URL (HTTPS).
  - Complete the Data safety form with details about data collected and shared.

4) Add an in-app link (React Native example)

- Quick approach: open the hosted URL in the system browser using `Linking`:

```js
import { Linking } from 'react-native'

function openPrivacy() {
  Linking.openURL('https://<your-domain-or-github>.github.io/<repo>/PRIVACY.md')
}
```

- Alternative: bundle the markdown/HTML into the app and display with a `WebView` or an in-app Markdown renderer. Bundling ensures the policy is available offline but requires updating the app to change text.

5) Verify and test

- Open the hosted URL on mobile and desktop to ensure it renders properly.
- Submit the hosted URL in App Store Connect and Play Console and wait for the consoles to accept it.

6) Recommendations for the link

- Use HTTPS.
- Prefer an HTML-rendered policy page (better mobile UX than raw `.md`).
- Keep the link stable (avoid temporary URLs during store submission).

7) If you want, I can:

- Create a `/docs/index.html` that converts the existing `PRIVACY.md` into a simple HTML page for GitHub Pages.
- Add a small React Native Settings entry that opens the hosted URL.
- Prepare the text for Apple’s App Privacy questionnaire and Google Data safety form based on the repo's SDKs and vendors (requires a list of vendors used).


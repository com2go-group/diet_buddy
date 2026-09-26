# DietBuddy landing page

A static page (HTML, CSS, a little JavaScript, fonts and images). There is no build step: upload
the contents of this folder to any web server or static host.

```
landing/
  index.html        the page
  privacy.html      Privacy Policy   ┐ generated from the app's texts
  terms.html        Terms of Service │ (src/features/legal) by
  delete-account.html  deletion steps┘ `npm run landing:legal`
  styles.css        styles (light and dark mode, responsive)
  config.js         settings you edit: store links, legal links, contact, company
  main.js           applies config.js to the page
  assets/           fonts (Inter, self-hosted), screenshots, favicon, social image
```

## 1. Edit `config.js`

| Setting                                                      | What to put                                                                                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `appStoreUrl`                                                | The App Store link, e.g. `https://apps.apple.com/app/id1234567890`                                                                                           |
| `playStoreUrl`                                               | `https://play.google.com/store/apps/details?id=com.com2go.dietbuddy` once published                                                                          |
| `privacyUrl`, `termsUrl`, `deleteAccountUrl`                 | Default to this folder's `privacy.html`, `terms.html` and `delete-account.html`. Change only if you host the legal pages elsewhere                           |
| `legalCompany`, `legalAddress`, `legalEmail`, `legalCountry` | Company name, registered address, privacy contact email and governing-law country used in the Privacy Policy and Terms (shown as `[placeholders]` until set) |
| `supportEmail`                                               | Contact address for the footer (the Contact link is hidden while empty)                                                                                      |
| `company`                                                    | Company name for the copyright line                                                                                                                          |

While a store link is empty, its buttons say "Coming soon to App Store / Google Play" and don't
navigate, so you can publish the page before launch.

## 2. Before launch

- **Official store badges:** the buttons are styled placeholders. Apple and Google require their
  official badge artwork when you link to the stores. Download it from
  developer.apple.com/app-store/marketing/guidelines and play.google.com/intl/en/badges, then
  replace the two `.store-btn` links in each place they appear (hero and download section).
- **Social preview:** set `og:image` in `index.html` to the absolute URL of
  `assets/og-image.png` (e.g. `https://dietbuddy.example/assets/og-image.png`). Social networks
  ignore relative image URLs.
- **Screenshots** come from `docs/store/screenshots/` (resized to WebP). Replace them when the
  final device screenshots are taken, keeping the file names.
- **App icon:** the favicon uses the DietBuddy bolt mark. The app's own icon (`assets/icon.png`
  in the app) is still Expo's placeholder and needs a real design before store submission.
- **Legal pages:** `privacy.html`, `terms.html` and `delete-account.html` are the live URLs for
  the stores (App Store privacy policy URL, Google Play privacy policy and account deletion
  URLs), e.g. `https://dietbuddy.example/privacy.html`. They are drafts for legal review (see
  `docs/legal.md`). Whenever the texts in `src/features/legal/` change, run
  `npm run landing:legal` and upload the three files again. To write the company details into
  the HTML itself instead of filling them from `config.js`, set `EXPO_PUBLIC_LEGAL_COMPANY`,
  `_ADDRESS`, `_EMAIL` and `_COUNTRY` before running it.

## 3. Upload

Copy everything in `landing/` to your web root (for example with SFTP, or `rsync -av landing/
user@server:/var/www/dietbuddy/`). Serve it over HTTPS. Suggested headers:

- `Cache-Control: public, max-age=31536000, immutable` for `assets/`
- `Cache-Control: no-cache` for `index.html`, `config.js` and `main.js`

To preview locally: `npx serve landing` and open http://localhost:3000.

## Notes

- No cookies, trackers or third-party requests: fonts and images are served from your server,
  so no cookie banner is needed for the page itself. If you add analytics, add consent too.
- The copy matches what the app does today (see CLAUDE.md). Prices aren't listed because they
  vary by country and are set in the stores.
- The page passes an axe-core WCAG 2.1 AA check in light and dark mode at desktop and phone widths.

# DietBuddy landing page

The website for **https://dietbuddy.me**: a static page (HTML, CSS, a little JavaScript, fonts
and images). There is no build step: upload the contents of this folder to the web root.

```
landing/
  index.html        the page
  privacy.html      Privacy Policy   ┐ generated from the app's texts
  terms.html        Terms of Service │ (src/features/legal) by
  delete-account.html  deletion steps┘ `npm run landing:legal`
  styles.css        styles (light and dark mode, responsive)
  config.js         settings you edit: store links, legal links, contact, company
  main.js           applies config.js to the page
  404.html          "Page not found" page
  robots.txt        lets search engines in, points to the sitemap
  sitemap.xml       the four public pages
  .htaccess         Apache settings: HTTPS + www redirects, clean URLs, security headers, caching
  assets/           fonts (Inter, self-hosted), screenshots, favicon, social image
  README.md         this file (don't upload)
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
- **Social preview:** `index.html` already points `og:image` and the canonical links at
  `https://dietbuddy.me/`. If the domain ever changes, update them there, in `sitemap.xml`,
  `robots.txt`, `.htaccess` and `SITE_URL` in `scripts/landing/build-legal-pages.mjs`.
- **Screenshots** come from `docs/store/screenshots/` (resized to WebP). Replace them when the
  final device screenshots are taken, keeping the file names.
- **App icon:** the favicon and the app icon (`assets/icon.png`) both use the DietBuddy bolt
  mark on the amber gradient.
- **Legal pages:** `privacy.html`, `terms.html` and `delete-account.html` are the live URLs for
  the stores (App Store privacy policy URL, Google Play privacy policy and account deletion
  URLs): `https://dietbuddy.me/privacy.html`, `https://dietbuddy.me/terms.html` and
  `https://dietbuddy.me/delete-account.html`. They are drafts for legal review (see
  `docs/legal.md`). Whenever the texts in `src/features/legal/` change, run
  `npm run landing:legal` and upload the three files again. To write the company details into
  the HTML itself instead of filling them from `config.js`, set `EXPO_PUBLIC_LEGAL_COMPANY`,
  `_ADDRESS`, `_EMAIL` and `_COUNTRY` before running it.

## 3. Upload to dietbuddy.me

1. **DNS:** point `dietbuddy.me` (A/AAAA records) and `www.dietbuddy.me` (CNAME to
   `dietbuddy.me`) at your server.
2. **HTTPS:** get a certificate covering both names (for example Let's Encrypt:
   `certbot --apache -d dietbuddy.me -d www.dietbuddy.me`, or your host's free SSL option).
3. **Upload** everything in this folder except `README.md` to the web root, including the hidden
   `.htaccess` file (turn on "show hidden files" in your FTP client). For example
   `rsync -av --exclude README.md landing/ user@server:/var/www/dietbuddy/`.
4. **Check:** `http://dietbuddy.me` and `https://www.dietbuddy.me` should both end up on
   `https://dietbuddy.me/`; `https://dietbuddy.me/privacy` and `/privacy.html` both show the
   Privacy Policy; an unknown address shows the "Page not found" page.
5. Optionally submit `https://dietbuddy.me/sitemap.xml` in Google Search Console.
6. **app-ads.txt** (for AdMob): once AdMob gives you its line (AdMob → Apps → app-ads.txt),
   save it as `app-ads.txt` in this folder and upload it, so it is served at
   `https://dietbuddy.me/app-ads.txt`.

The app opens `https://dietbuddy.me/terms.html` and `https://dietbuddy.me/privacy.html` from its
Terms and Privacy Policy links, and Profile → Website opens the home page, so keep those file
names. All store URL fields are listed in `docs/store/README.md`.

### Apache (most shared hosting)

`.htaccess` does it all. It needs `AllowOverride All` (the default on shared hosting) and the
`rewrite` and `headers` modules (`mod_deflate` and `mod_expires` are optional). It:

- redirects HTTP and `www.` to `https://dietbuddy.me` (301);
- serves `/privacy`, `/terms` and `/delete-account` without `.html`;
- shows `404.html` for unknown pages, hides dotfiles and directory listings;
- sends HSTS, a strict Content-Security-Policy (only files from dietbuddy.me), nosniff,
  referrer and permissions policies;
- caches fonts and images for 30 days and always revalidates HTML, `config.js` and `main.js`.

Only turn on HSTS preloading after HTTPS works for both names; the header here has no
`preload`, so it is safe to start with.

### nginx

`.htaccess` is ignored by nginx. Use this server block instead (certificate paths from certbot):

```nginx
server {
  listen 80;
  listen [::]:80;
  server_name dietbuddy.me www.dietbuddy.me;
  return 301 https://dietbuddy.me$request_uri;
}

server {
  listen 443 ssl;
  listen [::]:443 ssl;
  http2 on;
  server_name www.dietbuddy.me;
  ssl_certificate     /etc/letsencrypt/live/dietbuddy.me/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/dietbuddy.me/privkey.pem;
  return 301 https://dietbuddy.me$request_uri;
}

server {
  listen 443 ssl;
  listen [::]:443 ssl;
  http2 on;
  server_name dietbuddy.me;
  ssl_certificate     /etc/letsencrypt/live/dietbuddy.me/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/dietbuddy.me/privkey.pem;

  root /var/www/dietbuddy;
  index index.html;
  error_page 404 /404.html;

  add_header Strict-Transport-Security "max-age=31536000" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()" always;
  add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;

  location ~ /\. { deny all; }
  location / { try_files $uri $uri.html $uri/ =404; }
  location ~* \.(woff2|webp|png|svg)$ {
    add_header Cache-Control "public, max-age=2592000";
    add_header X-Content-Type-Options "nosniff" always;
  }
  location ~* \.(html|js|xml|txt)$ {
    add_header Cache-Control "no-cache";
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;
  }
}
```

(nginx drops server-level `add_header` lines inside a `location` that sets its own, which is why
the HTML location repeats the security headers.)

### Static hosts (Netlify, Cloudflare Pages, GitHub Pages)

Upload the folder as is. They provide HTTPS, clean URLs and `404.html` themselves; set the
`www` redirect in their domain settings. The security headers can be added with the host's
headers file if you want them.

To preview locally: `npx serve landing` and open http://localhost:3000.

## Notes

- No cookies, trackers or third-party requests: fonts and images are served from your server,
  so no cookie banner is needed for the page itself. If you add analytics, add consent too.
- The copy matches what the app does today (see CLAUDE.md). Prices aren't listed because they
  vary by country and are set in the stores.
- The page passes an axe-core WCAG 2.1 AA check in light and dark mode at desktop and phone widths.

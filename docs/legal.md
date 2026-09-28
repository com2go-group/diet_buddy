# Privacy Policy and Terms

The Privacy Policy and Terms of Service live in the app as data:
`src/features/legal/privacy.en.ts`, `src/features/legal/terms.en.ts` and
`src/features/legal/deleteAccount.en.ts`. Their public home is the website:

| Document                      | URL                                      |
| ----------------------------- | ---------------------------------------- |
| Privacy Policy                | https://dietbuddy.me/privacy.html        |
| Terms of Service              | https://dietbuddy.me/terms.html          |
| Account deletion instructions | https://dietbuddy.me/delete-account.html |

The website (`landing/`) gets these pages from the same texts with `npm run landing:legal`.
Re-run it and upload the three files whenever the texts change. Every Terms and Privacy Policy
link in the app (sign-up, onboarding consent, Profile, paywall) and in the sign-up and
password emails (`supabase/templates/`) opens these URLs, and the URLs in the texts are links.
The same texts are also built into the app at `/legal/privacy`, `/legal/terms` and
`/legal/delete-account` (public routes of the web build, used if the URLs are cleared).

**These are drafts written from `docs/data-inventory.md`. Have them reviewed by a lawyer before
launch.** Whenever data collection changes, update the data inventory and the policy together
(`src/features/legal/__tests__/legal.test.tsx` checks that every processor is named).

## Before going live

1. **Fill in the legal entity** in `.env` (and the EAS build environment). Until they are set,
   the pages show visible placeholders such as `[company name]`:
   - `EXPO_PUBLIC_LEGAL_COMPANY`: the company name.
   - `EXPO_PUBLIC_LEGAL_ADDRESS`: its registered address.
   - `EXPO_PUBLIC_LEGAL_EMAIL`: the privacy contact email.
   - `EXPO_PUBLIC_LEGAL_COUNTRY`: the country whose law governs the Terms.
2. **Sign data processing agreements** with every processor the policy names: Supabase,
   Anthropic, RevenueCat, Brevo, sms.to and Expo (push). Google AdMob is covered by accepting
   Google's EU controller terms in the AdMob console. The policy says Anthropic works under a
   DPA, so it must be signed before launch.
3. **Lawyer review checklist**:
   - Legal bases (contract, and explicit consent for health data under GDPR Art. 9(2)(a)).
   - The separate optional consents: AI body scan photos, wellness insights from coach chats,
     marketing and analytics.
   - International transfers (Anthropic, RevenueCat and Google outside the EU).
   - Whether an EU representative (Art. 27) or a data protection officer (Art. 37) is needed.
   - Retention (immediate deletion, backups within 30 days).
   - Consumer-law wording in the Terms (subscriptions, liability, governing law) for each launch
     country.
4. **Host the pages.** The landing site at dietbuddy.me carries the same texts
   (`landing/README.md`): `https://dietbuddy.me/privacy.html`, `https://dietbuddy.me/terms.html`
   and `https://dietbuddy.me/delete-account.html`. These are the URLs for the stores. The web
   build of the app also serves them at `/legal/privacy`, `/legal/terms` and
   `/legal/delete-account` if you host it.
5. **The app links to the website**: the Terms and Privacy Policy links at sign-up, in the
   onboarding consent step, in Profile and on the paywall open `https://dietbuddy.me/terms.html`
   and `https://dietbuddy.me/privacy.html` (`src/lib/site.ts`). `EXPO_PUBLIC_TERMS_URL` and
   `EXPO_PUBLIC_PRIVACY_URL` override them (for example a staging site). The in-app copies at
   `/legal/*` stay available as public routes of the web build.
6. **Enter the URLs in the stores**: App Store Connect (App Privacy → Privacy Policy URL, and
   the License Agreement if you use custom Terms) and Google Play Console (App content →
   Privacy policy).

When the text changes, bump `updated` in the document. If a change affects what users consented
to, also bump the consent version in the code (`HEALTH_CONSENT_VERSION`,
`OPTIONAL_CONSENT_VERSION`, `BODY_PHOTO_CONSENT_VERSION`) so the new version is recorded.
